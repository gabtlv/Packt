-- Triggers that turn the PRD's rules into database invariants.

-- A Google sign-in gives us name and avatar for free; mirror them into profiles
-- so the card back can be populated without asking the user to retype them.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();


-- Serial numbers ("#004 / SUMMERHACKS"). Incrementing the pack's counter takes a
-- row lock on that pack, so concurrent contributions get distinct serials rather
-- than colliding on the unique (pack_id, serial) constraint.
create function assign_card_serial() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update packs
     set card_count = card_count + 1
   where id = new.pack_id
  returning card_count into new.serial;

  if new.serial is null then
    raise exception 'pack_not_found' using errcode = 'P0003';
  end if;

  return new;
end $$;

create trigger cards_assign_serial
before insert on cards
for each row execute function assign_card_serial();


-- Contribution-gated pack opening: adding yourself to the pool mints exactly one
-- unopened pack. Because pack_grants has no INSERT policy, this trigger is the
-- only way a grant can come into existence.
create function grant_pack_on_contribution() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into pack_grants (user_id, pack_id, reason, source_card_id)
  values (new.owner_id, new.pack_id, 'contribution', new.id);
  return new;
end $$;

create trigger cards_grant_pack
after insert on cards
for each row execute function grant_pack_on_contribution();
