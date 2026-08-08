import Link from "next/link";

import { SiteHeader } from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/server";
import { listPacks } from "@/lib/services/packs";

/** Every community's binder, browsable by anyone. */
export default async function PacksRoute() {
  const supabase = await createClient();
  const packs = await listPacks(supabase);

  return (
    <>
      <SiteHeader next="/packs" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
        <p className="label text-ink-soft">Browse</p>
        <h1 className="display mb-8 text-4xl">Every set</h1>

        {packs.length === 0 ? (
          <p className="text-ink-soft">
            No sets yet. Run the seed to create the SummerHacks set.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {packs.map((pack) => (
              <li key={pack.id}>
                <Link
                  href={`/packs/${pack.slug}`}
                  className="block rounded-lg border border-sleeve-edge bg-white p-5 no-underline transition-colors hover:border-ink"
                  style={{ borderTopColor: pack.accent, borderTopWidth: 3 }}
                >
                  <h2 className="display text-2xl">{pack.name}</h2>
                  {pack.description ? (
                    <p className="mt-1 text-sm text-ink-soft">{pack.description}</p>
                  ) : null}
                  <p className="label mt-3 text-ink-soft">
                    {pack.card_count} card{pack.card_count === 1 ? "" : "s"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
