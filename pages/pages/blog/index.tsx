import { css, type RemixNode } from "@remix-run/ui";

import { type Article, parseArticle } from "../../lib/articles.ts";
import { routes } from "../../lib/routes.ts";
import { metaStyle } from "../../lib/theme.ts";
import { color } from "../../lib/tokens.ts";

export const title = "Blog — remix-ssg";
export const description =
  "Articles authored in Markdown, rendered to static HTML.";

/**
 * Reads every article, newest first.
 *
 * The articles are this file's siblings, so it asks for its own directory rather than being told
 * where `pages/blog/` is — a path spelled out in another module is a copy of the layout that can
 * fall out of step with it. `Deno.readDir` and `Deno.readTextFile` both take a `URL`, so the
 * directory never has to become a string on the way (`.pathname` would percent-encode a space in
 * the checkout path, and this way nothing can).
 *
 * A file name has to be encoded before it joins that URL, though. It is a literal name, not a URL
 * fragment, and `new URL('release notes #2.md', dir)` reads the `#` as the start of a fragment and
 * asks for `release notes ` instead.
 */
async function listArticles(): Promise<Article[]> {
  const dir = new URL("./", import.meta.url);
  const articles: Article[] = [];

  for await (const entry of Deno.readDir(dir)) {
    if (!entry.isFile || !entry.name.endsWith(".md")) continue;
    articles.push(
      parseArticle(
        entry.name.replace(/\.md$/, ""),
        await Deno.readTextFile(new URL(encodeURIComponent(entry.name), dir)),
      ),
    );
  }

  return articles.sort((a, b) => b.date.localeCompare(a.date));
}

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
