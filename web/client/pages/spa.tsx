/**
 * Client-side routing inside a statically generated site.
 *
 * DELETE ME in a repository made from this template: this page, `client/spa/`, its route in
 * `routes.ts`, its import and action in `server/router.ts`, the frame resolver in `hydration.ts`,
 * and the nav link in `layout.tsx`. See the root README.
 *
 * The question it answers is the one a static site raises the moment it has more than one page: the
 * default here is a *soft* navigation — the runtime fetches the next page's HTML and swaps the
 * document — which is already fast, and is what every other link on this site does. What it is not
 * is client-side routing: the markup still comes from a request.
 *
 * So this page is the smaller thing underneath: one named `<Frame>`, three links that target it,
 * and a resolver in the browser that answers with a component tree instead of a fetch. The page
 * around the frame is untouched by a view change; only the panel is replaced.
 *
 * It stays a real part of the static site throughout. Each of the three URLs is server-rendered
 * with its panel already in it, so a cold open or a reload is a static file and not a spinner, and
 * the three `<a href>`s below are what the build's crawler reads to find out that those URLs exist.
 * That last part is the reason the links are anchors with real hrefs: a crawler reads HTML, it does
 * not run the page, so a route reachable only through client code would never be generated.
 */

import { css, Frame, link, type RemixNode } from "@remix-run/ui";

import { routes } from "../routes.ts";
import { SPA_FRAME } from "../spa/frame.ts";
import { SPA_IDS, spaHeading, type SpaId } from "../spa/panel.tsx";
import { color, radius } from "../tokens.ts";

export const title = "Client-side routing — remix-ssg";
export const description =
  "Three URLs served as static HTML, swapped in the browser with no request: " +
  "one named frame, a resolver that returns components instead of fetching, " +
  "and links the build's crawler can still read.";

/** The page holds a frame the runtime drives, so the shell boots the runtime for it. */
export const hydrate = true;

/** The `<title>` for one view, so each of the three URLs is its own page. */
export function titleFor(id: SpaId): string {
  return `${spaHeading(id)} — SPA — remix-ssg`;
}

/**
 * The page around the frame.
 *
 * @param current The view the URL names — the frame's initial source
 * @returns The page body
 */
export default function SpaPage(current: SpaId): RemixNode {
  return (
    <>
      <h1>Client-side routing</h1>
      <p mix={leadStyle}>
        Three URLs, one frame. The panel below is replaced in the browser
        without a request going out, and each of the three is still its own
        static file.
      </p>

      <nav mix={tabsStyle} aria-label="SPA views">
        {SPA_IDS.map((id) => (
          <a
            key={id}
            mix={[
              tabStyle,
              // `link()` on an anchor is the attributes and nothing else: the `href` stays a real
              // one, and `data-rmx-target` is what sends the navigation to the frame below rather
              // than to the document. Before the runtime loads — and for the build's crawler —
              // this is an ordinary link to an ordinary page.
              link(routes.spa.show.href({ id }), { target: SPA_FRAME }),
            ]}
            aria-current={id === current ? "page" : undefined}
          >
            View {id}
          </a>
        ))}
      </nav>

      {
        /*
        The frame's initial content is not written here. The runtime resolves `src` when the page
        renders — on the server that is a sub-request the action answers with the panel alone (see
        `server/router.ts`), and in the browser it is the resolver in `hydration.ts`.
      */
      }
      <Frame name={SPA_FRAME} src={routes.spa.show.href({ id: current })} />
    </>
  );
}

// --- styles -----------------------------------------------------------------

const leadStyle = css({ fontSize: "1.15rem", color: color.muted });

const tabsStyle = css({
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem",
  marginBlock: "1.5rem",
});

const tabStyle = css({
  padding: "0.4rem 0.9rem",
  border: `1px solid ${color.border}`,
  borderRadius: radius.md,
  textDecoration: "none",
  color: color.fg,
  "&:hover": { borderColor: color.accent },
  "&[aria-current='page']": {
    background: color.accent,
    borderColor: color.accent,
    color: color.onAccent,
    fontWeight: 600,
  },
});
