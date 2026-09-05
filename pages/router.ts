/**
 * The site, wired by hand.
 *
 * Route definitions live in `routes.ts`, each page has a controller under `controllers/`, and this
 * file maps one to the other — the shape a Remix app has. What it adds is the rest of a static
 * site: the Markdown articles, whose URLs come from the files rather than from `routes.ts`, and
 * `islands/`, compiled as one code-split bundle.
 *
 * `deno serve router.ts` runs it as the dev server; the build crawls the same object. Nothing here
 * is a framework convention — the directory names, the transforms and the deploy rules are all
 * stated below.
 */

import { createRouter } from "@remix-run/fetch-router";
import {
  compose,
  createFileTree,
  createIslands,
  githubPages,
  serveAsHost,
} from "@kuboon/remix-ssg/site";
import type {
  FileServerBehavior,
  SiteMiddleware,
} from "@kuboon/remix-ssg/site";

import { base } from "./lib/base.ts";
import { routes } from "./routes.ts";
import { aboutAction } from "./controllers/about.tsx";
import { blogAction } from "./controllers/blog.tsx";
import { homeAction } from "./controllers/home.tsx";
import { showcaseAction } from "./controllers/showcase.tsx";
import { markdown } from "./transforms/markdown.tsx";

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

/**
 * Where the Markdown articles are.
 *
 * Said once, read twice: the file tree serves them, and the blog controller lists them.
 */
const articlesDir = `${import.meta.dirname}/pages/blog`;

const islands = await createIslands({
  rootDir: "islands",
  basePath: `${base}/assets`,
  // Source maps would double the file count of a static deploy for no gain; the sources are on
  // GitHub.
  bundle: { sourcemap: "none" },
});

const router = createRouter();

router.get(routes.home, homeAction(islands.urls));
router.get(routes.about, aboutAction);
router.get(routes.blog.index, blogAction(articlesDir));
// Showcase: delete this line when you delete the showcase — see README.
router.get(routes.showcase, showcaseAction(islands.urls));

/**
 * The router, as one of the site's parts.
 *
 * `compose` reads a `404` as "not mine" and moves on, which is exactly what the router returns for
 * a path it has no route for — so the pages, the articles and the chunks stack without any of them
 * knowing about the others. `paths()` is informational; the crawl follows links.
 */
const pages: SiteMiddleware = {
  basePath: base,
  fetch: (request) => router.fetch(request),
  paths: () => [
    routes.home.href(),
    routes.about.href(),
    routes.blog.index.href(),
    routes.showcase.href(),
  ],
  reload: () => Promise.resolve(),
};

export default serveAsHost(
  compose(
    pages,
    // The articles: `.md` files, served through this site's own transform.
    await createFileTree({
      rootDir: "pages",
      basePath: base,
      transforms: [markdown()],
    }),
    await createFileTree({
      rootDir: "static",
      basePath: `${base}/static`,
      cacheControl: "public, max-age=3600",
    }),
    islands,
  ),
  { behavior: fileServer, base },
);
