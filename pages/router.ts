/**
 * The site, wired by hand.
 *
 * Route definitions live in `routes.ts` and this file maps them to the pages that render them —
 * the shape a Remix app has. `pageAction` is the whole of the mapping: a page module exports a
 * component and its title, and that is a response.
 *
 * The rest of the site is mapped the same way. The browser modules and the files under `static/`
 * are directories rather than pages, so each is one wildcard route handing off to the thing that
 * serves it; the Markdown articles are not a directory at all here — `pages/blog/` answers its
 * routes like any other page.
 *
 * So what is exported is a plain `@remix-run/fetch-router` router. `deno serve router.ts` runs it
 * as the dev server and the build crawls the same object; both need only `fetch`. Nothing here is a
 * framework convention — the directory names, the routes and the deploy rules are all stated here.
 */

import { createRouter } from "@remix-run/fetch-router";
import type { RemixNode } from "@remix-run/ui";
import { createFileTree, githubPages } from "@kuboon/remix-ssg/site";
import type { FileServerBehavior } from "@kuboon/remix-ssg/site";

import { assets, assetsPath } from "./assets.ts";
import { base } from "./lib/base.ts";
import { renderPage } from "./layout.tsx";
import { routes } from "./routes.ts";

import * as About from "./pages/about.tsx";
import { blogController } from "./pages/blog/mod.ts";
import * as Home from "./pages/index.tsx";
// Showcase: delete this import when you delete the showcase — see README.
import * as Showcase from "./pages/showcase.tsx";

/** Deploy path prefix. The build strips it back off when writing, so output lands at the root. */
export { base };

/**
 * Where the crawl starts.
 *
 * Everything else is reached by following links, so the blog index listing its articles is what
 * makes them part of the site.
 */
export const entryPoints: readonly string[] = ["/"];

/** Where this deploys. The build writes the file this rule would serve. */
export const fileServer: FileServerBehavior = githubPages();

/** What every page module exports. */
interface Page {
  default: () => RemixNode;
  title: string;
  description?: string;
  /** Set by a page that places a client entry, so the shell boots the runtime for it. */
  hydrate?: boolean;
}

/**
 * Renders a page module into the shell.
 *
 * @param page The page module — its component, its title, and whether it hydrates
 * @returns An action for `router.get`
 */
function pageAction(page: Page): () => Response {
  return () =>
    renderPage({
      title: page.title,
      description: page.description,
      hydrate: page.hydrate,
      children: page.default(),
    });
}

/** The files under `static/`, served verbatim at their own names. */
const staticFiles = await createFileTree({
  rootDir: "static",
  basePath: `${base}/static`,
  cacheControl: "public, max-age=3600",
});

const router = createRouter();

router.get(routes.home, pageAction(Home));
router.get(routes.about, pageAction(About));
// Both blog routes at once: the listing, and one article.
router.map(routes.blog, blogController);
// Showcase: delete this line when you delete the showcase — see README.
router.get(routes.showcase, pageAction(Showcase));

// The two directories, each under its own prefix. A wildcard route is all it takes to hand a
// subtree to something that already serves one.
router.map(`${base}/static/*path`, ({ request }) => staticFiles.fetch(request));
router.map(`${assetsPath}/*path`, ({ request }) => assets.fetch(request));

export default router;
