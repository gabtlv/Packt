-- Invariant tests for the collection rules.
--
-- These are the checks that cannot be run without a live Postgres. Run them against a
-- database that has the migrations applied and the seed loaded:
--
--   psql "<your connection string>" -f supabase/tests/invariants.sql
--
-- Everything happens inside a transaction that is rolled back at the end, so it is
-- safe to run against the project you are demoing (it leaves no rows behind).
--
-- Each check raises an exception on failure, so the first broken invariant aborts the
-- run with a clear message. Success prints one NOTICE per check.

begin;

do $$
declare
  v_pack   uuid;
  v_alice  uuid := 'aaaaaaaa-0000-4000-8000-00000000a11c';
  v_bob    uuid := 'bbbbbbbb-0000-4000-8000-00000000b0b0';
  v_card_a uuid;
  v_card_b uuid;
  v_pulled cards;
  v_count  int;
  v_grant  uuid;
begin
  -- A private pack so these checks can't collide with the seeded set.
  insert into packs (slug, name) values ('test-invariants', 'Test Set')
  returning id into v_pack;

  insert into profiles (id, display_name) values
    (v_alice, 'Alice Test'), (v_bob, 'Bob Test');

  -- Impersonate Alice the way PostgREST does, so auth.uid() resolves.
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_alice, 'role', 'authenticated')::text,
                     true);

  ------------------------------------------------------------------ 1
  -- Opening with no grant fails, and writes no pull.
  begin
    perform open_pack(v_pack);
    raise exception 'FAIL 1: open_pack succeeded with no grant';
  exception when sqlstate 'P0001' then
    null; -- expected: no_unopened_pack
  end;

  select count(*) into v_count from pulls where user_id = v_alice;
  if v_count <> 0 then raise exception 'FAIL 1: a pull was recorded without a grant'; end if;
  raise notice 'PASS 1  opening without a grant is refused and records nothing';

  ------------------------------------------------------------------ 2
  -- Contributing mints exactly one grant.
  insert into cards (
    pack_id, owner_id, photo_path, thumb_path, display_name,
    prompt_1_key, prompt_1_answer, prompt_2_key, prompt_2_answer, fun_fact
  ) values (
    v_pack, v_alice, 'seed/01.png', 'seed/01.png', 'Alice Test',
    'building', 'a', 'snack', 'b', 'c'
  ) returning id into v_card_a;

  select count(*) into v_count
    from pack_grants where user_id = v_alice and pack_id = v_pack and consumed_at is null;
  if v_count <> 1 then
    raise exception 'FAIL 2: contributing minted % grants, expected 1', v_count;
  end if;
  raise notice 'PASS 2  contributing mints exactly one unopened pack';

  ------------------------------------------------------------------ 3
  -- A second contribution to the same pack is rejected (no grant farming).
  begin
    insert into cards (
      pack_id, owner_id, photo_path, thumb_path, display_name,
      prompt_1_key, prompt_1_answer, prompt_2_key, prompt_2_answer, fun_fact
    ) values (
      v_pack, v_alice, 'seed/02.png', 'seed/02.png', 'Alice Again',
      'building', 'a', 'snack', 'b', 'c'
    );
    raise exception 'FAIL 3: a second contribution to the same pack was allowed';
  exception when unique_violation then
    null; -- expected
  end;
  raise notice 'PASS 3  one card per person per pack';

  ------------------------------------------------------------------ 4
  -- Alice is the only card in the pool, so there is nothing she may pull.
  -- The pool is dry AND her grant must be refunded, not burnt.
  begin
    perform open_pack(v_pack);
    raise exception 'FAIL 4: Alice pulled a card from a pool containing only her own';
  exception when sqlstate 'P0002' then
    null; -- expected: pool_exhausted
  end;

  select count(*) into v_count
    from pack_grants where user_id = v_alice and pack_id = v_pack and consumed_at is null;
  if v_count <> 1 then
    raise exception 'FAIL 4: grant was not refunded after pool_exhausted (% unopened)', v_count;
  end if;
  raise notice 'PASS 4  no self-pull, and an exhausted pool refunds the pack';

  ------------------------------------------------------------------ 5
  -- Bob joins. Now Alice has exactly one eligible card.
  insert into cards (
    pack_id, owner_id, photo_path, thumb_path, display_name,
    prompt_1_key, prompt_1_answer, prompt_2_key, prompt_2_answer, fun_fact
  ) values (
    v_pack, v_bob, 'seed/03.png', 'seed/03.png', 'Bob Test',
    'building', 'a', 'snack', 'b', 'c'
  ) returning id into v_card_b;

  v_pulled := open_pack(v_pack);
  if v_pulled.id <> v_card_b then
    raise exception 'FAIL 5: expected to pull Bob''s card, got %', v_pulled.id;
  end if;
  raise notice 'PASS 5  a pull returns an eligible card';

  ------------------------------------------------------------------ 6
  -- The grant is spent, so a second open fails.
  begin
    perform open_pack(v_pack);
    raise exception 'FAIL 6: opened a second pack on one grant';
  exception when sqlstate 'P0001' then
    null; -- expected
  end;

  select count(*) into v_count from pulls where user_id = v_alice and pack_id = v_pack;
  if v_count <> 1 then
    raise exception 'FAIL 6: expected exactly 1 pull, found %', v_count;
  end if;
  raise notice 'PASS 6  one grant buys exactly one pull';

  ------------------------------------------------------------------ 7
  -- Given another grant, Bob's card is now ineligible (already held), so the pool
  -- reads as exhausted rather than handing over a duplicate.
  insert into pack_grants (user_id, pack_id, reason) values (v_alice, v_pack, 'test')
  returning id into v_grant;

  begin
    perform open_pack(v_pack);
    raise exception 'FAIL 7: pulled a duplicate of a card already held';
  exception when sqlstate 'P0002' then
    null; -- expected
  end;
  raise notice 'PASS 7  a card already held is never drawn again';

  ------------------------------------------------------------------ 8
  -- Serials are distinct and sequential within the pack.
  select count(distinct serial) into v_count from cards where pack_id = v_pack;
  if v_count <> 2 then
    raise exception 'FAIL 8: expected 2 distinct serials, found %', v_count;
  end if;
  raise notice 'PASS 8  serials are unique within a pack';

  ------------------------------------------------------------------ 9
  -- binder_cards: Alice contributed her own and pulled Bob's, so her lens is both.
  select count(*) into v_count from binder_cards(v_pack, v_alice);
  if v_count <> 2 then
    raise exception 'FAIL 9: Alice''s lens showed % cards, expected 2', v_count;
  end if;

  -- Bob contributed one and has pulled nothing.
  select count(*) into v_count from binder_cards(v_pack, v_bob);
  if v_count <> 1 then
    raise exception 'FAIL 9: Bob''s lens showed % cards, expected 1', v_count;
  end if;

  -- Unfiltered shows the whole pack.
  select count(*) into v_count from binder_cards(v_pack, null);
  if v_count <> 2 then
    raise exception 'FAIL 9: the unfiltered binder showed %, expected 2', v_count;
  end if;
  raise notice 'PASS 9  binder_cards returns contributed + pulled, and nothing else';

  raise notice '--- all invariants hold ---';
end $$;

rollback;

-- ---------------------------------------------------------------------------
-- Two checks that cannot run in this script, and how to run them:
--
-- CONCURRENCY. With exactly one unopened grant, fire two open_pack calls at the
-- same instant; exactly one must succeed. Needs two sessions, so it cannot live in
-- a single transaction. Either open two psql sessions and run open_pack together,
-- or from the app:
--
--   await Promise.all([
--     fetch('/api/packs/summerhacks/open', { method: 'POST' }),
--     fetch('/api/packs/summerhacks/open', { method: 'POST' }),
--   ])
--
-- Expect one 200 and one 403 (no_unopened_pack), and exactly one new row in pulls.
--
-- RLS. As a signed-in member, confirm the client cannot forge a collection. From
-- the browser console on the running app:
--
--   const s = window.supabase ?? null   // or construct a client with the publishable key
--   await s.from('pulls').insert({ pack_id: '<pack>', user_id: '<you>', card_id: '<any>' })
--   await s.from('pack_grants').insert({ user_id: '<you>', pack_id: '<pack>', reason: 'x' })
--
-- Both must fail with a row-level-security error: neither table has an INSERT policy,
-- so only the security-definer functions can write them.
-- ---------------------------------------------------------------------------
