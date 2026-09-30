/**
 * A stage that takes the whole screen, and nothing else on the page.
 *
 * DELETE ME in a repository made from this template: this page, the island it imports
 * (`islands/fullscreen-game.tsx`), its route in `routes.ts`, its import and line in
 * `server/router.tsx`, and the nav link in `layout.tsx`. See the root README.
 *
 * What is worth keeping is the shell's optional `viewport` prop, which this page is the only caller
 * of: it stays useful the moment any page of yours needs `viewport-fit=cover`, or needs the browser
 * to stop treating a drag as a scroll.
 *
 * The page is the demo and nothing else — no prose around it, because the claim it makes is one you
 * can only check by tapping the button: the Fullscreen API is the single thing a page can do that
 * actually removes mobile Safari's chrome, and the moment a page has a reason to want that,
 * everything else (the safe-area insets, the gestures the browser would rather keep for itself) has
 * to be handled too. The island is that handling, with an empty canvas where a game would go —
 * a template can carry the plumbing honestly; the thing being plumbed is yours.
 */

import { css, type Handle } from "@remix-run/ui";

import { FullscreenGame } from "../islands/fullscreen-game.tsx";

export const title = "Fullscreen stage — remix-ssg";
export const description =
  "A canvas that takes the whole screen: the Fullscreen API with its prefixed " +
  "twin, safe-area insets, device-ratio backing, pointer and keyboard input, " +
  "and the several refusals it takes to stop a browser zooming a drag.";

/** This page places a client entry, so the shell boots the runtime for it. */
export const hydrate = true;

/**
 * Three things at once, and the page needs all three.
 *
 * `viewport-fit=cover` is the opt-in that makes `env(safe-area-inset-*)` report anything other than
 * `0px`, which is what keeps the picture off the notch and the home indicator once the stage has
 * the screen. `maximum-scale=1, user-scalable=no` asks the browser not to zoom, because a pinch
 * over a canvas you are dragging on is a misfired drag rather than a request to read something
 * closer — iOS declines to honour it, which is why the island also refuses Safari's `gesture*`
 * events over the stage.
 */
export const viewport =
  "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, " +
  "viewport-fit=cover";

export default function FullscreenPage(_handle: Handle) {
  return () => (
    <div mix={pageStyle}>
      <FullscreenGame />
    </div>
  );
}

// --- styles -----------------------------------------------------------------

/**
 * No text to select and no gesture to misread.
 *
 * `touch-action: manipulation` is the mild one — it keeps scrolling and drops the double-tap zoom,
 * which on a page whose only content is a canvas is a delay before every second tap and nothing
 * else. The canvas itself goes further, to `none`.
 */
const pageStyle = css({
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
  touchAction: "manipulation",
});
