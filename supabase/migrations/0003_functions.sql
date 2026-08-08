-- open_pack: consume one earned pack and draw one eligible card, atomically.
--
-- Two things make this correct under the burst traffic a live event produces:
--
--   1. The grant is claimed with FOR UPDATE SKIP LOCKED, so two concurrent calls
--      (a double-click, two tabs) cannot claim the same grant. Exactly one wins.
--
--   2. Ineligible cards are excluded in the WHERE clause rather than drawn and
--      retried. A duplicate or self-pull is therefore unrepresentable, and there
--      is no retry cap to tune and no unlucky-streak failure mode in a small pool.
--
-- The whole body runs in one transaction, so a failure anywhere leaves no
-- half-opened pack behind.
create function open_pack(p_pack_id uuid)
returns cards
language plpgsql security definer set search_path = public as $$
declare
  v_user  uuid := auth.uid();
  v_grant uuid;
  v_card  cards;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  update pack_grants
     set consumed_at = now()
   where id = (
     select id
       from pack_grants
      where user_id = v_user
        and pack_id = p_pack_id
        and consumed_at is null
      order by created_at
        for update skip locked
      limit 1
   )
  returning id into v_grant;

  if v_grant is null then
    raise exception 'no_unopened_pack' using errcode = 'P0001';
  end if;

  select c.* into v_card
    from cards c
   where c.pack_id  = p_pack_id
     and c.owner_id <> v_user                       -- never your own card
     and not exists (                               -- never one you already hold
       select 1 from pulls p
        where p.user_id = v_user and p.card_id = c.id
     )
   order by random()
   limit 1;

  if v_card.id is null then
    -- Nothing left to pull. Refund the grant so the member is not charged an
    -- opening for nothing, and let the caller show "you've collected everyone
    -- here yet — check back as more people contribute".
    update pack_grants set consumed_at = null where id = v_grant;
    raise exception 'pool_exhausted' using errcode = 'P0002';
  end if;

  insert into pulls (pack_id, user_id, card_id)
  values (p_pack_id, v_user, v_card.id);

  return v_card;
end $$;

revoke all on function open_pack(uuid) from public, anon;
grant execute on function open_pack(uuid) to authenticated;


-- binder_cards: the single query behind all three binder views.
--
--   p_collector null      -> the whole public pack
--   p_collector = me      -> the "My Cards" lens
--   p_collector = someone -> that member's lens
--
-- A collector "has" a card if they contributed it or pulled it, which is exactly
-- the PRD's definition. Left as SECURITY INVOKER so RLS still applies.
create function binder_cards(p_pack_id uuid, p_collector uuid default null)
returns setof cards
language sql stable set search_path = public as $$
  select c.*
    from cards c
   where c.pack_id = p_pack_id
     and (
       p_collector is null
       or c.owner_id = p_collector
       or exists (
         select 1 from pulls p
          where p.card_id = c.id and p.user_id = p_collector
       )
     )
   order by c.serial;
$$;

grant execute on function binder_cards(uuid, uuid) to anon, authenticated;


-- Whether the signed-in member has already contributed to a pack, and whether
-- they have an unopened pack waiting. Drives the contribute gate and the
-- "Open your pack" call to action in one round trip.
create function my_pack_status(p_pack_id uuid)
returns table (has_contributed boolean, unopened_packs int)
language sql stable set search_path = public as $$
  select
    exists (
      select 1 from cards
       where pack_id = p_pack_id and owner_id = auth.uid()
    ),
    (
      select count(*)::int from pack_grants
       where pack_id = p_pack_id
         and user_id = auth.uid()
         and consumed_at is null
    );
$$;

grant execute on function my_pack_status(uuid) to authenticated;
