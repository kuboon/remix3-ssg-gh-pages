# web

A static-site starter built with [Remix v3](https://remix.run) — `remix/ui` for
rendering — and [`@remix-kbn/ssg`](https://jsr.io/@remix-kbn/ssg) for
everything around it. The output is plain HTML that deploys to GitHub Pages:
zero client-side JavaScript by default, with opt-in interactivity through
hydrated islands.

## Two halves

The workspace has one member for each side of the wire:

|           |                                                                       | checked with        |
| --------- | --------------------------------------------------------------------- | ------------------- |
| `client/` | pages, islands, routes, tokens — everything the browser is ever given | `dom`, no `deno.ns` |
| `server/` | the router, the bundler, the file reads, the build                    | `deno.ns` and `dom` |

Only `server/` is type-checked with the Deno namespace, so a `Deno.` anywhere in
`client/` is a build error rather than a surprise in the browser. Nothing else
enforces the line — no bundler config, no naming convention, one `lib` each.

`server/` may read from `client/` and does: it imports the pages and the shell
to render them, compiles the islands, and serves `client/static/`. Nothing goes
the other way — where a view needs something only the server knows, it takes it
as a prop. The document shell has two such props. `script` is where the client
runtime was compiled to, which `router.tsx` resolves and hands over — a page with
no islands passes `null` and ships no JavaScript. `image` is the page's social
card, drawn by `server/og/`.

## How it works

`client/routes.ts` states every URL the site answers, `client/pages/` renders
them, and `server/router.tsx` maps one to the other with a controller — the
shape a Remix app has:

```tsx
const pages = createController(routes, {
  actions: {
    home: pageAction(routes.home, Home),
    about: pageAction(routes.about, About),
    // …one per route in the map
  },
});

router.map(routes, pages);
```

A controller owns the direct routes of one route map and has to name an action
for every one of them. That is the reason to write it this way rather than as a
list of `router.get(...)` calls: add a route to `client/routes.ts` and forget
the action, and the router throws while it is being built instead of serving a
site with a hole in it. Nested maps are mapped separately, each by the
controller that answers it — `routes.blog` and `routes.spa` here.

The rest of the site is mapped the same way. A directory is a wildcard route
handing a subtree to whatever already serves one:

```ts
router.get(`${base}/static/*path`, ({ request }) => staticFiles.fetch(request));
router.get(`${assetsPath}/*path`, ({ request }) => assets.fetch(request));
router.get(`${base}/og/*path`, ({ request }) => serveOgImage(request));
```

`get` rather than `map`, because a directory answers reads: a `GET` route
serves `HEAD` too, and anything else gets a `405` naming the methods that are
allowed.

So `server/router.tsx` default-exports a plain `@remix-run/fetch-router` router,
with nothing wrapped around it. `deno serve` and the build both want the same
thing from it — `fetch` — and everything the build additionally needs (`base`,
`entryPoints`, `fileServer`) is a named export beside it.

The one middleware it carries is Remix's own renderer:

```ts
const router = createRouter({ middleware: [render({ assets })] });
```

`render({ assets })` puts `context.render(node)` on every request — the doctype,
the content type, `renderToStream`, and the two hooks a page tree needs
answered: the chunk URL behind each `clientEntry(import.meta.url, …)`, and the
fetch behind a frame navigation. As of `remix@3.0.0-rc.3` it asks the asset
server for `getScriptEntry` and nothing else, so `@remix-kbn/assets-deno` goes
straight in.

The Markdown articles are pages like any other. `server/blog/mod.tsx` sits in the
directory the `.md` files are in and answers both blog routes — the listing and
one article — so `server/router.tsx` maps the group in one line:

```ts
router.map(routes.blog, blogController);
```

Their URLs are the one thing not enumerated in `client/routes.ts`: they come
from the files on disk, so `routes.blog.show` states only the _shape_ of an
article URL, for the listing to link with.

### Pages are components

Every page, the shell included, is an ordinary Remix component: a setup
function that returns a render function, placed as JSX.

```tsx
export const title = "About — remix-ssg";
export const hydrate = false;

export default function About(_handle: Handle) {
  return () => <h1>About</h1>;
}
```

`PageModule` in `client/layout.tsx` is what a page module has to export, and
`hydrate` is required rather than optional on purpose: a missing flag is
indistinguishable from a page that genuinely ships nothing, and the page still
renders. That is exactly how a showcase once shipped with eighteen islands that
never hydrated.

A screen a controller fills in takes props the way any component does —
`PageModule<{ articles: readonly ArticleSummary[] }>` for the blog listing — so
`<Index.default articles={await listArticles()} />` is the whole of handing it
its data.

`deno task dev` runs that handler as the dev server. The build drives the very
same object with `fetch()`, writes each response to disk, and follows the links
it finds — so what you see locally is what gets generated, and moving to a live
server would be a change of deploy target rather than of code.

There is no build script in this repository. `deno task build` runs the
generator straight from JSR.

## Requirements

[Deno](https://deno.com) 2.x.

## Commands

```sh
deno task dev     # local dev server at http://localhost:8000
deno task build   # generate the static site into dist/
deno task check   # type-check, lint, and format-check
```

`dev` and `build` are `server/`'s tasks; the ones at the root run them there, so
either directory works. `check` runs `deno check` in each member — with that
member's `lib`, which is the whole point — then lints and format-checks the
workspace.

Neither task passes `-A` or `--unstable-bundle`. `server/deno.json` carries a
permission set for each (`-P=dev`, `-P=build`) and the root config the
`"unstable": ["bundle"]` the bundler needs — which is also why `deno task build`
names `-c deno.json`: a remote main module reads a project's config only when it
is told to.

The root `imports` names each package once. A subpath resolves from that entry,
so `@remix-run/ui/menu`, `@remix-kbn/ssg/site` and `@std/front-matter/yaml`
all work without a line of their own — and adding one would only be a second
place to bump the version.

## Project layout

```
web/
  deno.json          # the workspace: members, imports, tasks, lint + fmt
  deno.lock          # pinned dependency versions (committed)
  client/
    deno.json        # lib: dom — no deno.ns, so nothing here can reach for Deno
    routes.ts        # every URL the site answers
    base.ts          # the deploy prefix, computed once
    tokens.ts        # design tokens — colors, fonts, radii, the measure
    theme.ts         # the css() mixins more than one module uses
    layout.tsx       # the HTML document shell, and what a page module exports
    hydration.ts     # run() — the client runtime, loaded by a page that hydrates
    navigation-guard.ts  # the two navigations the runtime should not intercept
    pages/
      index.tsx      # home — places two client entries
      about.tsx
      showcase.tsx
      fullscreen.tsx # the mobile-Safari demo — delete me
      spa.tsx        # the client-side-routing demo — delete me
      blog/
        index.tsx    # the listing screen
        article.tsx  # the article screen
    spa/             # the client-side-routing demo — delete me
      app.tsx        # the router that runs in the browser — @remix-run/spa
      entry.ts       # its entrypoint: run(router), in place of hydration.ts
    helper/          # the in-page support chat — delete me
      button.ts      # the two names the shell and the browser agree on
      install.ts     # the delegated click listener, and the lazy import
      panel.ts       # the client and the controller, introduced to each other
      agent.ts       # what it knows, as a script
      tools.ts       # what it can do on the page
    islands/
      counter.tsx    # a hydrated island, and its own browser entrypoint
      total.tsx      # a second island/entrypoint, sharing state with it
      store.ts       # the module both islands import — the shared singleton
      share.tsx      # the article share row — a custom element, wrapped
      viewport-probe.tsx   # fullscreen demo — delete me
      fullscreen-demo.tsx  # fullscreen demo — delete me
    static/
      app.css        # tokens, document defaults, the cascade layer order
      favicon.svg
  server/
    deno.json        # lib: deno.ns — plus the tasks and their permission sets
    router.tsx       # the wiring — routes to pages, plus the rest of the site
    assets.ts        # client/ compiled as one graph
    runtime.ts       # where hydration.ts, spa/entry.ts and the chat chunk compiled to
    versions.ts      # the showcase's badges, read off the import map
    blog/
      mod.tsx        # the articles, and both blog routes
      *.md           # the articles
    og/
      mod.ts         # which page gets which social card, and the route serving them
      card.ts        # the drawing — Skia, via canvaskit-wasm
      fonts/         # Inter and Noto Sans JP — every .ttf here is registered
  dist/              # the build's output (gitignored)
```

Two files sit across the line on purpose. `client/base.ts` reads `BASE_URL` off
`globalThis` rather than through `Deno.env`, because a prefix is a render-time
value that the browser is never told and `client/` may not name `Deno`; and the
blog's screens are in `client/pages/blog/` while the module that reads the `.md`
files beside them is `server/blog/`. Each screen states the shape it needs of an
article, and the server's own `Article` is a superset of both.

## The UI showcase (delete me)

`client/pages/showcase.tsx` and `client/islands/showcase/` are a port of
[remix3-ui-showcase](https://github.com/kuboon/remix3-ui-showcase): every
first-party `@remix-run/ui` component and the animation primitives, each an
island whose parameters you can change live. It is here to demonstrate the
framework, and the root README lists it first among the things to delete in a
repository made from this template.

It is also the largest thing the island pipeline is asked to do here — 18
entrypoints compiled as one graph, sharing `@remix-run/ui` and the demo chrome
through code-split chunks rather than 18 copies.

Helpers the demos share live in `client/islands/showcase/_lib/`. The underscore
is decoration; what keeps them out of the entrypoints is the depth —
`server/assets.ts` globs `islands/showcase/*.tsx`, and `_lib/` is a directory
below that.

## The client-side routing demo (delete me)

`client/pages/spa.tsx` and `client/spa/` are three URLs — `/spa/1`, `/spa/2`,
`/spa/3` — routed in the browser by
[`@remix-run/spa`](https://github.com/remix-run/remix/tree/main/packages/spa),
and still generated as three static files. The root README lists it among the
things to delete in a repository made from this template.

It exists because the default on this site is one step short of that. Every link
here is already a _soft_ navigation: the runtime intercepts the click, fetches
the destination's HTML and reconciles it into the open document. Fast, and no
code to write — but the markup still comes from a request.

`@remix-run/spa` is the step underneath, and it is two functions:

- `render()` is middleware for an ordinary `@remix-run/fetch-router` router. It
  gives `context.render(node)`, and the response it makes carries a component
  tree rather than a body.
- `run(router)` points the Remix UI runtime at that router, so a navigation is
  dispatched through it instead of fetched.

So `client/spa/app.tsx` is a router like `server/router.tsx` — middleware,
params, status codes, a default handler, and a controller — that happens to run
in the browser. It maps `routes.spa`, the same route map the server maps, from
the same `client/routes.ts`, so a fourth view is a type error in both routers
rather than a URL only one of them answers. That two routers answer the same
URLs from one route table is the reason those routes live in a file of their
own.

### The two things to know before copying it

**`run()` owns the whole of `<body>`.** It clears what is there and renders the
router's output. So the site's shell is rendered by this router too — `Shell` in
`layout.tsx` is split out of `Layout` for exactly that, and the middleware's
transform wraps every route's node in it. And the shell's links carry
`data-rmx-document` on these pages: without it a click on `Blog` would be routed
by the client router, which has never heard of `/blog`.

**A document gets one runtime, and the first one to start keeps it.**
`hydration.ts` calls `@remix-run/ui`'s `run()` with a `loadModule` and hydrates
islands; `@remix-run/spa`'s `run()` wires a router instead, and its `loadModule`
throws — an SPA response carries a node, not a client entry. They never share a
page, so the demo has its own entrypoint in `server/assets.ts` and its own
`ClientRuntime` in `server/runtime.ts`, and `server/router.tsx` sends it to these
URLs and `hydration.ts` to every other one. The `@remix-run/ui` runtime they
both pull in is still emitted once, into a chunk they share.

The consequence that bites is about _entering_ the page. The shell's `SPA` link
carries `data-rmx-document` on every page of the site, not just on the ones
`documentLinks` covers, because a soft navigation into `/spa/1` reconciles the
new markup into the document that is already running `hydration.ts` — the
demo's `run()` arrives too late, never takes over, and every link on the page
falls back to fetching whole pages. The symptom is subtle: open `/spa/1`
directly and the demo works; reach it from the home page and it quietly does
not. This template shipped with that bug; the fix is one attribute, and the rule
behind it is that a page which starts a different runtime is entered by a
document load.

### What it does not change

`<head>` stays the server's. Each of the three URLs is generated with its own
title, description and social card, because that is what a crawler and a link
preview read, and neither runs the page. The client router sets `document.title`
itself on navigation, which is the one part it has to do by hand.

And it stays a static site. `deno task build` writes `spa/1.html`, `spa/2.html`
and `spa/3.html`, each with its screen already in it, so a cold open or a reload
is a file and not a spinner. The build _finds_ those three URLs the ordinary
way — by reading the three `<a href>`s out of the rendered HTML. It never runs
the router.

That is the constraint worth carrying into your own client-side routing: the
crawler reads HTML, it does not execute it. A route reachable only through
client code — a `navigate()` in a click handler, a path in a table the browser
consults — is invisible to the build and will not be generated. Either link to
it with a real `href`, as this demo does, or name it in `entryPoints` in
`server/router.tsx`, the way the social cards are.

### What it changed in the rest of the site

Two things, both forced by the same fact: `client/routes.ts` is now compiled
into a browser bundle, which it never was before.

- **`client/base.ts` imports `normalizeBase` from `@remix-kbn/ssg/base`, not
  `/site`.** Both export it, but `/site` is the Deno half of that package — the
  file trees, the loader, `node:path` — so reaching for it from a module the
  browser gets pulls Node built-ins into the bundle, and the bundle then fails
  to load. Nothing noticed while no browser entrypoint imported `routes.ts`.
  `/base` is those three string functions and no imports at all; it exists
  because this demo ran into exactly that.
- **The shell writes the deploy prefix into a `<meta>`, and `client/base.ts`
  reads it there in the browser.** It used to read `BASE_URL` and nothing else,
  which is correct on the server and empty in a browser — fine while the prefix
  was a render-time value, and wrong the moment a client router matches
  `location.pathname` against patterns that carry it. A router that thought the
  prefix was empty would fail to match every URL under a sub-path deploy, which
  is every pull request preview.

## The support chat (delete me)

`client/helper/` puts [`@remix-kbn/helper-agent`](https://jsr.io/@remix-kbn/helper-agent)
on every page that ships JavaScript: a **Help** button in the header, and a
chat panel that answers questions about this site. The root README lists it
among the things to delete in a repository made from this template.

What makes it worth having here rather than in the package's own README is
where it runs. The chat has two halves — a client that holds the conversation
and a controller that answers it — and on a normal deployment they sit on
either side of an origin, with a model behind the controller. GitHub Pages has
no server, so there is nowhere to keep an API key and nothing to route a `POST`
to. Both halves run in the browser instead:

```ts
const router = createRouter();
router.post(CHAT_PATH, helperAgentController(siteAgent()));

openHelperAgent({
  transport: { url: CHAT_PATH, fetch: (request) => router.fetch(request) },
  tools: pageTools,
});
```

The controller is an ordinary `@remix-run/fetch-router` request handler and the
client's transport takes a `fetch` rather than a URL, so the two can be
introduced to each other without an origin in between. `panel.ts` is the whole
of that wiring. The request never leaves the page, and everything except the
model — the wire protocol, the streaming, the transcript, the tool round trip —
is the real thing. What answers instead of a model is `agent/dummy`, reading
from the script in `agent.ts`.

### The button is the site's, not the package's

The package draws the panel and stops there, which is the right split: where a
support button goes is a thing about this site. So the shell renders a plain
`<button>` and `install.ts` gives it a behaviour. Two details in that file are
load-bearing:

- **The listener is on the document.** An internal link is a soft navigation,
  which swaps the document's contents, and on the SPA demo `run()` replaces the
  whole of `<body>`. The button that gets clicked is never the element that was
  there when the runtime started; one delegated listener outlives all of them.
- **The import is written so the bundler cannot read it.** `panel.ts` is an
  entrypoint of its own in `server/assets.ts`, and the shell writes its URL onto
  the button exactly as it writes the runtime's into `<script>`. Spelling
  `import("./panel.ts")` instead would work and would also put the chunk in
  every hydrated page's `<link rel="modulepreload">` list — fifty kilobytes
  downloaded on every visit for a panel most of them never open. As written, the
  home page's eager JavaScript is unchanged and the chat arrives on the first
  click.

Because nothing links to that chunk, the build cannot find it by crawling
either — so it is listed in `entryPoints` in `server/router.tsx`, next to the
social cards, which are there for the mirror-image reason.

### What it can do on the page

The tools in `tools.ts` are the half of tool use a static site can have. There
is no server to run anything, but there is a document: `where_am_i` reports the
path, the heading, whether the page shipped JavaScript and how many islands it
placed, and `draft_bug_report` builds a pre-filled link to this repository's
issue form. They are declared to the controller on every turn and stored
nowhere, so the list is what _this_ deploy can do.

`draft_bug_report` returns a URL rather than opening a tab, which is not a
nicety: a tool runs after the reply has finished streaming, by which point
there is no user gesture left and `window.open` is blocked. The panel renders
`http(s)` URLs in a reply as links.

### Deleting it

Delete `client/helper/`, the `helper/panel.ts` entrypoint in `server/assets.ts`,
the `helper` field on `ClientRuntime` and the button in `client/layout.tsx`, the
two `installHelper()` calls in `client/hydration.ts` and `client/spa/entry.ts`,
the `HELPER_SRC` prop in `client/spa/app.tsx`, and the last entry in
`entryPoints` in `server/router.tsx`.

## The mobile Safari demo (delete me)

`client/pages/fullscreen.tsx` answers one question — can CSS hide Safari's URL
bar and tab bar? — with measurements rather than prose. Its two islands read the
viewport back live: `viewport-probe.tsx` resolves `100svh`, `100dvh` and
`100lvh` on hidden probe elements and prints the pixels, and
`fullscreen-demo.tsx` wires the Fullscreen API to a button. The root README
lists it among the things to delete in a repository made from this template.

It is also the only page that overrides the shell's viewport meta, which is the
part worth keeping: `env(safe-area-inset-*)` reads `0px` unless the page opts in
with `viewport-fit=cover`, so `LayoutProps.viewport` exists for whichever of
your pages lays out to the edges of a phone screen. Deleting the demo leaves
that prop in place and unused, which is where the next such page will want it.

## Styling

Almost every rule is a `css(...)` mixin from `@remix-run/ui`, attached to an
element with `mix`:

```tsx
const cardStyle = css({
  padding: "1.25rem",
  border: `1px solid ${color.border}`,
  borderRadius: radius.lg,
  "&:hover": { borderColor: color.accent },
  "@media (min-width: 40rem)": { padding: "2rem" },
});

<section mix={cardStyle}>…</section>;
```

The renderer collects the mixins a page actually rendered and writes them into
that page's `<head>` as `<style>` tags — `context.render` streams, so it is
`renderToStream` doing it. So a page carries its own CSS and
nothing else: no rules for parts of the site the reader never opened, and no
class name that has to agree with a file somewhere else. The one stylesheet the
site does link is `client/static/app.css`, and the next section is what it is
for.

### The cascade

Generated `css(...)` rules — this site's, and the ones first-party `remix/ui`
components carry — all land in the native `rmx` cascade layer, and a mixin
cannot choose its layer. So `client/static/app.css` declares the full order, and
`client/layout.tsx` links it at the top of `<head>`:

```css
@layer base, rmx, app;
```

Layers rank by where they are first named, which is why that link has to come
out ahead of Remix's own rules — Remix appends its collected styles just before
`</head>`.

| Layer  | What is in it                                                                                                                                                                                                                                      |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base` | `app.css`. Tokens, the box model, and defaults for elements nobody styles by hand (`body`, `a`, `h1`, `code`). Being _before_ `rmx`, every one is a default a component may override — which is why nothing here needs `:where()` or `!important`. |
| `rmx`  | Remix's. Every mixin on this site, and the styling `remix/ui` components bring with them.                                                                                                                                                          |
| `app`  | Empty, and named anyway: where a rule would go that has to beat a component's own styling on purpose. Unlayered CSS would also win, but it would win by accident.                                                                                  |

### Where a style goes

- **Token values live in `client/static/app.css`; `client/tokens.ts` names
  them.** Remix supplies behaviour and a little component styling, not a theme,
  so the palette, typography and radii are the app's. They are custom properties
  because light and dark swap between two sets of them, and `tokens.ts` exports
  the `var(--…)` references rather than a second copy of the values. Islands
  import from `tokens.ts` and only from there — a `css(...)` call at module
  scope is not something the bundler will drop, so importing `theme.ts` would
  pull the whole shell into an island's chunk.
- **Mixins used by more than one module live in `client/theme.ts`.** A style
  used in one place belongs in that file, under a `// --- styles ---` heading at
  the bottom — see `client/layout.tsx` or `client/pages/index.tsx`.
- **`mix` takes an array**, so mixins compose: `mix={[bandStyle, headerStyle]}`
  is what a stylesheet would have said with a grouped selector. When an element
  also has behaviour, the `on(...)` handlers go last.
- **A page that needs more room than the measure takes it itself.**
  `client/pages/showcase.tsx` brings its own layout, so its wrapper sets
  `margin-inline: calc(50% - 50vw)` and widens from the main column to the full
  viewport — no flag reaches the shell for it, and its background finally spans
  both edges. `app.css` pairs that with `overflow-x: clip` on `body`, so `50vw`
  (which counts the scrollbar) cannot drag a horizontal scrollbar behind the
  vertical one.
- **Nesting reaches markup this site does not write.** `theme.ts`'s `proseStyle`
  dresses the Markdown articles with `& h2`, `& pre`, `& table` and friends,
  scoped to the one class on the article wrapper instead of leaking out as bare
  element selectors.

`client/static/` holds `app.css` and anything else served verbatim (the favicon,
images).

## Adding a page

Three edits, in the order you would guess:

1. Name its URL in `client/routes.ts` — `contact: get("/contact")`.
2. Write `client/pages/contact.tsx`, exporting a component as `default` plus a
   `title` and a `hydrate` — `true` if it places a client entry, `false` if it
   does not. A page that needs a viewport meta of its own exports `viewport`
   too; `client/pages/fullscreen.tsx` is the one that does, for
   `viewport-fit=cover`.
3. Add its action to the controller in `server/router.tsx` —
   `contact: pageAction(routes.contact, Contact)`. The route goes in twice
   because the second one is what files the page's social card.

Skip the third step and the router says so: a controller that does not answer
every route in its map throws as it is built.

An **article** needs none of that: drop a `.md` file under `server/blog/` and it
is served at its own name.

The crawl starts at `entryPoints` in `server/router.tsx` and follows links, so
**what is reachable is what gets generated**. A page nothing links to belongs in
`entryPoints`, or it is not part of the site.

That is also why the blog controller reads the article files: listing them is
what makes them reachable.

## Social cards

Every page gets an `og:image`: a 1200×630 PNG with the page's own title and
description on it, drawn during the build and written to `dist/og/`.

`server/og/card.ts` draws it with [Skia](https://skia.org), through
[`canvaskit-wasm`](https://www.npmjs.com/package/canvaskit-wasm) — the text
stack a browser uses, compiled to WebAssembly. That is more than a rectangle and
some words needs, until you look at the words: a title is arbitrary length and
the box is not, so it has to be shaped, wrapped, and cut with an ellipsis at a
line count. Skia does that with the same shaper the page itself will use, and it
does it without a browser, a font server, or a network round trip.

`server/og/mod.ts` decides what each card says. A page already exports a `title`
and a `description`, so a card is registered from those rather than from a
second list of pages to keep in step:

```ts
const image = ogImage(routes.about.href(), About);
```

One call does both halves — it records how to draw the card and returns the URL
to put in `<meta property="og:image">` — so there is no way to register a card
without getting its URL, and none to write the URL without registering the card.

Two things follow from a card not being linked to from anywhere. `og:image` is
an absolute URL fetched by whoever is showing the link, so the deploy origin
matters: `BASE_URL` carries it, and a local build, having none, writes a
relative tag rather than inventing a host. And the crawl has no link to follow,
so `entryPoints` in `server/router.tsx` names the images — `["/", ...ogPaths()]`
— which is why that export sits at the bottom of the file, after the routes that
filled the register.

### Fonts, and Japanese

`server/og/fonts/` holds what the cards are drawn with; every `.ttf` or `.otf`
in it is registered, in file-name order, and that order is the fallback order.
The fonts are vendored because Skia needs real font data — there is no system
font stack to fall back on and no CSS to resolve one.

Inter draws the Latin. Noto Sans JP sorts after it and answers for the Japanese,
so a mixed title comes out as it should — `静的サイトを書く` in Noto, the `HTML`
in the middle of it still Inter. Skia synthesises the bold face, so Japanese
needs only the one weight.

It is cut down to JIS X 0208 — every kana and all 6,355 level-1 and level-2
kanji, 2.2MB against the full font's 5.3MB. A character outside that set is
drawn as nothing at all, so the build says which ones and on which page:

```
og: no glyph for 鷗 in /blog/mori-ogai — see server/og/fonts/README.md
```

[`server/og/fonts/README.md`](./server/og/fonts/README.md) has the exact set,
the commands that produced it, and what to drop in for a script neither font
covers.

## Markdown content

Each article is a `.md` file under `server/blog/` with `title`, `date`, and
`summary` front-matter:

```markdown
---
title: Hello, remix-ssg
date: "2026-07-21"
summary: How this site is rendered to static HTML at build time.
---

Body starts here…
```

`server/blog/mod.tsx` turns it into a page: front-matter via `@std/front-matter`,
the body via [`@kuboon/md`](https://jsr.io/@kuboon/md) — GitHub-flavored,
sanitized, with heading anchors and Shiki-highlighted code. It is the only
module importing either package, and the only one that reads the files; the two
screens beside it, `index.tsx` and `article.tsx`, are handed what they render.
The generator never sees Markdown at all — it serves what this site's own
controller returns.

`mod.tsx` finds the files through `import.meta.dirname`, being in the directory
with them, so no path to the articles is written down anywhere. Nothing serves
that directory as files, either, which is why the source can sit beside the
`.md` without becoming a URL.

### Line breaks, and why the formatter leaves prose alone

`deno.json` sets `"proseWrap": "preserve"`, so `deno fmt` formats the code in a
Markdown file and leaves the words where they were put. It has to: Markdown
joins the lines of a paragraph with a space, which is invisible between English
words and a gap in the middle of a Japanese sentence — and a formatter wrapping
at 80 columns puts one wherever it likes. So an English article wraps at the
margin, a Japanese one is a line per paragraph, and each is right for what it
renders to.

## Interactive islands (client components)

Most of the site is static HTML. When you need interactivity, use an **island**:
a component that is server-rendered like everything else, then hydrated in the
browser. See `client/islands/counter.tsx`.

To add one:

1. Write it in `client/islands/` with `clientEntry(import.meta.url, …)` from
   `@remix-run/ui` — the module naming itself, so there is no path to keep in
   step with a file name. Pass a **named** function: the name is the export the
   browser imports. Call `handle.update()` after changing state.
2. Import it into a page and place it, and set `export const hydrate = true` on
   that page.

There is no third step: `server/assets.ts` globs `islands/*.tsx`, so the file
being there is what makes it an entrypoint. A helper a few islands share goes in
a subdirectory — `islands/_lib/` — which the glob does not reach.

A page with `hydrate = false` ships no `<script>` at all — `/about` and the
blog listing have none.

A controller reads the same export. `server/blog/mod.tsx` builds its `Layout`
calls itself, so it writes `script={ArticlePage.hydrate ? clientRuntime : null}`
where `pageAction` would have — the flag still lives on the screen rather than
in the controller. Both read `clientRuntime` from `server/runtime.ts`, which
resolves it once; it is a file of its own rather than a `router.tsx` export
because `router.tsx` imports the blog, so the blog cannot import back.

### How the client code is compiled

Every island is a browser entrypoint, and all of them go into a _single_
`Deno.bundle({ codeSplitting: true })` call. A module more than one of them
imports comes out **once**, in a chunk they share:

```
client/hydration.js ─┬─→ chunk-…   the Remix UI runtime
islands/counter.js  ─┤
islands/total.js    ─┴─→ chunk-…   store.ts
```

The home page demonstrates why that matters. `counter.tsx` and `total.tsx` are
separate entrypoints that never reference each other; both import
`client/islands/store.ts`, and the running total tracks the buttons only because
that store was emitted once. Compile the entries independently — one bundler
call each — and each gets a private copy, so the total would sit at zero.

`client/hydration.ts` is an entrypoint like the islands, and the only script the
shell writes: it calls `run()`, which walks the document for the hydration
markers the server emitted and imports each island by the URL named there.

That URL is resolved on the server, by the `render()` middleware —
`clientEntry`'s id is the island's own module URL, and turning that into a chunk
URL needs both the deploy prefix and the bundler's output naming, neither of
which the browser has. The middleware asks the asset server for
`getScriptEntry(id)`, which answers both at once — the URL and the chunks under
it; before `remix@3.0.0-rc.3` it was `getHref(id)` and `getPreloads(id)`, two
calls for the same thing. The id is read only
there: `$entryId` is what `renderToStream` passes to the hook, and nothing in
the client runtime looks at it, which is why the same expression may mean a
`file:` URL on one side and a chunk URL on the other. Where the id carries no
`#ExportName`, the export is the component function's own name — which is why
every island is written as a named function.

Those preloads earn their keep twice: the browser fetches the whole graph while
the runtime is still starting, and the build's crawl gets a `<link>` per chunk
to follow. Without them the chunks are named only inside the hydration JSON,
where nothing looking for links can see them — and the build writes four assets
instead of thirty-eight.

### A custom element inside an island

`client/islands/share.tsx` is the line under every article, and the only place on
this site where a Remix island wraps something that is not a Remix component:
`<share-buttons>`, from
[`@kuboon/share-element`](https://jsr.io/@kuboon/share-element). Everything about
the buttons is the package's — X, LINE and Threads, the copy-URL button, and the
native share sheet where one exists. Everything about _where they go_ is this
site's, and that is the whole of what the island writes: a line, a label, and the
tag.

Three things are worth knowing about.

**The import is safe on the server.** The package registers the element wherever
there is a DOM and does nothing anywhere else, so the island can import it at the
top like any other module even though the build evaluates the file in Deno. On
the server `<share-buttons>` is just a tag and the row is written out empty; in
the browser the registration upgrades it and it fills itself in.

**The tag needs a type.** `JSX.IntrinsicElements` has no catch-all for
hyphenated names, so the island augments it:

```ts
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "share-buttons": HostProps<ShareButtonsElement>;
    }
  }
}
```

Naming the package's own element interface there is what makes `url` and `show`
checked like any other prop rather than accepted as an `any`.

**Nothing here passes a URL.** An empty `<share-buttons>` shares the page it is
on, read at the moment of the click — the one form of an article's address that
is right at the domain root, under a repo sub-path and on a PR preview alike, and
still right after a frame navigation, which is how this site moves between pages.

The row sits inline rather than behind a "Share" button because the package
collapses to the native share sheet alone on a touch device that has one: on a
phone this is a single button, and a single button behind another button is two
taps to reach one. On a desktop it is the five that are actually worth having
there.

The buttons' own colors are in `static/app.css` rather than in a `css(...)`
mixin, for a reason that is in the comment there: the package ships its defaults
as an unlayered `<style>`, and unlayered CSS outranks every `@layer` whatever
the specificity — so a rule in `app` would lose to a `:where()` selector.

### Links, and why the shell streams

Every URL lives in `client/routes.ts` as a `@remix-run/fetch-router` route map,
and links go through it:

```tsx
<a href={routes.about.href()}>About</a>;
```

The map is built with the deploy prefix as its base, so an href is already
correct under a repo sub-path or a PR preview URL — `route('', …)` gives
`/about`, `route('/repo/preview', …)` gives `/repo/preview/about` — and nothing
has to remember to prepend `base`. That is also why `home` needs no special
case: the base alone is the home path. Nothing enforces that a route points at a
page that exists, but nothing needs to: the build crawls the links it finds, so
a route with no page behind it fails the build.

The blog is in the map too, as `blog: { index: "/blog", show: "/blog/:slug" }`.
No list of articles belongs there — they are Markdown files discovered at build
time — but the shape of their URL does, so the listing links with
`routes.blog.show.href({ slug })`. That call percent-encodes the slug itself,
which is why nothing around it encodes anything.

Internal links are plain `<a href>`. On a page with an island the client runtime
is active, and it turns every internal `<a>` click into a frame navigation: it
fetches the destination and swaps the document in place. That works — the new
page's islands hydrate, the back button behaves, styles come with it — but only
because the shell renders through `renderToStream`.

`renderToString` is `renderToStream` with `stripFlushMarkers()` over the result,
and the marker it strips, `<!-- rmx:flush document -->`, is exactly how the
runtime recognises a whole document rather than a fragment. Serve pages without
it and an internal link changes the URL while leaving the page alone, silently:
no error, no console warning, and the fetch even returns 200. `context.render`
streams, which is the only reason a bare `<a>` is enough here.

If you ever do want a link to force a real document load — leaving the runtime
and all its state behind — mark that one `<a data-rmx-document>`.

### The two navigations the runtime should not have

`client/navigation-guard.ts` runs before both `run()` calls and hands two kinds
of navigation back to the browser:

- **A jump to a `#fragment` on the page you are already on**, which the browser
  answers by moving the scroll position. Intercepted, it fetches the whole page
  and reconciles it — one click on a chip in the UI showcase pulled the
  document again and re-hydrated eighteen islands to do what the browser does
  for free.
- **A reload**, which intercepted keeps the document and everything in it. A
  counter at 3 is still at 3 afterwards, which is not what anyone means by F5.

Remix's own documentation site ships the same guard in its browser entry, with
a comment saying to remove it once `remix/ui` ignores these itself — so check
it against the `@remix-run/ui` changelog when bumping the version, and delete
the file when it lands upstream.

## Base paths and GitHub Pages

A GitHub Pages _project_ site is served under a sub-path
(`https://<user>.github.io/<repo>/`), and per-PR previews add a further segment.
`client/base.ts` turns the `BASE_URL` the deploy workflow sets into that prefix;
the shell, the pages and the router all read it from there, and the build strips
it back off when writing so the output always lands at `dist/`'s root.

Locally `BASE_URL` is unset and the site is served from `/`. To preview a
sub-path deployment:

```sh
BASE_URL=http://localhost:8000/remix3-ssg-gh-pages deno task dev
```

`deno serve` prints the root URL, but with `BASE_URL` set the site lives under
the prefix — open <http://localhost:8000/remix3-ssg-gh-pages>.

### Which file answers which URL

GitHub Pages serves `/about` from `about.html`, and 404s `/about/` when only
that file exists. `server/router.tsx` states that rule as
`fileServer = githubPages()`, and the build writes the file it would reach for.
Deploying somewhere with different rules is a matter of exporting a different
behavior.

The dev server does not emulate the host — it answers the URLs the routes
declare, which is the same set for every rule that matters here: `/about` is a
route, `/about/` is not, and neither is `/about.html`. The one thing Pages is
more forgiving about is that last one, serving a page at the file's own name
too; a link written that way fails the build here instead, which is the more
useful direction to be wrong in.

Deployment is wired up in `.github/workflows/pages.yml` at the repository root.
