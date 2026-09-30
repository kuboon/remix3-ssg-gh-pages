/**
 * The fullscreen demo: an empty stage, and everything a game on it would need from the page.
 *
 * DELETE ME in a repository made from this template — see `pages/fullscreen.tsx` and the root
 * README.
 *
 * There is no game here on purpose. What a template can usefully carry is the plumbing, which is
 * the part that is fiddly and the same every time: the Fullscreen API with its prefixed twin, the
 * safe-area padding that keeps the picture off the notch, a canvas backed at the device's pixel
 * ratio, pointer and keyboard input, a `requestAnimationFrame` loop that stops when the island
 * disconnects, and the several separate refusals it takes to stop a browser treating a drag as a
 * scroll. Replace `draw()` and `move()` with your own and the rest already works.
 *
 * The loop deliberately does not go through the UI runtime. A game redraws every frame; a component
 * re-renders when its state changes. Running the first through the second means `handle.update()`
 * sixty times a second, diffing a tree whose only moving part is a `<canvas>` the framework cannot
 * see inside. So the component renders once and then gets out of the way — `handle.update()` runs
 * when the button's label changes, not when the marker moves.
 *
 * Support is detected at run time rather than sniffed from a version, which is the honest way to
 * write this down: iPhone Safari was without the Fullscreen API for years while iPad had it, so a
 * page that assumed either answer was wrong on half the devices. `fullscreenEnabled` is also the
 * property that goes `false` inside an iframe without `allow="fullscreen"`, which no version check
 * would ever catch. The prefixed calls are kept beside the standard ones for the same reason:
 * Safari shipped `webkitRequestFullscreen` long before `requestFullscreen`.
 */

import { clientEntry, css, type Handle, on, ref } from "@remix-run/ui";

import { color, font, radius } from "../tokens.ts";

/** The prefixed half of the API, as Safari shipped it. */
type LegacyElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
type LegacyDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

/** What this browser will let the button do. */
type Support = "unknown" | "standard" | "prefixed" | "none";

