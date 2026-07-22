---
title: Adding an article
date: "2026-07-20"
summary: Drop a Markdown file in content/ — the crawler does the rest.
---

Articles are Markdown files in `content/`. To add one, create a new `.md` file
there with `title`, `date`, and `summary` frontmatter, then write the body.

## How it shows up

The blog index reads every file in `content/`, sorts them by date, and links to
each one at `/blog/<filename>`. Because the static build discovers pages by
following links, a new article appears in the output as soon as it is listed on
an already-reachable page.

## Authoring tips

- The frontmatter `title` is used for the page `<title>` and the index list.
- Start the body at `##`; the layout renders the `title` as the page heading.
- Any raw HTML in the Markdown is stripped during sanitization.
