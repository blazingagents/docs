import { spawnSync } from "node:child_process";
import { expect } from "vitest";
import { authoredMdxComponents } from "../components/mdx.tsx";
import type { PresentationContract } from "./documentation-contract.ts";
import { validateRestRequestExample } from "./rest-example-validator.ts";

const FENCE = /^[ \t]*```(?<language>[a-z0-9]+)(?<metadata>[^\n]*)$/gm;
const FENCE_ATTRIBUTE = /(?<name>tab-group|tab|title)="(?<value>[^"]+)"/g;
const JSX_TOKEN =
  /<(?<closing>\/)?(?<name>[A-Z][A-Za-z0-9]*)\b(?<body>[^>]*)>/g;
const JSX_ATTRIBUTE = /(?<name>href|name|title|type)="(?<value>[^"]+)"/g;
const STEPS_BODY = /<Steps>\s*(?<body>[\s\S]+?)\s*<\/Steps>/;
const STEP_BODY = /<Step>\s*(?<body>[\s\S]+?)\s*<\/Step>/g;
const EXPLICIT_HEADING_ID = /\[#(?<id>[a-z0-9-]+)\]\s*$/;
const EXPLICIT_HEADING_SUFFIX = /\[#.+?\]\s*$/;
const EXPLICIT_ID = /\[#(?<id>[a-z0-9-]+)\]|id="(?<htmlId>[^"]+)"/g;
const HEADING = /^(?<level>#{1,6})\s+(?<text>.+)$/gm;
const EXPLICIT_H2 = /^##\s+.+\s\[#(?<id>[a-z0-9-]+)\]$/gm;
const H2 = /^##\s+(?<text>.+)$/gm;
const SDK_METHOD_HEADING =
  /^### `(?<method>[a-zA-Z][a-zA-Z0-9_]*)\(\)` \[#(?<id>[a-z0-9-]+)\]$/gm;
const MARKDOWN_LINK_TEXT = /^\[(?<text>[^\]]+)\]\([^)]+\)$/;
const SECTION_HEADING_LINE = /^\s*#{2,3}\s+.+$/m;
const STEP_WRAPPER_TAG = /<\/?(?:Steps|Step)>/g;
const PARAGRAPH_BREAK = /\n\s*\n/;
const CAMEL_CASE_BOUNDARY = /([a-z0-9])([A-Z])/g;
const CURL_SECTION_HEADING = /^#### cURL\s*$/m;
const SUBSECTION_HEADING = /^#### /m;
const CURL_COMMAND = /^curl\b/;
const CURL_REQUEST_METHOD = /--request\s+(?<method>[A-Z]+)/;
const CURL_AUTHORIZATION = /Authorization: Bearer \$[A-Z][A-Z0-9_]+/;
const CURL_BASE_URL_PATH = /\$BLAZING_AGENTS_BASE_URL(?<path>\/v1\/[^"'\s?]+)/;
const CURL_JSON_BODY = /--data(?:-raw)?(?:\s|=)/;
const JSON_CONTENT_TYPE = /Content-Type: application\/json/;
const CURL_MULTIPART_BODY = /--form\b/;
const STEP_TAG = /<Step>/;
const authoredComponentNames = new Set(Object.keys(authoredMdxComponents));

interface IndexedName {
  index: number;
  name: string;
}
interface IndexedFence {
  body: string;
  index: number;
  language: string;
  metadata: string;
}

function camelToKebab(value: string): string {
  return value
    .replace(CAMEL_CASE_BOUNDARY, "$1-$2")
    .replaceAll("_", "-")
    .toLowerCase();
}

function slugify(value: string): string {
  return value
    .replace(EXPLICIT_HEADING_SUFFIX, "")
    .replaceAll("&", " and ")
    .replace(/[`*_~]/g, "")
    .replace(/<[^>]+>/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getAnchors(source: string): string[] {
  const anchors = new Set<string>();
  for (const match of source.matchAll(EXPLICIT_ID)) {
    const id = match.groups?.id ?? match.groups?.htmlId;
    if (id) {
      anchors.add(id);
    }
  }
  for (const match of source.matchAll(HEADING)) {
    const heading = match.groups?.text ?? "";
    anchors.add(
      heading.match(EXPLICIT_HEADING_ID)?.groups?.id ?? slugify(heading)
    );
  }
  return [...anchors];
}
export function validateComponentPresentation(
  row: PresentationContract,
  source: string,
  componentSource: string,
  occurrences: IndexedName[]
): void {
  expect(
    Object.fromEntries(
      [...new Set(occurrences.map(({ name }) => name))].map((name) => [
        name,
        occurrences.filter((candidate) => candidate.name === name).length,
      ])
    ),
    `${row.file}: component counts`
  ).toEqual(row.componentCounts);

  validateJsxNesting(row.file, componentSource);
  validateStepStructure(row, componentSource);
  validateCardStructure(row, componentSource);
  validateCalloutStructure(row, source, componentSource);
  validateFilesStructure(row, componentSource);
}

function validateJsxNesting(file: string, source: string): void {
  const stack: string[] = [];
  for (const match of source.matchAll(JSX_TOKEN)) {
    const name = match.groups?.name ?? "";
    if (!authoredComponentNames.has(name)) {
      continue;
    }
    if (match.groups?.closing) {
      expect(stack.pop(), `${file}: closing ${name}`).toBe(name);
      continue;
    }
    const parent = stack.at(-1);
    if (name === "Card") {
      expect(parent, `${file}: Card parent`).toBe("Cards");
    }
    if (name === "Step") {
      expect(parent, `${file}: Step parent`).toBe("Steps");
    }
    if (name === "Folder" || name === "File") {
      expect(["Files", "Folder"], `${file}: ${name} parent`).toContain(parent);
    }
    if (!match.groups?.body.trimEnd().endsWith("/")) {
      stack.push(name);
    }
  }
  expect(stack, `${file}: unclosed JSX`).toEqual([]);
}

export function validateFencePresentation(
  row: PresentationContract,
  source: string,
  fences: IndexedFence[]
): void {
  const endpointHeadings = [
    ...source.matchAll(
      /^### (?<method>DELETE|GET|PATCH|POST|PUT) (?<path>\/v1\/[^\s]+) \[#(?<operation>[a-z0-9-]+)\]$/gm
    ),
  ];
  if (row.fences.endpointCurls) {
    for (const [index, heading] of endpointHeadings.entries()) {
      const start = heading.index ?? -1;
      const end = endpointHeadings[index + 1]?.index ?? source.length;
      const endpointSource = source.slice(start, end);
      const curlHeading = endpointSource.match(CURL_SECTION_HEADING);
      expect(curlHeading?.index, `${row.file}: cURL section`).toBeDefined();
      const curlStart = start + (curlHeading?.index ?? 0);
      const afterCurlHeading = source.indexOf("\n", curlStart) + 1;
      const nextSubsection = source
        .slice(afterCurlHeading, end)
        .search(SUBSECTION_HEADING);
      const curlEnd =
        nextSubsection === -1 ? end : afterCurlHeading + nextSubsection;
      const endpointFences = fences.filter(
        (candidate) => candidate.index > curlStart && candidate.index < curlEnd
      );
      expect(endpointFences, `${row.file}: endpoint fence`).toHaveLength(1);
      const fence = endpointFences[0];
      expect(fence?.language, `${row.file}: endpoint fence language`).toBe(
        "bash"
      );
      expect(
        getFenceAttributes(fence?.metadata ?? ""),
        `${row.file}: endpoint fence metadata`
      ).toEqual({});
      validateRestCurl(
        row.file,
        heading.groups?.method ?? "",
        heading.groups?.operation ?? "",
        heading.groups?.path ?? "",
        fence?.body ?? ""
      );
      expect(
        fences.filter(
          (candidate) =>
            candidate.language === "bash" &&
            candidate.index > start &&
            candidate.index < end
        ),
        `${row.file}: no extra endpoint curl fences`
      ).toHaveLength(1);
    }
  } else {
    expect(
      fences.map(({ language, metadata }) => ({
        language,
        metadata: getFenceAttributes(metadata),
      })),
      `${row.file}: ordered fence contract`
    ).toEqual(row.fences.items);
  }
}

function getFenceAttributes(source: string): Record<string, string> {
  return Object.fromEntries(
    [...source.matchAll(FENCE_ATTRIBUTE)].map((match) => [
      match.groups?.name ?? "",
      match.groups?.value ?? "",
    ])
  );
}

function validateRestCurl(
  file: string,
  method: string,
  operation: string,
  plannedPath: string,
  body: string
): void {
  const syntax = spawnSync("bash", ["-n"], { encoding: "utf8", input: body });
  expect(syntax.status, `${file}: curl shell syntax\n${syntax.stderr}`).toBe(0);
  expect(body.trimStart(), `${file}: curl command`).toMatch(CURL_COMMAND);
  const requestMethod = body.match(CURL_REQUEST_METHOD)?.groups?.method;
  const actualMethod = requestMethod ?? "GET";
  expect(actualMethod, `${file}: curl HTTP method`).toBe(method);
  expect(body, `${file}: curl authorization`).toMatch(CURL_AUTHORIZATION);
  const actualPath = body.match(CURL_BASE_URL_PATH)?.groups?.path;
  const pathPattern = new RegExp(
    `^${plannedPath
      .split("/")
      .map((segment) => {
        if (segment === "*") {
          return ".+";
        }
        if (segment.startsWith(":")) {
          return "[^/]+";
        }
        return escapeRegex(segment);
      })
      .join("/")}$`
  );
  expect(actualPath, `${file}: curl request path`).toMatch(pathPattern);
  const hasJsonBody = CURL_JSON_BODY.test(body);
  if (hasJsonBody) {
    expect(body, `${file}: curl JSON content type`).toMatch(JSON_CONTENT_TYPE);
  }
  if (CURL_MULTIPART_BODY.test(body)) {
    expect(body, `${file}: multipart request`).not.toMatch(JSON_CONTENT_TYPE);
  }
  validateRestRequestExample(file, operation, body);
}

function validateStepStructure(
  row: PresentationContract,
  componentSource: string
): void {
  if (row.steps.length === 0) {
    return;
  }
  const wrapper = componentSource.match(STEPS_BODY)?.groups?.body;
  expect(wrapper, `${row.file}: Steps wrapper`).toBeDefined();
  const stepBodies = wrapper
    ? [...wrapper.matchAll(STEP_BODY)].map((match) => match.groups?.body ?? "")
    : [];
  const actualHeadings = stepBodies.map((body) => {
    const headings = [...body.matchAll(/^\s*#{2,3}\s+(?<text>.+)$/gm)];
    expect(headings, `${row.file}: exactly one heading per Step`).toHaveLength(
      1
    );
    return normalizeHeading(headings[0]?.groups?.text ?? "");
  });
  expect(actualHeadings, `${row.file}: Step headings and order`).toEqual(
    row.steps
  );
  for (const heading of actualHeadings) {
    expect(
      componentSource.replace(wrapper ?? "", ""),
      `${row.file}: ${heading} must only occur inside Steps`
    ).not.toMatch(
      new RegExp(`^\\s*#{2,3}\\s+${escapeRegex(heading)}(?:\\s|$)`, "m")
    );
  }
}

function validateCardStructure(
  row: PresentationContract,
  componentSource: string
): void {
  if (row.cards.length === 0) {
    return;
  }
  const destinations = [...componentSource.matchAll(JSX_TOKEN)]
    .filter((match) => match.groups?.name === "Card" && !match.groups?.closing)
    .map((match) => getJsxAttributes(match.groups?.body ?? "").href ?? "");
  expect(destinations, `${row.file}: Card destinations and order`).toEqual(
    row.cards
  );
}

function validateCalloutStructure(
  row: PresentationContract,
  source: string,
  componentSource: string
): void {
  if (!row.callout) {
    return;
  }
  const callout = [...componentSource.matchAll(JSX_TOKEN)].find(
    (match) => match.groups?.name === "Callout" && !match.groups?.closing
  );
  expect(callout, `${row.file}: Callout`).toBeDefined();
  const attributes = getJsxAttributes(callout?.groups?.body ?? "");
  expect(attributes.type, `${row.file}: Callout type`).toBe(row.callout.type);
  expect(attributes.title, `${row.file}: Callout title`).toBe(
    row.callout.title
  );

  const section = row.callout.section;
  if (section && callout?.index !== undefined) {
    const range = getHeadingSection(source, section);
    expect(callout.index, `${row.file}: Callout section start`).toBeGreaterThan(
      range.start
    );
    expect(callout.index, `${row.file}: Callout section end`).toBeLessThan(
      range.end
    );
    const prefix = source.slice(range.start, callout.index);
    if (row.callout.placement === "section-start") {
      expect(
        stripSectionOpening(prefix),
        `${row.file}: Callout at section opening`
      ).toBe("");
    }
    if (row.callout.placement === "after-first-paragraph") {
      expect(
        getSectionParagraphs(prefix),
        `${row.file}: Callout position`
      ).toHaveLength(1);
    }
  }
  if (row.callout.placement === "before-first-step") {
    const firstStep = componentSource.search(STEP_TAG);
    expect(firstStep, `${row.file}: first Step`).toBeGreaterThan(-1);
    expect(
      callout?.index ?? source.length,
      `${row.file}: Callout before Step`
    ).toBeLessThan(firstStep);
  }
  if (row.callout.placement === "before-first-fence") {
    expect(
      callout?.index ?? source.length,
      `${row.file}: Callout before code`
    ).toBeLessThan(source.search(FENCE));
  }
}

function validateFilesStructure(
  row: PresentationContract,
  componentSource: string
): void {
  if (row.filesTree.length === 0) {
    return;
  }
  const actual = [...componentSource.matchAll(JSX_TOKEN)].flatMap((match) => {
    const name = match.groups?.name ?? "";
    if (match.groups?.closing || (name !== "Folder" && name !== "File")) {
      return [];
    }
    return [`${name}:${getJsxAttributes(match.groups?.body ?? "").name}`];
  });
  expect(actual, `${row.file}: exact Files tree`).toEqual(row.filesTree);
}

function getJsxAttributes(source: string): Record<string, string> {
  return Object.fromEntries(
    [...source.matchAll(JSX_ATTRIBUTE)].map((match) => [
      match.groups?.name ?? "",
      match.groups?.value ?? "",
    ])
  );
}

function normalizeHeading(value: string): string {
  const heading = value.replace(EXPLICIT_HEADING_SUFFIX, "").trim();
  return heading.match(MARKDOWN_LINK_TEXT)?.groups?.text ?? heading;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripSectionOpening(value: string): string {
  return value
    .replace(SECTION_HEADING_LINE, "")
    .replace(STEP_WRAPPER_TAG, "")
    .trim();
}

function getSectionParagraphs(value: string): string[] {
  return stripSectionOpening(value)
    .split(PARAGRAPH_BREAK)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function validateStableAnchors(
  row: PresentationContract,
  source: string
): void {
  const h2s = [...source.matchAll(new RegExp(H2.source, H2.flags))];
  const explicitH2s = [...source.matchAll(EXPLICIT_H2)];
  expect(explicitH2s, `${row.file}: explicit H2 IDs`).toHaveLength(h2s.length);
  for (const heading of h2s) {
    const text = heading.groups?.text ?? "";
    const id = text.match(EXPLICIT_HEADING_ID)?.groups?.id;
    expect(
      { heading: normalizeHeading(text), id },
      `${row.file}: exact H2 heading/ID pair`
    ).toEqual({ heading: normalizeHeading(text), id: slugify(text) });
  }
  const assignedIds = row.anchors.assignedIds;
  for (const id of assignedIds) {
    expect(getAnchors(source), `${row.file}: assigned anchor ${id}`).toContain(
      id
    );
  }
  if (row.anchors.kind === "methods") {
    const methods = [...source.matchAll(SDK_METHOD_HEADING)].map((match) => ({
      heading: match.groups?.method ?? "",
      id: match.groups?.id ?? "",
    }));
    expect(
      methods.map(({ id }) => id),
      `${row.file}: assigned method IDs and order`
    ).toEqual(assignedIds);
    for (const method of methods) {
      expect(method.id, `${row.file}: ${method.heading} heading ID`).toBe(
        camelToKebab(method.heading)
      );
    }
  }
  if (row.anchors.kind === "operations") {
    const operationIds = [
      ...source.matchAll(
        /^### (?:DELETE|GET|PATCH|POST|PUT) \/v1\/[^\s]+ \[#(?<id>[a-z0-9-]+)\]$/gm
      ),
    ].map((match) => match.groups?.id ?? "");
    expect(
      operationIds,
      `${row.file}: assigned operation IDs and order`
    ).toEqual(assignedIds);
  }
  if (row.anchors.kind === "schemas") {
    const schemas = [
      ...source.matchAll(/^### (?<heading>.+?) \[#(?<id>[a-z0-9-]+)\]$/gm),
    ].map((match) => ({
      heading: match.groups?.heading ?? "",
      id: match.groups?.id ?? "",
    }));
    expect(schemas, `${row.file}: exact schema heading/ID branches`).toEqual(
      (row.anchors.assignedHeadings ?? []).map((heading, index) => ({
        heading,
        id: assignedIds[index],
      }))
    );
  }
}
function getHeadingSection(
  source: string,
  requestedHeading: string
): { end: number; start: number } {
  const headings = [
    ...source.matchAll(/^\s*(?<level>#{2,3})\s+(?<text>.+)$/gm),
  ];
  const index = headings.findIndex(
    (heading) =>
      (heading.groups?.text ?? "")
        .replace(EXPLICIT_HEADING_SUFFIX, "")
        .trimEnd() === requestedHeading
  );
  if (index === -1) {
    throw new Error(`Missing H2 section: ${requestedHeading}`);
  }
  const level = headings[index]?.groups?.level.length ?? 2;
  const next = headings
    .slice(index + 1)
    .find((heading) => (heading.groups?.level.length ?? 2) <= level);
  return {
    end: next?.index ?? source.length,
    start: headings[index]?.index ?? -1,
  };
}
