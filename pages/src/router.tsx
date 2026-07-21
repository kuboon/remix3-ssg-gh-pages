import { createRouter } from "remix/router";
import { routes } from "./routes.ts";
import { page } from "./layout.tsx";
import { getPost, posts } from "./posts.ts";

/** Directory of static files served under `/static/*` (favicon, CSS, images, …). */
const STATIC_DIR = new URL("../static/", import.meta.url);

const MIME: Record<string, string> = {
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

export const router = createRouter();

// Home
router.get(routes.home, () =>
  page({
    title: "remix-ssg — a static site starter",
    description: "A Remix v3 static-site-generation starter for GitHub Pages.",
    children: (
      <>
        <h1>A static site, rendered by your router</h1>
        <p class="lead">
          This starter renders <a href="https://remix.run">Remix v3</a>{" "}
          routes to plain HTML with{" "}
          <a href="https://jsr.io/@kuboon/remix-ssg">@kuboon/remix-ssg</a>, then
          deploys the result to GitHub Pages.
        </p>
        <ul class="features">
          <li>Server-rendered pages — no client JavaScript needed.</li>
          <li>Link-crawling build: seed one path, get the whole site.</li>
          <li>
            Works at the domain root, a repo sub-path, or a PR preview URL.
          </li>
        </ul>
        <p>
          <a class="button" href={routes.blog.index.href()}>Read the blog →</a>
        </p>
      </>
    ),
  }));

// About
router.get(routes.about, () =>
  page({
    title: "About — remix-ssg",
    description: "What this starter is and how it works.",
    children: (
      <>
        <h1>About</h1>
        <p>
          The build drives the router in-process with{" "}
          <code>router.fetch()</code>, writes each HTML response to disk, and
          follows the links it finds to discover the rest of the site.
        </p>
        <p>
          Because rendering happens inside ordinary route actions, the same code
          can serve a live server and generate a static site.
        </p>
        <p>
          <a href={routes.home.href()}>← Back home</a>
        </p>
      </>
    ),
  }));

// Blog index
router.get(routes.blog.index, () =>
  page({
    title: "Blog — remix-ssg",
    description: "Posts rendered to static HTML at build time.",
    children: (
      <>
        <h1>Blog</h1>
        <ul class="post-list">
          {posts.map((post) => (
            <li key={post.slug}>
              <a href={routes.blog.show.href({ slug: post.slug })}>
                {post.title}
              </a>
              <time datetime={post.date}>{post.date}</time>
              <p>{post.summary}</p>
            </li>
          ))}
        </ul>
      </>
    ),
  }));

// Blog post
router.get(routes.blog.show, ({ params }) => {
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
          <a href={routes.blog.index.href()}>← All posts</a>
        </p>
      </article>
    ),
  });
});

// Static files
router.get(routes.static, async ({ params }) => {
  const rel = params.path ?? "";
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
});
