/**
 * Static build: crawl the router from the home page and write every response
 * to `dist/`.
 *
 * We use the runtime-agnostic `crawl` + `toOutput` from @kuboon/remix-ssg (rather
 * than the batteries-included `prerender`) for one reason: when the site is
 * hosted under a base path, routes and links carry that prefix, but the files
 * must still land at the site root. So we strip the base prefix from each output
 * path before writing. See src/base.ts.
 */
import { dirname, join } from "@std/path";
import { crawl, toOutput } from "@kuboon/remix-ssg";
import { router } from "../src/router.tsx";
import { routes } from "../src/routes.ts";
import { base } from "../src/base.ts";

const OUT_DIR = new URL("../dist/", import.meta.url);

function stripBase(outputPath: string): string {
  let path = outputPath.replace(/^\/+/, "");
  if (base) {
    const prefix = base.replace(/^\//, "") + "/";
    if (path.startsWith(prefix)) path = path.slice(prefix.length);
  }
  return path;
}

async function main() {
  await Deno.remove(OUT_DIR, { recursive: true }).catch(() => {});

  let pages = 0;
  let assets = 0;

  // Seed from the (base-aware) home path; every other page is reached by crawling.
  for await (const result of crawl(router, { paths: [routes.home.href()] })) {
    const output = await toOutput(result);
    if (output == null) continue; // 204 No Content

    const relPath = stripBase(output.path);
    const destPath = join(new URL(OUT_DIR).pathname, relPath);
    await Deno.mkdir(dirname(destPath), { recursive: true });
    const bytes = typeof output.content === "string"
      ? new TextEncoder().encode(output.content)
      : output.content;
    await Deno.writeFile(destPath, bytes);

    if (relPath.endsWith(".html")) pages++;
    else assets++;
    console.log(`  ${relPath}`);
  }

  console.log(
    `\n✓ Wrote ${pages} page(s) and ${assets} asset(s) to dist/${
      base ? ` (base: ${base})` : ""
    }`,
  );
}

await main();
