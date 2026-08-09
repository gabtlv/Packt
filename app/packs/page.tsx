import Link from "next/link";

import { Bookshelf } from "@/components/bookshelf/Bookshelf";
import { SiteHeader } from "@/components/SiteHeader";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { listPacks } from "@/lib/services/packs";

/** Every community's binder, browsable by anyone. */
export default async function PacksRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [packs, admin] = await Promise.all([
    listPacks(supabase),
    isAdmin(supabase, user),
  ]);

  return (
    <>
      <SiteHeader next="/packs" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label text-ink-soft">Browse</p>
            <h1 className="display mt-2 text-4xl sm:text-5xl">The bookshelf</h1>
            <p className="mt-3 max-w-lg text-ink-soft">
              Hover a binder to pull it forward. Click to take it off the shelf
              and open it.
            </p>
          </div>

          {admin ? (
            <Link href="/admin/packs/new" className="btn btn--accent">
              New binder
            </Link>
          ) : null}
        </div>

        {packs.length === 0 ? (
          <div className="mt-10 max-w-md">
            <p className="text-ink-soft">
              No binders yet.{" "}
              {admin
                ? "Create one for the next event and it’ll show up on this shelf."
                : "Stay tuned for the next event."}
            </p>
            {admin ? (
              <Link href="/admin/packs/new" className="btn btn--accent mt-5">
                Create the first binder
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="mt-12">
            <Bookshelf packs={packs} />
          </div>
        )}
      </main>
    </>
  );
}
