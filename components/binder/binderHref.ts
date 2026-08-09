/** Build a binder URL, omitting default query params so "page 1 / everyone" stays clean. */
export function binderHref(slug: string, collector: string, page = 1) {
  const params = new URLSearchParams();
  if (collector !== "all") params.set("collector", collector);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/packs/${slug}${query ? `?${query}` : ""}`;
}
