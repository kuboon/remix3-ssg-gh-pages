/**
 * The site's fixed pages, as a `@remix-run/fetch-router` route map.
 *
 * Every page here has a path that is written down rather than derived, so this is the one place
 * that writes it: `layout.tsx` and the pages link with `routes.about.href()` instead of rebuilding
 * `${base}/about` at each call site, and a rename is one edit.
 *
 * The map is built with the deploy prefix as its base, which is what makes the hrefs correct under
 * a repo sub-path or a PR preview URL without anyone remembering to prepend anything —
 * `route('', …)` gives `/about` and `route('/repo/preview', …)` gives `/repo/preview/about`. It is
 * also why `home` needs no special case: the base alone is the home path, trailing slash and all.
 *
 * The blog is deliberately absent. Its articles are Markdown files discovered at build time, so
 * their paths are derived from what is on disk and there is nothing to write down here.
 */

import { route } from "@remix-run/fetch-router/routes";

import { base } from "./base.ts";

/** The fixed pages. Add a page here when you add one under `pages/`. */
export const routes = route(base, {
  home: "/",
  about: "/about",
  // Showcase: delete this route when you delete the showcase — see README.
  showcase: "/showcase",
});
