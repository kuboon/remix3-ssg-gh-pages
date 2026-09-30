/**
 * The stage of a fullscreen game, with a placeholder where the game goes.
 *
 * DELETE ME with the rest of the fullscreen demo — see `pages/fullscreen.tsx` and the root README.
 *
 * A mobile browser only collapses its bars when the page is scrolled, and no script can do that for
 * it. So the stage is `position: fixed; inset: 0` — it follows the visible area as the bars move —
 * and on a touch screen it sits over a document taller than the screen. Before the game starts the
 * stage lets a vertical swipe through (`touch-action: pan-y`), which scrolls the document under it
 * and shrinks Safari's tab bar to its compact form; a tap starts the game and switches the stage to
 * `touch-action: none`, after which every touch is the game's.
 *
 * Zoom is off throughout: `pan-y` already excludes pinch and double-tap zoom, and Safari's `gesture*`
 * events are refused because iOS ignores `user-scalable=no`. Text selection is off on the stage.
 *
 * The frame loop draws into the canvas directly rather than through `handle.update()`, which runs
 * once, when the game starts. Replace `draw()` with the game.
 */

import { clientEntry, css, type Handle, on, ref } from "@remix-run/ui";

import { routes } from "../routes.ts";
import { color, font } from "../tokens.ts";

export const FullscreenGame = clientEntry(
  import.meta.url,
  function FullscreenGame(handle: Handle) {
    let stage: HTMLElement | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let playing = false;

    /** A tap, not a swipe: `click` never fires for a touch the browser took as a scroll. */
    function start(): void {
      if (playing) return;
      playing = true;
      void handle.update();
    }

    handle.queueTask(() => {
      if (!stage || !canvas) return;
      const surface = canvas;
      const context = surface.getContext("2d");
      if (!context) return;
      const ctx = context;
      const options = { signal: handle.signal } as const;
      const touch = globalThis.matchMedia("(pointer: coarse)").matches;

      for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
        stage.addEventListener(type, (e) => e.preventDefault(), options);
      }

      /** The canvas's CSS size; its pixel buffer is this times the device ratio. */
      let w = 1;
      let h = 1;
      let palette = { bg: "", fg: "", muted: "", accent: "" };
      function fit(): void {
        const ratio = Math.min(globalThis.devicePixelRatio || 1, 3);
        w = Math.max(surface.clientWidth, 1);
        h = Math.max(surface.clientHeight, 1);
        surface.width = Math.round(w * ratio);
        surface.height = Math.round(h * ratio);
        const style = getComputedStyle(surface);
        const read = (name: string) => style.getPropertyValue(name).trim();
        palette = {
          bg: read("--bg"),
          fg: read("--fg"),
          muted: read("--muted"),
          accent: read("--accent"),
        };
      }
      const observer = new ResizeObserver(fit);
      observer.observe(surface);
      handle.signal.addEventListener("abort", () => observer.disconnect());
      globalThis.matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", fit, options);
      fit();

      /** Where the last touch or pointer was, so the placeholder shows input arriving. */
      let pointer: { x: number; y: number } | null = null;
      const track = (event: PointerEvent) => {
        if (!playing) return;
        const rect = surface.getBoundingClientRect();
        pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      };
      surface.addEventListener("pointerdown", track, options);
      surface.addEventListener("pointermove", (event) => {
        if (event.buttons !== 0 || event.pointerType === "mouse") track(event);
      }, options);

      function draw(now: number): void {
        ctx.setTransform(surface.width / w, 0, 0, surface.height / h, 0, 0);
        ctx.fillStyle = palette.bg;
        ctx.fillRect(0, 0, w, h);

        const unit = Math.min(w, h);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = palette.fg;
        ctx.font = `700 ${Math.max(18, unit * 0.07)}px system-ui, sans-serif`;
        ctx.fillText(
          playing
            ? "Your game goes here"
            : touch
            ? "Swipe up"
            : "Click to start",
          w / 2,
          h / 2,
        );
        ctx.fillStyle = palette.muted;
        ctx.font = `500 ${Math.max(12, unit * 0.032)}px system-ui, sans-serif`;
        ctx.fillText(
          playing
            ? `${Math.round(w)} × ${Math.round(h)}`
            : touch
            ? "to shrink the browser bar, then tap to start"
            : `${Math.round(w)} × ${Math.round(h)}`,
          w / 2,
          h / 2 + unit * 0.07,
        );

        if (pointer) {
          const r = unit * (0.05 + 0.01 * Math.sin(now / 200));
          ctx.fillStyle = palette.accent;
          ctx.beginPath();
          ctx.arc(pointer.x, pointer.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      let frame = requestAnimationFrame(function tick(now) {
        draw(now);
        frame = requestAnimationFrame(tick);
      });
      handle.signal.addEventListener(
        "abort",
        () => cancelAnimationFrame(frame),
      );
    });

    return () => (
      <div mix={runwayStyle}>
        <div
          mix={[
            ref((node) => (stage = node as HTMLElement)),
            stageStyle,
            playing ? playingStyle : readyStyle,
          ]}
        >
          <canvas
            mix={[
              ref((node) => (canvas = node as HTMLCanvasElement)),
              canvasStyle,
              on("click", start),
            ]}
          />
          <a href={routes.home.href()} mix={homeStyle}>← Home</a>
        </div>
      </div>
    );
  },
);

// --- styles -----------------------------------------------------------------

/**
 * What there is to scroll. Only on a touch screen, where scrolling is what shrinks the browser's
 * bars; a desktop window has none, and would only gain a scrollbar.
 *
 * Taller than the large viewport, so the document can still scroll once the bars have collapsed —
 * with nothing left to scroll the browser bounces back and brings them out again.
 */
const runwayStyle = css({
  "@media (pointer: coarse)": { minHeight: "150lvh" },
});

const stageStyle = css({
  position: "fixed",
  inset: 0,
  boxSizing: "border-box",
  paddingTop: "env(safe-area-inset-top)",
  paddingBottom: "env(safe-area-inset-bottom)",
  paddingLeft: "env(safe-area-inset-left)",
  paddingRight: "env(safe-area-inset-right)",
  background: color.bg,
  overflow: "hidden",
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
  WebkitTapHighlightColor: "transparent",
});

/** Before the game: a vertical swipe scrolls the document; pinch and double-tap still do nothing. */
const readyStyle = css({
  touchAction: "pan-y",
  "& canvas": { touchAction: "pan-y" },
});

/** During the game: every touch is the game's. */
const playingStyle = css({
  touchAction: "none",
  "& canvas": { touchAction: "none" },
});

const canvasStyle = css({
  display: "block",
  width: "100%",
  height: "100%",
});

const homeStyle = css({
  position: "absolute",
  top: "calc(env(safe-area-inset-top) + 0.6rem)",
  left: "calc(env(safe-area-inset-left) + 0.8rem)",
  fontFamily: font.mono,
  fontSize: "0.8rem",
  color: color.muted,
  textDecoration: "none",
});
