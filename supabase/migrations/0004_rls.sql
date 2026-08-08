-- Row Level Security.
--
-- The design principle here: the collection rules are enforced by the absence of
-- policies, not by application checks. `pulls` and `pack_grants` get no INSERT
-- policy at all, so the only way either row can be created is through the
-- security-definer functions in 0003/0002. A client holding the publishable key
-- cannot fabricate a pull, pull its own card, pull a duplicate, or open a pack it
-- did not earn — no matter what the frontend does.

alter table profiles    enable row level security;
alter table packs       enable row level security;
alter table cards       enable row level security;
alter table pulls       enable row level security;
alter table pack_grants enable row level security;

-- Public reads: the binder is a public artifact, so anonymous visitors can browse
-- it without signing in.
create policy profiles_read on profiles for select using (true);
create policy packs_read    on packs    for select using (true);
create policy cards_read    on cards    for select using (true);

-- Readable by everyone, which is what makes ?collector=<uuid> work — you can look
-- at what any member has collected.
create policy pulls_read    on pulls    for select using (true);

-- You may only insert a card about yourself. owner_id is set server-side from the
-- session, and this policy enforces it independently of the request body.
create policy cards_insert_own on cards for insert
  with check (owner_id = auth.uid());

create policy cards_update_own on cards for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Your unopened packs are yours to see. Deliberately no INSERT policy.
create policy grants_read_own on pack_grants for select
  using (user_id = auth.uid());
