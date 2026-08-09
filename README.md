# Card Binder

Make a trading card about yourself, add it to your community's shared binder, and
earn one pack to open — pulling a random card of someone else in the pool.

Every card is public. There is no private binder: "your cards" is a filter on the
same shared page (`?collector=me`), which is also how you view anyone else's
(`?collector=<user-id>`).

## Stack

Next.js 16 (App Router, Route Handlers) · React 19 · Tailwind v4 · Supabase
(Postgres, Auth, Storage, Realtime) · deployed on Vercel.

No FastAPI service and no AI image step — see `docs/decisions.md` for why.

## Setup

### 1. Supabase project

Create a project at [supabase.com](https://supabase.com), then:

- **Auth → Sign In / Providers → Google**: enable it, paste your Google OAuth client
  ID and secret.
- **Auth → URL Configuration → Redirect URLs**: add
  `http://localhost:3000/auth/callback` and your deployed
  `https://<your-app>/auth/callback`.
- In the Google Cloud console, add the same two URLs as authorised redirect URIs, plus
  `https://<project-ref>.supabase.co/auth/v1/callback`.

### 2. Environment

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from
**Project Settings → API Keys**. No service-role key is needed anywhere — every write
goes through RLS or a `security definer` function.

### 3. Database

Local Supabase needs Docker. If you don't have it, push straight to the hosted
project (this needs no Docker):

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push                       # applies supabase/migrations/*.sql
```

Then seed twelve staff cards so the first pack anyone opens isn't empty. Paste
`supabase/seed.sql` into the SQL editor, or:

```bash
psql "$(npx supabase status -o json | jq -r .DB_URL)" -f supabase/seed.sql
```

Regenerate the hand-written types whenever the schema changes:

```bash
npx supabase gen types typescript --linked > lib/database.types.ts
```

### 4. Run

```bash
npm install
npm run dev
```

## How the rules are enforced

The collection rules are database invariants, not application checks. `pulls` and
`pack_grants` have **no INSERT policy at all**, so the only thing that can write them
is a `security definer` function. A client holding the publishable key cannot
fabricate a pull, pull its own card, pull a duplicate, or open a pack it didn't earn —
regardless of what the frontend does.

| Rule | Where it lives |
| --- | --- |
| Contributing earns exactly one pack | `grant_pack_on_contribution` trigger, same transaction as the insert |
| At most five cards per person per pack | `enforce_cards_per_pack_limit` trigger — each card still mints one pack |
| One pack consumed per opening | `UPDATE … FOR UPDATE SKIP LOCKED` in `open_pack` |
| Never your own card, never a duplicate | excluded in `open_pack`'s `WHERE`, so it's unrepresentable rather than retried |
| Duplicate backstop | `unique (user_id, card_id)` on `pulls` |
| Dry pool refunds the pack | `open_pack` resets `consumed_at` before raising `pool_exhausted` |
| Serials don't collide | `assign_card_serial` bumps a counter on `packs`, taking a row lock |

## Free-tier limits that shape the design

Supabase's free plan gives **1 GB storage** and **5 GB egress**, and its server-side
image resizing is Pro-only. So photos are downscaled **in the browser** to a ~150 KB
WebP plus a ~25 KB thumbnail (`lib/images.ts`). Uploading originals would cap an entire
event at roughly 250 cards; downscaling raises it to ~5,700. Card images are served
through `next/image` so repeat binder views hit Vercel's CDN rather than Supabase's
egress.

Realtime is included free (200 peak connections, 2M messages/month). Messages are
counted per listening client, so 150 viewers × 200 contributions is ~30,000 — well
inside the quota. Connections are the ceiling: set `NEXT_PUBLIC_REALTIME=0` to fall
back to a 5s poll if you expect more than ~200 simultaneous viewers.

## Before a live event

- Free Supabase projects **pause after a week idle** — wake it in advance.
- Vercel Hobby **can't connect to a repo owned by a GitHub organisation**; use a
  personal repo or a Vercel team.
- Check the Storage dashboard after a test upload: derivatives should be ~150 KB and
  ~25 KB. If they're megabytes, the browser-side downscale fell through.

## Layout

```
app/
  page.tsx                     landing — three live cards as the hero
  packs/page.tsx               every set
  packs/[slug]/page.tsx        THE BINDER — ?collector=me|<uuid>, 9 pockets a page
  packs/[slug]/contribute/     one screen with a live card preview
  packs/[slug]/open/           the pack-opening ceremony (the one dark surface)
  api/packs/[slug]/cards       POST — create + contribute in one transaction
  api/packs/[slug]/open        POST — open_pack RPC
lib/services/                  cards · packs · draw · binder (framework-free)
components/card/               the layered card: frame, foil, tilt, flip
supabase/migrations/           schema, triggers, functions, RLS, storage, realtime
scripts/generate-seed-images.mjs  regenerates public/seed/*.png
```

Reads go through Server Components; only the two mutations are Route Handlers.
