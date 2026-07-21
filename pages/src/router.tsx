import { createRouter, type RouteBuilder } from "remix/router";
import { base } from "./base.ts";
import { routeGroup, routes } from "./routes.ts";
import { page } from "./layout.tsx";
import { getPost, posts } from "./posts.ts";
import { Counter } from "./islands/counter.tsx";
import { Link } from "./link.tsx";

/** Directory of static files served under `/static/*` (favicon, CSS, images, …). */
const STATIC_DIR = new URL("../static/", import.meta.url);

const MIME: Record<string, string> = {
  js: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  ico: "image/x-icon",
  woff2: "font/woff2",
  txt: "text/plain; charset=utf-8",
  json: "application/json; charset=utf-8",
};

async function serveStatic(rel: string): Promise<Response> {
  // Guard against path traversal before touching the filesystem.
  if (rel === "" || rel.includes("..")) {
    return new Response("Forbidden", { status: 403 });
  }
  const ext = rel.slice(rel.lastIndexOf(".") + 1).toLowerCase();
  try {
    const bytes = await Deno.readFile(new URL(rel, STATIC_DIR));
    return new Response(bytes, {
      headers: { "Content-Type": MIME[ext] ?? "application/octet-stream" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
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

      static: ({ params }) => serveStatic(params.path ?? ""),
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
