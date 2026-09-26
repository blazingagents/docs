import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Generates the REST API reference pages from the platform OpenAPI contract. */
const root = fileURLToPath(new URL("../", import.meta.url));
const specPath = resolve(root, "openapi/openapi.json");
const introDirectory = resolve(root, "content/rest-api-intros");
const pageDirectory = resolve(root, "content/docs/api-reference/rest-api");
const handWrittenPages = new Set(["index", "authentication"]);

/** Pages that do not follow the operation's first tag. */
const pageOverrides = new Map([
  ["POST /v1/agents/{agentId}/generation", "generation"],
]);
/**
 * Anchors for operations without an `operationId`, from tags the platform has
 * not converted to its contract conventions yet. Converted operations take
 * their anchor from the `operationId`; delete entries as their tags convert.
 */
const anchorOverrides = new Map([
  ["PATCH /v1/chat-connections/{id}", "rename-chat-connection"],
  ["POST /v1/chat-connections/{id}/credentials", "rotate-chat-credentials"],
  ["POST /v1/chat-connections/{id}/health", "check-chat-health"],
  ["GET /v1/agents/{agentId}/sessions", "list-sessions"],
  ["POST /v1/agents/{agentId}/sessions", "create-session-turn"],
  ["POST /v1/agents/{agentId}/sessions/{sessionId}", "resume-session-turn"],
  [
    "GET /v1/agents/{agentId}/sessions/{sessionId}/tool-approval-continuations/{continuationId}",
    "join-tool-approval-continuation",
  ],
  ["GET /v1/agents/{agentId}/skills", "list-skills"],
  ["POST /v1/agents/{agentId}/skills/upload", "upload-skill"],
  ["GET /v1/agents/{agentId}/skills/{skillId}/files", "get-skill-file"],
  ["PUT /v1/agents/{agentId}/skills/{skillId}/files", "put-skill-file"],
  ["POST /v1/agents/{agentId}/skills/{skillId}/copies", "copy-skill"],
  ["GET /v1/agents/{agentId}/memories", "list-memories"],
  ["PATCH /v1/providers/{id}", "update-provider"],
  ["GET /v1/providers/{id}/models", "list-provider-models"],
  ["GET /v1/providers/{id}/thinking-levels", "list-thinking-levels"],
  ["GET /v1/usage", "get-usage"],
  ["GET /v1/agents/{agentId}/usage", "get-agent-usage"],
  ["POST /v1/tasks/{taskId}/runs", "create-task-run"],
  ["GET /v1/tasks/{taskId}/runs", "list-task-runs"],
  ["GET /v1/tasks/{taskId}/runs/{runId}/messages", "list-task-run-messages"],
]);

const SAMPLE_TIMESTAMP = "2026-07-10T10:00:00Z";
/** The style guide's example model, for fields the spec gives no example. */
const EXAMPLE_MODEL = "openai/gpt-6-luna";
const MODEL_FIELD = /^model(?:Id)?$/;
const ID_PATTERN = /^\^([a-z]+_)\[0-9A-Za-z\]\{16\}\$$/;
const FRONTMATTER = /^---\ntitle: (?<title>.+)\ndescription: (?<description>.+)\n---\n/;
const NEXT_SECTION = /^## Next \[#next\]/m;
const STATUS_TEXT = {
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No Content",
};
const ERROR_CODES = {
  400: "validation_failed",
  401: "unauthorized",
  404: "not_found",
  413: "invalid_request",
  429: "rate_limited",
  503: "service_unavailable",
};
const METHODS = ["get", "post", "put", "patch", "delete"];
const CAMEL_CASE_BOUNDARY = /([a-z0-9])([A-Z])/g;
const BODY_NAMES = {
  "application/json": "a JSON body",
  "application/octet-stream": "a binary body",
  "multipart/form-data": "a multipart form body",
};

const spec = JSON.parse(readFileSync(specPath, "utf8"));

