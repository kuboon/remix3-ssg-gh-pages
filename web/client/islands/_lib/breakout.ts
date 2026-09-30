/**
 * Breakout, as a plain module: a canvas goes in, a `Game` comes out.
 *
 * DELETE ME with the rest of the fullscreen demo — see `pages/fullscreen.tsx` and the root README.
 *
 * Nothing here imports the UI runtime, and that is the point. A game redraws sixty times a second;
 * a component re-renders when its state changes. Running the first through the second would mean
 * `handle.update()` every frame — diffing a tree whose only moving part is a `<canvas>` that the
 * framework cannot see inside anyway. So the island owns the element and this module owns the
 * pixels, and the two meet at four methods.
 *
 * The field is laid out in CSS pixels rather than in some fixed logical grid, because the canvas is
 * whatever size the page or the screen gives it — a phone in a column, then the whole display a tap
 * later. `resize()` recomputes the metrics and rescales what is in flight; bricks survive it because
 * they are stored as grid cells and turned into rectangles at draw time.
 */

/** Where the game is between frames. */
export type Phase = "ready" | "playing" | "over" | "won";

export interface Game {
  /** Advance the simulation to `now` (a `requestAnimationFrame` timestamp) and draw it. */
  frame(now: number): void;
  /** Re-read the canvas's size and the page's colors, and lay the field out again. */
  resize(): void;
  /** Put the paddle under a pointer, in client coordinates. */
  aimAt(clientX: number): void;
  /** Hold a keyboard direction: `-1` left, `1` right, `0` released. */
  steer(direction: number): void;
  /** The one button: launch the ball, take the next life, or start again. */
  act(): void;
}

/** A brick, as its cell in the grid. Its rectangle is derived from the current metrics. */
interface Brick {
  col: number;
  row: number;
  alive: boolean;
}

/** Everything that depends on the canvas's current size. */
interface Metrics {
  w: number;
  h: number;
  paddleW: number;
  paddleH: number;
  paddleY: number;
  ballR: number;
  speed: number;
  paddleSpeed: number;
  brickLeft: number;
  brickTop: number;
  brickW: number;
  brickH: number;
  gapX: number;
  gapY: number;
}

/** The page's own colors, so the game is in the same palette as the site in both themes. */
interface Palette {
  bg: string;
  fg: string;
  muted: string;
  accent: string;
}

const COLS_WIDE = 9;
const COLS_NARROW = 6;
const ROWS = 5;
const LIVES = 3;

/** Row hues, top to bottom. Fixed rather than themed — a brick wall is allowed to be loud. */
const ROW_HUES = [348, 22, 45, 150, 205];

