-- Devs create event binders. Allowlisted emails may call create_pack(); everyone
-- else can still only read packs. No INSERT policy on packs — the RPC is the
-- sole write path, matching how pack_grants / pulls are gated.

create table admin_emails (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint admin_emails_lowercase check (email = lower(email))
);

alter table admin_emails enable row level security;
-- No policies: only security-definer functions read this table.

create function is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admin_emails
     where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function is_admin() from public;
grant execute on function is_admin() to authenticated;

create function create_pack(
  p_slug text,
  p_name text,
  p_description text default null,
  p_accent text default '#f59e0b'
)
returns packs
language plpgsql security definer set search_path = public as $$
declare
  v_pack packs;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  if p_slug is null or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'invalid_slug' using errcode = '22023';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;

  if p_accent is null or p_accent !~ '^#[0-9a-fA-F]{6}$' then
    raise exception 'invalid_accent' using errcode = '22023';
  end if;

  insert into packs (slug, name, description, accent)
  values (
    p_slug,
    trim(p_name),
    nullif(trim(p_description), ''),
    lower(p_accent)
  )
  returning * into v_pack;

  return v_pack;
exception
  when unique_violation then
    raise exception 'slug_taken' using errcode = '23505';
end $$;

revoke all on function create_pack(text, text, text, text) from public;
grant execute on function create_pack(text, text, text, text) to authenticated;
