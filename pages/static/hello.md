# Markdown, rendered to HTML

This page is a Markdown file in `static/`, served through `serveStatic` and
converted to HTML at build time by [`@kuboon/md`](https://jsr.io/@kuboon/md). It
is captured as a static page by the pre-render crawl like any other route.

## Features

GitHub-flavored Markdown works out of the box:

- **bold**, _italic_, and `inline code`
- [links](https://remix.run)
- task lists

  - [x] parse Markdown
  - [x] sanitize HTML
  - [ ] your next page

| Feature   | Supported |
| --------- | :-------: |
| Tables    |     ✓     |
| Autolinks |     ✓     |

## Code highlighting

Fenced code blocks are highlighted with Shiki:

```ts
export function greet(name: string): string {
  return `Hello, ${name}!`;
}
```

Every heading also gets a stable `id` and a self-link, and any raw HTML in the
source is stripped during sanitization.
