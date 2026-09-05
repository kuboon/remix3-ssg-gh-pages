import { css, type RemixNode } from "@remix-run/ui";

import { base } from "../../lib/base.ts";
import { listArticles } from "../../lib/articles.ts";
import { Link } from "../../lib/link.tsx";
import { metaStyle } from "../../lib/theme.ts";
import { color } from "../../lib/tokens.ts";

export const title = "Blog — remix-ssg";
export const description =
  "Articles authored in Markdown, rendered to static HTML.";

/**
 * A page that builds itself from content.
 *
 * It reads the sibling `.md` files rather than being handed a list, which is what keeps the
 * framework free of a content model — and it is also what makes every article reachable, since the
 * crawl only writes what something links to.
 */
export default async function Blog(): Promise<RemixNode> {
  const articles = await listArticles();

  return (
    <>
      <h1>Blog</h1>
      <ul mix={postListStyle}>
        {articles.map((article) => (
          <li key={article.slug}>
            <Link
              mix={postTitleStyle}
              href={`${base}/blog/${encodeURIComponent(article.slug)}`}
            >
              {article.title}
            </Link>
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
