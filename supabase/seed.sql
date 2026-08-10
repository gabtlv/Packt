-- Seeds the Packt pack with staff cards.
--
-- Why this matters: the PRD's highest-likelihood risk is "small pool size early on
-- limits pack-opening variety". More urgently, without seeds the very first pack
-- opened at a live demo would hit `pool_exhausted` — the only eligible cards would
-- be the demoer's own. Twelve seeds make the first pull always work.
--
-- Seed members are real auth.users rows (with no usable password — nobody signs in
-- as them). Inserting them fires handle_new_user, so their `profiles` rows and
-- display names/avatars are created by the same code path as real sign-ins.
--
-- Idempotent: safe to run more than once. The pack's display name is written on
-- every run, so a rename here reaches a database that has already been seeded —
-- which also means the name below, not the row, is the source of truth for it.
-- The slug is the pack's identity and never moves; routes are built from it.

insert into packs (id, slug, name, description, accent)
values (
  '11111111-1111-1111-1111-111111111111',
  'summerhacks',
  'Packt',
  'The summer cohort. Add your card to the pool, then open a pack and meet someone.',
  '#f59e0b'
)
on conflict (slug) do update set name = excluded.name;

-- Seed members. raw_user_meta_data is what handle_new_user reads for the display
-- name and avatar, so it is populated exactly as Google would.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
select
  '00000000-0000-0000-0000-000000000000',
  s.id,
  'authenticated',
  'authenticated',
  s.email,
  '$2a$10$SEEDONLYNOLOGINPOSSIBLE0000000000000000000000000000000000',
  now(), now(), now(),
  '{"provider":"seed","providers":["seed"]}'::jsonb,
  jsonb_build_object('full_name', s.display_name)
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'nova@seed.summerhacks.test',  'Nova Ibarra'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'dai@seed.summerhacks.test',   'Dai Okonkwo'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'perri@seed.summerhacks.test', 'Perri Lindqvist'),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'kes@seed.summerhacks.test',   'Kes Ramanathan'),
  ('a0000000-0000-4000-8000-000000000005'::uuid, 'juno@seed.summerhacks.test',  'Juno Baptiste'),
  ('a0000000-0000-4000-8000-000000000006'::uuid, 'sable@seed.summerhacks.test', 'Sable Ferreira'),
  ('a0000000-0000-4000-8000-000000000007'::uuid, 'orin@seed.summerhacks.test',  'Orin Vasquez'),
  ('a0000000-0000-4000-8000-000000000008'::uuid, 'thea@seed.summerhacks.test',  'Thea O''Malley'),
  ('a0000000-0000-4000-8000-000000000009'::uuid, 'rye@seed.summerhacks.test',   'Rye Castellano'),
  ('a0000000-0000-4000-8000-000000000010'::uuid, 'lumen@seed.summerhacks.test', 'Lumen Adeyemi'),
  ('a0000000-0000-4000-8000-000000000011'::uuid, 'vero@seed.summerhacks.test',  'Vero Sandoval'),
  ('a0000000-0000-4000-8000-000000000012'::uuid, 'ash@seed.summerhacks.test',   'Ash Nakamura')
) as s(id, email, display_name)
on conflict (id) do nothing;

