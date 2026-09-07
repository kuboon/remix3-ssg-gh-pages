/**
 * The document shell — this site's, not the framework's.
 *
 * It also carries the one thing the browser cannot work out for itself: the map from an island's
 * name to the chunk the bundler emitted, plus the scripts that load them. A page that places no
 * island gets neither, and so ships no JavaScript at all.
 *
 * The shell's own CSS is right here too, as `css(...)` mixins. The renderer collects the mixins
 * the page rendered and writes them into `<head>`, so nothing below has a class name that has to
 * agree with a file somewhere else.
 *
 * `htmlDocument` is what turns the tree below into a response: the doctype, the content type, and
 * — the part that matters here — `renderToStream` rather than `renderToString`. The runtime turns
 * every internal `<a>` click into a frame navigation and swaps the document only when it finds
 * `<!-- rmx:flush document -->` at the end, which `renderToString` strips; without it the URL
 * changes while the page does not, with no error anywhere. Going through the helper is what keeps
 * a plain `<a href>` working on a page with islands as well as on one without.
 *
 * The one stylesheet it does link is `static/app.css`: the site's tokens, its document-level defaults,
 * and the `@layer base, rmx, app` statement the whole cascade hangs off. Its position in the head
 * matters — layers rank by where they are first named, and Remix appends its collected styles just
 * before `</head>`, so the link has to come first.
 */

import { css, type RemixNode } from "@remix-run/ui";
import { htmlDocument } from "@kuboon/remix-ssg/site";

import { assets, resolveClientEntry } from "./assets.ts";
import { base } from "../client/base.ts";
import { routes } from "../client/routes.ts";
import { color, contentWidth } from "../client/tokens.ts";

/** What every page hands the shell. */
export interface LayoutProps {
  title: string;
  description?: string;
  /**
   * Whether this page places a client entry.
   *
   * The shell has to be told, because it cannot find out: the entries are resolved while the tree
   * renders, and by then the `<script>` that boots them has already been written. A page that says
   * nothing gets no script at all, which is what keeps an article free of JavaScript.
   */
  hydrate?: boolean;
  children: RemixNode;
}

/**
 * Renders a page inside the document shell.
 *
 * @param props The page's title, body, and whether it hydrates
 * @returns The response to serve for this page
 */
export function renderPage(props: LayoutProps): Response {
  return htmlDocument(
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{props.title}</title>
        {props.description
          ? <meta name="description" content={props.description} />
          : null}
        <link rel="stylesheet" href={`${base}/static/app.css`} />
        <link rel="icon" href={`${base}/static/favicon.svg`} />
      </head>
      <body>
        <header mix={[bandStyle, headerStyle]}>
          <a mix={brandStyle} href={routes.home.href()}>remix-ssg</a>
          <nav mix={navStyle}>
            <a href={routes.home.href()}>Home</a>
            <a href={routes.about.href()}>About</a>
            <a href={routes.blog.index.href()}>Blog</a>
            {/* Showcase: delete this link when you delete the showcase — see README. */}
            <a href={routes.showcase.href()}>UI showcase</a>
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
        {props.hydrate
          ? (
            <script
              type="module"
              src={assets.entryUrl("hydration.ts")}
            >
            </script>
          )
          : null}
      </body>
    </html>,
    { resolveClientEntry },
  );
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