export function createBreakout(canvas: HTMLCanvasElement): Game {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser gave no 2d canvas context.");
  const ctx = context;

  let metrics = measure(canvas, COLS_WIDE);
  let palette = readPalette(canvas);
  let cols = COLS_WIDE;

  let bricks: Brick[] = [];
  let paddleX = metrics.w / 2;
  let ballX = paddleX;
  let ballY = metrics.paddleY - metrics.ballR;
  let ballVX = 0;
  let ballVY = 0;
  let direction = 0;
  let score = 0;
  let lives = LIVES;
  let level = 1;
  let phase: Phase = "ready";
  let last = 0;

  resetLevel();

  function resetLevel(): void {
    cols = metrics.w < 420 ? COLS_NARROW : COLS_WIDE;
    metrics = measure(canvas, cols);
    bricks = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < cols; col++) {
        bricks.push({ col, row, alive: true });
      }
    }
    parkBall();
  }

  /** Put the ball back on the paddle and wait for a tap. */
  function parkBall(): void {
    paddleX = clamp(
      paddleX,
      metrics.paddleW / 2,
      metrics.w - metrics.paddleW / 2,
    );
    ballX = paddleX;
    ballY = metrics.paddleY - metrics.ballR - 1;
    ballVX = 0;
    ballVY = 0;
    phase = "ready";
  }

  function launch(): void {
    // Always upward, and never straight up: a vertical ball bounces down the same column forever.
    const angle = (Math.random() * 0.5 - 0.25) + -Math.PI / 2;
    const speed = metrics.speed * Math.pow(1.07, level - 1);
    ballVX = Math.cos(angle) * speed;
    ballVY = Math.sin(angle) * speed;
    phase = "playing";
  }

  function act(): void {
    switch (phase) {
      case "ready":
        launch();
        return;
      case "playing":
        return;
      case "won":
        level += 1;
        resetLevel();
        return;
      case "over":
        score = 0;
        lives = LIVES;
        level = 1;
        resetLevel();
        return;
    }
  }

  function resize(): void {
    const before = metrics;
    palette = readPalette(canvas);
    cols = canvas.clientWidth < 420 ? COLS_NARROW : COLS_WIDE;
    metrics = measure(canvas, cols);

    // The grid changed shape, so the wall in flight no longer maps onto it. Starting the level over
    // is the honest answer — and it only happens when someone crosses the breakpoint mid-rally.
    if (bricks.length !== ROWS * cols) {
      resetLevel();
      return;
    }

    const sx = before.w > 0 ? metrics.w / before.w : 1;
    const sy = before.h > 0 ? metrics.h / before.h : 1;
    paddleX = clamp(
      paddleX * sx,
      metrics.paddleW / 2,
      metrics.w - metrics.paddleW / 2,
    );
    if (phase === "playing") {
      ballX = clamp(ballX * sx, metrics.ballR, metrics.w - metrics.ballR);
      ballY = clamp(ballY * sy, metrics.ballR, metrics.paddleY - metrics.ballR);
      const scale = Math.hypot(sx, sy) / Math.SQRT2;
      ballVX *= scale;
      ballVY *= scale;
    } else parkBall();
  }

  function aimAt(clientX: number): void {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    const x = (clientX - rect.left) * (metrics.w / rect.width);
    paddleX = clamp(x, metrics.paddleW / 2, metrics.w - metrics.paddleW / 2);
    if (phase === "ready") ballX = paddleX;
  }

  function steer(next: number): void {
    direction = next;
  }

  function frame(now: number): void {
    // First frame after a pause — a tab in the background, or the browser throttling us — comes in
    // with a huge gap. Capping it is what stops the ball teleporting through the wall.
    const dt = last === 0 ? 0 : Math.min((now - last) / 1000, 1 / 20);
    last = now;

    if (direction !== 0) {
      paddleX = clamp(
        paddleX + direction * metrics.paddleSpeed * dt,
        metrics.paddleW / 2,
        metrics.w - metrics.paddleW / 2,
      );
      if (phase === "ready") ballX = paddleX;
    }

    if (phase === "playing") step(dt);
    draw();
  }

  /**
   * Integrate in slices no longer than the ball's own radius.
   *
   * One jump per frame is how a fast ball ends up on the far side of a brick with no collision
   * ever tested — and the faster the level, the more likely it is.
   */
  function step(dt: number): void {
    const distance = Math.hypot(ballVX, ballVY) * dt;
    const slices = Math.max(
      1,
      Math.ceil(distance / Math.max(metrics.ballR, 1)),
    );
    for (let i = 0; i < slices && phase === "playing"; i++) {
      advance(dt / slices);
    }
  }

  function advance(dt: number): void {
    ballX += ballVX * dt;
    ballY += ballVY * dt;

    const r = metrics.ballR;
    if (ballX < r) {
      ballX = r;
      ballVX = Math.abs(ballVX);
    } else if (ballX > metrics.w - r) {
      ballX = metrics.w - r;
      ballVX = -Math.abs(ballVX);
    }
    if (ballY < r) {
      ballY = r;
      ballVY = Math.abs(ballVY);
    }

    hitBricks();
    hitPaddle();

    if (ballY - r > metrics.h) {
      lives -= 1;
      if (lives <= 0) phase = "over";
      else parkBall();
    }
  }

  function hitBricks(): void {
    const r = metrics.ballR;
    for (const brick of bricks) {
      if (!brick.alive) continue;
      const x = metrics.brickLeft + brick.col * (metrics.brickW + metrics.gapX);
      const y = metrics.brickTop + brick.row * (metrics.brickH + metrics.gapY);
      if (
        ballX + r < x || ballX - r > x + metrics.brickW ||
        ballY + r < y || ballY - r > y + metrics.brickH
      ) continue;

      brick.alive = false;
      score += (ROWS - brick.row) * 10;

      // Which face was hit: the shallower overlap is the axis the ball came in on.
      const overlapX = Math.min(
        ballX + r - x,
        x + metrics.brickW - (ballX - r),
      );
      const overlapY = Math.min(
        ballY + r - y,
        y + metrics.brickH - (ballY - r),
      );
      if (overlapX < overlapY) ballVX = -ballVX;
      else ballVY = -ballVY;

      if (bricks.every((other) => !other.alive)) phase = "won";
      return; // One brick per slice; the slices are small enough that it never feels like a miss.
    }
  }

  function hitPaddle(): void {
    const r = metrics.ballR;
    const left = paddleX - metrics.paddleW / 2;
    const top = metrics.paddleY;
    if (ballVY <= 0) return;
    if (ballY + r < top || ballY - r > top + metrics.paddleH) return;
    if (ballX + r < left || ballX - r > left + metrics.paddleW) return;

    // Where on the paddle decides the angle, which is the whole game: the ball is aimed, not
    // merely reflected. Speed is preserved so a level never slows down by being played well.
    const offset = clamp((ballX - paddleX) / (metrics.paddleW / 2), -1, 1);
    const angle = -Math.PI / 2 + offset * (Math.PI / 3);
    const speed = Math.hypot(ballVX, ballVY);
    ballVX = Math.cos(angle) * speed;
    ballVY = Math.sin(angle) * speed;
    ballY = top - r;
  }

  // --- drawing --------------------------------------------------------------

  function draw(): void {
    const { w, h } = metrics;
    ctx.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, w, h);

    for (const brick of bricks) {
      if (!brick.alive) continue;
      const x = metrics.brickLeft + brick.col * (metrics.brickW + metrics.gapX);
      const y = metrics.brickTop + brick.row * (metrics.brickH + metrics.gapY);
      ctx.fillStyle = `hsl(${ROW_HUES[brick.row % ROW_HUES.length]} 72% 55%)`;
      roundRect(
        ctx,
        x,
        y,
        metrics.brickW,
        metrics.brickH,
        Math.min(4, metrics.brickH / 3),
      );
      ctx.fill();
    }

    ctx.fillStyle = palette.accent;
    roundRect(
      ctx,
      paddleX - metrics.paddleW / 2,
      metrics.paddleY,
      metrics.paddleW,
      metrics.paddleH,
      metrics.paddleH / 2,
    );
    ctx.fill();

    ctx.fillStyle = palette.fg;
    ctx.beginPath();
    ctx.arc(ballX, ballY, metrics.ballR, 0, Math.PI * 2);
    ctx.fill();

    const hud = Math.max(12, Math.min(18, metrics.w * 0.032));
    ctx.font = `600 ${hud}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textBaseline = "top";
    ctx.fillStyle = palette.muted;
    ctx.textAlign = "left";
    // All of it on the left: the top-right corner belongs to the fullscreen button.
    ctx.fillText(
      `SCORE ${score}   L${level}   ${"●".repeat(Math.max(lives, 0))}`,
      hud * 0.7,
      hud * 0.7,
    );

    if (phase !== "playing") banner(hud);
  }

  function banner(hud: number): void {
    const { w, h } = metrics;
    const lines = phase === "ready"
      ? ["Tap or press Space", "drag · ← → to move"]
      : phase === "won"
      ? [`Level ${level} cleared`, "Tap for the next one"]
      : ["Game over", `${score} points · tap to play again`];

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = palette.fg;
    ctx.font = `700 ${hud * 1.5}px system-ui, sans-serif`;
    ctx.fillText(lines[0], w / 2, h * 0.55);
    ctx.fillStyle = palette.muted;
    ctx.font = `500 ${hud}px system-ui, sans-serif`;
    ctx.fillText(lines[1], w / 2, h * 0.55 + hud * 1.8);
  }

  return { frame, resize, aimAt, steer, act };
}

// --- helpers ----------------------------------------------------------------

function measure(canvas: HTMLCanvasElement, cols: number): Metrics {
  const w = Math.max(canvas.clientWidth, 1);
  const h = Math.max(canvas.clientHeight, 1);
  const unit = Math.min(w, h);

  const paddleW = clamp(w * 0.2, 64, 180);
  const paddleH = clamp(unit * 0.024, 9, 16);
  const paddleY = h - paddleH - clamp(h * 0.07, 18, 56);
  const gapX = clamp(w * 0.012, 3, 10);
  const gapY = gapX;
  const brickLeft = clamp(w * 0.04, 8, 32);
  const brickTop = clamp(h * 0.1, 28, 90);
  const brickW = (w - brickLeft * 2 - gapX * (cols - 1)) / cols;
  const brickH = clamp(h * 0.035, 12, 26);

  return {
    w,
    h,
    paddleW,
    paddleH,
    paddleY,
    ballR: clamp(unit * 0.016, 5, 11),
    speed: clamp(unit * 1.15, 260, 640),
    paddleSpeed: clamp(w * 1.4, 400, 1400),
    brickLeft,
    brickTop,
    brickW,
    brickH,
    gapX,
    gapY,
  };
}

/**
 * The site's tokens, as the canvas needs them: strings, not custom properties.
 *
 * `getComputedStyle` is the only way to get from `var(--accent)` to a color a canvas can fill with,
 * and it is a layout read — so it happens on resize and on a theme change, never in a frame.
 */
function readPalette(canvas: HTMLCanvasElement): Palette {
  const style = getComputedStyle(canvas);
  const read = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    bg: read("--bg", "#0b0f19"),
    fg: read("--fg", "#e5e7eb"),
    muted: read("--muted", "#9ca3af"),
    accent: read("--accent", "#60a5fa"),
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}
