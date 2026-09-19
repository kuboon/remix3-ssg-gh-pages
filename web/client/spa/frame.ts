/**
 * The name of the frame the SPA demo swaps.
 *
 * SPA demo: delete this file when you delete the demo — see README.
 *
 * It is a module of its own so that `hydration.ts` — which every hydrating page loads — can name
 * the frame without importing the component that fills it. The runtime chunk is on the critical
 * path of every island on the site; the demo's markup is not, and it stays behind the dynamic
 * `import()` in the frame resolver.
 */

/** `<Frame name>` for the demo's panel, and the `data-rmx-target` its links carry. */
export const SPA_FRAME = "spa";
