/**
 * The site, wired by hand.
 *
 * Route definitions live in `routes.ts` and this file maps them to the pages that render them —
 * the shape a Remix app has. `pageAction` is the whole of the mapping: a page module exports a
 * component and its title, and that is a response.
 *
 * The pages it renders live in `client/`, along with the islands they place: everything the
 * browser is ever given, in the half of the workspace that is type-checked without `deno.ns`. This
 * half has the runtime — the file reads, the bundler, the environment — and hands the other half
 * what it needs to render.
 *
 * The rest of the site is mapped the same way as a page. The browser modules and the files under
 * `client/static/` are directories rather than pages, so each is one wildcard route handing off to
 * the thing that serves it; the Markdown articles are not a directory at all here — `blog/` answers
 * its routes like any other page.
 *
 * So what is exported is a plain `@remix-run/fetch-router` router. `deno serve router.ts` runs it
 * as the dev server and the build crawls the same object; both need only `fetch`. Nothing here is a
 * framework convention — the directory names, the routes and the deploy rules are all stated here.
 */

import { createRouter, type RouterContext } from "@remix-run/fetch-router";
import { render } from "@remix-run/render-middleware";
import type { RemixNode } from "@remix-run/ui";
import { createFileTree, githubPages } from "@kuboon/remix-ssg/site";
import type { FileServerBehavior } from "@kuboon/remix-ssg/site";

import { assets, assetsPath } from "./assets.ts";
import { base } from "../client/base.ts";
import { Layout } from "./layout.tsx";
import { routes } from "../client/routes.ts";

import * as About from "../client/pages/about.tsx";
import { blogController } from "./blog/mod.ts";
import * as Home from "../client/pages/index.tsx";
// Showcase: delete these two imports when you delete the showcase — see README.
import * as Showcase from "../client/pages/showcase.tsx";
import { versions } from "./versions.ts";

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
function pageAction(page: Page) {
  return (context: AppContext): Response =>
    context.render(
      Layout({
        title: page.title,
        description: page.description,
        hydrate: page.hydrate,
        children: page.default(),
      }),
    );
}

/**
 * The files under `client/static/`, served verbatim at their own names.
 *
 * Addressed from this file rather than from the working directory, so `deno serve`, the build and
 * an editor all find them wherever they are run from.
 */
const staticFiles = await createFileTree({
  rootDir: `${import.meta.dirname}/../client/static`,
  basePath: `${base}/static`,
  cacheControl: "public, max-age=3600",
});

/**
 * The renderer, as middleware.
 *
 * `render({ assets })` puts `context.render(node)` on every request: `renderToStream`, the doctype,
 * the content type, and the two hooks a page tree needs answered — the chunk URL behind each
 * `clientEntry(import.meta.url, …)`, and the fetch behind a frame navigation. It is Remix's own,
 * which is why the asset server is passed to it rather than wrapped: it asks for `getHref` and
 * `getPreloads`, and `@kuboon/remix-assets-deno` answers both.
 */
const router = createRouter({ middleware: [render({ assets })] });

/** The request context those middlewares produce — `context.render`, in practice. */
export type AppContext = RouterContext<typeof router>;

// So `createController()` in `blog/mod.ts` types its actions against this app's context rather than
// the bare default. One augmentation for the whole app, which is what a single-router app has.
declare module "@remix-run/fetch-router" {
  interface RouterTypes {
    context: AppContext;
  }
}

router.get(routes.home, pageAction(Home));
router.get(routes.about, pageAction(About));
// Both blog routes at once: the listing, and one article.
router.map(routes.blog, blogController);
// Showcase: delete this line when you delete the showcase — see README. It has an action of its
// own because its badges are read off the import map, which a page in `client/` cannot open.
router.get(routes.showcase, (context) =>
  context.render(
    Layout({
      title: Showcase.title,
      description: Showcase.description,
      children: Showcase.default(versions()),
    }),
  ));

// The two directories, each under its own prefix. A wildcard route is all it takes to hand a
// subtree to something that already serves one.
router.map(`${base}/static/*path`, ({ request }) => staticFiles.fetch(request));
router.map(`${assetsPath}/*path`, ({ request }) => assets.fetch(request));

export default router;
