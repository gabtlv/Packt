import Link from "next/link";

type Props = {
  slug: string;
  collector: string;
  page: number;
  pageCount: number;
};

function href(slug: string, collector: string, page: number) {
  const params = new URLSearchParams();
  if (collector !== "all") params.set("collector", collector);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/packs/${slug}${query ? `?${query}` : ""}`;
}

/** Binder pages turn one at a time, like the physical object. */
export function BinderPager({ slug, collector, page, pageCount }: Props) {
  if (pageCount <= 1) return null;

  return (
    <nav
      className="flex items-center justify-center gap-4"
      aria-label="Binder pages"
    >
      {page > 1 ? (
        <Link className="btn btn--quiet" href={href(slug, collector, page - 1)}>
          ‹ Previous
        </Link>
      ) : (
        <span className="btn btn--quiet" aria-disabled="true" style={{ opacity: 0.35 }}>
          ‹ Previous
        </span>
      )}

      <span className="label" aria-live="polite">
        Page {page} of {pageCount}
      </span>

      {page < pageCount ? (
        <Link className="btn btn--quiet" href={href(slug, collector, page + 1)}>
          Next ›
        </Link>
      ) : (
        <span className="btn btn--quiet" aria-disabled="true" style={{ opacity: 0.35 }}>
          Next ›
        </span>
      )}
    </nav>
  );
}
