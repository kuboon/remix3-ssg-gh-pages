import { createRouter, type RouteBuilder } from "remix/router";
import { createFileResponse } from "remix/response/file";
import { openLazyFile } from "remix/fs";
import { createAssetServer } from "@kuboon/remix-assets-deno";
import { fromFileUrl, join } from "@std/path";
import { base } from "./base.ts";
import { assetsBasePath, chunkUrl, clientEntrypoints } from "./assets.ts";
import { routeGroup, routes } from "./routes.ts";
import { page } from "./layout.tsx";
import { getArticle, listArticles } from "./content.ts";
import { renderMarkdown } from "./markdown.ts";
import { Counter } from "./islands/counter.tsx";
import { Total } from "./islands/total.tsx";
import { Link } from "./link.tsx";

/** Directory of static files served under `/static/*` (favicon, CSS, images, …). */
const STATIC_DIR = fromFileUrl(new URL("../static/", import.meta.url));

/**
 * Serves a file from `static/` with `createFileResponse` (over `openLazyFile`) —
 * the same machinery `staticFiles()` uses — which supplies the Content-Type,
 * ETag, Last-Modified, and conditional/range handling. We call it from the route
 * action (rather than the `staticFiles()` middleware) so it sees the base-
 * stripped route param and works under the deploy mount.
 */
async function serveStatic(request: Request, rel: string): Promise<Response> {
  // Guard against path traversal before touching the filesystem.
  if (rel === "" || rel.includes("..")) {
    return new Response("Forbidden", { status: 403 });
  }
  const path = join(STATIC_DIR, rel);
  let info: Deno.FileInfo;
  try {
    info = await Deno.stat(path);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!info.isFile) {
    return new Response("Not found", { status: 404 });
  }
  return await createFileResponse(openLazyFile(path), request, {
    cacheControl: "public, max-age=3600",
  });
}

/**
 * The client chunks, compiled in memory.
 *
 * Every entrypoint goes into one `Deno.bundle({ codeSplitting: true })` call,
 * so a module more than one of them imports — the Remix UI runtime, the click
 * store — is emitted once into a chunk they share. Compiling each entry on its
 * own would give each a private copy, and `src/islands/store.ts` would stop
 * being a singleton. Needs Deno's `--unstable-bundle` flag.
 */
export const assets = await createAssetServer({
  rootDir: fromFileUrl(new URL("../", import.meta.url)),
  entrypoints: Object.values(clientEntrypoints).map((entry) => entry.source),
  basePath: assetsBasePath,
  mode: "bundle",
  // Source maps would double the file count of a static deploy for no gain;
  // the sources are on GitHub.
  bundle: { sourcemap: "none" },
});

assertEntryUrls();

/**
 * Checks the chunk URLs `src/assets.ts` declares against the ones the bundler
 * actually produced.
 *
 * Islands cannot ask the asset server for their own URL — a `clientEntry()` id
 * is evaluated in the browser too, where there is no bundler — so they compute
 * it from a declared chunk path instead. This turns that declaration into a
 * checked invariant: a change in how the bundler names outputs fails here at
 * startup rather than as a 404 mid-hydration.
 */
function assertEntryUrls(): void {
  for (const [name, entry] of Object.entries(clientEntrypoints)) {
    const actual = assets.entryUrl(entry.source);
    const declared = chunkUrl(entry.chunk);
    if (actual !== declared) {
      throw new Error(
        `Client entrypoint "${name}" is published at ${actual}, but src/assets.ts ` +
          `declares ${declared}. Update its "chunk" to "${
            actual.slice(assetsBasePath.length + 1)
          }".`,
      );
    }
  }
}

export const router = createRouter();

