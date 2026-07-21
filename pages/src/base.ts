/**
 * Base-path support for hosting under a sub-path (e.g. GitHub Pages project
 * sites served at `https://<user>.github.io/<repo>/`).
 *
 * The deploy workflow passes the full public URL in `BASE_URL`; locally it is
 * unset and the site is served from the root. We only ever need its *pathname*
 * as a prefix — e.g. `https://kuboon.github.io/remix3-ssg-gh-pages` → `/remix3-ssg-gh-pages`.
 *
 * Every route pattern and in-page link is built from {@link base}, so the same
 * code renders correct links at the root, under a repo sub-path, or under a
 * per-PR preview sub-path with no other changes. The build strips this prefix
 * back off when writing files, so the output always lands at the site root.
 */
const BASE_URL = Deno.env.get("BASE_URL") ?? "";

/** URL path prefix the site is mounted under, without a trailing slash (e.g. `""` or `/repo`). */
export const base: string = BASE_URL
  ? new URL(BASE_URL).pathname.replace(/\/+$/, "")
  : "";

/** Prefixes a root-relative path with {@link base}. `withBase("/about")` → `/repo/about`. */
export function withBase(path: string): string {
  return `${base}${path}`;
}
