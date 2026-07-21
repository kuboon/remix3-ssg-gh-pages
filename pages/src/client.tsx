/**
 * Client entry — the single browser bundle for the whole site.
 *
 * `deno task bundle` compiles this file (and the Remix UI runtime + every island
 * it re-exports) into one self-contained `static/client.js`. Pages that use an
 * island load it with `<script type="module" src="/static/client.js">`.
 *
 * On load, `run()` reads the hydration data the server embedded in the page and
 * hydrates each island by dynamically importing its module and picking the named
 * export — which resolves back to this same (already-loaded) bundle.
 *
 * Every island must be re-exported here under the export name used in its
 * `clientEntry()` id (e.g. `#Counter`).
 */
import { run } from "remix/ui";

export { Counter } from "./islands/counter.tsx";

run({
  loadModule: (url: string, name: string) =>
    import(url).then((mod) => mod[name]),
});
