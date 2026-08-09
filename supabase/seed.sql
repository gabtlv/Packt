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
insert into cards (
  pack_id, owner_id, photo_path, thumb_path, border_variant, display_name,
  school_or_work, favorite_media, social_label, social_url,
  prompt_1_key, prompt_1_answer, prompt_2_key, prompt_2_answer, fun_fact
)
select
  '11111111-1111-1111-1111-111111111111',
  c.owner_id,
  c.photo, c.photo, c.border, c.display_name,
  c.affiliation, c.media, c.social_label, c.social_url,
  c.p1k, c.p1a, c.p2k, c.p2a, c.fun_fact
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'seed/01.png', 'amber',  'Nova Ibarra',
   'UC Santa Cruz', 'Pachinko (the novel, not the machine)', 'github', 'https://github.com',
   'building', 'A transit app that only tells you when to run for the bus.',
   'snack', 'Cold brew and an alarming quantity of gummy bears.',
   'I have visited 38 US states but never been on a plane.'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'seed/02.png', 'cyan',   'Dai Okonkwo',
   'Interning at a robotics lab', 'Everything Everywhere All at Once', 'github', 'https://github.com',
   'first_code', 'A Neopets layout with far too many marquee tags.',
   'hot_take', 'Tabs. It is not close. Please stop emailing me.',
   'I can solve a Rubik''s cube one-handed but not two-handed.'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'seed/03.png', 'violet', 'Perri Lindqvist',
   'Georgia Tech', 'Kentucky Route Zero', 'website', 'https://example.com',
   'obsession', 'Generative embroidery patterns. My sewing machine is scared.',
   'weekend', 'Farmers market, then losing four hours to a bouldering gym.',
   'I once got a bug fix merged while asleep. Timezones did the work.'),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'seed/04.png', 'rose',   'Kes Ramanathan',
   'Northeastern', 'The Wind-Up Bird Chronicle', 'github', 'https://github.com',
   'superpower', 'Seeing which console.log actually ran.',
   'building', 'A CLI that shames me for unused dependencies.',
   'I make hot sauce and label each batch with a version number.'),
  ('a0000000-0000-4000-8000-000000000005'::uuid, 'seed/05.png', 'lime',   'Juno Baptiste',
   'McGill', 'Sailor Moon, unironically', 'website', 'https://example.com',
   'hometown', 'Montréal, where winter is a personality trait.',
   'obsession', 'Fermentation. There are eleven jars in my room.',
   'I taught myself to juggle during a four-hour build queue.'),
  ('a0000000-0000-4000-8000-000000000006'::uuid, 'seed/06.png', 'slate',  'Sable Ferreira',
   'Freelancing / open source', 'Blade Runner 2049', 'github', 'https://github.com',
   'hot_take', 'Most dashboards would be better as a single number.',
   'snack', 'Rice, egg, chilli oil. Unbeatable at 3am.',
   'My first paid gig was fixing a bakery''s website in exchange for bread.'),
  ('a0000000-0000-4000-8000-000000000007'::uuid, 'seed/07.png', 'amber',  'Orin Vasquez',
   'Arizona State', 'Dune (the 1984 one, fight me)', 'website', 'https://example.com',
   'first_code', 'A TI-83 program that did my algebra homework badly.',
   'superpower', 'Instantly knowing which dependency broke the build.',
   'I have a houseplant older than my laptop and I love it more.'),
  ('a0000000-0000-4000-8000-000000000008'::uuid, 'seed/08.png', 'cyan',   'Thea O''Malley',
   'Trinity College Dublin', 'Normal People', 'github', 'https://github.com',
   'weekend', 'Sea swim, then a very long breakfast.',
   'building', 'A tool that turns lecture recordings into flashcards.',
   'I once ran a half marathon by accident. I got lost.'),
  ('a0000000-0000-4000-8000-000000000009'::uuid, 'seed/09.png', 'violet', 'Rye Castellano',
   'Working at a tiny games studio', 'Outer Wilds', 'website', 'https://example.com',
   'obsession', 'Procedural music. My neighbours are patient.',
   'hot_take', 'Every game needs a photo mode, including spreadsheets.',
   'I have shipped a game where the only enemy was a very slow duck.'),
  ('a0000000-0000-4000-8000-000000000010'::uuid, 'seed/10.png', 'rose',   'Lumen Adeyemi',
   'University of Lagos', 'Afrobeats and podcasts, simultaneously', 'github', 'https://github.com',
   'building', 'Offline-first notes for places with patchy signal.',
   'hometown', 'Lagos. The traffic taught me patience and async.',
   'I can identify a phone model by its camera shutter sound.'),
  ('a0000000-0000-4000-8000-000000000011'::uuid, 'seed/11.png', 'lime',   'Vero Sandoval',
   'UT Austin', 'Severance', 'website', 'https://example.com',
   'superpower', 'Reproducing the bug on the first try.',
   'snack', 'Breakfast tacos. Non negotiable. Any hour.',
   'I keep a spreadsheet ranking every taco I have eaten since 2021.'),
  ('a0000000-0000-4000-8000-000000000012'::uuid, 'seed/12.png', 'slate',  'Ash Nakamura',
   'Waterloo', 'Ghost in the Shell', 'github', 'https://github.com',
   'first_code', 'A Minecraft mod that replaced all sheep with cubes.',
   'weekend', 'Film camera, long walk, no destination.',
   'I develop my own film in a bathroom that is technically a closet.')
) as c(owner_id, photo, border, display_name, affiliation, media,
       social_label, social_url, p1k, p1a, p2k, p2a, fun_fact)
where not exists (
  select 1 from cards
   where pack_id = '11111111-1111-1111-1111-111111111111'
     and owner_id = c.owner_id
);

-- Seeds don't get to open packs, so drop the grants their contributions minted.
delete from pack_grants
 where pack_id = '11111111-1111-1111-1111-111111111111'
   and user_id in (select id from auth.users where raw_app_meta_data->>'provider' = 'seed');