// Every route is mounted under the deploy base prefix (see src/base.ts). Handlers
// are mapped to the relative `routeGroup`, so they never repeat the prefix; links
// use the prefixed `routes` from ./routes.ts.
router.mount(base || "/", (app: RouteBuilder) => {
  // Top-level pages and static files.
  app.map(routeGroup, {
    actions: {
      home: () =>
        page({
          title: "remix-ssg — a static site starter",
          description:
            "A Remix v3 static-site-generation starter for GitHub Pages.",
          hydrate: true,
          children: (
            <>
              <h1>A static site, rendered by your router</h1>
              <p class="lead">
                This starter renders <a href="https://remix.run">Remix v3</a>
                {" "}
                routes to plain HTML with{" "}
                <a href="https://jsr.io/@kuboon/remix-ssg">
                  @kuboon/remix-ssg
                </a>, then deploys the result to GitHub Pages.
              </p>
              <ul class="features">
                <li>
                  Server-rendered pages — zero client JavaScript by default.
                </li>
                <li>
                  Content authored in Markdown, rendered with{" "}
                  <a href="https://jsr.io/@kuboon/md">@kuboon/md</a>.
                </li>
                <li>
                  Works at the domain root, a repo sub-path, or a PR preview
                  URL.
                </li>
                <li>
                  Opt into interactivity per component with hydrated islands.
                </li>
              </ul>
              <section class="demo">
                <h2>Two islands, one shared module</h2>
                <p>
                  Both controls below are server-rendered like every other page,
                  then hydrated in the browser — view source and you'll find
                  them already in the initial HTML.
                </p>
                <p>
                  They are <em>separate browser entrypoints</em>{" "}
                  that never talk to each other. Each one imports the same click
                  store, and the running total keeps up because the bundler
                  emitted that store once, into a chunk they share. Compile the
                  two entries independently and each gets a private copy — the
                  total would sit at zero forever.
                </p>
                <div class="demo-row">
                  <Counter label="Left" start={0} />
                  <Counter label="Right" start={0} />
                  <Total label="Shared total" />
                </div>
              </section>
              <p>
                <Link class="button" href={routes.blog.index.href()}>
                  Read the blog →
                </Link>
              </p>
            </>
          ),
        }),

      about: () =>
        page({
          title: "About — remix-ssg",
          description: "What this starter is and how it works.",
          children: (
            <>
              <h1>About</h1>
              <p>
                The build drives the router in-process with{" "}
                <code>router.fetch()</code>, writes each HTML response to disk,
                and follows the links it finds to discover the rest of the site.
              </p>
              <p>
                Because rendering happens inside ordinary route actions, the
                same code can serve a live server and generate a static site.
              </p>
              <p>
                Articles are authored in Markdown under{" "}
                <code>content/</code>; see the{" "}
                <Link href={routes.blog.index.href()}>blog</Link>.
              </p>
              <p>
                <Link href={routes.home.href()}>← Back home</Link>
              </p>
            </>
          ),
        }),

      static: ({ request, params }) => serveStatic(request, params.path ?? ""),

      // Compiled client chunks. The asset server keys off the full pathname, so
      // it is handed the request untouched.
      assets: ({ request }) => assets.fetch(request),
    },
  });

  // Blog — driven by Markdown files in content/.
  app.map(routeGroup.blog, {
    actions: {
      index: async () => {
        const articles = await listArticles();
        return page({
          title: "Blog — remix-ssg",
          description:
            "Articles authored in Markdown, rendered to static HTML.",
          children: (
            <>
              <h1>Blog</h1>
              <ul class="post-list">
                {articles.map((article) => (
                  <li key={article.slug}>
                    <Link href={routes.blog.show.href({ slug: article.slug })}>
                      {article.title}
                    </Link>
                    {article.date
                      ? <time datetime={article.date}>{article.date}</time>
                      : null}
                    <p>{article.summary}</p>
                  </li>
                ))}
              </ul>
            </>
          ),
        });
      },

      show: async ({ params }) => {
        const article = await getArticle(params.slug ?? "");
        if (!article) {
          return new Response("Not found", { status: 404 });
        }
        const body = await renderMarkdown(article.body);
        return page({
          title: `${article.title} — remix-ssg`,
          description: article.summary,
          children: (
            <article class="post">
              <h1>{article.title}</h1>
              {article.date
                ? <time datetime={article.date}>{article.date}</time>
                : null}
              {body}
              <p>
                <Link href={routes.blog.index.href()}>← All posts</Link>
              </p>
            </article>
          ),
        });
      },
    },
  });
});

/**
 * `deno serve src/router.tsx` starts the dev server directly from this module —
 * it looks for a default export with a `fetch` method, which the router already
 * is. See the `dev` task in deno.json.
 */
export default router;
