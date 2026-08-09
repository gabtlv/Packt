import { Bookshelf } from "@/components/bookshelf/Bookshelf";
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

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
        <p className="label text-ink-soft">Browse</p>
        <h1 className="display mt-2 text-4xl sm:text-5xl">The bookshelf</h1>
        <p className="mt-3 max-w-lg text-ink-soft">
          Hover a binder to pull it forward. Click to take it off the shelf and
          open it.
        </p>

        {packs.length === 0 ? (
          <p className="mt-10 text-ink-soft">
            No binders yet. Run the seed to create the Packt set.
          </p>
        ) : (
          <div className="mt-12">
            <Bookshelf packs={packs} />
          </div>
        )}
      </main>
    </>
  );
}
