/**
 * The site, wired by hand.
 *
 * Route definitions live in `routes.ts` and this file maps them to the pages that render them —
 * the shape a Remix app has. `pageAction` is the whole of the mapping: a page module exports a
 * component and its title, and that is a response.
 *
 * What it adds is the rest of a static site: the Markdown articles, whose URLs come from the files
 * rather than from `routes.ts`, and the browser modules from `assets.ts`.
 *
 * `deno serve router.ts` runs it as the dev server; the build crawls the same object. Nothing here
 * is a framework convention — the directory names, the transforms and the deploy rules are all
 * stated below.
 */

import { createRouter } from "@remix-run/fetch-router";
import type { RemixNode } from "@remix-run/ui";
import {
  compose,
  createFileTree,
  githubPages,
  serveAsHost,
} from "@kuboon/remix-ssg/site";
import type {
  FileServerBehavior,
  SiteMiddleware,
} from "@kuboon/remix-ssg/site";

import { assets, assetsPath } from "./assets.ts";
import { base } from "./lib/base.ts";
import { renderPage } from "./layout.tsx";
import { routes } from "./routes.ts";
import { markdown } from "./transforms/markdown.tsx";

import * as About from "./pages/about.tsx";
import * as Blog from "./pages/blog.tsx";
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

/**
 * Where the Markdown articles are.
 *
 * Said once, read twice: the file tree serves them, and the blog page lists them.
 */
const articlesDir = `${import.meta.dirname}/pages/blog`;

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

const router = createRouter();

router.get(routes.home, pageAction(Home));
router.get(routes.about, pageAction(About));
router.get(routes.blog.index, async () =>
  renderPage({
    title: Blog.title,
    description: Blog.description,
    children: await Blog.default(articlesDir),
  }));
// Showcase: delete this line when you delete the showcase — see README.
router.get(routes.showcase, pageAction(Showcase));

// The browser modules, under their own prefix.
router.map(`${assetsPath}/*path`, ({ request }) => assets.fetch(request));

/**
 * The router, as one of the site's parts.
 *
 * `compose` reads a `404` as "not mine" and moves on, which is exactly what the router returns for
 * a path it has no route for — so the pages, the articles and the chunks stack without any of them
 * knowing about the others.
 */
const app: SiteMiddleware = {
  basePath: base,
  fetch: (request) => router.fetch(request),
  paths: () => [
    routes.home.href(),
    routes.about.href(),
    routes.blog.index.href(),
    routes.showcase.href(),
    ...assets.moduleUrls().values(),
  ],
  reload: () => assets.reload(),
};

export default serveAsHost(
  compose(
    app,
    // The articles: `.md` files, served through this site's own transform.
    await createFileTree({
      rootDir: "pages/blog",
      basePath: `${base}/blog`,
      transforms: [markdown()],
    }),
    await createFileTree({
      rootDir: "static",
      basePath: `${base}/static`,
      cacheControl: "public, max-age=3600",
    }),
  ),
  { behavior: fileServer, base },
);