function resolveSchema(schema) {
  if (schema?.$ref) {
    return spec.components.schemas[schema.$ref.split("/").at(-1)];
  }
  return schema ?? {};
}

function schemaName(schema) {
  return schema?.$ref?.split("/").at(-1);
}

function primaryType(schema) {
  const types = [schema.type].flat().filter((type) => type && type !== "null");
  return types[0] ?? (schema.properties ? "object" : undefined);
}

/** Builds a schema-shaped example; `minimal` keeps only what a request needs. */
export function exampleFor(input, { minimal = false, name = "" } = {}, depth = 0) {
  const schema = resolveSchema(input);
  if (schema.example !== undefined) {
    return schema.example;
  }
  if (schema.examples?.length) {
    return schema.examples[0];
  }
  const variant = schema.oneOf ?? schema.anyOf;
  if (variant) {
    return exampleFor(variant[0], { minimal, name }, depth + 1);
  }
  if (schema.const !== undefined) {
    return schema.const;
  }
  if (schema.enum) {
    return schema.enum[0];
  }
  if (schema.default !== undefined && !minimal) {
    return schema.default;
  }
  const type = primaryType(schema);
  if (!type) {
    return [schema.type].flat().includes("null") ? null : {};
  }
  if (type === "object") {
    if (depth > 6 || !schema.properties) {
      return {};
    }
    const required = new Set(schema.required ?? []);
    const keys = Object.keys(schema.properties);
    const selected = minimal
      ? keys.filter((key) => required.has(key))
      : keys;
    return Object.fromEntries(
      (selected.length > 0 || !minimal ? selected : keys.slice(0, 1)).map(
        (key) => [
          key,
          exampleFor(schema.properties[key], { minimal, name: key }, depth + 1),
        ]
      )
    );
  }
  if (type === "array") {
    if (minimal && !schema.minItems) {
      return [];
    }
    return [exampleFor(schema.items, { minimal, name }, depth + 1)];
  }
  if (type === "integer" || type === "number") {
    return schema.minimum ?? (schema.exclusiveMinimum ?? -1) + 1;
  }
  if (type === "boolean") {
    return true;
  }
  const id = schema.pattern?.match(ID_PATTERN)?.[1];
  if (id) {
    return `${id}1234567890ABCDEF`;
  }
  if (schema.format === "date-time") {
    return SAMPLE_TIMESTAMP;
  }
  if (schema.format === "uri" || schema.format === "url" || /Url$/.test(name)) {
    return "https://example.com";
  }
  if (schema.format === "binary") {
    return "file";
  }
  return MODEL_FIELD.test(name) ? EXAMPLE_MODEL : "string";
}

function typeLabel(input) {
  const schema = resolveSchema(input);
  const variant = schema.oneOf ?? schema.anyOf;
  const nullable = [schema.type].flat().includes("null");
  let label;
  if (variant) {
    label = [...new Set(variant.map(typeLabel))].join(" | ");
  } else if (primaryType(schema) === "array") {
    label = `${typeLabel(schema.items)}[]`;
  } else if (schema.format === "binary") {
    label = "file";
  } else {
    label = primaryType(schema) ?? (nullable ? "null" : "any");
  }
  return nullable && label !== "null" ? `${label} | null` : label;
}

function code(value) {
  return `\`${typeof value === "string" && value ? value : JSON.stringify(value)}\``;
}

