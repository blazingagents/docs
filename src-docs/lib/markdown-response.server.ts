import {
  getDocumentationMarkdown,
  getDocumentationPage,
} from "./document.server.ts";
import { documentationCatalog } from "./documentation-catalog.ts";

const NEXT_SECTION = /^#{2,3} /m;

export async function getDocumentationMarkdownResponse(
  path: string
): Promise<Response> {
  const slug = path.slice(0, -3);
  const operationEntry = documentationCatalog.getOperation(`/${slug}`);
  const operationResource = operationEntry?.resource;
  const operation = operationEntry?.operation;
  let pageSlug = slug === "index" ? undefined : slug.split("/");
  if (operationResource) {
    pageSlug = operationResource.url.slice(1).split("/");
  }
  const page = getDocumentationPage(pageSlug);
  if (!page) {
    return new Response("Not Found", { status: 404 });
  }
  const markdown = await getDocumentationMarkdown(page);
  return new Response(
    operation
      ? getOperationMarkdown(markdown, operation.method, operation.path)
      : markdown,
    { headers: { "Content-Type": "text/markdown; charset=utf-8" } }
  );
}

function getOperationMarkdown(
  markdown: string,
  method: string,
  path: string
): string {
  const marker = `### ${method} ${path}`;
  const remaining = markdown.slice(markdown.indexOf(marker));
  const headingEnd = remaining.indexOf("\n") + 1;
  const section =
    remaining.slice(0, headingEnd) +
    remaining.slice(headingEnd).split(NEXT_SECTION)[0];
  return `${section.trim()}\n`;
}
