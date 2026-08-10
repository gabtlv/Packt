-- Two card fronts (Sporty and Vintage) instead of one, and one question instead
-- of three.
--
-- Additive on purpose: nothing is dropped, so cards contributed before this
-- migration keep every word their owner wrote. But the five retired columns were
-- `not null` with no default, so their constraints have to come off — otherwise
-- the first insert from the new, shorter form fails on columns the form no longer
-- collects.

alter table cards
  -- Which front this card is printed on. Left unconstrained for the same reason
  -- border_variant and rarity are: the app owns the vocabulary, and a CHECK here
  -- would mean a migration every time a designer adds a style.
  add column if not exists card_design text not null default 'sporty',
  add column if not exists explanation text;

-- The one question the form now asks. Backfilled from fun_fact, which occupied
-- the same "one line in the contributor's own voice" slot, so existing cards read
-- sensibly on the new back rather than going blank.
update cards set explanation = fun_fact where explanation is null;

alter table cards alter column explanation set not null;

-- Retired. Preserved on existing rows, never written again.
alter table cards
  alter column fun_fact        drop not null,
  alter column prompt_1_key    drop not null,
  alter column prompt_1_answer drop not null,
  alter column prompt_2_key    drop not null,
  alter column prompt_2_answer drop not null;
