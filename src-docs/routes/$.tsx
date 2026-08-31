import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { deserializePageTree } from "fumadocs-core/source/client";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import browserCollections from "../../.source/browser.ts";
import {
  BRAND_NAME,
  DOCUMENTATION_ORIGIN,
  SOCIAL_IMAGE_ALT,
  SOCIAL_IMAGE_URL,
} from "../../brand.ts";
import {
  ApiCodeRail,
  type ApiRequestExample,
  type ApiResponseExample,
} from "../components/api-code-rail.tsx";
import {
  ApiOperationContent,
  ApiOperationRoute,
  formatOperationName,
  type HttpMethod,
} from "../components/api-reference.tsx";
import type { ApiResponseMetadata } from "../components/api-response-details.tsx";
import { DocumentationLayout } from "../components/layout.tsx";
import { DocumentationMarkdownCopyButton } from "../components/markdown-copy-button.tsx";
import { mdxComponents } from "../components/mdx.tsx";
import { documentationTree } from "../generated/documentation-manifest.ts";
import { documentationCatalog } from "../lib/documentation-catalog.ts";

const API_OPERATION_HEADING = /^(DELETE|GET|PATCH|POST|PUT) \/v1\//;
const TRAILING_SLASH = /\/$/;
const clientLoader = browserCollections.docs.createClientLoader({
  component(
    { default: Content },
    { components }: { components: typeof mdxComponents }
  ) {
    return <Content components={components} />;
  },
});
const documentationPageTree = deserializePageTree(documentationTree);

interface DocumentationPageData {
  description?: string;
  markdownUrl: string;
  operation?: {
    examples: readonly ApiRequestExample[];
    id: string;
    method: HttpMethod;
    path: string;
    responseMetadata: ApiResponseMetadata;
    responses: readonly ApiResponseExample[];
  };
  path: string;
  resourceUrl?: string;
  title: string;
  toc: { _step?: number; depth: number; title: string; url: string }[];
  url: string;
}

export async function loadDocumentationPage({
  location,
  params,
}: {
  location: { hash?: string; search: Record<string, unknown> };
  params: { _splat?: string };
}): Promise<DocumentationPageData> {
  const url = `/${params._splat ?? ""}`.replace(TRAILING_SLASH, "") || "/";
  const resourceRedirect = documentationCatalog.getResource(url);
  if (resourceRedirect) {
    const operation = resourceRedirect.operations.find(
      (candidate) => `#${candidate.operation}` === location.hash
    );
    throw redirect({
      href: operation?.url ?? resourceRedirect.operations[0].url,
    });
  }
  const operationEntry = documentationCatalog.getOperation(url);
  const operationResource = operationEntry?.resource;
  const operation = operationEntry?.operation;
  const pageUrl = operationResource?.url ?? url;
  const page = documentationCatalog.getPage(pageUrl);
  if (!page) {
    throw notFound();
  }

  const document = await clientLoader.preload(page.path);
  const toc = document.toc.map(({ _step, depth, url: itemUrl }) => ({
    _step,
    depth,
    title: getTocTitle(
      document.structuredData.headings,
      itemUrl.slice(1),
      pageUrl
    ),
    url: itemUrl,
  }));
  return {
    description: operation?.description ?? document.frontmatter.description,
    markdownUrl: url === "/" ? "/index.md" : `${url}.md`,
    operation: operation
      ? {
          examples: operation.examples,
          id: operation.operation,
          method: operation.method,
          path: operation.path,
          responseMetadata: operation.responseMetadata,
          responses: operation.responses,
        }
      : undefined,
    path: page.path,
    resourceUrl: operationResource?.url,
    title: operation
      ? formatOperationName(operation.operation)
      : document.frontmatter.title,
    toc: operation ? getOperationToc(toc, operation.operation) : toc,
    url,
  };
}

export function getDocumentationHead({
  loaderData,
}: {
  loaderData?: DocumentationPageData;
}) {
  if (!loaderData) {
    return {};
  }

  const title = `${loaderData.title} · Blazing Agents Documentation`;
  const canonicalUrl = `${DOCUMENTATION_ORIGIN}${loaderData.url}`;

  return {
    links: [{ href: canonicalUrl, rel: "canonical" }],
    meta: [
      { title },
      { content: loaderData.description, name: "description" },
      { content: "article", property: "og:type" },
      { content: BRAND_NAME, property: "og:site_name" },
      { content: title, property: "og:title" },
      { content: loaderData.description, property: "og:description" },
      { content: canonicalUrl, property: "og:url" },
      { content: SOCIAL_IMAGE_URL, property: "og:image" },
      { content: SOCIAL_IMAGE_URL, property: "og:image:secure_url" },
      { content: "1200", property: "og:image:width" },
      { content: "636", property: "og:image:height" },
      { content: "image/jpeg", property: "og:image:type" },
      { content: SOCIAL_IMAGE_ALT, property: "og:image:alt" },
      { content: "summary_large_image", name: "twitter:card" },
      { content: title, name: "twitter:title" },
      { content: loaderData.description, name: "twitter:description" },
      { content: SOCIAL_IMAGE_URL, name: "twitter:image" },
      { content: SOCIAL_IMAGE_ALT, name: "twitter:image:alt" },
    ],
  };
}

