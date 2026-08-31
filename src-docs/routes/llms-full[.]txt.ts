import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/llms-full.txt")({
  server: {
    handlers: {
      GET: getFullLlmsResponse,
    },
  },
});

export async function getFullLlmsResponse(): Promise<Response> {
  const { llms } = await import("fumadocs-core/source");
  const { getAllDocumentationMarkdown } = await import(
    "../lib/document.server.ts"
  );
  const { source } = await import("../lib/source.server.ts");
  return new Response(
    `${llms(source).index()}\n\n${await getAllDocumentationMarkdown()}`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
}
