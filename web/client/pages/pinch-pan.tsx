import { css, type RemixNode } from "@remix-run/ui";

import { PinchPanDemo } from "../islands/pinch-pan.tsx";
import { color, font, radius } from "../tokens.ts";

export const title = "Pinch and pan — remix-ssg";
export const description =
  "Two-finger pinch and pan as a @remix-run/ui mixin: the host listens, its content is " +
  "transformed, and the point under your fingers stays under your fingers.";

/** This page places a client entry, so the shell boots the runtime for it. */
export const hydrate = true;

export default function PinchPan(): RemixNode {
  return (
    <>
      <h1>Pinch and pan</h1>
      <p>
        <a href="https://jsr.io/@kuboon/remix-ui-pinch-pan">
          <code>@kuboon/remix-ui-pinch-pan</code>
        </a>{" "}
        is a <code>@remix-run/ui</code>{" "}
        mixin for two-finger gestures. It goes on the element that listens; the
        element inside it is the one that moves.
      </p>

      <div mix={noteStyle}>
        <strong>This needs a touch device.</strong>{" "}
        Pinch and drag the map below with two fingers. A mouse has one pointer
        and cannot pinch, so on a desktop use the buttons — they drive the same
        view through the mixin's <code>controls</code>.
      </div>

      <PinchPanDemo />

      <h2>The rule</h2>
      <p>
        One rule produces the whole gesture:{" "}
        <strong>
          the content point under your fingers' centroid stays under their
          centroid
        </strong>. Moving both fingers pans, spreading them zooms about the
        point between them, and doing both does both — there is no separate pan
        mode and zoom mode to switch between.
      </p>
      <p>
        Two consequences are worth knowing, because they are what a hand-rolled
        version usually gets wrong and neither one fails loudly. Reaching{" "}
        <code>maxScale</code>{" "}
        does not slide the content: the scale is clamped before the translation
        is solved, so the pinch simply stops growing. And changing fingers
        mid-gesture does not jump: adding or lifting one re-anchors against the
        transform the content already has.
      </p>

      <h2>Placing it</h2>
      <pre mix={codeStyle}><code>{PLACEMENT}</code></pre>
      <p>
        The mixin sets two things for you, because both are load-bearing and
        easy to forget: <code>touch-action: none</code>{" "}
        on the host, without which the browser claims the gesture and no{" "}
        <code>pointermove</code> ever arrives, and{" "}
        <code>transform-origin: 0 0</code>{" "}
        on the content, which the arithmetic that recovers the point under your
        fingers assumes.
      </p>

      <h2>Driving it from the rest of the component</h2>
      <p>
        <code>controls</code> hands over the current transform plus{" "}
        <code>set()</code> and{" "}
        <code>reset()</code>. That is what the buttons above use — and what the
        readout reads, through <code>onChange</code>.
      </p>
      <pre mix={codeStyle}><code>{CONTROLS}</code></pre>
      <p>
        Zooming about the middle of the viewport rather than the content's
        corner is the same rule again, with the viewport's midpoint standing in
        for the centroid — see <code>islands/pinch-pan.tsx</code>{" "}
        for the six lines that do it.
      </p>
    </>
  );
}

const PLACEMENT = `<div class="viewport" mix={[pinchPan({ maxScale: 8 })]}>
  <div class="map">…</div>
</div>`;

const CONTROLS = `let view: PinchPanControls | null = null

pinchPan({
  maxScale: 8,
  onChange: (next) => { transform = next; handle.update() },
  controls: (api) => { view = api },
})

// …then, from a button:
view?.reset()`;

// --- styles -----------------------------------------------------------------

const noteStyle = css({
  padding: "0.9rem 1.1rem",
  marginBlock: "1.25rem",
  border: `1px solid ${color.border}`,
  borderRadius: radius.md,
  background: color.card,
  color: color.fg,
});

const codeStyle = css({
  overflowX: "auto",
  padding: "0.9rem 1.1rem",
  border: `1px solid ${color.border}`,
  borderRadius: radius.md,
  background: color.card,
  fontFamily: font.mono,
  fontSize: "0.85rem",
  lineHeight: 1.6,
});
