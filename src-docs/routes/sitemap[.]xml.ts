import { createFileRoute } from "@tanstack/react-router";
import { DOCUMENTATION_ORIGIN } from "../../brand.ts";
import { documentationCatalog } from "../lib/documentation-catalog.ts";

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...documentationCatalog.paths.map(
    (url) => `  <url><loc>${DOCUMENTATION_ORIGIN}${url}</loc></url>`
  ),
  "</urlset>",
  "",
].join("\n");

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: getDocumentationSitemapResponse,
    },
  },
});

export function getDocumentationSitemapResponse(): Response {
  return new Response(sitemap, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
