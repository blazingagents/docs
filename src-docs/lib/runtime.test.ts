import {
  createMemoryHistory,
  RouterContextProvider,
} from "@tanstack/react-router";
import { FrameworkProvider } from "fumadocs-core/framework";
import {
  type ComponentProps,
  type ComponentType,
  createElement,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import {
  ApiOperationContent,
  ApiReferenceTable,
} from "../components/api-reference.tsx";
import {
  ApiReferenceSectionHeading,
  ApiResponseDetails,
  ApiResponseProvider,
} from "../components/api-response-details.tsx";
import {
  documentationPages,
  restApiOperations,
} from "../generated/documentation-manifest.ts";
import { getRouter } from "../router.tsx";
import {
  DocumentationPage,
  getDocumentationHead,
  getOperationToc,
  loadDocumentationPage,
  Route,
} from "../routes/$.tsx";
import { getDocumentationSearchResponse } from "../routes/api/search.ts";
import { getFullLlmsResponse } from "../routes/llms-full[.]txt.ts";
import { getLlmsResponse } from "../routes/llms[.]txt.ts";
import { getDocumentationSitemapResponse } from "../routes/sitemap[.]xml.ts";
import {
  getAllDocumentationMarkdown,
  getDocumentationMarkdown,
  getDocumentationMarkdownUrl,
  getDocumentationPage,
} from "./document.server.ts";
import {
  cloudflarePagesRedirects,
  documentationNotFoundHtml,
} from "./hosting.ts";
import { getDocumentationMarkdownResponse } from "./markdown-response.server.ts";

const TestApiOperationContent = ApiOperationContent as ComponentType<
  Omit<ComponentProps<typeof ApiOperationContent>, "children"> & {
    children?: ReactNode;
  }
>;
const TestApiResponseProvider = ApiResponseProvider as ComponentType<
  Omit<ComponentProps<typeof ApiResponseProvider>, "children"> & {
    children?: ReactNode;
  }
>;

describe("documentation runtime artifacts", () => {
  test("omits the hidden operation root from terminal TOCs", () => {
    const request = { depth: 4, title: "Request", url: "#request" };
    expect(
      getOperationToc(
        [
          { depth: 3, title: "Create resource", url: "#create-resource" },
          request,
        ],
        "create-resource"
      )
    ).toEqual([request]);
  });

  test("hides the Markdown intro on single-operation pages", () => {
    const markup = renderToStaticMarkup(
      createElement(
        TestApiOperationContent,
        {
          operation: "get-workspace",
          responseMetadata: { description: "Returns the Workspace." },
          responses: [
            {
              contentType: "application/json",
              note: "Workspace",
              status: "200",
            },
          ],
        },
        createElement("h3", { className: "api-operation-heading" })
      )
    );
    expect(markup).toContain(
      ".api-single-operation > .api-operation-heading { display: none; }"
    );
    expect(markup).toContain(
      ".api-single-operation > #get-workspace, .api-single-operation > #get-workspace + p { display: none; }"
    );
    expect(markup).toContain(
      '.api-single-operation[data-api-operation="get-workspace"] > #get-workspace ~ :is(h2, .api-operation-heading) ~ * { display: none !important; }'
    );
  });

  test("scopes every operation boundary above response recovery rules", () => {
    const markup = renderToStaticMarkup(
      createElement(
        TestApiOperationContent,
        {
          operation: "list-agents",
          responseMetadata: { description: "Returns the Agents." },
          responses: [
            {
              contentType: "application/json",
              note: "Agents",
              status: "200",
            },
          ],
        },
        createElement("h3", {
          className: "api-operation-heading",
          id: "list-agents",
        })
      )
    );
    expect(markup).toContain(
      '.api-single-operation[data-api-operation="list-agents"] > #list-agents ~ :is(h2, .api-operation-heading)'
    );
    expect(markup).not.toContain(
      ".api-single-operation > #list-agents ~ :is(h2, .api-operation-heading)"
    );
  });

  test("renders interactive API response controls and schema disclosure", () => {
    const markup = renderToStaticMarkup(
      createElement(ApiResponseDetails, {
        metadata: {
          description: "Returns the updated Agent.",
          schema: {
            href: "/api-reference/protocols/objects-and-schemas#agent",
            name: "Agent",
          },
        },
        responses: [
          {
            code: '{ "id": "ag_1234567890ABCDEF" }',
            contentType: "application/json",
            language: "json",
            note: "Agent",
            status: "200",
          },
          {
            code: '{ "error": { "code": "not_found" } }',
            contentType: "application/json",
            language: "json",
            status: "404",
          },
        ],
      })
    );

    expect(markup).toContain('aria-label="Select response status"');
    expect(markup).toContain('aria-label="Select response content type"');
    expect(markup).toContain("Show child attributes");
    expect(markup).toContain(">Agent</a>");
  });

  test("replaces only response headings inside an operation context", () => {
    const markup = renderToStaticMarkup(
      createElement(
        TestApiResponseProvider,
        {
          metadata: { description: "Returns the Workspace." },
          responses: [
            {
              contentType: "application/json",
              note: "Workspace",
              status: "200",
            },
          ],
        },
        createElement(ApiReferenceSectionHeading, null, "Response"),
        createElement(ApiReferenceSectionHeading, null, "Errors")
      )
    );

    expect(markup).toContain('class="api-response-details"');
    expect(markup).toContain("<h4>Errors</h4>");
  });

  test("classifies legacy and current API parameter tables", () => {
    const legacyMarkup = renderToStaticMarkup(
      createElement(
        ApiReferenceTable,
        null,
        createElement(
          "thead",
          null,
          createElement(
            "tr",
            null,
            ...["Location", "Field", "Required", "Description"].map((header) =>
              createElement("th", { key: header }, header)
            )
          )
        ),
        createElement(
          "tbody",
          null,
          createElement(
            "tr",
            null,
            ...["Header", "Authorization", "yes", "Tenant API key."].map(
              (value) => createElement("td", { key: value }, value)
            )
          )
        )
      )
    );
    const currentMarkup = renderToStaticMarkup(
      createElement(
        ApiReferenceTable,
        null,
        createElement(
          "thead",
          null,
          createElement(
            "tr",
            null,
            ...["Field", "Type", "Location", "Required", "Description"].map(
              (header) => createElement("th", { key: header }, header)
            )
          )
        )
      )
    );

    expect(legacyMarkup).toContain(
      'data-api-parameter-layout="field-location"'
    );
    expect(legacyMarkup).toContain(
      "<td>Authorization</td><td>string</td><td>header</td><td>required</td>"
    );
    expect(currentMarkup).toContain(
      'data-api-parameter-layout="field-location"'
    );
  });

  test("loads canonical pages and their processed Markdown", async () => {
    const root = getDocumentationPage();
    const quickstart = getDocumentationPage(["getting-started", "quickstart"]);
    expect(root).toBeDefined();
    expect(quickstart).toBeDefined();
    expect(getDocumentationPage(["missing"])).toBeUndefined();
    if (!(root && quickstart)) {
      throw new Error("Expected generated documentation pages");
    }
    expect(getDocumentationMarkdownUrl(root)).toBe("/index.md");
    expect(getDocumentationMarkdownUrl(quickstart)).toBe(
      "/getting-started/quickstart.md"
    );
    expect(await getDocumentationMarkdown(quickstart)).toContain(
      "# Run your first Agent"
    );
    expect(await getAllDocumentationMarkdown()).toContain("# Agents");
  });

  test("emits complete redirect, not-found, and sitemap artifacts", async () => {
    expect(cloudflarePagesRedirects.trim().split("\n")).toHaveLength(
      restApiOperations.length
    );
    expect(documentationNotFoundHtml).toContain("<h1>Page not found</h1>");

    const response = getDocumentationSitemapResponse();
    const body = await response.text();
    expect(response.headers.get("content-type")).toBe(
      "application/xml; charset=utf-8"
    );
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=0, must-revalidate"
    );
    expect(body.match(/<url><loc>/g)).toHaveLength(
      documentationPages.length -
        restApiOperations.length +
        restApiOperations.reduce(
          (count, { operations }) => count + operations.length,
          0
        )
    );
    expect(body).toContain("https://docs.blazingagents.com/</loc>");
  });

  test("serves Markdown, search, and LLM discovery endpoints", async () => {
    const next = <TContext = undefined>(options?: { context?: TContext }) => ({
      context: options?.context as TContext,
      isNext: true as const,
    });
    const handlers = Route.options.server?.handlers;
    if (typeof handlers === "function") {
      throw new Error(
        "Documentation route handlers are not statically defined"
      );
    }
    const routeHandler = handlers?.GET;
    if (typeof routeHandler !== "function") {
      throw new Error("Documentation route has no GET handler");
    }
    const rootMarkdown = await getDocumentationMarkdownResponse("index.md");
    const operationMarkdown = await getDocumentationMarkdownResponse(
      "api-reference/rest-api/agents/create-agent.md"
    );
    expect(rootMarkdown.headers.get("content-type")).toBe(
      "text/markdown; charset=utf-8"
    );
    expect(await rootMarkdown.text()).toContain("# Blazing Agents");
    const operationMarkdownBody = await operationMarkdown.text();
    expect(operationMarkdownBody).toContain("### POST /v1/agents");
    expect(operationMarkdownBody).not.toContain("### GET /v1/agents");
    expect(
      await (await getDocumentationMarkdownResponse("missing.md")).text()
    ).toBe("Not Found");

    const search = await getDocumentationSearchResponse();
    expect(search.headers.get("cache-control")).toBe(
      "public, max-age=0, must-revalidate"
    );
    expect(await search.json()).toBeDefined();

    const llms = await getLlmsResponse();
    expect(llms.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(await llms.text()).toContain("Blazing Agents");
    expect(await (await getFullLlmsResponse()).text()).toContain(
      "# Blazing Agents"
    );

    const markdownRouteResponse = await routeHandler({
      context: undefined,
      next,
      params: { _splat: "index.md" },
      pathname: "/$",
      request: new Request("https://docs.blazingagents.com/index.md"),
    });
    const nextRouteResponse = await routeHandler({
      context: undefined,
      next,
      params: { _splat: undefined },
      pathname: "/$",
      request: new Request("https://docs.blazingagents.com/"),
    });
    expect(markdownRouteResponse).toBeInstanceOf(Response);
    expect(nextRouteResponse).toEqual({ context: undefined, isNext: true });
    if (!(markdownRouteResponse instanceof Response)) {
      throw new Error("Documentation route returned an invalid response");
    }
    expect(await markdownRouteResponse.text()).toContain("# Blazing Agents");
    expect((await getDocumentationSearchResponse()).status).toBe(200);
    expect((await getLlmsResponse()).status).toBe(200);
    expect((await getFullLlmsResponse()).status).toBe(200);

    const pageData = await loadDocumentationPage({
      location: { search: {} },
      params: { _splat: "getting-started/quickstart" },
    });
    expect(pageData.title).toBe("Run your first Agent");
    expect(pageData.toc).toBeInstanceOf(Array);
    await expect(
      loadDocumentationPage({
        location: { search: {} },
        params: { _splat: "api-reference/rest-api/api-keys" },
      })
    ).rejects.toBeDefined();
    await expect(
      loadDocumentationPage({
        location: { hash: "#create-agent", search: {} },
        params: { _splat: "api-reference/rest-api/agents" },
      })
    ).rejects.toBeDefined();
    await expect(
      loadDocumentationPage({
        location: { hash: "#missing-operation", search: {} },
        params: { _splat: "api-reference/rest-api/agents" },
      })
    ).rejects.toBeDefined();
    const operationPageData = await loadDocumentationPage({
      location: { search: {} },
      params: { _splat: "api-reference/rest-api/agents/create-agent" },
    });
    expect(operationPageData.title).toBe("Create agent");
    expect(operationPageData.operation).toEqual(
      expect.objectContaining({
        id: "create-agent",
        method: "POST",
        path: "/v1/agents",
      })
    );
    expect(operationPageData.operation?.examples).toHaveLength(7);
    expect(operationPageData.operation?.responses[0]).toMatchObject({
      contentType: "application/json",
      language: "json",
      status: "201",
    });
    expect(operationPageData.operation?.responseMetadata).toMatchObject({
      schema: { name: "agentResponseSchema" },
    });
    expect(operationPageData.toc.map(({ title }) => title)).toEqual([
      "Request",
      "Response",
      "Errors",
      "cURL",
      "SDK and related guides",
    ]);
    expect(getDocumentationHead({ loaderData: pageData }).meta).toContainEqual({
      content: "article",
      property: "og:type",
    });
    expect(getDocumentationHead({ loaderData: undefined })).toEqual({});
    const rootPageData = await loadDocumentationPage({
      location: { search: {} },
      params: { _splat: undefined },
    });
    expect(rootPageData.markdownUrl).toBe("/index.md");
    await expect(
      loadDocumentationPage({
        location: { search: {} },
        params: { _splat: "missing" },
      })
    ).rejects.toBeDefined();
    const router = getRouter();
    router.update({
      ...router.options,
      history: createMemoryHistory({ initialEntries: [pageData.url] }),
    });
    await router.load();
    const TestRouterContextProvider = RouterContextProvider as ComponentType<{
      router: typeof router;
    }>;
    const renderPage = (data: typeof pageData) =>
      renderToStaticMarkup(
        createElement(
          TestRouterContextProvider,
          { router },
          createElement(FrameworkProvider, {
            // biome-ignore lint/correctness/noChildrenProp: FrameworkProvider's contract requires children in its props type.
            children: DocumentationPage({ loadPage: () => data }),
            useParams: () => ({}),
            usePathname: () => data.url,
            useRouter: () => ({
              push: () => undefined,
              refresh: () => undefined,
            }),
          })
        )
      );
    const renderedPage = renderPage(pageData);
    const renderedOperationPage = renderPage(operationPageData);
    expect(renderedPage).toContain('data-page-header="true"');
    expect(renderedPage).toContain(
      "Create the smallest valid Agent and complete one streamed Turn."
    );
    expect(renderedPage.match(/<h1/g)).toHaveLength(1);
    expect(renderedPage.indexOf("Run your first Agent")).toBeLessThan(
      renderedPage.indexOf("Copy Markdown")
    );
    expect(renderedOperationPage).toContain('data-page-header="true"');
    expect(renderedOperationPage).toContain(
      'aria-label="Code examples for Create agent"'
    );
    expect(renderedOperationPage).not.toContain("On this page");
    expect(renderedOperationPage).toContain("POST");
    expect(renderedOperationPage).toContain("/v1/agents");
  }, 30_000);
});
