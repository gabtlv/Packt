-- Allow up to five contributions per member per pack. Each card still mints one
-- pack grant (via grant_pack_on_contribution), so more cards = more openings and
-- a denser pool. The hard cap lives in a trigger so the client cannot farm past it.

alter table cards drop constraint cards_pack_id_owner_id_key;

create index cards_pack_owner_idx on cards (pack_id, owner_id);

create function enforce_cards_per_pack_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
  v_limit constant int := 5;
begin
  -- Serialize concurrent inserts for the same (pack, owner) so two requests that
  -- both see count = 4 cannot both slip through.
  perform pg_advisory_xact_lock(
    hashtextextended(new.pack_id::text || ':' || new.owner_id::text, 0)
  );

  select count(*)::int into v_count
    from cards
   where pack_id = new.pack_id
     and owner_id = new.owner_id;

  if v_count >= v_limit then
    raise exception 'contribution_limit'
      using errcode = 'P0004',
            hint = format('at most %s cards per member per pack', v_limit);
  end if;

  return new;
end $$;

create trigger cards_enforce_per_pack_limit
before insert on cards
for each row execute function enforce_cards_per_pack_limit();


-- Return how many cards the member has already added, not just a boolean — the
-- contribute gate needs the remaining quota.
drop function if exists my_pack_status(uuid);

create function my_pack_status(p_pack_id uuid)
returns table (contribution_count int, unopened_packs int)
language sql stable set search_path = public as $$
  select
    (
      select count(*)::int from cards
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