-- Their cards. photo_path values starting with `seed/` are resolved by
-- resolvePhotoUrl() to files in public/ rather than Supabase Storage, so seeds need
-- no upload step. Serials are assigned by the assign_card_serial trigger.
-- Designs alternate so a freshly seeded binder shows both fronts side by side
-- rather than nine of the same one.
insert into cards (
  pack_id, owner_id, photo_path, thumb_path, border_variant, card_design,
  display_name, school_or_work, explanation,
  favorite_media, social_label, social_url
)
select
  '11111111-1111-1111-1111-111111111111',
  c.owner_id,
  c.photo, c.photo, c.border, c.design,
  c.display_name, c.location, c.explanation,
  c.media, c.social_label, c.social_url
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'seed/01.png', 'amber',  'sporty',  'Nova Ibarra',
   'Santa Cruz, CA',
   'Shot from the bus I was about to miss. I have never once caught it on the first try.',
   'Pachinko (the novel, not the machine)', 'github', 'https://github.com'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'seed/02.png', 'cyan',   'vintage', 'Dai Okonkwo',
   'Lagos, Nigeria',
   'The robotics lab at 2am, which is the only hour it is ever quiet enough to think.',
   'Everything Everywhere All at Once', 'github', 'https://github.com'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'seed/03.png', 'violet', 'sporty',  'Perri Lindqvist',
   'Atlanta, GA',
   'A pattern my sewing machine generated on its own. I have decided that counts as art.',
   'Kentucky Route Zero', 'website', 'https://example.com'),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'seed/04.png', 'rose',   'vintage', 'Kes Ramanathan',
   'Boston, MA',
   'Batch seventeen of my hot sauce. The label is a version number because of course it is.',
   'The Wind-Up Bird Chronicle', 'github', 'https://github.com'),
  ('a0000000-0000-4000-8000-000000000005'::uuid, 'seed/05.png', 'lime',   'sporty',  'Juno Baptiste',
   'Montréal, QC',
   'Eleven fermentation jars on one windowsill. My roommates have stopped asking about them.',
   'Sailor Moon, unironically', 'website', 'https://example.com'),
  ('a0000000-0000-4000-8000-000000000006'::uuid, 'seed/06.png', 'slate',  'vintage', 'Sable Ferreira',
   'Lisbon, Portugal',
   'The bakery whose website I fixed for bread. Still the best rate I have ever been paid.',
   'Blade Runner 2049', 'github', 'https://github.com'),
  ('a0000000-0000-4000-8000-000000000007'::uuid, 'seed/07.png', 'amber',  'sporty',  'Orin Vasquez',
   'Tempe, AZ',
   'My houseplant, who is older than my laptop and considerably better looked after.',
   'Dune (the 1984 one, fight me)', 'website', 'https://example.com'),
  ('a0000000-0000-4000-8000-000000000008'::uuid, 'seed/08.png', 'cyan',   'vintage', 'Thea O''Malley',
   'Dublin, Ireland',
   'Taken on the sea swim I do every Saturday, about four seconds before I lost the nerve.',
   'Normal People', 'github', 'https://github.com'),
  ('a0000000-0000-4000-8000-000000000009'::uuid, 'seed/09.png', 'violet', 'sporty',  'Rye Castellano',
   'Wellington, NZ',
   'The very slow duck from the only game I have shipped. It was also the only enemy.',
   'Outer Wilds', 'website', 'https://example.com'),
  ('a0000000-0000-4000-8000-000000000010'::uuid, 'seed/10.png', 'rose',   'vintage', 'Lumen Adeyemi',
   'Lagos, Nigeria',
   'Lagos traffic, where I learned patience and, eventually, why async exists.',
   'Afrobeats and podcasts, simultaneously', 'github', 'https://github.com'),
  ('a0000000-0000-4000-8000-000000000011'::uuid, 'seed/11.png', 'lime',   'sporty',  'Vero Sandoval',
   'Austin, TX',
   'Entry 412 in my breakfast taco spreadsheet. It scored a nine and I stand by that.',
   'Severance', 'website', 'https://example.com'),
  ('a0000000-0000-4000-8000-000000000012'::uuid, 'seed/12.png', 'slate',  'vintage', 'Ash Nakamura',
   'Waterloo, ON',
   'Developed in a bathroom that is technically a closet. The light leak was not on purpose.',
   'Ghost in the Shell', 'github', 'https://github.com')
) as c(owner_id, photo, border, design, display_name, location, explanation,
       media, social_label, social_url)
where not exists (
  select 1 from cards
   where pack_id = '11111111-1111-1111-1111-111111111111'
     and owner_id = c.owner_id
);

-- Seeds don't get to open packs, so drop the grants their contributions minted.
delete from pack_grants
 where pack_id = '11111111-1111-1111-1111-111111111111'
   and user_id in (select id from auth.users where raw_app_meta_data->>'provider' = 'seed');
