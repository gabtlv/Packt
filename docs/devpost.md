# Card Binder — Devpost submission

Copy each section into the matching field on Devpost.

---

## Inspiration

Every hackathon starts the same way: 150 people who will spend a weekend three feet
apart and leave knowing four of them. Icebreakers don't fix it. A Slack channel of
introductions is a wall of text nobody scrolls, and a name tag tells you a name.

Trading cards solved this decades ago. You make one, you put it in the pool, and the
only way to see anyone else's is to open a pack. The scarcity *is* the mechanic. You
don't browse a directory of 150 strangers and message nobody — you get **one**, at
random, and that one person becomes someone you actually go find in the room.

## What it does

Card Binder turns a community into a trading card set.

1. **Make your card.** One screen: a photo, two prompts from a catalogue of eight, a
   fun fact, a link. The card assembles live beside the form as you type.
2. **Contributing earns you exactly one pack.** Not a feed, not a directory. One
   sealed pack.
3. **Open it.** A foil pack tears open on a dark stage and reveals one random card
   from the pool — never your own, never one you already hold.
4. **The binder.** Nine-pocket pages, ring holes punched down the margin, empty
   pockets left visible so the set visibly wants more people in it.

There is no private binder. Every card is public: "My Cards" is `?collector=me`, a
filter on the same public page, which is also how you view anyone else's collection.

## How we built it

Next.js 16 (App Router) · React 19 · Tailwind v4 on Vercel, with Supabase for
Postgres, Auth, Storage and Realtime.

The architectural bet: **the collection rules are database invariants, not
application checks.**

`pulls` and `pack_grants` have *no INSERT policy at all*. Nothing holding the
publishable key can write them — the only path is a `security definer` function. A
client cannot fabricate a pull, pull its own card, pull a duplicate, or open a pack
it never earned, regardless of what the frontend does.

| Rule | Where it lives |
| --- | --- |
| Contributing earns exactly one pack | trigger, same transaction as the insert |
| One card per person per pack | `unique (pack_id, owner_id)` |
| One pack consumed per opening | `UPDATE … FOR UPDATE SKIP LOCKED` |
| Never your own card, never a duplicate | excluded in `open_pack`'s `WHERE` |
| Dry pool refunds the pack | `consumed_at` reset before raising |
| Serials don't collide | counter bumped under a row lock |

The heart of it:

```sql
update pack_grants set consumed_at = now()
 where id = (
   select id from pack_grants
    where user_id = v_user and pack_id = p_pack_id and consumed_at is null
    order by created_at
      for update skip locked            -- a double-click can't spend one pack twice
    limit 1
 )
returning id into v_grant;

select c.* into v_card
  from cards c
 where c.pack_id  = p_pack_id
   and c.owner_id <> v_user             -- never your own card
   and not exists (                     -- never one you already hold
     select 1 from pulls p
      where p.user_id = v_user and p.card_id = c.id
   )
 order by random() limit 1;
```

Two things we're glad we did that way:

- `FOR UPDATE SKIP LOCKED` means two concurrent calls — a double-click, two tabs —
  can't claim the same grant. Exactly one wins.
- Ineligible cards are excluded in the `WHERE` rather than drawn-and-retried. A
  duplicate isn't unlikely, it's **unrepresentable**. No retry cap to tune and no
  unlucky-streak failure mode in a small pool.

Reads go through Server Components; only the two mutations are Route Handlers.
Business logic sits in framework-free modules under `lib/services/` that take a
Supabase client and plain arguments.

## Challenges we ran into

**The free tier is a design constraint, not a footnote.** Supabase gives 1 GB of
storage, and its server-side image resizing is Pro-only. Straight-from-the-phone
photos are 3–5 MB, which would cap an entire event at roughly 250 cards. So we
downscale *in the browser* before upload — a ~150 KB WebP for the card and a ~25 KB
thumbnail for the grid, via `createImageBitmap` + canvas. The same 1 GB now holds
about 5,700 cards.

That has a sharp edge we hit: `createImageBitmap(file, { imageOrientation: "from-image" })`.
Without that option, every phone photo carrying EXIF rotation gets drawn **sideways**
onto the card. And iPhone HEIC won't decode in some browsers at all, so that path
throws a typed error telling you to pick a JPEG rather than failing silently.

**No Docker meant no local Postgres.** Instead of guessing, we validated all six
migration files against Postgres's own parser (libpg_query via `pg-query-emscripten`),
which checks the three `plpgsql` bodies that the outer SQL grammar would otherwise
skip over as opaque strings.

**We cut the AI image step.** The original plan had a generative transformation. We
dropped it and made the *composition* carry that weight instead: the card frames your
photo in a keylined art window inside a coloured mat, lays a pointer-driven foil sheen
over it, tilts it in 3D, stamps a serial and set code, and flips to a printed back. A
photo in that frame is not the photo you uploaded — but the transformation is
typographic and material rather than generative. The seam for adding generation later
is a single file, `lib/services/cards.ts`, the one place a card row is created.

**A hydration error that wasn't ours.** LanguageTool's browser extension stamps
attributes onto `<html>` before React hydrates. It cost us more debugging than we'd
like to admit before we noticed the error message's own last line calling it.

## Accomplishments that we're proud of

- **Rules as invariants, not checks.** Six of them enforced by unique constraints,
  triggers and row locks. The frontend can be wrong and the data still can't be.
- **One route serves three views.** Whole pack, your lens, someone else's lens — same
  route, same component, same query. "Mine" is provably not a separate resource,
  which is what makes "no private binder" true rather than merely promised.
- **No service-role key anywhere.** Every write goes through RLS or a
  `security definer` function.
- **Zero WCAG 2.1 A/AA violations** from `axe-core` across all five screens.
- The nine-pocket page with empty pockets left visible. It argues "this gets better
  with more people" without a line of copy.

## What we learned

- Constraints beat validation. "Retry until you get a non-duplicate" and "exclude
  duplicates from the draw" sound equivalent — only one has no failure mode.
- Free-tier limits belong in the design phase. The 1 GB ceiling changed our upload
  architecture, not a config value.
- Merging create-card and contribute-to-pack into a single insert removed a whole
  class of half-failed demo states, and made "contributed but earned nothing"
  unreachable, because the grant trigger fires in the same transaction.
- Modelling the entitlement as a row (`pack_grants`) rather than deriving it from
  "has this person contributed?" is exactly what makes double-opening impossible via
  a conditional update on `consumed_at`.

## What's next for Card Binder

- **Exercise the invariants against live Postgres.** They're designed and they parse,
  but they aren't yet proven: no-grant open, double open, self-pull refund, concurrent
  opens, and direct `INSERT`s against `pulls` bouncing off RLS. Highest priority.
- **The generative step we cut**, slotted into `lib/services/cards.ts`.
- **Rarity that means something.** The column exists and everything is `common` today
  — earliest contributors as holos, that sort of thing.
- **Trading**, with two-sided consent. The constraint work is already the right shape.
- **A global binder** across communities, plus per-event set codes so one person can
  appear in several sets.

---

## Built with

```
next.js, react, typescript, supabase, postgresql, plpgsql, tailwind-css, vercel,
row-level-security, supabase-auth, supabase-storage, supabase-realtime,
google-oauth, zod, canvas-api, webp, server-components
```

## Try it out

- GitHub repo
- Live deployment (Vercel)
