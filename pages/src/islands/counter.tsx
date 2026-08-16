import { clientEntry, on } from "remix/ui";
import type { Handle } from "remix/ui";
import { entryId } from "../assets.ts";
import { clicks } from "./store.ts";

/**
 * A client component ("island"): server-rendered to HTML like everything else,
 * then hydrated in the browser so it becomes interactive.
 *
 * `clientEntry(entryId, component)` marks the component for hydration. The
 * `entryId` is `"<module-url>#<exportName>"` — the URL the browser imports to
 * load this component and the export to pick out of it. This island is its own
 * browser entrypoint (see `src/assets.ts`), so the URL points at its own chunk
 * rather than at one bundle shared by the whole site.
 *
 * Every click also lands in the {@link clicks} store, which `total.tsx` — a
 * *separate* entrypoint — reads. That the two agree is the visible proof that
 * the shared module was emitted once.
 *
 * The component itself follows the Remix UI runtime shape: it receives a
 * `handle` (props + `update()`) and returns a render function. Call
 * `handle.update()` after mutating local state to re-render.
 */
export const Counter = clientEntry(
  entryId("counter", "Counter"),
  function Counter(handle: Handle<{ label: string; start?: number }>) {
    let count = handle.props.start ?? 0;

    return () => (
      <button
        type="button"
        class="counter"
        mix={[on("click", () => {
          count++;
          clicks.bump();
          handle.update();
        })]}
      >
        {handle.props.label}: {count}
      </button>
    );
  },
);
