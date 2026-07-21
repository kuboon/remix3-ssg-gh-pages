/**
 * Sample blog content. In a real site this might come from Markdown files,
 * a CMS, or a database read at build time — anything you can `await` inside a
 * route action works, because pages are rendered by driving the router.
 */
export interface Post {
  slug: string;
  title: string;
  date: string;
  summary: string;
  body: string[];
}

export const posts: Post[] = [
  {
    slug: "hello-remix-ssg",
    title: "Hello, remix-ssg",
    date: "2026-07-21",
    summary: "How this site is rendered to static HTML at build time.",
    body: [
      "This page was rendered on the server by a remix/fetch-router route and written to disk as static HTML by @kuboon/remix-ssg — no client-side JavaScript required.",
      "The build drives the router in-process with router.fetch(), then crawls the links in the rendered HTML to discover every page.",
    ],
  },
  {
    slug: "add-a-page",
    title: "Adding a page",
    date: "2026-07-21",
    summary:
      "Add a route, map an action, link to it — the crawler does the rest.",
    body: [
      "Add a route to src/routes.ts, map an action in src/router.ts, and link to it from an already-reachable page.",
      "Because the generator discovers pages by following links, every new page just needs to be linked from somewhere the crawl already reaches.",
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
