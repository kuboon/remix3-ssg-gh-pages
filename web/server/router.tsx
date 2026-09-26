/**
 * The site, wired by hand.
 *
 * Route definitions live in `routes.ts` and this file maps them to the pages that render them —
 * the shape a Remix app has. `router.map(routes, controller)` is the whole of the mapping, and a
 * controller has to name an action for every route in the map it owns: leave one out and the
 * router throws while it is being built, rather than answering a route with nothing.
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
 * So what is exported is a plain `@remix-run/fetch-router` router. `deno serve router.tsx` runs it
 * as the dev server and the build crawls the same object; both need only `fetch`. Nothing here is a
 * framework convention — the directory names, the routes and the deploy rules are all stated here.
 */

import {
  createController,
  createRouter,
  type RouterContext,
} from "@remix-run/fetch-router";
import { render } from "@remix-run/render-middleware";
import { createFileTree, githubPages } from "@remix-kbn/ssg/site";
import type { FileServerBehavior } from "@remix-kbn/ssg/site";
import { stripBase } from "@remix-kbn/ssg/base";

import { assets, assetsPath } from "./assets.ts";
// `spaRuntime` is the SPA demo's — delete it from this import when you delete the demo.
import { clientRuntime, spaRuntime } from "./runtime.ts";
import { ogImage, ogPaths, serveOgImage } from "./og/mod.ts";
import { base } from "../client/base.ts";
import { Layout, type PageModule } from "../client/layout.tsx";
import { routes } from "../client/routes.ts";

import * as About from "../client/pages/about.tsx";
import { blogController } from "./blog/mod.tsx";
// Fullscreen demo: delete this import when you delete the demo — see README.
import * as Fullscreen from "../client/pages/fullscreen.tsx";
import * as Home from "../client/pages/index.tsx";
// Showcase: delete these two imports when you delete the showcase — see README.
import * as Showcase from "../client/pages/showcase.tsx";
// SPA demo: delete this import when you delete the demo — see README.
import * as Spa from "../client/pages/spa.tsx";
import { versions } from "./versions.ts";

/** Deploy path prefix. The build strips it back off when writing, so output lands at the root. */
export { base };

/** Where this deploys. The build writes the file this rule would serve. */
export const fileServer: FileServerBehavior = githubPages();

/**
 * Renders a page module into the shell.
 *
 * The route comes in alongside the module because the page's own path is what its social card is
 * registered under — the card is drawn from the same `title` and `description` the `<head>` gets,
 * so there is one place where a page says what it is called.
 *
 * @param route The route this page answers, for its card's URL
 * @param page The page module — its component, its title, and whether it hydrates
 * @returns An action for the controller that owns the route
 */
