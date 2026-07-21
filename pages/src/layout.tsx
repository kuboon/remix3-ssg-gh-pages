import { renderToString } from "remix/ui/server";
import { createHtmlResponse } from "remix/response/html";
import type { Handle, RemixNode } from "remix/ui";
import { routes } from "./routes.ts";
import { withBase } from "./base.ts";

interface DocumentProps {
  title: string;
  description?: string;
  children: RemixNode;
}

/** The full HTML document shell shared by every page. */
function Document(handle: Handle<DocumentProps>) {
  return () => {
    const { title, description, children } = handle.props;
    return (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{title}</title>
          {description
            ? <meta name="description" content={description} />
            : null}
          <link rel="icon" href={withBase("/static/favicon.svg")} />
          <link rel="stylesheet" href={withBase("/static/styles.css")} />
        </head>
        <body>
          <header class="site-header">
            <a class="brand" href={routes.home.href()}>remix-ssg</a>
            <nav class="site-nav">
              <a href={routes.home.href()}>Home</a>
              <a href={routes.about.href()}>About</a>
              <a href={routes.blog.index.href()}>Blog</a>
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
