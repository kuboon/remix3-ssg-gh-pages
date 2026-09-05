/**
 * `.md` pages: a Markdown article with YAML front-matter.
 *
 * The framework never sees Markdown — this transform and its dependencies are the site's, which is
 * what keeps `@kuboon/md` out of the generator. Articles are text, so they place no islands and
 * ship no JavaScript.
 */

import type { FileTransform } from "@kuboon/remix-ssg/site";

import { parseArticle } from "../lib/articles.ts";
import { renderMarkdown } from "../lib/markdown.ts";
import { renderPage } from "../layout.tsx";
import { routes } from "../lib/routes.ts";
import { metaStyle, proseStyle } from "../lib/theme.ts";

export function markdown(context: { base: string }): FileTransform {
  return {
    match: (relativePath) => relativePath.endsWith(".md"),

    path: (relativePath) => {
      const withoutExtension = relativePath.replace(/\.md$/, "").replace(
        /(^|\/)index$/,
        "",
      );
      return `/${withoutExtension}`.replace(/\/$/, "") || "/";
    },

    async render(file) {
      const slug = file.path.replace(/\.md$/, "").split("/").pop() ?? file.path;
      const article = parseArticle(slug, await Deno.readTextFile(file.url));
      const body = await renderMarkdown(article.body);

      return renderPage({
        title: `${article.title} — remix-ssg`,
        description: article.summary,
        base: context.base,
        islandUrls: {},
        children: (
          <article mix={proseStyle}>
            <h1>{article.title}</h1>
            {article.date
              ? (
                <time mix={metaStyle} datetime={article.date}>
                  {article.date}
                </time>
              )
              : null}
            {body}
            <p>
              <a href={routes.blog.index.href()}>← All posts</a>
            </p>
          </article>
        ),
      });
    },
  };
}
