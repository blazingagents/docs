import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: getLlmsResponse,
    },
  },
});

export async function getLlmsResponse(): Promise<Response> {
  const { llms } = await import("fumadocs-core/source");
  const { source } = await import("../lib/source.server.ts");
  return new Response(llms(source).index(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
