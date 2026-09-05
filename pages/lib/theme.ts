/**
 * The site's styles: one base layer, and the `css(...)` mixins more than one module uses.
 *
 * Nearly everything here is a mixin from `@remix-run/ui`. The server collects the mixins a page
 * actually rendered and emits them as `<style>` tags in that page's `<head>`, so each page ships
 * its own CSS and nothing else: no extra request, and no rules for parts of the site the reader
 * never opened.
 *
 * The exception is {@link baseLayerCss}, and the reason is the cascade. Generated `css(...)` rules
 * — this site's and the ones first-party `remix/ui` components carry — all land in the native
 * `rmx` layer. Anything the app wants a component to be free to override has to sit in a layer
 * *before* `rmx`, and a mixin cannot choose its layer. So the document-level defaults are real CSS
 * in `@layer base`, built from the same tokens as everything else.
 *
 * Two more things are worth knowing before editing:
 *
 * - `mix` takes an array, so mixins compose: `mix={[bandStyle, headerStyle]}` is how this site
 *   says what a stylesheet would have said with a grouped selector.
 * - What belongs in this file is what more than one module uses. A style used in one place belongs
 *   in that file, next to the markup it dresses.
 */

import { css } from "@remix-run/ui";

import { color, font, palette, radius } from "./tokens.ts";

// --- the base layer ----------------------------------------------------------

/** `--name: value;` lines for a palette, indented to sit inside a rule. */
function customProperties(
  properties: Record<string, string>,
  indent: string,
): string {
  return Object.entries(properties)
    .map(([name, value]) => `${indent}${name}: ${value};`)
    .join("\n");
}

/**
 * The document-level defaults, and the layer order the whole site cascades by.
 *
 * `layout.tsx` writes this into `<head>` ahead of everything else, which is what fixes the order:
 * layers rank by where they are first named, so naming all three in one statement — before Remix
 * has emitted a rule of its own — settles it once.
 *
 * - `base` — here. Tokens, the box model, and the defaults for elements nobody styles by hand.
 *   Being before `rmx`, every one of them is a default a component may override without a fight,
 *   which is why nothing below needs `:where()` or `!important`.
 * - `rmx` — Remix's. Every `css(...)` mixin on this site, and the styles `remix/ui` components
 *   bring with them.
 * - `app` — empty, and named anyway: it is where a rule would go that has to beat a component's
 *   own styling on purpose. Unlayered CSS would also do it, and would do it by accident.
 */
export const baseLayerCss: string = `@layer base, rmx, app;

@layer base {
  :root {
    color-scheme: light dark;
${customProperties(palette.light, "    ")}
  }

  @media (prefers-color-scheme: dark) {
    :root {
${customProperties(palette.dark, "      ")}
    }
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: ${font.sans};
    line-height: 1.6;
    color: ${color.fg};
    background: ${color.bg};
  }

  a {
    color: ${color.accent};
  }

  h1 {
    font-size: 2rem;
    line-height: 1.2;
    margin-top: 0;
  }

  code {
    font-family: ${font.mono};
    font-size: 0.9em;
    background: ${color.card};
    padding: 0.1rem 0.35rem;
    border-radius: ${radius.sm};
  }
}
`;

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
 */
export const proseStyle = css({
  "& h2, & h3, & h4": { lineHeight: 1.25, marginBlock: "2rem 0.5rem" },
  "& h2": { fontSize: "1.5rem" },
  "& h3": { fontSize: "1.2rem" },
  "& p, & ul, & ol": { marginBlock: "1rem" },
  "& li": { marginBlock: "0.3rem" },
  "& a": { textDecorationThickness: "1px", textUnderlineOffset: "2px" },
  // @kuboon/md wraps every heading in its own anchor link. Left to the base layer's default it
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
