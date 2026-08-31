import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import fumadocs from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { documentationCatalog } from "./src-docs/lib/documentation-catalog.ts";
import {
  cloudflarePagesRedirects,
  documentationNotFoundHtml,
} from "./src-docs/lib/hosting.ts";

/** The root-mounted static documentation host, independent from the dashboard. */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: "0.0.0.0",
    port: 3761,
    strictPort: true,
  },
  plugins: [
    {
      name: "documentation-markdown-dev-server",
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          const requestUrl = new URL(
            request.url ?? "/",
            "http://documentation.local"
          );
          if (
            request.method !== "GET" ||
            requestUrl.search ||
            !requestUrl.pathname.endsWith(".md")
          ) {
            next();
            return;
          }
          try {
            const environment = server.environments.ssr;
            if (!("dispatchFetch" in environment)) {
              next(new Error("Documentation SSR environment is not fetchable"));
              return;
            }
            const dispatchFetch = environment.dispatchFetch as (
              request: Request
            ) => Promise<Response>;
            const markdownResponse = await dispatchFetch.call(
              environment,
              new Request(requestUrl)
            );
            response.statusCode = markdownResponse.status;
            markdownResponse.headers.forEach((value, name) => {
              response.setHeader(name, value);
            });
            response.end(Buffer.from(await markdownResponse.arrayBuffer()));
          } catch (error) {
            next(error);
          }
        });
      },
    },
    {
      name: "documentation-hosting-artifacts",
      generateBundle() {
        this.emitFile({
          fileName: "_redirects",
          source: cloudflarePagesRedirects,
          type: "asset",
        });
        this.emitFile({
          fileName: "404.html",
          source: documentationNotFoundHtml,
          type: "asset",
        });
      },
    },
    fumadocs(),
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src-docs",
      router: {
        routesDirectory: "routes",
      },
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: true,
        crawlLinks: false,
      },
      pages: [
        ...documentationCatalog.pagePaths.map((path) => ({ path })),
        ...documentationCatalog.markdownPaths.map((path) => ({ path })),
        ...documentationCatalog.operationPaths.map((path) => ({ path })),
        ...documentationCatalog.operationMarkdownPaths.map((path) => ({
          path,
        })),
        { path: "/api/search" },
        { path: "/llms.txt" },
        { path: "/llms-full.txt" },
        { path: "/sitemap.xml" },
      ],
    }),
    viteReact(),
    /** Keep prerendering independent from the deployment provider's runtime preset. */
    nitro({ preset: "node-server", renderer: false }),
  ],
});
