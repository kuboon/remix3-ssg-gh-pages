import { clientEntry, css, on, ref } from "@remix-run/ui";
import type { Handle, HostProps } from "@remix-run/ui";
import type { ShareDialogElement } from "@kuboon/share-element";
// Imported for its side effect: this is what registers `<share-dialog>`.
import "@kuboon/share-element";

import { color, radius } from "../tokens.ts";

/**
 * `<share-dialog>` is a custom element, so Remix's JSX has to be told the tag exists.
 *
 * `IntrinsicElements` is where a host tag is declared, and it carries no catch-all for hyphenated
 * names — an undeclared one is a type error rather than an `any`. Typing it against the package's
 * own element interface is what makes `ref` below hand back something with `.open()` on it.
 */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "share-dialog": HostProps<ShareDialogElement>;
    }
  }
}

/**
 * The article share button, and the one custom element on this site.
 *
 * [`@kuboon/share-element`](https://jsr.io/@kuboon/share-element) is a plain custom element rather
 * than a Remix component, so this island is the adapter between the two: Remix renders and hydrates
 * the button and the empty `<share-dialog>` beside it, and the button hands the element a URL.
 * Nothing about the panel is written here — the X / LINE / Threads buttons, the native share sheet
 * where `navigator.share` exists and the copy-URL fallback where it does not, are the package's.
 *
 * Importing the package at the top of this file is safe even though this module renders on the
 * server first: it registers the element wherever there is a DOM and does nothing anywhere else,
 * which is exactly the shape an SSG build needs. On the server the tag is just a tag, and the panel
 * arrives empty in the HTML; in the browser the registration upgrades it and it fills in.
 *
 * The tag is written in the markup rather than built with the package's own `createShareDialog()`
 * on purpose — as of 0.1.0 that function does not work in a browser. See the note on
 * `shareDialog` below.
 *
 * The URL it shares is `location.href`, read at the moment of the click. That is the one form of
 * the article's address that is right everywhere this site is served from — the domain root, a
 * repo sub-path, a PR preview URL — without the server having to work out an origin it may not
 * know. `text` is display-only: the package shows it inside the panel and never sends it anywhere.
 *
 * The panel itself is styled by `static/app.css`, not from here — see the note at the end of that
 * file for why a `css(...)` mixin could not have done it.
 */
export const ShareButton = clientEntry(
  import.meta.url,
  function ShareButton(handle: Handle<{ label: string; text: string }>) {
    /**
     * The panel, bound as the element is inserted.
     *
     * A `ref` rather than `createShareDialog()`, because in `@kuboon/share-element@0.1.0` the
     * element's constructor adds the panel's own class, `hidden` attribute and children — which a
     * custom element constructor may not do. `document.createElement()`, which is all
     * `createShareDialog()` is, refuses it (`NotSupportedError: The result must not have
     * attributes`) and hands back a `<share-dialog>` that never upgraded, so calling `.open()` on
     * it throws. An element the HTML parser made — one written in markup, as here — upgrades
     * through a different path that does not check, and works. Swap this for
     * `createShareDialog()` once a release builds in `connectedCallback` instead.
     */
    let dialog: ShareDialogElement | undefined;

    return () => (
      <>
        <button
          type="button"
          mix={[
            shareButtonStyle,
            on("click", () => {
              dialog?.open({ url: location.href, text: handle.props.text });
            }),
          ]}
        >
          {handle.props.label}
        </button>
        <share-dialog
          mix={ref((node) => {
            dialog = node;
          })}
        />
      </>
    );
  },
);

/** The island's own CSS, in the island's own file — the button only; the panel is the package's. */
const shareButtonStyle = css({
  font: "inherit",
  fontWeight: 600,
  cursor: "pointer",
  padding: "0.5rem 0.9rem",
  border: `1px solid ${color.border}`,
  borderRadius: radius.md,
  background: color.card,
  color: color.fg,
  "&:hover": { borderColor: color.accent, color: color.accent },
  "&:active": { transform: "translateY(1px)" },
});
