import { clientEntry, css, on, ref } from "@remix-run/ui";
import type { Handle } from "@remix-run/ui";
import {
  clampScale,
  pinchPan,
  type PinchPanControls,
  type ScaleLimits,
  type Transform,
} from "@kuboon/remix-ui-pinch-pan";

import { color, font, radius } from "../tokens.ts";

/**
 * The limits, named once.
 *
 * The mixin clamps the gesture with them, and the zoom buttons below clamp with the same
 * `clampScale` the mixin uses — so a button that runs into the limit stops where a pinch would,
 * and the translation it solves stays consistent with the scale that was actually applied.
 */
const LIMITS: ScaleLimits = { minScale: 1, maxScale: 8 };

/** How much one press of the zoom buttons changes the scale. */
const STEP = 1.6;

/**
 * Two-finger pinch and pan, from `@kuboon/remix-ui-pinch-pan`.
 *
 * The mixin goes on the viewport and transforms its content — the element that listens has to be
 * the stable one, because the content moves out from under the fingers as soon as the gesture
 * starts.
 *
 * A two-finger gesture cannot be performed with a mouse, so this island is also the answer to
 * "how do I drive this from the rest of the component": `controls` hands over `set()` and `reset()`,
 * and the buttons below use them. That makes the page usable on a desktop and demonstrates the
 * programmatic half of the API at the same time.
 */
export const PinchPanDemo = clientEntry(
  import.meta.url,
  function PinchPanDemo(handle: Handle) {
    let view: PinchPanControls | null = null;
    let viewport: Element | null = null;
    let transform: Transform = { x: 0, y: 0, scale: 1 };

    /**
     * Zooms about the middle of the viewport.
     *
     * `set({ scale })` on its own would scale about the content's top-left, which sends whatever
     * you were looking at off the edge. Holding the centre still is the same rule the gesture
     * follows, with the viewport's midpoint standing in for the fingers' centroid.
     *
     * The viewport has no padding or border, so its own coordinate space and the content's
     * untransformed one share an origin; that is what lets the midpoint be used directly.
     */
    const zoomBy = (factor: number) => {
      if (!view || !viewport) return;
      const rect = viewport.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const current = view.transform;
      const scale = clampScale(current.scale * factor, LIMITS);
      view.set({
        scale,
        x: cx - ((cx - current.x) / current.scale) * scale,
        y: cy - ((cy - current.y) / current.scale) * scale,
      });
    };

    return () => (
      <div mix={wrapStyle}>
        <div
          mix={[
            viewportStyle,
            ref((node) => {
              viewport = node;
            }),
            pinchPan({
              ...LIMITS,
              onChange(next) {
                transform = next;
                handle.update();
              },
              controls(api) {
                view = api;
              },
            }),
          ]}
        >
          <div mix={contentStyle}>
            <Chart />
          </div>
        </div>

        <div mix={barStyle}>
          <div mix={buttonsStyle}>
            <button
              type="button"
              mix={[buttonStyle, on("click", () => zoomBy(1 / STEP))]}
              aria-label="Zoom out"
            >
              −
            </button>
            <button
              type="button"
              mix={[buttonStyle, on("click", () => zoomBy(STEP))]}
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              mix={[buttonStyle, on("click", () => view?.reset())]}
            >
              Reset
            </button>
          </div>
          <output mix={readoutStyle}>
            x {transform.x.toFixed(0)} · y {transform.y.toFixed(0)} · scale{" "}
            {transform.scale.toFixed(2)}
          </output>
        </div>
      </div>
    );
  },
);

/**
 * Something worth zooming into.
 *
 * Drawn rather than loaded so the page adds no binary asset, and deliberately carrying labels far
 * too small to read at 1×: the gesture is doing its job when they become legible.
 */
function Chart(_handle: Handle) {
  return () => {
    const stops = [
      { x: 120, y: 110, name: "Northgate" },
      { x: 430, y: 90, name: "Ironworks" },
      { x: 660, y: 200, name: "East Pier" },
      { x: 250, y: 300, name: "Old Market" },
      { x: 540, y: 380, name: "Observatory" },
      { x: 130, y: 470, name: "Southfield" },
      { x: 700, y: 480, name: "Lighthouse" },
    ];

    return (
      <svg
        width="800"
        height="560"
        viewBox="0 0 800 560"
        role="img"
        aria-label="A fictitious transit map, small enough at its natural size that its labels need zooming to read."
      >
        <defs>
          <pattern
            id="pp-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="currentColor"
              stroke-width="0.5"
              opacity="0.25"
            />
          </pattern>
        </defs>
        <rect width="800" height="560" fill="url(#pp-grid)" />
        <polyline
          points="120,110 430,90 660,200 540,380 700,480"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          opacity="0.55"
        />
        <polyline
          points="130,470 250,300 430,90"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          opacity="0.35"
          stroke-dasharray="8 6"
        />
        {stops.map((stop) => (
          <g key={stop.name}>
            <circle cx={stop.x} cy={stop.y} r="7" fill="currentColor" />
            <text
              x={stop.x + 12}
              y={stop.y + 4}
              font-size="9"
              fill="currentColor"
              opacity="0.85"
            >
              {stop.name}
            </text>
          </g>
        ))}
      </svg>
    );
  };
}

// --- styles -----------------------------------------------------------------

const wrapStyle = css({ display: "grid", gap: "0.75rem" });

/**
 * The element the mixin listens on.
 *
 * No padding and no border, because the zoom buttons above treat its box as the content's
 * coordinate space. `touch-action: none` is not set here — the mixin sets it itself, which is the
 * point of it being a mixin rather than a recipe.
 */
const viewportStyle = css({
  overflow: "hidden",
  padding: 0,
  height: "clamp(240px, 50vw, 380px)",
  border: `1px solid ${color.border}`,
  borderRadius: radius.md,
  background: color.card,
  color: color.fg,
  cursor: "grab",
});

const contentStyle = css({ width: "800px", height: "560px" });

const barStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "0.75rem",
});

const buttonsStyle = css({ display: "flex", gap: "0.5rem" });

const buttonStyle = css({
  font: "inherit",
  fontWeight: 600,
  minWidth: "2.75rem",
  cursor: "pointer",
  padding: "0.4rem 0.8rem",
  border: `1px solid ${color.border}`,
  borderRadius: radius.md,
  background: color.bg,
  color: color.fg,
  "&:active": { transform: "translateY(1px)" },
});

const readoutStyle = css({
  fontFamily: font.mono,
  fontSize: "0.85rem",
  color: color.muted,
  fontVariantNumeric: "tabular-nums",
});
