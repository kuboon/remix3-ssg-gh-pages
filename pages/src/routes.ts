import { route } from "remix/routes";
import { withBase } from "./base.ts";

/**
 * The site's route map. Patterns are prefixed with the deploy {@link withBase}
 * so `routes.about.href()` yields the correctly-prefixed URL everywhere.
 *
 * Add a page by adding a route here and mapping an action in `router.ts`.
 */
export const routes = route({
  home: withBase("/"),
  about: withBase("/about"),
  blog: {
    index: withBase("/blog"),
    show: withBase("/blog/:slug"),
  },
  // Static assets (images, stylesheets, robots.txt, …) live in `static/`.
  static: withBase("/static/*path"),
});
