import Link from "next/link";

type Props = {
  slug: string;
  /** Current filter: "all", "me", or another member's id. */
  collector: string;
  signedIn: boolean;
  counts: { all: number; mine: number };
  viewingName?: string;
};

/**
 * The "My Cards" lens.
 *
 * Deliberately a filter on this same page rather than a route of its own: nothing a
 * member holds lives anywhere private, so there is no separate binder to navigate
 * to. The same control also shows another member's lens when you arrive via their
 * card, which is why it can render a third chip.
 */
export function CollectorFilter({
  slug,
  collector,
  signedIn,
  counts,
  viewingName,
}: Props) {
  const isOther = collector !== "all" && collector !== "me";

  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Filter binder">
      <Link
        href={`/packs/${slug}`}
        className="chip"
        aria-current={collector === "all"}
      >
        Everyone · {counts.all}
      </Link>

      {signedIn ? (
        <Link
          href={`/packs/${slug}?collector=me`}
          className="chip"
          aria-current={collector === "me"}
        >
          Yours · {counts.mine}
        </Link>
      ) : null}

      {isOther ? (
        <span className="chip" aria-current="true">
          {viewingName ?? "Member"}&apos;s cards
        </span>
      ) : null}
    </nav>
  );
}
