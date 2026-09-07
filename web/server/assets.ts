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
import type { EntryComponent } from "@remix-run/ui";

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

/**
 * Resolves a `clientEntry()` id to the chunk it landed in.
 *
 * An id is `import.meta.url` — the island naming itself, and nothing else. That is the shape Remix's
 * own `render()` middleware reads, and this follows its rule: an `#ExportName` on the end wins if
 * one is written, and otherwise the export is the component function's own name. Which is why every
 * island passes a *named* function whose name is the name it is exported under.
 *
 * Only the server reads the id. `$entryId` is used by `renderToStream` and by nothing in the client
 * runtime, so the same expression meaning a `file:` URL here and a chunk URL in the browser costs
 * nothing — and it has to be resolved here anyway, because nothing in a browser can know the deploy
 * prefix or predict the bundler's output naming.
 *
 * It also asks for the chunk to be preloaded, which puts a `<link rel="modulepreload">` in the
 * head. That is worth it twice over: the browser fetches the module while the runtime is still
 * starting, and the build's crawl — which follows links, and follows the `import` statements inside
 * the JavaScript it reaches — has a way to find the chunks at all. Without it they are named only
 * inside the hydration JSON, where nothing looking for links can see them.
 *
 * @param entryId The id passed to `clientEntry()` — a module URL, optionally `#ExportName`
 * @param component The component that id was attached to, whose name is the fallback export name
 * @returns Where the browser should load it from, what to import, and what to preload
 */
export function resolveClientEntry(
  entryId: string,
  component: EntryComponent,
): { href: string; exportName: string; preloads: string[] } {
  const hash = entryId.lastIndexOf("#");
  const moduleUrl = hash === -1 ? entryId : entryId.slice(0, hash);
  const exportName = (hash === -1 ? "" : entryId.slice(hash + 1)) ||
    component.name;
  // `entrypoints` above are written relative to `clientDir`, and that is how the asset server keys
  // them, so the island's own URL comes back to the name it was listed under.
  const href = assets.entryUrl(
    decodeURIComponent(moduleUrl.slice(clientDir.href.length)),
  );

  return { href, exportName, preloads: [href] };
}
