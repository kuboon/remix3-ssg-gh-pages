/**
 * The site's design tokens: values only, no mixins.
 *
 * Islands import from here, and only from here. `theme.ts` beside it calls `css(...)`, and a
 * `css(...)` call at module scope is not something a bundler will drop — so an island that wanted
 * one border color would otherwise carry every rule in the shell into its chunk.
 */

/**
 * Colors, as references to the custom properties `documentStyle` defines on `<html>`.
 *
 * They are indirections rather than literals so that light and dark stay one pair of palettes in
 * one place, instead of a `@media` block in every mixin that happens to mention a color.
 */
export const color = {
  bg: "var(--bg)",
  fg: "var(--fg)",
  muted: "var(--muted)",
  accent: "var(--accent)",
  /** Text on an `accent` background — dark in dark mode, where the accent is light. */
  onAccent: "var(--on-accent)",
  border: "var(--border)",
  /** A raised-but-quiet surface: cards, code, callouts. */
  card: "var(--card)",
} as const;

/** The two palettes those custom properties resolve to. */
export const palette = {
  light: {
    "--bg": "#ffffff",
    "--fg": "#1f2937",
    "--muted": "#6b7280",
    "--accent": "#2563eb",
    "--on-accent": "#ffffff",
    "--border": "#e5e7eb",
    "--card": "#f9fafb",
  },
  dark: {
    "--bg": "#0b0f19",
    "--fg": "#e5e7eb",
    "--muted": "#9ca3af",
    "--accent": "#60a5fa",
    "--on-accent": "#0b0f19",
    "--border": "#1f2937",
    "--card": "#111827",
  },
} as const;

export const font = {
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
} as const;

export const radius = {
  sm: "0.3rem",
  md: "0.5rem",
  lg: "0.75rem",
} as const;

/** The measure every band of the shell lines up to. */
export const contentWidth = "44rem";
