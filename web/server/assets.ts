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

/**
 * Resolves a `clientEntry()` id to the chunk it landed in.
 *
 * An id is `${import.meta.url}#<ExportName>` — the island naming itself, which is the convention
 * `clientEntry` is written for and one fewer string to keep in step with a file name. It is a
 * `file:` URL on the server and a chunk URL in the browser, and only the server ever reads it:
 * `$entryId` is used by `renderToStream` and by nothing in the client runtime. Which is just as
 * well, because nothing in a browser can know the deploy prefix or predict the bundler's output
 * naming — the server knows both, so it answers here, at render time.
 *
 * It also asks for the chunk to be preloaded, which puts a `<link rel="modulepreload">` in the
 * head. That is worth it twice over: the browser fetches the module while the runtime is still
 * starting, and the build's crawl — which follows links, and follows the `import` statements inside
 * the JavaScript it reaches — has a way to find the chunks at all. Without it they are named only
 * inside the hydration JSON, where nothing looking for links can see them.
 *
 * @param entryId The id passed to `clientEntry()`
 * @returns Where the browser should load it from, what to import, and what to preload
 */
export function resolveClientEntry(
  entryId: string,
): { href: string; exportName: string; preloads: string[] } {
  const hash = entryId.lastIndexOf("#");
  const moduleUrl = entryId.slice(0, hash);
  const exportName = entryId.slice(hash + 1);
  // `entrypoints` above are written relative to `clientDir`, and that is how the asset server keys
  // them, so the island's own URL comes back to the name it was listed under.
  const href = assets.entryUrl(
    decodeURIComponent(moduleUrl.slice(clientDir.href.length)),
  );

  return { href, exportName, preloads: [href] };
}
