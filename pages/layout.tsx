/**
 * The document shell — this site's, not the framework's.
 *
 * It also carries the one thing the browser cannot work out for itself: the map from an island's
 * name to the chunk the bundler emitted, plus the scripts that load them. A page that places no
 * island gets neither, and so ships no JavaScript at all.
 *
 * The shell's own CSS is right here too, as `css(...)` mixins. `renderToString` collects the
 * mixins the page rendered and writes them into `<head>`, so there is no stylesheet to link and
 * nothing to keep in sync with the markup below.
 */

import { renderToString } from "@remix-run/ui/server";
import { css, type RemixNode } from "@remix-run/ui";
import { ISLAND_MAP_ELEMENT_ID } from "@kuboon/remix-ssg/client";

import { Link } from "./lib/link.tsx";
import { bodyStyle, documentStyle } from "./lib/theme.ts";
import { color, contentWidth } from "./lib/tokens.ts";

/** What every page hands the shell. */
export interface LayoutProps {
  title: string;
  description?: string;
  /** Deploy path prefix, so every URL in the shell carries it. */
  base: string;
  /** Name -> chunk URL for the islands this page places. Empty on a page with none. */
  islandUrls: Record<string, string>;
  children: RemixNode;
}

/**
 * Renders a page inside the document shell.
 *
 * @param props The page's title, prefix, islands and body
 * @returns The complete HTML document
 */
export async function renderPage(props: LayoutProps): Promise<string> {
  const { base, islandUrls } = props;
  const chunks = [...new Set(Object.values(islandUrls))];
  const home = base === "" ? "/" : base;

  const html = await renderToString(
    <html lang="en" mix={documentStyle}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{props.title}</title>
        {props.description
          ? <meta name="description" content={props.description} />
          : null}
        <link rel="icon" href={`${base}/static/favicon.svg`} />
      </head>
      <body mix={bodyStyle}>
        <header mix={[bandStyle, headerStyle]}>
          <Link mix={brandStyle} href={home}>remix-ssg</Link>
          <nav mix={navStyle}>
            <Link href={home}>Home</Link>
            <Link href={`${base}/about`}>About</Link>
            <Link href={`${base}/blog`}>Blog</Link>
            {/* Showcase: delete this link when you delete the showcase — see README. */}
            <Link href={`${base}/showcase`}>UI showcase</Link>
          </nav>
        </header>
        <main mix={[bandStyle, mainStyle]}>{props.children}</main>
        <footer mix={[bandStyle, footerStyle]}>
          <p>
            Built with{" "}
            <a href="https://jsr.io/@kuboon/remix-ssg">@kuboon/remix-ssg</a> and
            {" "}
            <a href="https://remix.run">Remix v3</a>.
          </p>
        </footer>
        {chunks.length > 0
          ? (
            <>
              <script type="application/json" id={ISLAND_MAP_ELEMENT_ID}>
                {JSON.stringify(islandUrls)}
              </script>
              {chunks.map((src) => (
                <script key={src} type="module" src={src}></script>
              ))}
            </>
          )
          : null}
      </body>
    </html>,
  );

  return `<!DOCTYPE html>${html}`;
}

// --- styles -----------------------------------------------------------------

/**
 * The measure the header, the main column and the footer all share.
 *
 * A stylesheet would say this with a grouped selector; here each band composes it, because `mix`
 * takes an array and the classes stack in the order they are listed.
 */
const bandStyle = css({
  width: "100%",
  maxWidth: contentWidth,
  marginInline: "auto",
  paddingInline: "1.25rem",
});

const headerStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  flexWrap: "wrap",
  paddingBlock: "1.25rem",
  borderBottom: `1px solid ${color.border}`,
});

const brandStyle = css({
  fontWeight: 700,
  fontSize: "1.1rem",
  textDecoration: "none",
  color: color.fg,
});

const navStyle = css({
  display: "flex",
  flexWrap: "wrap",
  gap: "1rem",
});

const mainStyle = css({ paddingBlock: "2.5rem" });

const footerStyle = css({
  paddingBlock: "2rem",
  borderTop: `1px solid ${color.border}`,
  color: color.muted,
  fontSize: "0.9rem",
});