export const FullscreenGame = clientEntry(
  import.meta.url,
  function FullscreenGame(handle: Handle) {
    let stage: HTMLElement | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let support: Support = "unknown";
    let active = false;
    let error = "";

    function syncState(): void {
      const legacy = document as LegacyDocument;
      active = document.fullscreenElement === stage ||
        legacy.webkitFullscreenElement === stage;
      void handle.update();
    }

    async function enter(): Promise<void> {
      if (!stage) return;
      error = "";
      const element = stage as LegacyElement;
      try {
        if (element.requestFullscreen) {
          // `navigationUI: "hide"` asks for the browser's own controls to go too, where the
          // browser offers the choice. It is a request, not a guarantee.
          await element.requestFullscreen({ navigationUI: "hide" });
        } else if (element.webkitRequestFullscreen) {
          await element.webkitRequestFullscreen();
        } else {
          throw new Error("No requestFullscreen on this element.");
        }
      } catch (cause) {
        // A rejection here is normal, not exceptional: Safari refuses when the call has drifted
        // out of the gesture, and showing why is more use than swallowing it.
        error = cause instanceof Error ? cause.message : String(cause);
        void handle.update();
      }
    }

    async function leave(): Promise<void> {
      const legacy = document as LegacyDocument;
      try {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (legacy.webkitExitFullscreen) {
          await legacy.webkitExitFullscreen();
        }
      } catch (cause) {
        error = cause instanceof Error ? cause.message : String(cause);
        void handle.update();
      }
    }

    // Queued from setup, so all of this runs in the browser and not during the server's one render.
    // `handle.signal` takes every listener and observer back off when the island disconnects.
    handle.queueTask(() => {
      const options = { signal: handle.signal } as const;
      document.addEventListener("fullscreenchange", syncState, options);
      document.addEventListener("webkitfullscreenchange", syncState, options);

      const legacy = document as LegacyDocument;
      support = document.fullscreenEnabled
        ? "standard"
        : legacy.webkitFullscreenEnabled
        ? "prefixed"
        : "none";
      void handle.update();

      if (!canvas) return;
      const surface = canvas;
      const context = surface.getContext("2d");
      if (!context) return;
      // Bound again as its own `const` so the null check survives into the closures below.
      const ctx = context;

      /** Where the marker is, in CSS pixels, and which way the keyboard is holding it. */
      let markerX = 0;
      let direction = 0;
      /** The canvas's CSS box, and the page's colors — both re-read on resize, never in a frame. */
      let box = { w: 1, h: 1 };
      let palette = { bg: "", fg: "", muted: "", accent: "" };

      /**
       * The canvas has two sizes and both matter: the CSS box it occupies, and the pixel buffer it
       * draws into. Only the second is `width`/`height`, and leaving it at the default is what
       * makes a canvas look soft on a phone — so the buffer is the box times the device ratio, and
       * `draw()` scales its transform to match.
       *
       * `getComputedStyle` is also the only way from `var(--accent)` to a color a canvas can fill
       * with, and it is a layout read, so it happens here rather than in the loop.
       */
      function fit(): void {
        const ratio = Math.min(globalThis.devicePixelRatio || 1, 3);
        box = {
          w: Math.max(surface.clientWidth, 1),
          h: Math.max(surface.clientHeight, 1),
        };
        surface.width = Math.round(box.w * ratio);
        surface.height = Math.round(box.h * ratio);
        const style = getComputedStyle(surface);
        const read = (name: string) => style.getPropertyValue(name).trim();
        palette = {
          bg: read("--bg"),
          fg: read("--fg"),
          muted: read("--muted"),
          accent: read("--accent"),
        };
        markerX = clamp(markerX || box.w / 2, 0, box.w);
      }

      const observer = new ResizeObserver(fit);
      observer.observe(surface);
      handle.signal.addEventListener("abort", () => observer.disconnect());
      fit();

      // A theme flip changes every color the canvas fills with and nothing about its size, so the
      // resize observer never hears about it.
      globalThis
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", fit, options);

      // Drag to move. Pointer events cover mouse, pen and touch in one path, and capture keeps a
      // drag alive after the finger leaves the canvas — otherwise the marker freezes the moment
      // you overshoot the edge.
      let dragging = false;
      const aimAt = (clientX: number) => {
        const rect = surface.getBoundingClientRect();
        if (rect.width === 0) return;
        markerX = clamp((clientX - rect.left) * (box.w / rect.width), 0, box.w);
      };
      surface.addEventListener("pointerdown", (event) => {
        dragging = true;
        surface.setPointerCapture(event.pointerId);
        aimAt(event.clientX);
        event.preventDefault();
      }, options);
      surface.addEventListener("pointermove", (event) => {
        if (dragging || event.pointerType === "mouse") aimAt(event.clientX);
      }, options);
      const release = () => (dragging = false);
      surface.addEventListener("pointerup", release, options);
      surface.addEventListener("pointercancel", release, options);

      globalThis.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") direction = -1;
        else if (event.key === "ArrowRight") direction = 1;
        else return;
        event.preventDefault(); // An arrow key scrolls a document; here it steers.
      }, options);
      globalThis.addEventListener("keyup", (event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          direction = 0;
        }
      }, options);

      /*
       * iOS ignores `user-scalable=no` — it has since iOS 10, deliberately, so a page cannot trap
       * someone who needs to zoom. `touch-action: none` stops the browser's own panning and
       * double-tap zoom over the canvas, but pinch on iOS arrives as the non-standard `gesture*`
       * events, and refusing those is the only way to keep two fingers from scaling the stage.
       * Scoped to the stage, so the rest of the document still zooms.
       */
      for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
        stage?.addEventListener(type, (e) => e.preventDefault(), options);
      }

      /** Your simulation goes here. This one moves a marker and counts seconds. */
      function move(dt: number): void {
        markerX = clamp(markerX + direction * box.w * 0.9 * dt, 0, box.w);
      }

      /** Your renderer goes here. This one proves the loop, the input and the palette are live. */
      function draw(now: number): void {
        const { w, h } = box;
        ctx.setTransform(surface.width / w, 0, 0, surface.height / h, 0, 0);
        ctx.fillStyle = palette.bg;
        ctx.fillRect(0, 0, w, h);

        const unit = Math.min(w, h);

        // Something that moves on its own, so a stalled loop is visible rather than merely quiet.
        ctx.fillStyle = palette.accent;
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.arc(
          w / 2 + Math.cos(now / 900) * w * 0.3,
          h / 2 + Math.sin(now / 700) * h * 0.22,
          unit * 0.09,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = palette.fg;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `700 ${clamp(unit * 0.07, 18, 34)}px system-ui, sans-serif`;
        ctx.fillText("Your game goes here", w / 2, h / 2 - unit * 0.05);
        ctx.fillStyle = palette.muted;
        ctx.font = `500 ${clamp(unit * 0.035, 12, 16)}px system-ui, sans-serif`;
        ctx.fillText(
          "drag or ← → to move · the button takes the screen",
          w / 2,
          h / 2 + unit * 0.03,
        );
        ctx.fillText(
          `${Math.round(w)} × ${Math.round(h)} css px`,
          w / 2,
          h / 2 + unit * 0.09,
        );

        // The marker: the input, made visible.
        const markerW = clamp(w * 0.2, 64, 180);
        const markerH = clamp(unit * 0.024, 9, 16);
        ctx.fillStyle = palette.accent;
        ctx.beginPath();
        ctx.roundRect(
          clamp(markerX - markerW / 2, 0, w - markerW),
          h - markerH - clamp(h * 0.07, 18, 56),
          markerW,
          markerH,
          markerH / 2,
        );
        ctx.fill();
      }

      let last = 0;
      let frame = 0;
      const tick = (now: number) => {
        // A tab in the background comes back with a huge gap; capping it keeps the step sane.
        const dt = last === 0 ? 0 : Math.min((now - last) / 1000, 1 / 20);
        last = now;
        move(dt);
        draw(now);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      handle.signal.addEventListener(
        "abort",
        () => cancelAnimationFrame(frame),
      );
    });

    return () => (
      <div mix={[ref((node) => (stage = node as HTMLElement)), stageStyle]}>
        <canvas
          mix={[
            ref((node) => (canvas = node as HTMLCanvasElement)),
            canvasStyle,
          ]}
        >
          The fullscreen demo draws into a canvas, and this browser has none.
        </canvas>

        <button
          type="button"
          disabled={support === "none"}
          aria-label={active ? "Exit fullscreen" : "Go fullscreen"}
          mix={[
            buttonStyle,
            on("click", () => {
              if (active) {
                void leave();
              } else void enter();
            }),
          ]}
        >
          {active ? "Exit" : "Fullscreen"}
        </button>

        {support === "none"
          ? (
            <p mix={noteStyle}>
              No Fullscreen API for ordinary elements here — older iPhone Safari
              is the usual reason. Add the page to the Home Screen for the same
              chrome-free result.
            </p>
          )
          : null}

        {error ? <p mix={noteStyle}>Rejected: {error}</p> : null}
      </div>
    );
  },
);

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

