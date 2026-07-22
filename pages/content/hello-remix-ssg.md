---
title: Hello, remix-ssg
date: "2026-07-21"
summary: How this site is rendered to static HTML at build time.
---

This article is a Markdown file in `content/`. Its metadata comes from the YAML
frontmatter above; the body is rendered to HTML by
[`@kuboon/md`](https://jsr.io/@kuboon/md) and dropped into the shared layout.

## Rendered on the server

The page was produced by a `remix/fetch-router` route and written to disk as
static HTML by [`@kuboon/remix-ssg`](https://jsr.io/@kuboon/remix-ssg) — no
client-side JavaScript required.

The build drives the router in-process with `router.fetch()`, then crawls the
links in the rendered HTML to discover every page.

## Code, tables, and more

GitHub-flavored Markdown works out of the box, including syntax-highlighted
code:

```ts
export function greet(name: string): string {
  return `Hello, ${name}!`;
}
```

| Feature   | Supported |
| --------- | :-------: |
| Tables    |     ✓     |
| Task list |     ✓     |
