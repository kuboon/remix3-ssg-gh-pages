/**
 * The client-side module map: which browser chunk each island lives in.
 *
 * Islands are compiled by `@kuboon/remix-assets-deno` in bundled mode — every
 * entrypoint goes into a *single* `Deno.bundle({ codeSplitting: true })` call,
 * so the Remix UI runtime that `client.tsx` and both islands all import is
 * emitted once, into a shared chunk each of them loads. Compiling the entries
 * separately would give each its own copy of that runtime, and a runtime with
 * two copies of its scheduler is not a runtime.
 *
 * ## Why the URLs are declared here rather than asked for
 *
 * A `clientEntry()` id has to be evaluated in the browser as well as on the
 * server, so it cannot come from the asset server object — that is server-only
 * code, and pulling it into an island would drag the bundler into the browser
 * bundle. So this module *states* where each entry is published, and the server
 * checks the claim against the bundler's actual output at startup
 * (`assertEntryUrls` in `router.tsx`). A layout change in the bundler becomes a
 * loud error instead of a 404 at runtime.
 */

import { base } from "./base.ts";

/** Public mount point for compiled client chunks, carrying the deploy prefix. */
export const assetsBasePath: string = `${base}/assets`;

/** The public URL of a compiled chunk, e.g. `chunkUrl("islands/counter.js")`. */
export function chunkUrl(chunk: string): string {
  return `${assetsBasePath}/${chunk}`;
}

/**
 * Every client entrypoint, as `entrypoint path (for the bundler) -> chunk path
 * (what it is published as)`.
 *
 * The chunk path is the entrypoint's path relative to `src/`, with a `.js`
 * extension — that is how the bundler names an entry's output.
 */
export const clientEntrypoints = {
  runtime: { source: "src/client.tsx", chunk: "client.js" },
  counter: { source: "src/islands/counter.tsx", chunk: "islands/counter.js" },
  total: { source: "src/islands/total.tsx", chunk: "islands/total.js" },
} as const;

/** Name of a client entrypoint. */
export type ClientEntrypoint = keyof typeof clientEntrypoints;

/**
 * The `clientEntry()` id for an island: the URL the browser imports, plus the
 * export to pick out of it.
 *
 * @param name Which entrypoint
 * @param exportName The island's export name in that module
 * @returns The entry id, e.g. `/repo/assets/islands/counter.js#Counter`
 */
export function entryId(name: ClientEntrypoint, exportName: string): string {
  return `${chunkUrl(clientEntrypoints[name].chunk)}#${exportName}`;
}
