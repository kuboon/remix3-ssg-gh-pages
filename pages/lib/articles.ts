/**
 * What a blog article *is*.
 *
 * The framework has no content model — it serves files through the transforms this site provides —
 * so the shape of an article and the reading of its front-matter live here, shared by the transform
 * that renders one and the index page that lists them.
 *
 * Where the articles are is deliberately not here. `pages/blog/index.tsx` is already in that
 * directory and finds its siblings through `import.meta.url`, which is one fewer path to keep in
 * agreement with the layout.
 */

import { extract } from "@std/front-matter/yaml";

/** A Markdown article: front-matter metadata plus the Markdown body. */
export interface Article {
  /** The file's name without its extension, which is also its URL segment. */
  slug: string;
  title: string;
  date: string;
  summary: string;
  /** The Markdown body, front-matter removed. */
  body: string;
}

/**
 * Parses one article.
 *
 * @param slug The file's name without its extension
 * @param text The file's contents
 * @returns The article
 */
export function parseArticle(slug: string, text: string): Article {
  const { attrs, body } = extract(text);
  const a = attrs as Record<string, unknown>;

  return {
    slug,
    title: typeof a.title === "string" ? a.title : slug,
    date: typeof a.date === "string" ? a.date : "",
    summary: typeof a.summary === "string" ? a.summary : "",
    body,
  };
}
