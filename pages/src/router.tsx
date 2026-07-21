import { createRouter, type RouteBuilder } from "remix/router";
import { createFileResponse } from "remix/response/file";
import { openLazyFile } from "remix/fs";
import { fromFileUrl, join } from "@std/path";
import { base } from "./base.ts";
import { routeGroup, routes } from "./routes.ts";
import { page } from "./layout.tsx";
import { getPost, posts } from "./posts.ts";
import { Counter } from "./islands/counter.tsx";
import { Link } from "./link.tsx";

/** Directory of static files served under `/static/*` (favicon, CSS, images, …). */
const STATIC_DIR = fromFileUrl(new URL("../static/", import.meta.url));

/**
 * Serves a file from `static/`. `createFileResponse` supplies the Content-Type
 * (inferred from the extension by `openLazyFile`), ETag, Last-Modified, and
 * conditional/range handling — the same machinery `staticFiles()` uses, but
 * driven by the base-stripped route param so it works under the deploy mount.
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
                <li>Link-crawling build: seed one path, get the whole site.</li>
                <li>
                  Works at the domain root, a repo sub-path, or a PR preview
                  URL.
                </li>
                <li>
                  Opt into interactivity per component with hydrated islands.
                </li>
              </ul>
              <section class="demo">
                <h2>An interactive island</h2>
                <p>
                  The button below is server-rendered like every other page,
                  then hydrated in the browser so it responds to clicks — view
                  source and you'll find it already in the initial HTML.
                </p>
                <Counter label="Clicks" start={0} />
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
                <Link href={routes.home.href()}>← Back home</Link>
              </p>
            </>
          ),
        }),

      static: ({ request, params }) => serveStatic(request, params.path ?? ""),
    },
  });

  // Blog.
  app.map(routeGroup.blog, {
    actions: {
      index: () =>
        page({
          title: "Blog — remix-ssg",
          description: "Posts rendered to static HTML at build time.",
          children: (
            <>
              <h1>Blog</h1>
              <ul class="post-list">
                {posts.map((post) => (
                  <li key={post.slug}>
                    <Link href={routes.blog.show.href({ slug: post.slug })}>
                      {post.title}
                    </Link>
                    <time datetime={post.date}>{post.date}</time>
                    <p>{post.summary}</p>
                  </li>
                ))}
              </ul>
            </>
          ),
        }),

      show: ({ params }) => {
        const post = getPost(params.slug ?? "");
        if (!post) {
          return new Response("Not found", { status: 404 });
        }
        return page({
          title: `${post.title} — remix-ssg`,
          description: post.summary,
          children: (
            <article class="post">
              <h1>{post.title}</h1>
              <time datetime={post.date}>{post.date}</time>
              {post.body.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
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
