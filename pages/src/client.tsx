/**
 * Client runtime entry — starts the Remix UI runtime for the document.
 *
 * This is one of three browser entrypoints (`src/assets.ts` lists them all).
 * It no longer re-exports the islands: each island is its own entrypoint, and
 * `loadModule` below dynamically imports whichever one a hydrated component
 * names in its `clientEntry()` id.
 *
 * All three entrypoints import the Remix UI runtime, and all three are compiled
 * in a single `Deno.bundle({ codeSplitting: true })` call, so that runtime is
 * emitted once into a chunk they share rather than once per entry.
 */
import { run } from "remix/ui";

run({
  loadModule: (url: string, name: string) =>
    import(url).then((mod) => mod[name]),
});
