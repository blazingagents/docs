import {
  documentationPages,
  restApiOperations,
} from "../generated/documentation-manifest.ts";

type DocumentationPage = (typeof documentationPages)[number];
type RestApiResource = (typeof restApiOperations)[number];
type RestApiOperation = RestApiResource["operations"][number];

const pagesByUrl = new Map<string, DocumentationPage>(
  documentationPages.map((page) => [page.url, page])
);
const resourcesByUrl = new Map<string, RestApiResource>(
  restApiOperations.map((resource) => [resource.url, resource])
);
const operationsByUrl = new Map<
  string,
  Readonly<{ operation: RestApiOperation; resource: RestApiResource }>
>(
  restApiOperations.flatMap((resource) =>
    resource.operations.map(
      (operation) =>
        [operation.url, Object.freeze({ operation, resource })] as const
    )
  )
);
const pagePaths = Object.freeze(
  documentationPages.flatMap(({ url }) =>
    resourcesByUrl.has(url) ? [] : [url]
  )
);
const operationPaths = Object.freeze([...operationsByUrl.keys()]);

/** Immutable indexes and ordered path views over the generated docs manifest. */
export const documentationCatalog = Object.freeze({
  markdownPaths: Object.freeze(
    pagePaths.map((path) => (path === "/" ? "/index.md" : `${path}.md`))
  ),
  operationMarkdownPaths: Object.freeze(
    operationPaths.map((path) => `${path}.md`)
  ),
  operationPaths,
  pagePaths,
  paths: Object.freeze([...pagePaths, ...operationPaths]),
  redirects: Object.freeze(
    restApiOperations.map(({ operations, url }) =>
      Object.freeze([url, operations[0].url] as const)
    )
  ),
  getOperation: (url: string) => operationsByUrl.get(url),
  getPage: (url: string) => pagesByUrl.get(url),
  getResource: (url: string) => resourcesByUrl.get(url),
});