function describeField(input) {
  const schema = resolveSchema(input);
  const parts = [];
  if (schema.description) {
    parts.push(schema.description.replace(/\.?$/, "."));
  }
  const id = schema.pattern?.match(ID_PATTERN)?.[1];
  if (id && !schema.description) {
    parts.push(`\`${id}…\` ID.`);
  }
  if (schema.enum && schema.enum.length > 1) {
    parts.push(`One of ${schema.enum.map(code).join(", ")}.`);
  }
  if (schema.minLength !== undefined && schema.maxLength !== undefined) {
    parts.push(`${schema.minLength}–${schema.maxLength} characters.`);
  } else if (schema.maxLength !== undefined) {
    parts.push(`Up to ${schema.maxLength} characters.`);
  }
  if (schema.minimum !== undefined) {
    parts.push(
      schema.maximum === undefined || schema.maximum === Number.MAX_SAFE_INTEGER
        ? `Minimum ${schema.minimum}.`
        : `${schema.minimum}–${schema.maximum}.`
    );
  }
  if (schema.default !== undefined) {
    parts.push(`Defaults to ${code(schema.default)}.`);
  }
  return parts.join(" ");
}

function cell(value) {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function colonPath(path) {
  return path.replaceAll(/\{([^}]+)\}/g, ":$1");
}

function slug(summary) {
  return summary
    .toLowerCase()
    .replaceAll("'s", "")
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !["a", "an", "the"].includes(word))
    .join("-");
}

function requestBody(operation) {
  const [contentType, media] = Object.entries(
    operation.requestBody?.content ?? {}
  )[0] ?? [undefined, undefined];
  return contentType
    ? {
        contentType,
        example: media.example,
        schema: resolveSchema(media.schema),
      }
    : undefined;
}

function parameterRows(operation, body) {
  const rows = (operation.parameters ?? []).map((parameter) => ({
    description: describeField(parameter.schema),
    location: parameter.in,
    name: parameter.name,
    required: parameter.required === true,
    type: typeLabel(parameter.schema),
  }));
  if (body?.schema.properties) {
    const required = new Set(body.schema.required ?? []);
    for (const [name, schema] of Object.entries(body.schema.properties)) {
      rows.push({
        description: describeField(schema),
        location: body.contentType === "multipart/form-data" ? "form" : "body",
        name,
        required: required.has(name),
        type: typeLabel(schema),
      });
    }
  } else if (body) {
    rows.push({
      description: `Raw \`${body.contentType}\` request body.`,
      location: "body",
      name: "(body)",
      required: operation.requestBody.required === true,
      type: typeLabel(body.schema),
    });
  }
  return rows;
}

function successResponses(operation) {
  return Object.entries(operation.responses)
    .filter(([status]) => status.startsWith("2"))
    .map(([status, response]) => {
      const [contentType, media] = Object.entries(response.content ?? {})[0] ?? [];
      const json = contentType === "application/json";
      return {
        contentType,
        description: response.description,
        example: media?.example ?? (json ? exampleFor(media.schema) : undefined),
        headers: Object.entries(response.headers ?? {}).map(
          ([name, header]) => ({ description: header.description, name })
        ),
        schema: json ? schemaName(media.schema) : undefined,
        status,
      };
    });
}

function errorResponses(operation) {
  return Object.entries(operation.responses)
    .filter(([status]) => !status.startsWith("2"))
    .map(([status, response]) => ({
      codes: response["x-error-codes"] ?? [],
      description: response.description,
      example: {
        error: {
          code:
            response["x-error-codes"]?.[0] ??
            ERROR_CODES[status] ??
            spec.components.schemas.ApiError.properties.error.properties.code
              .enum[0],
          message: `${response.description}.`,
        },
      },
      status,
    }));
}

