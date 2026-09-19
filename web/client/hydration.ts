/**
 * The client runtime, started once per document.
 *
 * `run()` walks the document for the hydration markers `renderToStream` emitted and hydrates each
 * one, importing the module the server named for it. That name is a real URL by the time it
 * reaches here — `assets.ts` resolved it during render — so that hook is one function.
 *
 * The shell loads this as a `<script type="module">` on any page that hydrates, and on no other:
 * the blog listing places no client entry, so it ships no JavaScript at all.
 *
 * The second hook is frame resolution, which is what turns a link into a soft navigation. Answering
 * it is opt-in — leave it out and Remix fetches the destination as HTML, which is right for every
 * page of this site but one. See {@link resolveFrame}.
 */

import { run } from "@remix-run/ui";
import type { ResolveFrame, ResolveFrameOptions } from "@remix-run/ui";

import { SPA_FRAME } from "./spa/frame.ts";

/**
 * What a frame reload is answered with.
 *
 * Every navigation on this site is a frame reload — the document itself is the top frame — and all
 * but one of them is answered the way Remix would have answered it anyway, by fetching the
 * destination's HTML. That is {@link fetchFrame} below, and it is spelled out here rather than
 * inherited because a `resolveFrame` replaces the default outright: there is one hook, not a chain.
 *
 * The exception is the SPA demo's frame, which is answered with a component tree. Returning a node
 * is all it takes to route in the browser — no request goes out, and the runtime renders it into
 * the frame exactly as it would have rendered fetched HTML.
 *
 * SPA demo: delete the branch below, and the import above, when you delete the demo — see README.
 * What is left is the default, at which point this hook can go too.
 *
 * The demo's markup is loaded on demand rather than imported at the top of this file, which every
 * hydrating page downloads. Nothing on the rest of the site should carry it, and a dynamic
 * `import()` is also a specifier the bundler splits and the build's crawler follows — so the chunk
 * is written to the static site without anything linking to it.
 */
const resolveFrame: ResolveFrame = async (src, options) => {
  if (options?.target === SPA_FRAME) {
    const { SpaPanel, spaIdFromSrc } = await import("./spa/panel.tsx");
    const id = spaIdFromSrc(src);
    if (id !== null) return SpaPanel({ id, renderedBy: "client" });
  }

  return await fetchFrame(src, options);
};

/**
 * Remix's own frame resolution: fetch the source as HTML.
 *
 * @param src The frame's source URL
 * @param options The form data, method and abort signal of the navigation that started the reload
 * @returns The response to render into the frame
 */
async function fetchFrame(
  src: string,
  options?: ResolveFrameOptions,
): Promise<Response> {
  const method = options?.method;
  const isWrite = method !== undefined &&
    !["get", "head"].includes(method.toLowerCase());

  const response = await fetch(src, {
    body: isWrite ? options?.formData : undefined,
    headers: { Accept: "text/html" },
    method,
    mode: "same-origin",
    signal: options?.signal,
  });

  const isHtml = response.headers.get("Content-Type")?.toLowerCase().includes(
    "text/html",
  );
  // A redirect or a client error is renderable when it came back as a page; anything else is not
  // something to reconcile into the document.
  if (response.status >= 500 || (response.status >= 300 && !isHtml)) {
    throw new Error(
      `Failed to resolve frame: ${response.status} ${response.statusText}`
        .trimEnd(),
    );
  }

  return response;
}

run({
  loadModule: async (moduleUrl, exportName) => {
    const module = await import(moduleUrl) as Record<string, unknown>;
    const picked = module[exportName];
    if (typeof picked !== "function") {
      throw new Error(
        `Module "${moduleUrl}" has no function export "${exportName}".`,
      );
    }
    return picked;
  },
  resolveFrame,
});
