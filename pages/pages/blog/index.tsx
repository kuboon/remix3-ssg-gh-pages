/**
 * The article listing.
 *
 * It is handed the articles rather than reading them: `mod.ts` owns the files, this owns the
 * screen. What it renders is what makes the articles part of the site, though — the crawl writes
 * what something links to, so an article missing from here is an article missing from `dist/`.
 */

import { css, type RemixNode } from "@remix-run/ui";

import type { Article } from "./mod.ts";
import { routes } from "../../routes.ts";
import { metaStyle } from "../../lib/theme.ts";
import { color } from "../../lib/tokens.ts";

export const title = "Blog — remix-ssg";
export const description =
  "Articles authored in Markdown, rendered to static HTML.";

/**
 * @param articles The articles, in the order they should be listed
 * @returns The listing
 */
export default function BlogIndex(articles: Article[]): RemixNode {
  return (
    <>
      <h1>Blog</h1>
      <ul mix={postListStyle}>
        {articles.map((article) => (
          <li key={article.slug}>
            <a
              mix={postTitleStyle}
              href={routes.blog.show.href({ slug: article.slug })}
            >
              {article.title}
            </a>
            {article.date
              ? (
                <time mix={metaStyle} datetime={article.date}>
                  {article.date}
                </time>
              )
              : null}
            <p mix={summaryStyle}>{article.summary}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

// --- styles -----------------------------------------------------------------

const postListStyle = css({
  listStyle: "none",
  padding: 0,
  "& li": {
    paddingBlock: "1rem",
    borderBottom: `1px solid ${color.border}`,
  },
});

const postTitleStyle = css({
  fontSize: "1.2rem",
  fontWeight: 600,
});

const summaryStyle = css({ marginBlock: "0.3rem 0" });