function curlFor(operation, path, body, responses) {
  const parameters = operation.parameters ?? [];
  let url = path.replaceAll(/\{([^}]+)\}/g, (_match, name) =>
    String(
      exampleFor(
        parameters.find((parameter) => parameter.name === name)?.schema,
        { name }
      )
    )
  );
  const query = parameters
    .filter((parameter) => parameter.in === "query" && parameter.required)
    .map(
      (parameter) =>
        `${parameter.name}=${encodeURIComponent(String(exampleFor(parameter.schema, { name: parameter.name })))}`
    );
  if (query.length > 0) {
    url += `?${query.join("&")}`;
  }
  const method = operation.method.toUpperCase();
  const contentTypes = responses.map(({ contentType }) => contentType);
  const flags = [
    ...(contentTypes.includes("text/event-stream") ||
    contentTypes.includes("text/plain")
      ? ["--no-buffer"]
      : []),
    ...(method === "GET" ? [] : [`--request ${method}`]),
  ];
  const lines = [
    `curl${flags.map((flag) => ` ${flag}`).join("")} "$BLAZING_AGENTS_BASE_URL${url}"`,
    '--header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"',
  ];
  if (body?.contentType === "application/json") {
    lines.push(
      '--header "Content-Type: application/json"',
      `--data '${JSON.stringify(body.example ?? exampleFor(body.schema, { minimal: true }))}'`
    );
  } else if (body?.contentType === "multipart/form-data") {
    for (const [name, schema] of Object.entries(body.schema.properties)) {
      if ((body.schema.required ?? []).includes(name)) {
        const value = exampleFor(schema, { minimal: true });
        lines.push(
          `--form "${name}=${resolveSchema(schema).format === "binary" ? `@./${name}` : value}"`
        );
      }
    }
  } else if (body) {
    lines.push('--data-binary "@./file"');
  }
  if (contentTypes.includes("application/octet-stream")) {
    lines.push("--output file");
  }
  return lines.join(" \\\n  ");
}

function readIntro(slugName) {
  const source = readFileSync(resolve(introDirectory, `${slugName}.md`), "utf8");
  const frontmatter = source.match(FRONTMATTER);
  if (!frontmatter) {
    throw new Error(`${slugName}.md intro needs a title and description`);
  }
  const body = source.slice(frontmatter[0].length).trim();
  const nextIndex = body.search(NEXT_SECTION);
  return {
    ...frontmatter.groups,
    intro: nextIndex === -1 ? body : body.slice(0, nextIndex).trim(),
    next: nextIndex === -1 ? "" : body.slice(nextIndex).trim(),
  };
}

/** Returns the documented operations grouped into pages, in navigation order. */
export function loadRestApi() {
  const acceptsApiKey = (operation) =>
    (operation.security ?? spec.security).some((scheme) => "ApiKey" in scheme);
  const operations = Object.entries(spec.paths).flatMap(([path, item]) =>
    METHODS.filter((method) => item[method] && acceptsApiKey(item[method])).map(
      (method) => {
        const operation = { ...item[method], method };
        const key = `${method.toUpperCase()} ${path}`;
        const body = requestBody(operation);
        const responses = successResponses(operation);
        return {
          anchor: operation.operationId
            ? operation.operationId.replace(CAMEL_CASE_BOUNDARY, "$1-$2").toLowerCase()
            : (anchorOverrides.get(key) ?? slug(operation.summary)),
          body,
          curl: curlFor(operation, path, body, responses),
          errors: errorResponses(operation),
          method: method.toUpperCase(),
          page:
            pageOverrides.get(key) ??
            operation.tags.find((tag) => tag !== "dashboard"),
          parameters: parameterRows(operation, body),
          path: colonPath(path),
          responses,
          summary: operation.summary,
          /** Only converted operations carry descriptions written for tenants. */
          ...(operation.operationId ? { description: operation.description } : {}),
        };
      }
    )
  );
  const navigation = JSON.parse(
    readFileSync(resolve(pageDirectory, "meta.json"), "utf8")
  ).pages.filter((page) => !handWrittenPages.has(page));
  const unlisted = [...new Set(operations.map(({ page }) => page))].filter(
    (page) => !navigation.includes(page)
  );
  if (unlisted.length > 0) {
    throw new Error(`Add ${unlisted.join(", ")} to rest-api/meta.json`);
  }
  return navigation.map((page) => ({
    ...readIntro(page),
    operations: operations.filter((operation) => operation.page === page),
    slug: page,
  }));
}

