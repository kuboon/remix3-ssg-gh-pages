/**
 * The home page.
 *
 * It places two islands, so it is handed the name -> chunk map the bundler produced and picks the
 * two it needs; a page that places none is handed nothing.
 */

import { css } from "@remix-run/ui";

import { renderPage } from "../layout.tsx";
import { routes } from "../routes.ts";
import { buttonStyle, cardStyle } from "../lib/theme.ts";
import { color } from "../lib/tokens.ts";
import { Counter } from "../islands/counter.tsx";
import { Total } from "../islands/total.tsx";

/**
 * Renders the home page.
 *
 * @param islandUrls Name -> chunk URL for every island on the site
 * @returns The action `router.ts` maps to {@link routes.home}
 */
export function homeAction(islandUrls: Record<string, string>): () => Response {
  return () =>
    renderPage({
      title: "remix-ssg — a static site starter",
      description:
        "A Remix v3 static-site-generation starter for GitHub Pages.",
      islandUrls: pick(islandUrls, "counter", "total"),
      children: (
        <>
          <h1>A static site, rendered by your own handler</h1>
          <p mix={leadStyle}>
            This starter serves <a href="https://remix.run">Remix v3</a>{" "}
            pages from a handler you write in <code>router.ts</code>, and{" "}
            <a href="https://jsr.io/@kuboon/remix-ssg">@kuboon/remix-ssg</a>
            {" "}
            crawls that same handler into static HTML for GitHub Pages.
          </p>
          <ul mix={featureListStyle}>
            <li>Server-rendered pages — zero client JavaScript by default.</li>
            <li>
              Content authored in Markdown, rendered with{" "}
              <a href="https://jsr.io/@kuboon/md">@kuboon/md</a>{" "}
              by a transform this site owns.
            </li>
            <li>
              Works at the domain root, a repo sub-path, or a PR preview URL.
            </li>
            <li>Opt into interactivity per page with hydrated islands.</li>
          </ul>
          <section mix={cardStyle}>
            <h2>Two islands, one shared module</h2>
            <p>
              Both controls below are server-rendered like every other page,
              then hydrated in the browser — view source and you'll find them
              already in the initial HTML.
            </p>
            <p>
              They are <em>separate browser entrypoints</em>{" "}
              that never talk to each other. Each one imports the same click
              store, and the running total keeps up because the bundler emitted
              that store once, into a chunk they share. Compile the two entries
              independently and each gets a private copy — the total would sit
              at zero forever.
            </p>
            <div mix={demoRowStyle}>
              <Counter label="Left" start={0} />
              <Counter label="Right" start={0} />
              <Total label="Shared total" />
            </div>
          </section>
          <p>
            <a mix={buttonStyle} href={routes.blog.index.href()}>
              Read the blog →
            </a>
          </p>
        </>
      ),
    });
}

/** The chunks for the islands this page places, and no others. */
function pick(
  islandUrls: Record<string, string>,
  ...names: readonly string[]
): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const name of names) {
    const chunk = islandUrls[name];
    if (chunk === undefined) throw new Error(`No island named "${name}".`);
    picked[name] = chunk;
  }
  return picked;
}

// --- styles -----------------------------------------------------------------

const leadStyle = css({
  fontSize: "1.15rem",
  color: color.muted,
});

const featureListStyle = css({
  paddingLeft: "1.1rem",
  "& li": { marginBlock: "0.4rem" },
});

const demoRowStyle = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "0.75rem",
});
