import { type DocsPage, source } from "./source.server.ts";

/** The server-side contract produced by the generated Fumadocs source. */
export type DocumentationPage = DocsPage;

export function getDocumentationPage(
  slugs?: string[]
): DocumentationPage | undefined {
  return source.getPage(slugs);
}

export function getDocumentationMarkdownUrl(page: DocumentationPage): string {
  return page.url === "/" ? "/index.md" : `${page.url}.md`;
}

export function getDocumentationMarkdown(
  page: DocumentationPage
): Promise<string> {
  return page.data.getText("processed");
}

export async function getAllDocumentationMarkdown(): Promise<string> {
  const markdown = await Promise.all(
    source.getPages().map(getDocumentationMarkdown)
  );
  return markdown.join("\n\n");
}