function renderResponses(responses) {
  return responses.flatMap((response) => {
    const media = response.contentType ? ` as \`${response.contentType}\`` : "";
    const headers = response.headers.map(
      ({ description, name }) => ` Sets \`${name}\`: ${description}.`
    );
    return [
      `Returns \`${response.status} ${STATUS_TEXT[response.status]}\`${media}. ${response.description}.${headers.join("")}`,
      ...(response.schema ? [`Response schema: \`${response.schema}\`.`] : []),
      ...(response.example === undefined
        ? []
        : [
            response.contentType === "application/json"
              ? `\`\`\`json\n${JSON.stringify(response.example, null, 2)}\n\`\`\``
              : `\`\`\`text\n${response.example}\n\`\`\``,
          ]),
    ];
  });
}

function renderOperation(operation) {
  const table =
    operation.parameters.length === 0
      ? ["There are no parameters and no request body."]
      : [
          [
            "| Field | Type | Location | Required | Description |",
            "| --- | --- | --- | --- | --- |",
            ...operation.parameters.map(
              (row) =>
                `| \`${row.name}\` | ${cell(row.type)} | ${row.location} | ${row.required ? "required" : ""} | ${cell(row.description)} |`
            ),
          ].join("\n"),
        ];
  const auth = `Requires [bearer authentication](/api-reference/rest-api/authentication)${operation.body ? ` and ${BODY_NAMES[operation.body.contentType]}` : ""}.`;
  return [
    `### ${operation.method} ${operation.path} [#${operation.anchor}]`,
    `${operation.summary}.`,
    ...(operation.description ? [operation.description] : []),
    "#### Request",
    auth,
    ...table,
    "#### Response",
    ...renderResponses(operation.responses),
    "#### Errors",
    [
      "| Status | Codes | Description |",
      "| --- | --- | --- |",
      ...operation.errors.map(
        ({ codes, description, status }) =>
          `| \`${status}\` | ${codes.map((errorCode) => `[\`${errorCode}\`](/api-reference/protocols/errors#${errorCode})`).join(", ")} | ${cell(description)} |`
      ),
    ].join("\n"),
    "See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.",
    "#### cURL",
    `\`\`\`bash\n${operation.curl}\n\`\`\``,
  ].join("\n\n");
}

export function renderPage(page) {
  return `${[
    `---\ntitle: ${page.title}\ndescription: ${page.description}\n---`,
    `# ${page.title}`,
    page.intro,
    "## Endpoints [#endpoints]",
    ...page.operations.map(renderOperation),
    page.next,
  ]
    .filter(Boolean)
    .join("\n\n")}\n`;
}

function main() {
  const pages = loadRestApi();
  const expected = new Map(
    pages.map((page) => [`${page.slug}.md`, renderPage(page)])
  );
  const existing = readdirSync(pageDirectory).filter(
    (file) =>
      file.endsWith(".md") && !handWrittenPages.has(file.replace(/\.md$/, ""))
  );
  const stale = [
    ...[...expected].filter(
      ([file, content]) =>
        !existing.includes(file) ||
        readFileSync(resolve(pageDirectory, file), "utf8") !== content
    ),
    ...existing.filter((file) => !expected.has(file)).map((file) => [file]),
  ].map(([file]) => file);
  if (process.argv.includes("--check")) {
    if (stale.length > 0) {
      console.error(
        `REST API pages are stale: ${stale.join(", ")}. Run npm run generate:rest-api.`
      );
      process.exit(1);
    }
    console.log(`REST API pages match the OpenAPI contract (${expected.size} pages).`);
    return;
  }
  for (const file of existing.filter((candidate) => !expected.has(candidate))) {
    rmSync(resolve(pageDirectory, file));
  }
  for (const [file, content] of expected) {
    writeFileSync(resolve(pageDirectory, file), content);
  }
  console.log(`Generated ${expected.size} REST API pages.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
