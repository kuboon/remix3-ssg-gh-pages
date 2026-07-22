import { extract } from "@std/front-matter/yaml";
import { fromFileUrl, join } from "@std/path";

/** Directory of Markdown articles (`content/*.md`). */
const CONTENT_DIR = fromFileUrl(new URL("../content/", import.meta.url));

/** A Markdown article: frontmatter metadata plus the Markdown body. */
export interface Article {
  slug: string;
  title: string;
  date: string;
  summary: string;
  /** The Markdown body (frontmatter removed). */
  body: string;
}

function parse(slug: string, text: string): Article {
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

/** Reads one article by slug, or `undefined` if there is no such file. */
export async function getArticle(slug: string): Promise<Article | undefined> {
  if (!slug || slug.includes("/") || slug.includes("..")) return undefined;
  try {
    return parse(
      slug,
      await Deno.readTextFile(join(CONTENT_DIR, `${slug}.md`)),
    );
  } catch {
    return undefined;
  }
}

/** Reads every article in `content/`, newest first. */
export async function listArticles(): Promise<Article[]> {
  const articles: Article[] = [];
  for await (const entry of Deno.readDir(CONTENT_DIR)) {
    if (!entry.isFile || !entry.name.endsWith(".md")) continue;
    articles.push(
      parse(
        entry.name.replace(/\.md$/, ""),
        await Deno.readTextFile(join(CONTENT_DIR, entry.name)),
      ),
    );
  }
  return articles.sort((a, b) => b.date.localeCompare(a.date));
}
