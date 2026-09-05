/**
 * The about page: what this starter is and how it works. It places no island, so it ships no
 * JavaScript.
 */

import { renderPage } from "../layout.tsx";
import { routes } from "../routes.ts";

/**
 * Renders the about page.
 *
 * @returns The response
 */
export function aboutAction(): Response {
  return renderPage({
    title: "About — remix-ssg",
    description: "What this starter is and how it works.",
    islandUrls: {},
    children: (
      <>
        <h1>About</h1>
        <p>
          <code>router.ts</code> composes three directories into one handler:
          {" "}
          <code>islands/</code> compiled as a single code-split bundle,{" "}
          <code>pages/</code> served through this site's own transforms, and
          {" "}
          <code>static/</code> served verbatim.
        </p>
        <p>
          <code>deno serve router.ts</code>{" "}
          runs that handler as the dev server. The build drives the very same
          object with{" "}
          <code>fetch()</code>, writes each response to disk, and follows the
          links it finds — so going from a static deploy to a live server would
          be a change of deploy target rather than of code.
        </p>
        <p>
          Only what is reachable gets generated. A page nothing links to belongs
          in <code>entryPoints</code>, or it is not part of the site.
        </p>
        <p>
          Articles are Markdown files under <code>pages/blog/</code>; see the
          {" "}
          <a href={routes.blog.index.href()}>blog</a>.
        </p>
        <p>
          <a href={routes.home.href()}>← Back home</a>
        </p>
      </>
    ),
  });
}