// --- styles -----------------------------------------------------------------

/**
 * The fullscreen element, and the stage's frame in the page.
 *
 * `box-sizing: border-box` with a percentage-height canvas is what makes the safe-area padding do
 * anything: an absolutely positioned child would resolve `inset: 0` against the padding box and sit
 * under the notch regardless, while a block child's `height: 100%` is the content box — so the
 * padding is exactly the inset, and the page needs `viewport-fit=cover` for it to be non-zero.
 */
const stageStyle = css({
  position: "relative",
  boxSizing: "border-box",
  width: "100%",
  height: "min(72svh, 36rem)",
  overflow: "hidden",
  border: `1px solid ${color.border}`,
  borderRadius: radius.lg,
  background: color.bg,

  // Nothing here is text, and a stray selection during a drag is only ever in the way.
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
  WebkitTapHighlightColor: "transparent",

  "&:fullscreen": {
    width: "100%",
    height: "100%",
    borderRadius: 0,
    border: "none",
    paddingTop: "env(safe-area-inset-top)",
    paddingBottom: "env(safe-area-inset-bottom)",
    paddingLeft: "env(safe-area-inset-left)",
    paddingRight: "env(safe-area-inset-right)",
  },

  "&::backdrop": { background: color.bg },
});

const canvasStyle = css({
  display: "block",
  width: "100%",
  height: "100%",
  // Every browser gesture over the stage — panning, pinch, double-tap zoom — belongs to the
  // demo instead.
  touchAction: "none",
});

const buttonStyle = css({
  position: "absolute",
  top: "calc(env(safe-area-inset-top) + 0.6rem)",
  right: "calc(env(safe-area-inset-right) + 0.6rem)",
  font: "inherit",
  fontFamily: font.mono,
  fontSize: "0.75rem",
  fontWeight: 600,
  cursor: "pointer",
  padding: "0.35rem 0.7rem",
  border: `1px solid ${color.border}`,
  borderRadius: radius.md,
  background: color.card,
  color: color.fg,
  opacity: 0.85,
  "&:hover": { opacity: 1, borderColor: color.accent },
  "&:active": { transform: "translateY(1px)" },
  "&:disabled": { opacity: 0.4, cursor: "not-allowed" },
});

const noteStyle = css({
  position: "absolute",
  left: "calc(env(safe-area-inset-left) + 0.8rem)",
  right: "calc(env(safe-area-inset-right) + 0.8rem)",
  bottom: "calc(env(safe-area-inset-bottom) + 0.6rem)",
  margin: 0,
  fontSize: "0.8rem",
  lineHeight: 1.4,
  color: color.muted,
  textAlign: "center",
});
