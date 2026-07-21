import { renderToString } from "remix/ui/server";
import { createHtmlResponse } from "remix/response/html";
import type { Handle, RemixNode } from "remix/ui";
import { routes } from "./routes.ts";
import { Link } from "./link.tsx";

interface DocumentProps {
  title: string;
  description?: string;
  /** Load the client bundle to hydrate islands on this page. */
  hydrate?: boolean;
  children: RemixNode;
}

/** The full HTML document shell shared by every page. */
function Document(handle: Handle<DocumentProps>) {
  return () => {
    const { title, description, hydrate, children } = handle.props;
    return (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{title}</title>
          {description
            ? <meta name="description" content={description} />
            : null}
          <link rel="icon" href={routes.static.href({ path: "favicon.svg" })} />
          <link
            rel="stylesheet"
            href={routes.static.href({ path: "styles.css" })}
          />
        </head>
        <body>
          <header class="site-header">
            <Link class="brand" href={routes.home.href()}>remix-ssg</Link>
            <nav class="site-nav">
              <Link href={routes.home.href()}>Home</Link>
              <Link href={routes.about.href()}>About</Link>
              <Link href={routes.blog.index.href()}>Blog</Link>
            </nav>
          </header>
          <main class="site-main">{children}</main>
          <footer class="site-footer">
            <p>
              Built with{" "}
              <a href="https://jsr.io/@kuboon/remix-ssg">@kuboon/remix-ssg</a>
              {" "}
              and <a href="https://remix.run">Remix v3</a>.
            </p>
          </footer>
          {hydrate
            ? (
              <script
                type="module"
                src={routes.static.href({ path: "client.js" })}
              >
              </script>
            )
            : null}
        </body>
      </html>
    );
  };
}

/**
 * Renders a page node inside the {@link Document} shell to a complete HTML
 * `Response`. Route actions call this to return a page.
 */
export async function page(
  props: Omit<DocumentProps, "children"> & { children: RemixNode },
): Promise<Response> {
  const html = "<!DOCTYPE html>" +
    (await renderToString(<Document {...props} />));
  return createHtmlResponse(html);
}
