-- Profiles are created by handle_new_user on auth.users insert. Anyone who signed
-- in before that trigger was applied has a session but no profiles row, which
-- then fails cards_owner_id_fkey on contribute. Backfill those rows, and expose
-- ensure_my_profile() so the app can heal the gap on the next signed-in request.

insert into public.profiles (id, display_name, avatar_url)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data->>'full_name', ''),
    nullif(u.raw_user_meta_data->>'name', ''),
    split_part(u.email, '@', 1),
    'Anonymous'
  ),
  u.raw_user_meta_data->>'avatar_url'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

create function ensure_my_profile()
returns profiles
language plpgsql security definer set search_path = public as $$
declare
  v_user auth.users%rowtype;
  v_profile profiles;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_profile from profiles where id = auth.uid();
  if found then
    return v_profile;
  end if;

  select * into v_user from auth.users where id = auth.uid();

  insert into profiles (id, display_name, avatar_url)
  values (
    v_user.id,
    coalesce(
      nullif(v_user.raw_user_meta_data->>'full_name', ''),
      nullif(v_user.raw_user_meta_data->>'name', ''),
      split_part(v_user.email, '@', 1),
      'Anonymous'
    ),
    v_user.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set display_name = excluded.display_name
  returning * into v_profile;

  return v_profile;
end $$;

revoke all on function ensure_my_profile() from public;
grant execute on function ensure_my_profile() to authenticated;
