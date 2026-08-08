# Decisions and deviations from the PRD

Recorded so the reasoning survives the hackathon.

## Stack decisions

**No FastAPI.** The PRD lists FastAPI alongside Next.js on Vercel. That means a second
service to host, CORS, and verifying Supabase JWTs in Python. The PRD's "services"
became framework-free modules under `lib/services/` called by Route Handlers instead.
`draw.ts`, `binder.ts`, `cards.ts` and `packs.ts` take a Supabase client and plain
arguments, so lifting them into a Python service later is mechanical rather than a
rewrite.

**No Gemini / no AI image step.** Decided for the MVP: photos are uploaded and used
untransformed.

This means **PRD success metric #2 is not met as written** — "a non-trivial
transformation… clearly distinguishable from a plain uploaded photo". What carries it
instead is the card *composition*: `components/card/` frames the photo in a keylined
art window inside a coloured mat, lays a pointer-driven foil sheen over it, tilts it in
3D, prints a serial and set name, and flips to a back with a printed emblem. A photo
in that frame is not the photo you uploaded, but the transformation is typographic and
material rather than generative.

The seam for adding generation later is `lib/services/cards.ts`: it is the single place
a card row is created, so a step deriving extra columns from `photo_path` slots in
without touching routes or schema.

## Product-shape decisions

**`POST /cards` and `POST /packs/:id/contribute` are merged** into
`POST /api/packs/[slug]/cards`. A card has no meaning outside a pack, and a two-phase
create-then-contribute flow can half-fail mid-demo and leave orphaned cards. One insert
also means the trigger minting the pack grant fires in the same transaction, so
"contributed but earned nothing" is unreachable.

**`POST /cards/:id/transform` is dropped**, since there is no AI step.

**"Retry on duplicate pull" is replaced by "exclude ineligible cards from the draw."**
The PRD proposes drawing, detecting a duplicate, retrying, and capping the retries.
`open_pack` instead filters out your own card and anything you already hold in the
`WHERE` clause. A duplicate isn't unlikely — it's unrepresentable. This removes the PRD
risk *"duplicate-prevention logic causing repeated retries in small pools"* rather than
mitigating it, and there is no retry cap to tune.

**One binder route serves three views.** The PRD asks for both a "My Cards" filter and
"view other users' binders" while forbidding a private binder. These collapse into one
query parameter on the single public route: no `collector` shows the whole pack,
`?collector=me` is your lens, `?collector=<uuid>` is someone else's. Same route, same
component, same `binder_cards()` function — so "mine" is provably not a separate
resource.

**The contribute flow is one screen, not a wizard.** The plan sketched five step
components. The PRD's target is a card contributed in under sixty seconds, and a single
short form beside a live card preview beats stepping through five panels — you watch
the card assemble as you type.

**The global binder is not built.** The PRD lists it under nice-to-haves. `/packs`
covers the must-have "view other communities' binders".

## Design direction

The signature is the **nine-pocket binder page**: ring holes punched down the left
margin, welded seams between pockets, and **empty pockets left visible**. The empty
pockets make the PRD's "it gets better with more people" argument visually instead of
stating it.

The palette is warm card stock, binder navy and PVC-sleeve grey — deliberately not the
dark-mode-plus-neon look collectible apps default to. Photographs of people read better
on cream, and it reserves darkness for the single moment that should feel theatrical:
`.stage`, the pack-opening surface.

Type is Archivo (display, heavy and tight, set-logo energy), Newsreader (card-back
flavour text, as printed cards have always used), Space Mono (serials and set codes,
stamped rather than typeset).

## Verification notes

Without Docker there is no local Postgres, so the migrations were validated with
Postgres's own parser (libpg_query via `pg-query-emscripten`) — all six files parse,
including the three `plpgsql` bodies, which the outer SQL grammar treats as opaque
strings and would otherwise skip.

The UI was verified against a small mock of the Supabase REST endpoints, which is how
two real bugs were caught: `next/image` receiving an empty `src` in the contribute
preview before a photo is chosen, and `.btn` rendering ink-on-ink (invisible) against
the dark pack-opening stage.

`axe-core` reports no WCAG 2.1 A/AA violations on the landing page, binder, pack index,
contribute form and pack-opening surface. Amber (`--color-sun`) is 1.8:1 on stock and
can never carry text; `--color-sun-ink` exists for that.

**Still unverified: every database invariant.** They need a live Postgres. The tests to
run are listed in the plan's verification section — no-grant open, double open,
self-pull refund, duplicate prevention, concurrent opens, and direct `INSERT` attempts
against `pulls`/`pack_grants` being rejected by RLS.
