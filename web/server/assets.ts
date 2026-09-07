/**
 * The browser modules, compiled as one graph.
 *
 * Every entrypoint below goes into a single `Deno.bundle({ codeSplitting: true })` call, which is
 * the point: a module two of them import — the Remix UI runtime, a shared store — is emitted once,
 * into a chunk both import, so it is one module at runtime rather than two copies with two states.
 *
 * The list is written out rather than discovered, for the same reason `routes.ts` is: a file
 * appearing in a directory is not a decision, and this is one.
 *
 * Every path here is under `client/`: this is the server compiling the browser's half of the site,
 * and the browser's half is a directory.
 */

import { createAssetServer } from "@kuboon/remix-assets-deno";

import { base } from "../client/base.ts";

/** The directory every entrypoint below, and every `clientEntry()` id, is resolved against. */
const clientDir = new URL("../client/", import.meta.url);

/** Where the chunks are served, and where `entryUrl()` resolves against. */
export const assetsPath = `${base}/assets`;

export const assets = await createAssetServer({
  rootDir: decodeURIComponent(clientDir.pathname),
  entrypoints: [
    // The client runtime. Every page that hydrates loads this one; the islands ride in the chunks
    // it shares with them.
    "hydration.ts",
    "islands/counter.tsx",
    "islands/total.tsx",
    // Showcase: delete these when you delete the showcase — see README.
    "islands/showcase/accordion.tsx",
    "islands/showcase/anchor.tsx",
    "islands/showcase/anim-entrance.tsx",
    "islands/showcase/anim-layout.tsx",
    "islands/showcase/anim-spring.tsx",
    "islands/showcase/anim-tween.tsx",
    "islands/showcase/breadcrumbs.tsx",
    "islands/showcase/buttons.tsx",
    "islands/showcase/checkbox.tsx",
    "islands/showcase/combobox.tsx",
    "islands/showcase/input.tsx",
    "islands/showcase/listbox.tsx",
    "islands/showcase/menu.tsx",
    "islands/showcase/popover.tsx",
    "islands/showcase/radio.tsx",
    "islands/showcase/select.tsx",
    "islands/showcase/tabs.tsx",
    "islands/showcase/toggle.tsx",
  ],
  basePath: assetsPath,
  mode: "bundle",
  // Source maps would double the file count of a static deploy for no gain; the sources are on
  // GitHub.
  bundle: { sourcemap: "none" },
});
