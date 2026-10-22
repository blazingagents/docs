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
const ID_PATTERN = /^\^([a-z]+_)\[0-9A-Za-z\]\{16\}\$$/;
const FRONTMATTER = /^---\ntitle: (?<title>.+)\ndescription: (?<description>.+)\n---\n/;
const NEXT_SECTION = /^## Next \[#next\]/m;
const STATUS_TEXT = {
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No Content",
};
const METHODS = ["get", "post", "put", "patch", "delete"];
const CAMEL_CASE_BOUNDARY = /([a-z0-9])([A-Z])/g;
const BODY_NAMES = {
  "application/json": "a JSON body",
  "application/octet-stream": "a binary body",
  "multipart/form-data": "a multipart form body",
};

const ACCESS_TEXT = {
  read: "A read-only or full [API key](/api-reference/rest-api/authentication#access-levels) can call it.",
  run: "A read-only or full [API key](/api-reference/rest-api/authentication#access-levels) can call it.",
  write: "Needs a full [API key](/api-reference/rest-api/authentication#access-levels); a read-only key gets `403 insufficient_scope`.",
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

/**
 * A value for a path, query, or form parameter in the cURL example. The
 * contract gives bodies and responses examples, but not every parameter:
 * IDs follow their pattern, and other values become shell variables.
 */
function parameterExample(input, name) {
  const schema = resolveSchema(input);
  const id = schema.pattern?.match(ID_PATTERN)?.[1];
  if (schema.example !== undefined) {
    return schema.example;
  }
  if (schema.enum) {
    return schema.enum[0];
  }
  if (id) {
    return `${id}1234567890ABCDEF`;
  }
  return `$${name.replace(CAMEL_CASE_BOUNDARY, "$1_$2").toUpperCase()}`;
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
  /** Contract descriptions often state the length or default themselves. */
  const stated = schema.description ?? "";
  if (schema.format === "date" && !stated) {
    parts.push("A `YYYY-MM-DD` date.");
  }
  const statesLength = stated.includes("characters");
  if (
    !statesLength &&
    schema.minLength !== undefined &&
    schema.maxLength !== undefined
  ) {
    parts.push(`${schema.minLength}–${schema.maxLength} characters.`);
  } else if (!statesLength && schema.maxLength !== undefined) {
    parts.push(`Up to ${schema.maxLength} characters.`);
  }
  const maximum =
    schema.maximum === Number.MAX_SAFE_INTEGER ? undefined : schema.maximum;
  if (schema.exclusiveMinimum !== undefined) {
    parts.push(
      `More than ${schema.exclusiveMinimum}${maximum === undefined ? "" : `, up to ${maximum}`}.`
    );
  } else if (schema.minimum !== undefined) {
    parts.push(
      maximum === undefined
        ? `Minimum ${schema.minimum}.`
        : `${schema.minimum}–${maximum}.`
    );
  } else if (maximum !== undefined) {
    parts.push(`Up to ${maximum}.`);
  }
  if (schema.minItems !== undefined && schema.maxItems !== undefined) {
    parts.push(`${schema.minItems}–${schema.maxItems} items.`);
  } else if (schema.maxItems !== undefined) {
    parts.push(`Up to ${schema.maxItems} items.`);
  } else if (schema.minItems !== undefined) {
    parts.push(`At least ${schema.minItems} items.`);
  }
  if (schema.default !== undefined && !/defaults to/i.test(stated)) {
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

function tagValue(schema) {
  return schema.const ?? (schema.enum?.length === 1 ? schema.enum[0] : undefined);
}

function objectVariants(schema) {
  const variants = (schema.oneOf ?? schema.anyOf ?? [])
    .map(resolveSchema)
    .filter((variant) => variant.properties);
  return variants.length > 0 ? variants : undefined;
}

/** The property whose single value tells a oneOf's object variants apart. */
function discriminator(variants, prefix) {
  const key = Object.keys(variants[0].properties).find((name) => {
    const values = variants.map((variant) =>
      variant.properties[name] === undefined
        ? undefined
        : tagValue(resolveSchema(variant.properties[name]))
    );
    return (
      values.every((value) => value !== undefined) &&
      new Set(values).size === variants.length
    );
  });
  if (!key) {
    throw new Error(`${prefix || "body"} oneOf variants need a discriminator`);
  }
  return key;
}

/**
 * Rows for every field of an object, with nested objects, array items and
 * oneOf variants flattened into dotted names. A field only some variants
 * have records the discriminator values that allow it in `when`.
 */
function fieldRows(schema, location, prefix = "") {
  const variants = objectVariants(schema);
  if (variants?.length === 1) {
    return fieldRows(variants[0], location, prefix);
  }
  if (variants) {
    const key = discriminator(variants, prefix);
    const groups = new Map();
    for (const variant of variants) {
      const label = code(tagValue(resolveSchema(variant.properties[key])));
      for (const row of fieldRows(variant, location, prefix)) {
        const id = JSON.stringify(row);
        const group = groups.get(id) ?? { labels: [], row };
        group.labels.push(label);
        groups.set(id, group);
      }
    }
    const names = [...groups.values()].map(({ row }) => row.name);
    return [...groups.values()]
      .sort(
        (left, right) =>
          names.indexOf(left.row.name) - names.indexOf(right.row.name)
      )
      .map(({ labels, row }) =>
        labels.length === variants.length
          ? row
          : {
              ...row,
              when: [
                `\`${prefix}${key}\` is ${labels.join(" or ")}`,
                ...row.when,
              ],
            }
      );
  }
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties ?? {}).flatMap(([name, property]) => {
    const resolved = resolveSchema(property);
    const path = `${prefix}${name}`;
    const items = resolveSchema(resolved.items);
    const hasFields = (candidate) =>
      candidate.properties !== undefined || objectVariants(candidate) !== undefined;
    return [
      {
        description: describeField(property),
        location,
        name: path,
        required: required.has(name),
        type: typeLabel(property),
        when: [],
      },
      ...(hasFields(resolved) ? fieldRows(resolved, location, `${path}.`) : []),
      ...(primaryType(resolved) === "array" && hasFields(items)
        ? fieldRows(items, location, `${path}[].`)
        : []),
    ];
  });
}

function parameterRows(operation, body) {
  const rows = (operation.parameters ?? []).map((parameter) => ({
    description: describeField(parameter.schema),
    location: parameter.in,
    name: parameter.name,
    required: parameter.required === true,
    type: typeLabel(parameter.schema),
  }));
  if (body && (body.schema.properties || objectVariants(body.schema))) {
    const location =
      body.contentType === "multipart/form-data" ? "form" : "body";
    for (const { when, ...row } of fieldRows(body.schema, location)) {
      rows.push(
        when.length === 0
          ? row
          : {
              ...row,
              description: `Only when ${when.join(" and ")}. ${row.description}`.trim(),
            }
      );
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
        example: media?.example,
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
      codes: response["x-error-codes"],
      description: response.description,
      example: {
        error: {
          code: response["x-error-codes"][0],
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
      parameterExample(
        parameters.find((parameter) => parameter.name === name)?.schema,
        name
      )
    )
  );
  const query = parameters
    .filter((parameter) => parameter.in === "query" && parameter.required)
    .map(
      (parameter) =>
        `${parameter.name}=${encodeURIComponent(String(parameterExample(parameter.schema, parameter.name)))}`
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
      `--data '${JSON.stringify(body.example).replaceAll("'", "'\\''")}'`
    );
  } else if (body?.contentType === "multipart/form-data") {
    for (const [name, schema] of Object.entries(body.schema.properties)) {
      if ((body.schema.required ?? []).includes(name)) {
        const value = parameterExample(schema, name);
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
        if (!ACCESS_TEXT[operation["x-access"]]) {
          throw new Error(`${key} needs x-access read, run or write`);
        }
        return {
          access: operation["x-access"],
          endUserScope: operation.security?.some(
            (scheme) => "EndUserScope" in scheme
          ) === true,
          anchor: operation.operationId
            .replace(CAMEL_CASE_BOUNDARY, "$1-$2")
            .toLowerCase(),
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
          description: operation.description,
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
  const auth = [
    `Requires [bearer authentication](/api-reference/rest-api/authentication)${operation.body ? ` and ${BODY_NAMES[operation.body.contentType]}` : ""}.`,
    ACCESS_TEXT[operation.access],
    operation.endUserScope
      ? "Accepts an [end-user scope](/api-reference/rest-api/authentication#end-user-scope), which limits the request to that end user's records."
      : "A tenant operation: it refuses an [end-user scope](/api-reference/rest-api/authentication#end-user-scope) with `403 forbidden`.",
  ].join(" ");
  return [
    `### ${operation.method} ${operation.path} [#${operation.anchor}]`,
    `${operation.summary}.`,
    operation.description,
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
