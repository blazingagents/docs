// biome-ignore-all lint/performance/noNamespaceImport: this test reflects every public runtime schema export.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as agents from "@blazing-agents/core/entities/agents";
import * as apikeys from "@blazing-agents/core/entities/apikeys";
import * as artifacts from "@blazing-agents/core/entities/artifacts";
import * as attribution from "@blazing-agents/core/entities/attribution";
import * as chat from "@blazing-agents/core/entities/chat";
import * as mcpConnections from "@blazing-agents/core/entities/mcp-connections";
import * as memories from "@blazing-agents/core/entities/memories";
import * as prompts from "@blazing-agents/core/entities/prompts";
import * as providers from "@blazing-agents/core/entities/providers";
import * as sessions from "@blazing-agents/core/entities/sessions";
import * as tasks from "@blazing-agents/core/entities/tasks";
import * as tenants from "@blazing-agents/core/entities/tenants";
import * as usage from "@blazing-agents/core/entities/usage";
import * as workspaces from "@blazing-agents/core/entities/workspaces";
import { expect } from "vitest";
import { documentationContract } from "./documentation-contract.ts";

const contentDirectory = resolve(process.cwd(), "content/docs");
const H3 = /^### (?<heading>.+?) \[#(?<id>[a-z0-9-]+)\]$/gm;
const STATE_ROW = /^\| `(?<name>[^`]+)` \| (?<values>[^|]+) \|$/gm;
const SCHEMA_NAME = /`(?<name>[a-zA-Z][a-zA-Z0-9]+Schema)`/g;
const ALPHABETICAL = (left: string, right: string) => left.localeCompare(right);
const publicEntityExports: Record<string, unknown> = {
  ...agents,
  ...apikeys,
  ...artifacts,
  ...attribution,
  ...chat,
  ...mcpConnections,
  ...memories,
  ...prompts,
  ...providers,
  ...sessions,
  ...tasks,
  ...tenants,
  ...usage,
  ...workspaces,
};

interface RuntimeSchema {
  options?: readonly string[];
  shape?: Record<string, RuntimeSchema>;
  type?: string;
  value?: unknown;
}

export function validateProtocolObjectAndStateInventory(): void {
  const file = "api-reference/protocols/objects-and-schemas.md";
  const documentation = readFileSync(resolve(contentDirectory, file), "utf8");
  const contract = documentationContract.presentations.find(
    (row) => row.file === file
  );
  if (
    !(contract?.anchors.assignedHeadings && contract.anchors.assignedSchemas)
  ) {
    throw new Error("Missing canonical object catalog headings");
  }
  const catalogEnd = documentation.indexOf("## Examples");
  const catalog = documentation.slice(
    documentation.indexOf("### Agent "),
    catalogEnd
  );
  const headings = [...catalog.matchAll(H3)].map((match) => ({
    heading: match.groups?.heading ?? "",
    id: match.groups?.id ?? "",
  }));
  expect(
    headings,
    "canonical object catalog is exact and bidirectional"
  ).toEqual(
    contract.anchors.assignedHeadings.map((heading, index) => ({
      heading,
      id: contract.anchors.assignedIds[index],
    }))
  );

  const referencedSchemas = new Set<string>();
  for (const [index, { heading }] of headings.entries()) {
    const start = catalog.indexOf(`### ${heading} `);
    const nextHeading = headings[index + 1]?.heading;
    const end = nextHeading
      ? catalog.indexOf(`### ${nextHeading} `)
      : catalog.length;
    const schemaNames = [...catalog.slice(start, end).matchAll(SCHEMA_NAME)]
      .map((match) => match.groups?.name ?? "")
      .filter((name) => name in publicEntityExports);
    expect(
      schemaNames.length,
      `${heading}: public runtime schema`
    ).toBeGreaterThan(0);
    const schemaName = contract.anchors.assignedSchemas[index] ?? "";
    expect(
      schemaNames,
      `${heading}: assigned public runtime schema is documented`
    ).toContain(schemaName);
    const schema = publicEntityExports[schemaName] as RuntimeSchema | undefined;
    expect(schema?.type, `${heading}: object-shaped public schema`).toBe(
      "object"
    );
    expect(
      referencedSchemas.has(schemaName),
      `${heading}: unique schema owner`
    ).toBe(false);
    referencedSchemas.add(schemaName);
  }
  expect(
    [...referencedSchemas],
    "documented resource schemas exactly match the authoritative public inventory"
  ).toEqual(contract.anchors.assignedSchemas);
  expect(
    contract.anchors.assignedSchemas.every(
      (schemaName) =>
        (publicEntityExports[schemaName] as RuntimeSchema | undefined)?.type ===
        "object"
    ),
    "every authoritative resource schema is a public object export"
  ).toBe(true);
  expect(
    new Set(contract.anchors.assignedSchemas).size,
    "one authoritative schema per catalog branch"
  ).toBe(headings.length);

  const stateSection = documentation.slice(
    documentation.indexOf("#### Public state vocabulary"),
    documentation.indexOf("### Agent ")
  );
  const documentedStates = Object.fromEntries(
    [...stateSection.matchAll(STATE_ROW)].map((match) => [
      match.groups?.name ?? "",
      [...(match.groups?.values ?? "").matchAll(/`(?<value>[^`]+)`/g)].map(
        (value) => value.groups?.value ?? ""
      ),
    ])
  );
  for (const [path, values] of Object.entries(documentedStates)) {
    expect(values, `${path}: exact runtime vocabulary`).toEqual(
      getRuntimeVocabulary(path)
    );
  }
  const exportedEnums = Object.entries(publicEntityExports)
    .filter(
      ([, schema]) => (schema as RuntimeSchema | undefined)?.type === "enum"
    )
    .map(([name]) => name)
    .sort(ALPHABETICAL);
  expect(
    Object.keys(documentedStates)
      .filter((name) => !name.includes("."))
      .sort(ALPHABETICAL),
    "every public runtime entity enum has exactly one vocabulary row"
  ).toEqual(exportedEnums);
}

function getRuntimeVocabulary(path: string): string[] {
  const [schemaName, field] = path.split(".");
  let schema = publicEntityExports[schemaName ?? ""] as
    | RuntimeSchema
    | undefined;
  if (field) {
    schema = schema?.shape?.[field];
  }
  if (schema?.options) {
    return [...schema.options];
  }
  return schema?.type === "literal" && typeof schema.value === "string"
    ? [schema.value]
    : [];
}
