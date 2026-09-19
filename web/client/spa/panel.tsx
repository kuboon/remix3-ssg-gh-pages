/**
 * The one screen the SPA demo swaps, and the three URLs it answers.
 *
 * SPA demo: delete this file when you delete the demo — see README.
 *
 * This module is rendered twice over, by two different runtimes, and that is the whole point of it:
 *
 * - on the server, by the action in `server/router.ts`, which is what puts the panel in the static
 *   HTML of `/spa/1`, `/spa/2` and `/spa/3`;
 * - in the browser, by the frame resolver in `hydration.ts`, which returns this node instead of
 *   fetching anything when the reader moves between those three URLs.
 *
 * So it imports nothing either half lacks — no `Deno`, no `document` — and takes where it is
 * rendered as a prop rather than sniffing for it, which is also what lets the page say so out loud.
 */

import { css, type RemixNode } from "@remix-run/ui";

import { color, radius } from "../tokens.ts";

/** The demo's three views. The URL for each is `/spa/<id>`. */
export const SPA_IDS = ["1", "2", "3"] as const;

/** One of {@link SPA_IDS}. */
export type SpaId = typeof SPA_IDS[number];

/** Which runtime built a given render of the panel. */
export type RenderedBy = "server" | "client";

/**
 * Narrows a URL segment to one of the demo's views.
 *
 * The parameter is typed as possibly missing because that is how a matched route param reaches an
 * action, and anything that is not one of the three is not a view of this demo.
 *
 * @param value The `:id` segment, as the router matched it
 * @returns The view, or `null` when there is no such view
 */
export function parseSpaId(value: string | undefined): SpaId | null {
  return (SPA_IDS as readonly string[]).includes(value ?? "")
    ? value as SpaId
    : null;
}

/**
 * The view a frame source names.
 *
 * The frame resolver is handed a URL rather than a matched route — it is the browser's half of the
 * routing, and there is no router there — so this is where `/repo/spa/2` becomes `"2"`. The base is
 * a placeholder: `src` is same-origin and already absolute by the time a frame reload hands it
 * over, and only the last segment is read either way.
 *
 * @param src The frame's source URL
 * @returns The view, or `null` when the URL is not one of the demo's
 */
export function spaIdFromSrc(src: string): SpaId | null {
  let pathname: string;
  try {
    pathname = new URL(src, "http://localhost").pathname;
  } catch {
    return null;
  }

  return parseSpaId(pathname.replace(/\/+$/, "").split("/").pop());
}

/** What each view says. The heading is also the page's title, so it is written once. */
const views: Record<SpaId, { heading: string; body: RemixNode }> = {
  "1": {
    heading: "One frame, three URLs",
    body: (
      <>
        <p>
          The panel you are reading is a named <code>&lt;Frame&gt;</code>{" "}
          — the rest of the page (the shell, the heading, the three links above)
          is outside it and never re-renders. The links carry{" "}
          <code>data-rmx-target="spa"</code>, which is how the Remix runtime
          knows to reload this frame rather than swap the document.
        </p>
        <p>
          Go to view 2 and watch the badge above change. Then reload the page
          and watch it change back.
        </p>
      </>
    ),
  },
  "2": {
    heading: "Nothing was fetched",
    body: (
      <>
        <p>
          A frame reload normally fetches its source as HTML. This one does not:
          {" "}
          <code>client/hydration.ts</code> passes <code>run()</code> a{" "}
          <code>resolveFrame</code>{" "}
          that recognises this frame's name and returns a component tree instead
          of a response. Open the network panel and click between the three
          views — nothing goes out.
        </p>
        <p>
          The URL still changes, and back and forward still work, because the
          runtime drives all of it through the browser's Navigation API.
        </p>
      </>
    ),
  },
  "3": {
    heading: "Still three static files",
    body: (
      <>
        <p>
          <code>/spa/1</code>, <code>/spa/2</code> and <code>/spa/3</code>{" "}
          are each their own <code>index.html</code> in{" "}
          <code>web/dist</code>. The build never runs this demo's client code;
          it finds the three URLs the way it finds every other page, by reading
          the three <code>&lt;a href&gt;</code>{" "}
          above out of the rendered HTML. That is why they are ordinary links
          with real <code>href</code>s and not click handlers.
        </p>
        <p>
          So a cold open of <code>/spa/3</code>{" "}
          is a static file with this panel already in it, and the client routing
          only takes over once the runtime has loaded.
        </p>
      </>
    ),
  },
};

/** The heading a view is titled with, for the `<title>` and the social card. */
export function spaHeading(id: SpaId): string {
  return views[id].heading;
}

/** What the panel is handed. */
export interface SpaPanelProps {
  id: SpaId;
  /**
   * Which runtime built this render.
   *
   * Handed in rather than detected: both halves of the demo call this function, and a panel that
   * guessed would be demonstrating the guess rather than the routing.
   */
  renderedBy: RenderedBy;
}

/**
 * One view of the SPA demo.
 *
 * @param props The view to show, and which runtime is showing it
 * @returns The panel's contents, for the frame to hold
 */
export function SpaPanel(props: SpaPanelProps): RemixNode {
  const view = views[props.id];

  return (
    <section mix={panelStyle}>
      <p mix={badgeStyle}>
        {props.renderedBy === "server"
          ? "server-rendered — this is what the static file contains"
          : "rendered in the browser — no request was made"}
      </p>
      <h2 mix={headingStyle}>{view.heading}</h2>
      {view.body}
    </section>
  );
}

// --- styles -----------------------------------------------------------------

const panelStyle = css({
  padding: "1.25rem",
  border: `1px solid ${color.border}`,
  borderRadius: radius.lg,
  background: color.card,
  "& > :last-child": { marginBottom: 0 },
});

const badgeStyle = css({
  display: "inline-block",
  margin: 0,
  padding: "0.2rem 0.6rem",
  borderRadius: radius.sm,
  border: `1px solid ${color.border}`,
  background: color.bg,
  color: color.muted,
  fontSize: "0.8rem",
});

const headingStyle = css({ marginBlock: "0.75rem 1rem", fontSize: "1.3rem" });
