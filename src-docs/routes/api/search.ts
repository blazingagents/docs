import { createFileRoute } from "@tanstack/react-router";
import { documentationCatalog } from "../../lib/documentation-catalog.ts";

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: getDocumentationSearchResponse,
    },
  },
});

export async function getDocumentationSearchResponse(): Promise<Response> {
  const { createFromSource } = await import("fumadocs-core/search/server");
  const { source } = await import("../../lib/source.server.ts");
  const searchSource = new Proxy(source, {
    get(target, property, receiver) {
      if (property === "getPages") {
        return () =>
          target
            .getPages()
            .filter(({ url }) => !documentationCatalog.getResource(url));
      }
      return Reflect.get(target, property, receiver);
    },
  });
  const search = createFromSource(searchSource, { language: "english" });
  const response = await search.staticGET();
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  return new Response(response.body, { headers });
}
