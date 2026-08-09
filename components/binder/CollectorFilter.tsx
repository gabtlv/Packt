import Link from "next/link";

import { binderHref } from "@/components/binder/binderHref";

type Props = {
  slug: string;
  /** Current filter: "all", "me", or another member's id. */
  collector: string;
  signedIn: boolean;
  counts: { all: number; mine: number };
  viewingName?: string;
};

/**
 * Binder lenses as real tabs sitting on the binder cover — Everyone / Yours
 * (and a third tab when viewing another member). Same route, different filter;
 * nothing private lives elsewhere.
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
    <div className="binder-tabs" role="tablist" aria-label="Binder views">
      <Link
        href={binderHref(slug, "all")}
        role="tab"
        className="binder-tabs__tab"
        aria-selected={collector === "all"}
        tabIndex={collector === "all" ? 0 : -1}
      >
        <span className="binder-tabs__label">Everyone</span>
        <span className="binder-tabs__count">{counts.all}</span>
      </Link>

      {signedIn ? (
        <Link
          href={binderHref(slug, "me")}
          role="tab"
          className="binder-tabs__tab"
          aria-selected={collector === "me"}
          tabIndex={collector === "me" ? 0 : -1}
        >
          <span className="binder-tabs__label">Yours</span>
          <span className="binder-tabs__count">{counts.mine}</span>
        </Link>
      ) : null}

      {isOther ? (
        <span
          role="tab"
          className="binder-tabs__tab"
          aria-selected="true"
          tabIndex={0}
        >
          <span className="binder-tabs__label">
            {viewingName ?? "Member"}
          </span>
        </span>
      ) : null}
    </div>
  );
}
