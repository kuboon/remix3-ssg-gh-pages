/**
 * The fullscreen demo: one game, and the button that gives it the whole screen.
 *
 * DELETE ME with the rest of the fullscreen demo — see `pages/fullscreen.tsx` and the root README.
 *
 * The page it lives on used to explain what a page can do about mobile Safari's chrome. The answer
 * was always "one thing" — the Fullscreen API — so the page is now that one thing, doing something
 * worth going fullscreen for. Everything the old prose asserted is still here, just demonstrated
 * instead of described: the safe-area insets keep the playfield off the notch, and the button only
 * works because it is a button, called from a real user gesture.
 *
 * Support is detected at run time rather than sniffed from a version, which is the honest way to
 * write this down: iPhone Safari was without the Fullscreen API for years while iPad had it, so a
 * page that assumed either answer was wrong on half the devices. `fullscreenEnabled` is also the
 * property that goes `false` inside an iframe without `allow="fullscreen"`, which no version check
 * would ever catch. The prefixed calls are kept beside the standard ones for the same reason:
 * Safari shipped `webkitRequestFullscreen` long before `requestFullscreen`.
 *
 * The component renders once and then gets out of the way. `handle.update()` runs when the button's
 * label changes, not when the ball moves — the frames belong to `_lib/breakout.ts`, which draws
 * into the canvas this island owns.
 */

import { clientEntry, css, type Handle, on, ref } from "@remix-run/ui";

import { createBreakout, type Game } from "./_lib/breakout.ts";
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
    let game: Game | null = null;
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
      game = createBreakout(surface);

      /**
       * The canvas has two sizes and both matter: the CSS box it occupies, and the pixel buffer it
       * draws into. Only the second is `width`/`height`, and leaving it at the default is what
       * makes a canvas look soft on a phone — so the buffer is the box times the device ratio, and
       * the game scales its own transform to match.
       */
      function fit(): void {
        const ratio = Math.min(globalThis.devicePixelRatio || 1, 3);
        const width = Math.round(Math.max(surface.clientWidth, 1) * ratio);
        const height = Math.round(Math.max(surface.clientHeight, 1) * ratio);
        if (surface.width !== width) surface.width = width;
        if (surface.height !== height) surface.height = height;
        game?.resize();
      }

      const observer = new ResizeObserver(fit);
      observer.observe(surface);
      handle.signal.addEventListener("abort", () => observer.disconnect());
      fit();

      // A theme flip changes every color the game fills with, and nothing about its size — so the
      // resize observer never hears about it. `resize()` re-reads the palette, which is what this
      // wants; the layout it also redoes is a no-op.
      const dark = globalThis.matchMedia("(prefers-color-scheme: dark)");
      dark.addEventListener("change", fit, options);

      // Drag to move, tap to launch. Pointer events cover mouse, pen and touch in one path, and
      // capture keeps a drag alive after the finger leaves the canvas — otherwise the paddle
      // freezes the moment you overshoot the edge.
      let dragging = false;
      surface.addEventListener("pointerdown", (event) => {
        dragging = true;
        surface.setPointerCapture(event.pointerId);
        game?.aimAt(event.clientX);
        game?.act();
        event.preventDefault();
      }, options);
      surface.addEventListener("pointermove", (event) => {
        if (dragging || event.pointerType === "mouse") {
          game?.aimAt(event.clientX);
        }
      }, options);
      const release = () => (dragging = false);
      surface.addEventListener("pointerup", release, options);
      surface.addEventListener("pointercancel", release, options);

      globalThis.addEventListener("keydown", (event) => {
        if (event.repeat) return;
        if (event.key === "ArrowLeft" || event.key === "a") game?.steer(-1);
        else if (event.key === "ArrowRight" || event.key === "d") {
          game?.steer(1);
        } else if (event.key === " " || event.key === "Enter") game?.act();
        else return;
        event.preventDefault(); // Space scrolls a document; here it launches the ball.
      }, options);
      globalThis.addEventListener("keyup", (event) => {
        if (
          event.key === "ArrowLeft" || event.key === "a" ||
          event.key === "ArrowRight" || event.key === "d"
        ) game?.steer(0);
      }, options);

      /*
       * iOS ignores `user-scalable=no` — it has since iOS 10, deliberately, so a page cannot trap
       * someone who needs to zoom. `touch-action: none` stops the browser's own panning and
       * double-tap zoom over the canvas, but pinch on iOS arrives as the non-standard `gesture*`
       * events, and refusing those is the only way to keep two fingers from scaling the playfield
       * out from under the ball. Scoped to the stage, so the rest of the document still zooms.
       */
      for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
        stage?.addEventListener(
          type,
          (event) => event.preventDefault(),
          options,
        );
      }

      let frame = 0;
      const tick = (now: number) => {
        game?.frame(now);
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
          A Breakout game. This browser has no canvas, so there is nothing to
          play here.
        </canvas>

        <button
          type="button"
          disabled={support === "none"}
          aria-label={active ? "Exit fullscreen" : "Play fullscreen"}
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

// --- styles -----------------------------------------------------------------

/**
 * The fullscreen element, and the game's frame in the page.
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
  // Every browser gesture over the playfield — panning, pinch, double-tap zoom — belongs to the
  // game instead.
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
