/**
 * The blog: the Markdown articles, and everything it takes to serve them.
 *
 * This module *is* the blog. It sits in the directory the articles are in, so the files it serves
 * are its own siblings and `import.meta.dirname` is the only path involved — there is no article
 * directory written down in `router.ts` for this file to fall out of step with.
 *
 * Everything Markdown is here: the front-matter shape, the parser, the renderer, the listing and
 * the article page. `@kuboon/md` and `@std/front-matter` are imported from nowhere else, which is
 * what keeps Markdown out of the generator — it serves what this site's own code returns.
 *
 * `router.ts` maps the whole `routes.blog` group to `blogController`, so an article is a route like
 * any other page rather than a file served off disk. That is also why this `.tsx` is safe to keep
 * beside the `.md` files: nothing serves the directory, so nothing can serve the source.
 */

import { createController } from "@remix-run/fetch-router";
import { css, type RemixNode } from "@remix-run/ui";
import { markdownToHast } from "@kuboon/md";
import { hastToRemix } from "@kuboon/md/hast_to_remix.ts";
import { extract } from "@std/front-matter/yaml";

import { renderPage } from "../../layout.tsx";
import { routes } from "../../routes.ts";
import { metaStyle, proseStyle } from "../../lib/theme.ts";
import { color } from "../../lib/tokens.ts";

/** Where the articles are: right here, next to this file. */
const articlesDir = import.meta.dirname!;

/** A Markdown article: front-matter metadata plus the rendered body. */
interface Article {
  /** The file's name without its extension, which is also its URL segment. */
  slug: string;
  title: string;
  date: string;
  summary: string;
  /** The Markdown body, front-matter removed. */
  body: string;
}

// --- the files --------------------------------------------------------------

/**
 * The slug of every article on disk.
 *
 * Names only — no file is read — because that is all `blogPaths()` needs, and it is asked for every
 * article before anyone has asked for one. Synchronous for the same reason: the host indexes the
 * site's paths in one pass, with nowhere to await.
 *
 * @returns One slug per `.md` file
 */
function readSlugs(): string[] {
  const slugs: string[] = [];

  for (const entry of Deno.readDirSync(articlesDir)) {
    if (entry.isFile && entry.name.endsWith(".md")) {
      slugs.push(entry.name.replace(/\.md$/, ""));
    }
  }

  return slugs;
}

/**
 * Reads one article.
 *
 * A slug arrives from the URL, so it is checked before it becomes a file name: anything holding a
 * separator, and anything starting with a dot, is not the name of an article here. It is typed as
 * possibly missing because that is how a matched param reaches an action.
 *
 * @param slug The file's name without its extension
 * @returns The article, or `null` if there is no such file
 */
async function readArticle(slug: string | undefined): Promise<Article | null> {
  if (!slug || slug.startsWith(".") || /[/\\]/.test(slug)) return null;

  const text = await Deno.readTextFile(`${articlesDir}/${slug}.md`).catch(
    () => null,
  );
  if (text === null) return null;

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

/**
 * Every article, newest first.
 *
 * Read on each request rather than cached, so editing an article in the dev server is a reload
 * away — there are a handful of files, and the build reads them once.
 *
 * @returns The articles, sorted by date, descending
 */
async function listArticles(): Promise<Article[]> {
  const articles = await Promise.all(readSlugs().map(readArticle));

  return articles
    .filter((article): article is Article => article !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Renders an article body.
 *
 * `@kuboon/md` parses GitHub-flavored Markdown into a sanitized hast tree (heading anchors,
 * Shiki-highlighted code, tables, task lists) and `hastToRemix` converts it to `@remix-run/ui`
 * elements. That converter is its own entry point, so importing `@kuboon/md` does not put a UI
 * framework in the graph of anyone who only wants HTML out.
 *
 * @param markdown The Markdown body, front-matter already removed
 * @returns The body as a node tree, ready to place in a page
 */
async function renderMarkdown(markdown: string): Promise<RemixNode> {
  return hastToRemix(await markdownToHast(markdown)) as RemixNode;
}

// --- the pages --------------------------------------------------------------

/**
 * The article listing.
 *
 * It builds itself from the files rather than from a list someone maintains, which is what keeps
 * the framework free of a content model — and it is also what makes every article reachable, since
 * the crawl only writes what something links to.
 *
 * @returns The listing
 */
async function BlogIndex(): Promise<RemixNode> {
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

/**
 * One article.
 *
 * Text only: it places no client entry, so the page ships no JavaScript at all.
 *
 * @param article The article, front-matter parsed
 * @returns The article page
 */
async function BlogArticle(article: Article): Promise<RemixNode> {
  const body = await renderMarkdown(article.body);

  return (
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
  );
}

// --- the routes -------------------------------------------------------------

/** Both blog routes, for `router.map(routes.blog, blogController)`. */
export const blogController = createController(routes.blog, {
  actions: {
    index: async () =>
      renderPage({
        title: "Blog — remix-ssg",
        description: "Articles authored in Markdown, rendered to static HTML.",
        children: await BlogIndex(),
      }),

    show: async ({ params }) => {
      const article = await readArticle(params.slug);
      // A `404` reads as "not mine" to `compose`, which is what an unknown slug is.
      if (article === null) {
        return new Response("Not Found", {
          status: 404,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }

      return renderPage({
        title: `${article.title} — remix-ssg`,
        description: article.summary,
        children: await BlogArticle(article),
      });
    },
  },
});

/**
 * Every URL the blog answers.
 *
 * The site's paths are file-shaped — that is how the host indexes them — so the slug goes in as it
 * is on disk, not as `href()` percent-encodes it for a link.
 *
 * @returns The listing's path, and one per article
 */
export function blogPaths(): string[] {
  return [
    routes.blog.index.href(),
    ...readSlugs().map((slug) =>
      decodeURIComponent(routes.blog.show.href({ slug }))
    ),
  ];
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
