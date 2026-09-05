/**
 * The site's stylesheet — except that it is not a stylesheet.
 *
 * Every rule here is a `css(...)` mixin from `@remix-run/ui`. The server collects the mixins a
 * page actually rendered and emits them as `<style>` tags in that page's `<head>`, so each page
 * ships its own CSS and nothing else: no extra request, and no rules for parts of the site the
 * reader never opened.
 *
 * Two things are worth knowing before editing:
 *
 * - Each generated class lands in its own `@layer rmx.<class>`, and those layers are ordered by
 *   the order in which the styles were rendered. A mixin applied further down the tree therefore
 *   wins over one applied above it, whatever the specificity — which is why the document-wide
 *   defaults below can sit on `<html>` and `<body>` and still be overridable everywhere, with no
 *   `!important` anywhere on this site.
 * - `mix` takes an array, so mixins compose: `mix={[bandStyle, headerStyle]}` is how this site
 *   says what a CSS file would have said with a grouped selector.
 *
 * What belongs here is what more than one module uses. A style used in one place belongs in that
 * file, next to the markup it dresses.
 */

import { css } from "@remix-run/ui";

import { color, font, palette, radius } from "./tokens.ts";

// --- the document ------------------------------------------------------------

/**
 * Goes on `<html>`: the palettes, the color scheme, and the box model.
 *
 * The dark palette is a nested `@media` block, which the mixin scopes to this same class — so the
 * custom properties are redefined on the element that declared them, and everything reading
 * `var(--…)` follows without knowing a second palette exists.
 */
export const documentStyle = css({
  colorScheme: "light dark",
  boxSizing: "border-box",
  ...palette.light,
  "@media (prefers-color-scheme: dark)": { ...palette.dark },
  "& *, & *::before, & *::after": { boxSizing: "inherit" },
});

/**
 * Goes on `<body>`: the typography, and defaults for elements this site does not write by hand.
 *
 * The nested selectors are wrapped in `:where()` so they carry no specificity of their own. The
 * Markdown articles and the UI showcase both style elements themselves, and neither should have to
 * out-specify the shell to do it.
 */
export const bodyStyle = css({
  margin: 0,
  fontFamily: font.sans,
  lineHeight: 1.6,
  color: color.fg,
  background: color.bg,
  "& :where(a)": { color: color.accent },
  "& :where(h1)": { fontSize: "2rem", lineHeight: 1.2, marginTop: 0 },
  "& :where(code)": {
    fontFamily: font.mono,
    fontSize: "0.9em",
    background: color.card,
    padding: "0.1rem 0.35rem",
    borderRadius: radius.sm,
  },
});

// --- shared pieces -----------------------------------------------------------

/** A date, a byline, a caption: small, quiet, on a line of its own. */
export const metaStyle = css({
  display: "block",
  color: color.muted,
  fontSize: "0.85rem",
  marginBlock: "0.2rem",
});

/** A filled call to action. It goes on a `<Link>`, not on a `<button>`. */
export const buttonStyle = css({
  display: "inline-block",
  marginTop: "0.5rem",
  padding: "0.6rem 1rem",
  borderRadius: radius.md,
  background: color.accent,
  color: color.onAccent,
  textDecoration: "none",
  fontWeight: 600,
  transition: "filter 120ms ease",
  "&:hover": { filter: "brightness(1.08)" },
  "&:active": { transform: "translateY(1px)" },
});

/** A bordered, slightly raised block: the home page demo, a callout, a pull-out. */
export const cardStyle = css({
  marginBlock: "2rem",
  padding: "1.25rem",
  border: `1px solid ${color.border}`,
  borderRadius: radius.lg,
  background: color.card,
  "& > :first-child": { marginTop: 0 },
  "& > :last-child": { marginBottom: 0 },
});

/**
 * Typography for a tree of elements this site never writes: the Markdown articles.
 *
 * A stylesheet would reach these with bare element selectors, and would then be styling every
 * `<table>` on the site. Nesting under the one class on the article wrapper says the same thing
 * locally, and it stops at the article.
 */
export const proseStyle = css({
  "& h2, & h3, & h4": { lineHeight: 1.25, marginBlock: "2rem 0.5rem" },
  "& h2": { fontSize: "1.5rem" },
  "& h3": { fontSize: "1.2rem" },
  "& p, & ul, & ol": { marginBlock: "1rem" },
  "& li": { marginBlock: "0.3rem" },
  "& a": { textDecorationThickness: "1px", textUnderlineOffset: "2px" },
  // @kuboon/md wraps every heading in its own anchor link. Left to the document-wide default it
  // would paint each heading accent-blue and underline it.
  "& :is(h1, h2, h3, h4, h5, h6) a": {
    color: "inherit",
    textDecoration: "none",
  },
  "& :is(h1, h2, h3, h4, h5, h6) a:hover": { textDecoration: "underline" },
  "& img": { maxWidth: "100%", height: "auto", borderRadius: radius.md },
  "& blockquote": {
    margin: "1.5rem 0",
    paddingInlineStart: "1rem",
    borderInlineStart: `3px solid ${color.border}`,
    color: color.muted,
  },
  "& hr": {
    border: 0,
    borderTop: `1px solid ${color.border}`,
    marginBlock: "2rem",
  },
  "& table": {
    width: "100%",
    borderCollapse: "collapse",
    marginBlock: "1.5rem",
  },
  "& th, & td": {
    padding: "0.4rem 0.6rem",
    borderBottom: `1px solid ${color.border}`,
    textAlign: "left",
  },
  // Shiki paints the block itself, inline, so all this owes a code block is room to breathe and
  // somewhere to scroll. The inner <code> has to give back what the document-wide `code` default
  // gave it, or a light chip sits on top of a dark block.
  "& pre": {
    marginBlock: "1.5rem",
    padding: "0.9rem 1rem",
    borderRadius: radius.md,
    overflowX: "auto",
    fontSize: "0.85rem",
    lineHeight: 1.5,
  },
  "& pre code": { background: "none", padding: 0, fontSize: "inherit" },
});
