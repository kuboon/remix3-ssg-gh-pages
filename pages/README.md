# pages

A static-site starter built with [Remix v3](https://remix.run) —
`remix/fetch-router` for routing and `remix/ui` for rendering — pre-rendered to
static HTML by [`@kuboon/remix-ssg`](https://jsr.io/@kuboon/remix-ssg). The
output is plain HTML that deploys to GitHub Pages: zero client-side JavaScript
by default, with opt-in interactivity through hydrated islands (see below).

## How it works

Pages are ordinary Remix routes that render HTML with `remix/ui/server`. The
build (`scripts/build.ts`) drives the router in-process from the home page,
follows the links it finds in the rendered HTML to discover every page, and
writes each response to `dist/`. The same router powers the dev server, so what
you see locally is what gets generated.

## Requirements

[Deno](https://deno.com) 2.x.

## Commands

```sh
deno task dev     # local dev server at http://localhost:8000
deno task build   # generate the static site into dist/
deno task bundle  # compile the client island bundle (run by dev/build)
deno task check   # type-check, lint, and format-check
```

## Project layout

```
pages/
  deno.json          # tasks, imports, compiler + JSX options
  deno.lock          # pinned dependency versions (committed)
  src/
    base.ts          # base-path helper (see below)
    routes.ts        # the route map
    router.tsx       # route actions (the pages) + static file serving
    layout.tsx       # the shared HTML document shell + page() helper
    link.tsx         # internal <Link> (full-document navigation)
    posts.ts         # sample blog content
    client.tsx       # browser entry: hydrates islands (bundled to static/client.js)
    islands/
      counter.tsx    # a sample client component (hydrated island)
  scripts/
    build.ts         # static build (crawl the router, write dist/)
    dev.ts           # local dev server
  static/            # files served under /static/* (favicon, CSS, images…)
```

## Adding a page

1. Add a route pattern to `src/routes.ts`.
2. Map an action for it in `src/router.tsx` (use the `page()` helper).
3. Link to it from a page the crawl already reaches (e.g. the header nav).

The generator finds pages by following links, so any new page only needs to be
linked from somewhere reachable.

## Interactive islands (client components)

Most of the site is static HTML. When you need interactivity, use an **island**:
a component that is server-rendered like everything else, then hydrated in the
browser. See `src/islands/counter.tsx` (used on the home page).

To add one:

1. Write the component with `clientEntry("/static/client.js#Name", ...)` from
   `remix/ui` (see `counter.tsx`). Call `handle.update()` after changing state.
2. Re-export it from `src/client.tsx` under that same `Name`.
3. Render it on a page, and pass `hydrate: true` to `page()` so the page loads
   the client bundle.

`deno task bundle` compiles `src/client.tsx` (plus the Remix UI runtime and
every island) into a single self-contained `static/client.js`, which the build
then emits as a static asset. `dev` and `build` run it for you.

Internal links use the `<Link>` component (`src/link.tsx`), which marks them for
full-document navigation so pages with an active client runtime still navigate
like a normal static site.

## Base paths and GitHub Pages

A GitHub Pages _project_ site is served under a sub-path
(`https://<user>.github.io/<repo>/`), and per-PR previews add a further segment.
To keep links correct everywhere, the build reads a `BASE_URL` environment
variable (set automatically by the deploy workflow):

- the router mounts every route under `BASE_URL`'s path with
  `router.mount(base, …)`, and `route(base, …)` builds matching prefixed links
  and asset URLs (`src/base.ts`, `src/routes.ts`);
- the build strips that prefix back off when writing files, so the output always
  lands at `dist/`'s root.

Locally `BASE_URL` is unset and the site is served from `/`. To preview a
sub-path deployment locally:

```sh
BASE_URL=http://localhost:8000/remix3-ssg-gh-pages deno task dev
```

Deployment is wired up in `.github/workflows/pages.yml` at the repository root.