export const Route = createFileRoute("/$")({
  component: DocumentationPage,
  loader: loadDocumentationPage,
  head: getDocumentationHead,
  server: {
    handlers: {
      GET: async ({ next, params }) => {
        const path = params._splat;
        if (!path?.endsWith(".md")) {
          return next();
        }
        const { getDocumentationMarkdownResponse } = await import(
          "../lib/markdown-response.server.ts"
        );
        return getDocumentationMarkdownResponse(path);
      },
    },
  },
});

export function getOperationToc(
  toc: DocumentationPageData["toc"],
  operation: string
): DocumentationPageData["toc"] {
  const start = toc.findIndex(({ url }) => url === `#${operation}`);
  const end = toc.findIndex(
    ({ depth }, index) => index > start && depth <= toc[start].depth
  );
  return toc.slice(start + 1, end === -1 ? toc.length : end);
}

function getTocTitle(
  headings: { content: string; id: string }[],
  id: string,
  pageUrl: string
): string {
  const heading = headings.find((candidate) => candidate.id === id);
  /* v8 ignore next -- @preserve: generated TOC entries always originate from these headings. */
  if (!heading) {
    throw new Error(`Missing generated heading ${id}`);
  }
  if (
    pageUrl.startsWith("/api-reference/rest-api/") &&
    API_OPERATION_HEADING.test(heading.content)
  ) {
    return formatOperationName(id);
  }
  return heading.content;
}

export function DocumentationPage({
  loadPage = Route.useLoaderData,
}: {
  loadPage?: () => DocumentationPageData;
} = {}) {
  const page = loadPage();
  const content = clientLoader.useContent(page.path, {
    components: mdxComponents,
  });
  const isApiOperation = page.resourceUrl !== undefined;
  const renderedContent = page.operation ? (
    <ApiOperationContent
      operation={page.operation.id}
      responseMetadata={page.operation.responseMetadata}
      responses={page.operation.responses}
    >
      {content}
    </ApiOperationContent>
  ) : (
    content
  );

  return (
    <DocumentationLayout tree={documentationPageTree}>
      <DocsPage
        breadcrumb={{ enabled: true }}
        className={page.operation ? "api-operation-page" : undefined}
        tableOfContent={
          page.operation
            ? {
                component: (
                  <ApiCodeRail
                    className="api-code-rail-desktop"
                    operation={page.title}
                    requests={page.operation.examples}
                    responses={page.operation.responses}
                  />
                ),
                enabled: true,
              }
            : { enabled: true }
        }
        tableOfContentPopover={{ enabled: !page.operation }}
        toc={page.toc}
      >
        <DocumentationPageHeader page={page} />
        {page.operation ? (
          <ApiCodeRail
            className="api-code-rail-inline"
            operation={page.title}
            requests={page.operation.examples}
            responses={page.operation.responses}
          />
        ) : null}
        <DocsBody className={isApiOperation ? "api-reference-page" : undefined}>
          {renderedContent}
        </DocsBody>
      </DocsPage>
    </DocumentationLayout>
  );
}

function DocumentationPageHeader({
  page,
}: {
  page: Pick<
    DocumentationPageData,
    "description" | "markdownUrl" | "operation" | "title"
  >;
}) {
  return (
    <div className="not-prose mb-8" data-page-header="true">
      <div className="flex items-center justify-between gap-4">
        <DocsTitle className="min-w-0 text-balance">{page.title}</DocsTitle>
        <DocumentationMarkdownCopyButton markdownUrl={page.markdownUrl} />
      </div>
      <DocsDescription className="mt-2 mb-0 max-w-3xl">
        {page.description}
      </DocsDescription>
      {page.operation ? (
        <div className="mt-6">
          <ApiOperationRoute
            method={page.operation.method}
            path={page.operation.path}
          />
        </div>
      ) : null}
    </div>
  );
}
