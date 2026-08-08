"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const POLL_MS = 5000;
const COALESCE_MS = 400;

/**
 * Keeps the binder current as other people contribute.
 *
 * Realtime is used as an invalidation signal rather than a client-side store: on a
 * new card we re-run the server render. That keeps pagination, ordering and the
 * collector filter correct with no duplicated query logic on the client. Bursts are
 * coalesced so twenty simultaneous contributions cost one refresh, not twenty.
 *
 * Set NEXT_PUBLIC_REALTIME=0 to fall back to polling. That exists because the
 * Supabase free tier allows 200 peak connections — roughly one per open tab — so a
 * room bigger than that would saturate it and the grid would quietly stop updating.
 */
export function useLiveBinder(packId: string) {
  const router = useRouter();

  useEffect(() => {
    const enabled = process.env.NEXT_PUBLIC_REALTIME !== "0";
    let timer: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), COALESCE_MS);
    };

    if (!enabled) {
      const interval = setInterval(() => router.refresh(), POLL_MS);
      return () => clearInterval(interval);
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`pack:${packId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "cards",
          filter: `pack_id=eq.${packId}`,
        },
        refresh,
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      // Releasing the socket on unmount is what keeps us under the connection cap.
      void supabase.removeChannel(channel);
    };
  }, [packId, router]);
}
