import { clientEntry, on } from "remix/ui";
import type { Handle } from "remix/ui";
import { withBase } from "../base.ts";

/**
 * A client component ("island"): server-rendered to HTML like everything else,
 * then hydrated in the browser so it becomes interactive.
 *
 * `clientEntry(entryId, component)` marks the component for hydration. The
 * `entryId` is `"<module-url>#<exportName>"` — the URL the browser imports to
 * load this component and the export to pick out of it. It points at the bundled
 * client entry (`/static/client.js`, built by `deno task bundle`), which
 * re-exports `Counter`. `withBase` keeps the URL correct under a deploy sub-path.
 *
 * The component itself follows the Remix UI runtime shape: it receives a
 * `handle` (props + `update()`) and returns a render function. Call
 * `handle.update()` after mutating local state to re-render.
 */
export const Counter = clientEntry(
  `${withBase("/static/client.js")}#Counter`,
  function Counter(handle: Handle<{ label: string; start?: number }>) {
    let count = handle.props.start ?? 0;

    return () => (
      <button
        type="button"
        class="counter"
        mix={[on("click", () => {
          count++;
          handle.update();
        })]}
      >
        {handle.props.label}: {count}
      </button>
    );
  },
);
