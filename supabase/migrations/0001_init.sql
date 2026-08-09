-- Card Binder core schema.
--
-- Shape of the domain: a `pack` is a themed community pool (e.g. Packt).
-- A `card` is one member's self-contribution to exactly one pack. Contributing
-- mints a `pack_grant` (an unopened pack), and consuming a grant produces a
-- `pull` (a card that member now holds). There is no private binder anywhere in
-- here: `cards` and `pulls` are world-readable, and "my cards" is a filter.

create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_url   text,                  -- Google avatar, used as the card back's contact photo
  created_at   timestamptz not null default now()
);

create table packs (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  description text,
  accent      text not null default '#f59e0b',
  -- Doubles as the per-pack serial counter. Bumping it takes a row lock on the
  -- pack, which is what serializes serial assignment under concurrent inserts.
  card_count  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table cards (
  id              uuid primary key default gen_random_uuid(),
  pack_id         uuid not null references packs on delete cascade,
  owner_id        uuid not null references profiles on delete cascade,
  serial          int  not null,

  -- front
  photo_path      text not null,       -- storage path, ~1200px webp
  thumb_path      text not null,       -- storage path, ~400px webp
  border_variant  text not null default 'amber',
  rarity          text not null default 'common',

  -- back
  display_name    text not null,
  school_or_work  text,
  favorite_media  text,
  social_label    text,
  social_url      text,
  prompt_1_key    text not null,
  prompt_1_answer text not null,
  prompt_2_key    text not null,
  prompt_2_answer text not null,
  fun_fact        text not null,

  created_at      timestamptz not null default now(),

  -- One contribution per person per pack. This is also what stops a member from
  -- farming extra pack openings by contributing repeatedly.
  unique (pack_id, owner_id),
  unique (pack_id, serial)
);

-- An unopened pack. Modelling the entitlement as a row (rather than deriving it
-- from "has contributed?") makes it auditable and makes double-opening
-- impossible via a conditional update on consumed_at.
create table pack_grants (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles on delete cascade,
  pack_id        uuid not null references packs on delete cascade,
  reason         text not null default 'contribution',
  source_card_id uuid references cards on delete set null,
  consumed_at    timestamptz,          -- null = still unopened
  created_at     timestamptz not null default now()
);

create table pulls (
  id         uuid primary key default gen_random_uuid(),
  pack_id    uuid not null references packs on delete cascade,
  user_id    uuid not null references profiles on delete cascade,
  card_id    uuid not null references cards on delete cascade,
  created_at timestamptz not null default now(),
  -- Backstop for duplicate prevention. open_pack() already excludes cards the
  -- member holds, so this should never fire; it exists so that no future code
  -- path can create a duplicate either.
  unique (user_id, card_id)
);

create index cards_pack_serial_idx on cards (pack_id, serial);
create index pulls_user_card_idx   on pulls (user_id, card_id);
create index pulls_card_idx        on pulls (card_id);
create index grants_unopened_idx   on pack_grants (user_id, pack_id) where consumed_at is null;
