import Link from "next/link";
import { redirect } from "next/navigation";

import { CreatePackForm } from "@/components/admin/CreatePackForm";
import { SiteHeader } from "@/components/SiteHeader";
import { isAdmin } from "@/lib/admin";
import { signInWithGoogle } from "@/lib/auth-actions";
import { createClient } from "@/lib/supabase/server";

/** Organizer-only: put a new event binder on the bookshelf. */
export default async function NewPackRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <SiteHeader next="/admin/packs/new" />
        <main className="mx-auto w-full max-w-md flex-1 px-5 py-16 text-center">
          <h1 className="display text-3xl">Sign in to create a binder</h1>
          <p className="mt-3 text-ink-soft">
            Only organizer accounts can add sets to the bookshelf.
          </p>
          <form action={signInWithGoogle} className="mt-6">
            <input type="hidden" name="next" value="/admin/packs/new" />
            <button type="submit" className="btn btn--accent">
              Sign in with Google
            </button>
          </form>
        </main>
      </>
    );
  }

  if (!(await isAdmin(supabase, user))) {
    redirect("/packs");
  }

  return (
    <>
      <SiteHeader next="/admin/packs/new" />
      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-10">
        <p className="label text-ink-soft">
          <Link href="/packs" className="no-underline hover:underline">
            The bookshelf
          </Link>{" "}
          · New binder
        </p>
        <div className="mt-6 rounded-lg border border-sleeve-edge bg-white/50 p-6">
          <CreatePackForm />
        </div>
      </main>
    </>
  );
}
