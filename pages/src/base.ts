/**
 * Base-path support for hosting under a sub-path (e.g. GitHub Pages project
 * sites served at `https://<user>.github.io/<repo>/`).
 *
 * The deploy workflow passes the full public URL in `BASE_URL`; locally it is
 * unset and the site is served from the root. We only ever need its *pathname*
 * as a prefix — e.g. `https://kuboon.github.io/remix3-ssg-gh-pages` → `/remix3-ssg-gh-pages`.
 *
 * The router mounts every route under this prefix and `route(base, …)` builds
 * matching prefixed links (see `routes.ts`), so the same code renders correct
 * URLs at the root, under a repo sub-path, or under a per-PR preview sub-path.
 * The build strips this prefix back off when writing files, so the output always
 * lands at the site root.
 *
 * ## Why the browser needs it too
 *
 * This module is bundled into the client, and there `Deno` does not exist. An
 * island's `clientEntry()` id is its own public URL, which the island computes
 * from `base` — and it computes it in the browser as well as on the server, so
 * a browser-side `base` of `""` would produce ids missing the deploy prefix.
 * The server therefore embeds the value in the document (see `layout.tsx`) and
 * this module reads it back.
 */

declare global {
  // eslint-disable-next-line no-var
  var __BASE_PATH__: string | undefined;
}

/** Reads `BASE_URL` on the server; falls back to what the document embedded in the browser. */
function readBase(): string {
  if (typeof Deno !== "undefined") {
    const url = Deno.env.get("BASE_URL") ?? "";
    return url ? new URL(url).pathname.replace(/\/+$/, "") : "";
  }

  return globalThis.__BASE_PATH__ ?? "";
}

/** URL path prefix the site is mounted under, without a trailing slash (e.g. `""` or `/repo`). */
export const base: string = readBase();

/** The global the server writes and the browser reads. Kept here so both sides agree on the name. */
export const BASE_PATH_GLOBAL = "__BASE_PATH__";
