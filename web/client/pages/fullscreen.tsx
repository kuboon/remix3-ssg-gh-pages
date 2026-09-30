/**
 * A fullscreen game page: the screen is the app, and there is nothing else on it.
 *
 * DELETE ME in a repository made from this template: this page, the island it imports
 * (`islands/fullscreen-game.tsx`), its route in `routes.ts`, its import and line in
 * `server/router.tsx`, and the nav link in `layout.tsx`. See the root README.
 *
 * The game is a placeholder. What this page carries is the frame a game needs from the document:
 * no site chrome around it, the stage sized to the visible screen and padded off the notch, and
 * no zoom, scroll or text selection to fight a drag.
 *
 * It does not call the Fullscreen API. iPhone Safari does not offer it for ordinary elements, so a
 * page built on it would be a different page on the phone that matters most. What removes Safari's
 * own chrome there is running from the Home Screen, and this layout is already right for that.
 */

import type { Handle } from "@remix-run/ui";

import { FullscreenGame } from "../islands/fullscreen-game.tsx";

export const title = "Fullscreen game — remix-ssg";
export const description =
  "A game page that is the whole screen: no site chrome, safe-area insets, " +
  "and no zoom, scroll or text selection.";

/** This page places a client entry, so the shell boots the runtime for it. */
export const hydrate = true;

/** No header, nav or footer: the game is the whole of `<body>`. */
export const bare = true;

/**
 * `viewport-fit=cover` lets the stage reach the screen's edges and makes `env(safe-area-inset-*)`
 * non-zero. `maximum-scale=1, user-scalable=no` turns pinch zoom off where the browser honours it;
 * iOS does not, which the island handles.
 */
export const viewport =
  "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, " +
  "viewport-fit=cover";

export default function FullscreenPage(_handle: Handle) {
  return () => <FullscreenGame />;
}