function pageAction(route: { href(): string }, page: PageModule) {
  const image = ogImage(route.href(), page);
  const Page = page.default;

  return (context: AppContext): Response =>
    context.render(
      <Layout
        title={page.title}
        description={page.description}
        image={image}
        viewport={page.viewport}
        script={page.hydrate ? clientRuntime : null}
      >
        <Page />
      </Layout>,
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
 * which is why the asset server is passed to it rather than wrapped: as of `remix@3.0.0-rc.3` it
 * asks for `getScriptEntry` alone, and `@remix-kbn/assets-deno` answers it.
 */
const router = createRouter({ middleware: [render({ assets })] });

/** The request context those middlewares produce — `context.render`, in practice. */
export type AppContext = RouterContext<typeof router>;

// So `createController()` here and in `blog/mod.ts` types its actions against this app's context
// rather than the bare default. One augmentation for the whole app, which is what a single-router
// app has.
declare module "@remix-run/fetch-router" {
  interface RouterTypes {
    context: AppContext;
  }
}

/**
 * The pages at the top of the map.
 *
 * A controller owns the direct routes of one route map, so this one owns everything in `routes`
 * that is not itself a map — and it has to own all of them. `routes.blog` and `routes.spa` are
 * maps, so they are mapped separately below, each by the controller that answers it.
 */
const pages = createController(routes, {
  actions: {
    home: pageAction(routes.home, Home),
    about: pageAction(routes.about, About),
    // Fullscreen demo: delete this action when you delete the demo — see README.
    fullscreen: pageAction(routes.fullscreen, Fullscreen),
    // Showcase: delete this action when you delete the showcase — see README. It is written out
    // rather than built by `pageAction` because its badges are read off the import map, which a
    // page in `client/` cannot open.
    showcase: (context) =>
      context.render(
        <Layout
          title={Showcase.title}
          description={Showcase.description}
          image={showcaseImage}
          script={Showcase.hydrate ? clientRuntime : null}
        >
          <Showcase.default versions={versions()} />
        </Layout>,
      ),
  },
});

/** Showcase: delete this line when you delete the showcase — see README. */
const showcaseImage = ogImage(routes.showcase.href(), Showcase);

// SPA demo: delete everything down to the next comment when you delete the demo — see README. It
// has a controller of its own because the view its `:id` names is handed to the screen rather than
// read back out of the router, and because it loads a different script than every other page.
const spaImages = new Map(
  Spa.SPA_IDS.map((id) => [
    id,
    ogImage(routes.spa.show.href({ id }), {
      title: Spa.titleFor(id),
      description: Spa.description,
    }),
  ]),
);

const spa = createController(routes.spa, {
  actions: {
    show: (context) => {
      const id = Spa.parseSpaId(context.params.id);
      // A `404` for anything that is not one of the demo's views, which is what an unknown id is.
      // The router in the browser answers the same URL the same way — see `client/spa/app.tsx`.
      if (id === null) {
        return new Response("Not Found", {
          status: 404,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }

      return context.render(
        <Layout
          title={Spa.titleFor(id)}
          description={Spa.description}
          image={spaImages.get(id) ?? null}
          // Not `clientRuntime`: this page starts a router rather than hydrating islands, and a
          // document gets one runtime. See `client/spa/entry.ts`.
          script={spaRuntime}
          // The shell's links leave the client router's world, so they go to the browser.
          documentLinks
        >
          {
            /*
            What the build writes into the file. `run()` replaces it with its own first render as
            soon as the script loads, which is the takeover the screen reports.
          */
          }
          <Spa.default id={id} renderedBy="server" navigations={0} />
        </Layout>,
      );
    },
  },
});

router.map(routes, pages);
// SPA demo: delete this line when you delete the demo — see README.
router.map(routes.spa, spa);
// Both blog routes at once: the listing, and one article.
router.map(routes.blog, blogController);

// The three directories, each under its own prefix. A wildcard route is all it takes to hand a
// subtree to something that already serves one — and `get` rather than `map`, because a directory
// answers reads: a `GET` route serves `HEAD` too, and anything else gets a `405` naming what it
// may use. `og/` is a directory only in the finished site — nothing is on disk until a card is
// drawn.
router.get(`${base}/static/*path`, ({ request }) => staticFiles.fetch(request));
router.get(`${assetsPath}/*path`, ({ request }) => assets.fetch(request));
router.get(`${base}/og/*path`, ({ request }) => serveOgImage(request));

/**
 * Where the crawl starts.
 *
 * Everything else is reached by following links, so the blog index listing its articles is what
 * makes them part of the site.
 *
 * The social cards are the exception, and the reason this is a list rather than just `/`: nothing
 * on the site links to one. An `og:image` is an absolute URL meant for someone else's server, so a
 * crawler that followed it would be leaving — the build is told about them instead.
 *
 * The chat's chunk is the other exception, for the mirror-image reason: the only mention of it in
 * the HTML is an attribute on the help button, and a crawler follows links and imports rather than
 * attributes it has never heard of. That it cannot be found by following is the point — see
 * `client/helper/install.ts` — so, like the cards, the build is told.
 *
 * It is down here rather than up with the other exports because a card is registered as its page's
 * route is wired, and this reads the register.
 */
export const entryPoints: readonly string[] = [
  "/",
  ...ogPaths(),
  `/${stripBase(clientRuntime.helper, base)}`,
];

export default router;
