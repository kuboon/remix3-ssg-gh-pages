import { css, type RemixNode } from "@remix-run/ui";

import { type Article, parseArticle } from "../lib/articles.ts";
import { routes } from "../routes.ts";
import { metaStyle } from "../lib/theme.ts";
import { color } from "../lib/tokens.ts";

/**
 * Reads every article, newest first.
 *
 * `router.ts` says where the articles are, because it is already saying it to the file tree that
 * serves them — one statement, two readers, and no path here that could fall out of step with it.
 */
async function listArticles(dir: string): Promise<Article[]> {
  const articles: Article[] = [];

  for await (const entry of Deno.readDir(dir)) {
    if (!entry.isFile || !entry.name.endsWith(".md")) continue;
    articles.push(
      parseArticle(
        entry.name.replace(/\.md$/, ""),
        await Deno.readTextFile(`${dir}/${entry.name}`),
      ),
    );
  }

  return articles.sort((a, b) => b.date.localeCompare(a.date));
}

export const title = "Blog — remix-ssg";
export const description =
  "Articles authored in Markdown, rendered to static HTML.";

/**
 * The article listing.
 *
 * It builds itself from the files rather than from a list someone maintains, which is what keeps
 * the framework free of a content model — and it is also what makes every article reachable, since
 * the crawl only writes what something links to.
 *
 * @param articlesDir Directory holding the `.md` articles, from `router.ts`
 * @returns The listing
 */
export default async function Blog(articlesDir: string): Promise<RemixNode> {
  const articles = await listArticles(articlesDir);

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
