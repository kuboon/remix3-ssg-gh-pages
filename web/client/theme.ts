/**
 * The `css(...)` mixins more than one module uses.
 *
 * Every rule here is a mixin from `@remix-run/ui`. The server collects the mixins a page actually
 * rendered and emits them as `<style>` tags in that page's `<head>`, so each page ships its own
 * CSS and nothing else: no extra request, and no rules for parts of the site the reader never
 * opened.
 *
 * What a mixin cannot do is choose its cascade layer — every one of them lands in Remix's `rmx` —
 * so the site's layer order and its document-level defaults live in `static/app.css` instead, in a
 * `base` layer ahead of `rmx` and behind the `reset` layer the kiso.css import sits in. That is
 * also where the token values are; `./tokens.ts` names them.
 *
 * Two more things are worth knowing before editing:
 *
 * - `mix` takes an array, so mixins compose: `mix={[bandStyle, headerStyle]}` is how this site
 *   says what a stylesheet would have said with a grouped selector.
 * - What belongs in this file is what more than one module uses. A style used in one place belongs
 *   in that file, next to the markup it dresses.
 */

import { css } from "@remix-run/ui";

import { color, radius } from "./tokens.ts";

// --- shared mixins -----------------------------------------------------------

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
 *
 * What is *not* here is the flow: the heading sizes, the block margins and the list markers moved
 * into `static/app.css`'s `base` layer when the kiso.css reset arrived, because a reset strips the
 * UA's block margins from the whole document and a hand-written page needs the same rhythm an
 * article does. Only what is genuinely particular to an article is left — the parts below all
 * dress markup `@kuboon/md` emits and nothing else does.
 */
export const proseStyle = css({
  // @kuboon/md wraps every heading in its own anchor link. Left to the base layer's default it
  // would paint each heading accent-blue and underline it.
  "& :is(h1, h2, h3, h4, h5, h6) a": {
    color: "inherit",
    textDecoration: "none",
  },
  "& :is(h1, h2, h3, h4, h5, h6) a:hover": { textDecoration: "underline" },
  "& img": { borderRadius: radius.md },
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
    marginBlock: "1.5rem",
  },
  "& th, & td": {
    padding: "0.4rem 0.6rem",
    borderBottom: `1px solid ${color.border}`,
  },
  // Shiki paints the block itself, inline, so all this owes a code block is room to breathe and
  // somewhere to scroll. The inner <code> has to give back what the base layer's `code` gave it,
  // or a light chip sits on top of a dark block.
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
