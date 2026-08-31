import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loader } from "fumadocs-core/source";
import fumadocs from "fumadocs-mdx/vite";
import { createServer } from "vite";
import { documentationContractSchema } from "../src-docs/lib/documentation-contract-schema.ts";

const REST_API_OPERATION =
  /^### (?<method>DELETE|GET|PATCH|POST|PUT) (?<path>\/v1\/\S+) \[#(?<operation>[a-z0-9-]+)\]$/gm;
const PARAGRAPH_BREAK = /\n\s*\n/;
const TITLE = /^title: (?<title>.+)$/m;
const CURL_BLOCK = /#### cURL\s+```bash\n(?<code>[\s\S]*?)\n```/;
const RESPONSE_SECTION = /#### Response\n\n(?<content>[\s\S]*?)(?=\n#### |$)/;
const ERROR_SECTION = /#### Errors\n\n(?<content>[\s\S]*?)(?=\n#### |$)/;
const SUCCESS_STATUS =
  /\b(?<status>2\d\d) (?:OK|Created|Accepted|No Content)\b/g;
const ERROR_STATUS = /`(?<status>[45]\d\d)(?: [a-z][a-z0-9_]*)?`/g;
const DOCUMENTED_ERROR =
  /`(?<statuses>[45]\d\d(?:\s*\/\s*[45]\d\d)*)\s+(?<code>[a-z][a-z0-9_]*)`/g;
const ERROR_NUMBER = /[45]\d\d/g;
const FENCED_RESPONSE = /```(?<language>[^\n]*)\n(?<code>[\s\S]*?)\n```/g;
const ENVIRONMENT_VARIABLE = /\$([A-Z][A-Z0-9_]*)/g;
const MARKDOWN_LINK = /\[(?<name>[^\]]+)\]\([^)]+\)/;
const NON_ALPHANUMERIC = /[^a-z0-9]/g;
const RESPONSE_SCHEMA =
  /(?:Non-streaming )?Response schema:\s+(?:\[`?|`)(?<name>[A-Za-z][A-Za-z0-9]*)/i;
const RESPONSE_SCHEMA_LINK =
  /(?:Non-streaming )?Response schema:\s+\[`?(?<name>[A-Za-z][A-Za-z0-9]*)`?\]\((?<href>[^)]+)\)/i;
const RESPONSE_TABLE_ROW =
  /^\|\s*`?(?<status>2\d\d) [^|`]+`?\s*\|\s*(?<body>[^|]+)\|\s*(?<description>[^|]+)\|/gm;
const INLINE_MARKDOWN_LINK = /\[(?<label>[^\]]+)\]\((?<href>[^)]+)\)/g;
const WHITESPACE = /\s/;
const TRAILING_PERIOD = /\.$/;
const TERMINAL_PUNCTUATION = /[.!?:]$/;
const SAMPLE_TIMESTAMP = "2026-07-20T12:00:00.000Z";
const AGENT_RESPONSE_EXAMPLE = {
  avatarUrl: null,
  createdAt: SAMPLE_TIMESTAMP,
  id: "ag_1234567890ABCDEF",
  instructions: "Answer clearly.",
  mcpConnectionIds: [],
  memoryInjectionEnabled: true,
  metadata: {},
  model: "openrouter/auto",
  name: "Support Agent",
  providerId: null,
  status: "active",
  tenantId: "ten_1234567890ABCDEF",
  tools: ["workspace", "write_todos"],
  updatedAt: SAMPLE_TIMESTAMP,
  userId: "",
  version: 1,
  workspaceId: "ws_1234567890ABCDEF",
};
const AGENT_VERSION_EXAMPLE = {
  agentId: "ag_1234567890ABCDEF",
  createdAt: SAMPLE_TIMESTAMP,
  instructions: "Answer clearly.",
  mcpConnectionIds: [],
  memoryInjectionEnabled: true,
  metadata: {},
  model: "openrouter/auto",
  name: "Support Agent",
  providerId: null,
  tenantId: "ten_1234567890ABCDEF",
  tools: ["workspace"],
  version: 1,
};
const MCP_ATTACHMENT_EXAMPLE = {
  createdAt: SAMPLE_TIMESTAMP,
  forwardedMetadataKeys: ["locale"],
  forwardUserId: true,
  mcpConnectionId: "mcp_1234567890ABCDEF",
  updatedAt: SAMPLE_TIMESTAMP,
};
const MCP_CONNECTION_EXAMPLE = {
  authType: "none",
  createdAt: SAMPLE_TIMESTAMP,
  credentialFragment: null,
  id: "mcp_1234567890ABCDEF",
  lastAuthErrorCode: null,
  name: "Docs server",
  oauthIssuer: null,
  oauthResource: null,
  status: "connected",
  tokenExpiresAt: null,
  updatedAt: SAMPLE_TIMESTAMP,
  url: "https://mcp.example.com/mcp",
};
const MEMORY_EXAMPLE = {
  agentId: "ag_1234567890ABCDEF",
  createdAt: SAMPLE_TIMESTAMP,
  id: "mem_1234567890ABCDEF",
  lastAccessedAt: SAMPLE_TIMESTAMP,
  tenantId: "ten_1234567890ABCDEF",
  text: "Prefers concise answers.",
  updatedAt: SAMPLE_TIMESTAMP,
  userId: "user-42",
};
const PROMPT_EXAMPLE = {
  createdAt: SAMPLE_TIMESTAMP,
  id: "prompt_1234567890ABCDEF",
  metadata: {},
  name: "Welcome",
  template: "Welcome, {{name}}!",
  tenantId: "ten_1234567890ABCDEF",
  updatedAt: SAMPLE_TIMESTAMP,
  userId: "",
  variables: ["name"],
};
const TASK_EXAMPLE = {
  activeRunId: null,
  agentId: "ag_1234567890ABCDEF",
  agentVersion: null,
  createdAt: SAMPLE_TIMESTAMP,
  deletedAt: null,
  enabled: true,
  id: "tk_1234567890ABCDEF",
  latestRunId: null,
  metadata: {},
  name: "Daily summary",
  prompt: "Summarize open support cases.",
  schedule: null,
  tenantId: "ten_1234567890ABCDEF",
  updatedAt: SAMPLE_TIMESTAMP,
  userId: "",
};
const USAGE_EXAMPLE = {
  buckets: [
    {
      agentId: "ag_1234567890ABCDEF",
      day: "2026-07-20",
      durationMs: 1400,
      inputTokens: 120,
      model: null,
      outputTokens: 80,
      provider: null,
      requestCount: 2,
      sessionId: null,
      userId: null,
    },
  ],
  totals: {
    durationMs: 1400,
    inputTokens: 120,
    outputTokens: 80,
    requestCount: 2,
  },
};
const WORKSPACE_EXAMPLE = {
  createdAt: SAMPLE_TIMESTAMP,
  id: "ws_1234567890ABCDEF",
  metadata: { project: "docs" },
  name: "Release files",
  tenantId: "ten_1234567890ABCDEF",
  updatedAt: SAMPLE_TIMESTAMP,
  userId: "user-42",
};
const CHAT_NON_STREAM_EXAMPLE = {
  message: {
    id: "msg_response",
    parts: [{ text: "Hello.", type: "text" }],
    role: "assistant",
  },
};
const SKILL_EXAMPLE = {
  agentId: "ag_1234567890ABCDEF",
  createdAt: SAMPLE_TIMESTAMP,
  description: "Deploy the application.",
  id: "skill_1234567890ABCDEF",
  metadata: { category: "deployment" },
  name: "deploy",
  tenantId: "ten_1234567890ABCDEF",
  updatedAt: SAMPLE_TIMESTAMP,
};
const SKILL_DETAIL_EXAMPLE = {
  ...SKILL_EXAMPLE,
  files: [
    { path: "SKILL.md", sizeBytes: 96 },
    { path: "scripts/deploy.sh", sizeBytes: 240 },
  ],
};
const REPRESENTATIVE_RESPONSES = new Map([
  ["agent", AGENT_RESPONSE_EXAMPLE],
  ["agentobject", AGENT_RESPONSE_EXAMPLE],
  ["agentversion", AGENT_VERSION_EXAMPLE],
  ["chatnonstreamresponseschema", CHAT_NON_STREAM_EXAMPLE],
  [
    "agentversionsresponse",
    { data: [AGENT_VERSION_EXAMPLE], nextCursor: null },
  ],
  ["mcpattachmentresponse", MCP_ATTACHMENT_EXAMPLE],
  ["mcpattachmentsresponse", { mcpAttachments: [MCP_ATTACHMENT_EXAMPLE] }],
  ["mcpconnectionresponse", MCP_CONNECTION_EXAMPLE],
  ["mcpconnectionsresponse", { mcpConnections: [MCP_CONNECTION_EXAMPLE] }],
  [
    "mcpconnectiontestresponse",
    {
      latencyMs: 42,
      ok: true,
      server: { name: "Docs server", version: "1.0.0" },
      toolCount: 2,
      toolNames: ["search", "fetch"],
    },
  ],
  [
    "mcpconnectionoauthconnectresponse",
    {
      authorizationUrl:
        "https://app.example.com/app/mcp-connections?mcpOAuthSetup=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    },
  ],
  [
    "mcpconnectionreconnectresult",
    { connection: MCP_CONNECTION_EXAMPLE, status: "connected" },
  ],
  [
    "mcpoauthauthorizationlaunchresponseschema",
    {
      authorizationUrl:
        "https://app.example.com/v1/mcp/oauth/authorize?setup=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    },
  ],
  [
    "toolapprovalsresponse",
    {
      continuation: {
        id: "tool-approval:message-1",
        state: "waiting",
      },
      data: [
        {
          approvalId: "approval-1",
          decision: "pending",
          input: { action: "deleteById", agentId: "ag_1234567890ABCDEF" },
          reason: null,
          toolCallId: "call-1",
          toolName: "agents",
        },
      ],
    },
  ],
  [
    "toolapprovaldecisionresponse",
    { continuationId: "tool-approval:message-1", state: "queued" },
  ],
  ["memoryresponse", { memory: MEMORY_EXAMPLE }],
  ["memorieslistresponse", { data: [MEMORY_EXAMPLE], nextCursor: null }],
  ["promptobject", PROMPT_EXAMPLE],
  ["skillresponseschema", SKILL_DETAIL_EXAMPLE],
  ["skillslistresponseschema", { data: [SKILL_EXAMPLE], nextCursor: null }],
  [
    "skillcopyresultsschema",
    [
      {
        agentId: "ag_1234567890ABCDEF",
        skill: SKILL_DETAIL_EXAMPLE,
        status: "created",
      },
      {
        agentId: "ag_0FEDCBA098765432",
        error: {
          code: "skill_name_conflict",
          message: "A Skill with this name already exists.",
        },
        status: "failed",
      },
    ],
  ],
  ["taskobject", TASK_EXAMPLE],
  ["usageresponse", USAGE_EXAMPLE],
  [
    "workspaceslistresponseschema",
    { data: [WORKSPACE_EXAMPLE], nextCursor: null },
  ],
  ["workspaceschema", WORKSPACE_EXAMPLE],
]);
const DEFAULT_ERROR_CODES = new Map([
  ["400", "invalid_request"],
  ["401", "unauthorized"],
  ["404", "not_found"],
  ["409", "internal"],
  ["413", "invalid_request"],
  ["429", "rate_limited"],
  ["500", "internal"],
  ["502", "internal"],
  ["503", "service_unavailable"],
]);
const SHARED_REST_ERRORS = [
  { code: "unauthorized", message: "Unauthorized", status: "401" },
  { code: "internal", message: "Internal Server Error", status: "500" },
  {
    code: "service_unavailable",
    message: "Service unavailable",
    status: "503",
  },
];
const webappDirectory = fileURLToPath(new URL("../", import.meta.url));
const outputPath = resolve(
  webappDirectory,
  "src-docs/generated/documentation-manifest.ts"
);
const contract = documentationContractSchema.parse(
  JSON.parse(
    readFileSync(
      resolve(webappDirectory, "src-docs/documentation-contract.json"),
      "utf8"
    )
  )
);
const navigationLabels = new Map(
  contract.targets.map(({ file, name }) => [file, name])
);
const restApiDirectory = resolve(
  webappDirectory,
  "content/docs/api-reference/rest-api"
);
const restApiMetadata = JSON.parse(
  readFileSync(resolve(restApiDirectory, "meta.json"), "utf8")
);

/** Canonical examples use a deliberately small, validated shell subset. */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Keeping quote state together makes the supported shell grammar auditable.
function tokenizeShell(command) {
  const tokens = [];
  let current = "";
  let quoteState;
  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    if (character === "\\" && command[index + 1] === "\n") {
      index += 1;
    } else if (!quoteState && WHITESPACE.test(character)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else if (character === "'" && quoteState !== '"') {
      quoteState = quoteState === "'" ? undefined : "'";
    } else if (character === '"' && quoteState !== "'") {
      quoteState = quoteState === '"' ? undefined : '"';
    } else if (
      character === "\\" &&
      quoteState !== "'" &&
      index + 1 < command.length
    ) {
      current += command[index + 1];
      index += 1;
    } else {
      current += character;
    }
  }
  if (quoteState) {
    throw new Error("Unterminated quote in cURL example");
  }
  if (current) {
    tokens.push(current);
  }
  return tokens;
}

function parseNameValue(value) {
  const separator = value.indexOf(":");
  if (separator < 0) {
    throw new Error(`Missing header separator in ${value}`);
  }
  return {
    name: value.slice(0, separator),
    value: value.slice(separator + 1).trimStart(),
  };
}

function parseFormField(value) {
  const separator = value.indexOf("=");
  if (separator < 0) {
    throw new Error(`Missing form separator in ${value}`);
  }
  const name = value.slice(0, separator);
  const fieldValue = value.slice(separator + 1);
  if (!fieldValue.startsWith("@")) {
    return { name, type: "text", value: fieldValue };
  }
  const [file, ...attributes] = fieldValue.slice(1).split(";");
  const contentType = attributes
    .find((attribute) => attribute.startsWith("type="))
    ?.slice("type=".length);
  return { contentType, name, path: file, type: "file" };
}

function appendQuery(url, query) {
  if (query.length === 0) {
    return url;
  }
  const serialized = query
    .map(
      ({ name, value }) =>
        `${encodeURIComponent(name)}=${encodeURIComponent(value)}`
    )
    .join("&");
  return `${url}${url.includes("?") ? "&" : "?"}${serialized}`;
}

/** Parses the cURL options intentionally used by the checked-in documentation. */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: A single option dispatch documents and rejects the supported cURL subset.
function parseCurl(code) {
  const tokens = tokenizeShell(code);
  if (tokens.shift() !== "curl") {
    throw new Error("Canonical request example must start with curl");
  }
  const request = {
    failOnHttpError: false,
    headers: [],
    includeHeaders: false,
    method: undefined,
    noBuffer: false,
    outputFile: undefined,
    query: [],
    url: undefined,
  };
  let data;
  let binaryFile;
  const form = [];
  while (tokens.length > 0) {
    const token = tokens.shift();
    if (token === "--request") {
      request.method = tokens.shift();
    } else if (token === "--header") {
      request.headers.push(parseNameValue(tokens.shift()));
    } else if (token === "--data") {
      data = tokens.shift();
    } else if (token === "--data-binary") {
      const value = tokens.shift();
      binaryFile = value.startsWith("@") ? value.slice(1) : undefined;
      if (!binaryFile) {
        throw new Error(
          "Only file-backed --data-binary examples are supported"
        );
      }
    } else if (token === "--data-urlencode") {
      const value = tokens.shift();
      const separator = value.indexOf("=");
      request.query.push({
        name: value.slice(0, separator),
        value: value.slice(separator + 1),
      });
    } else if (token === "--form") {
      form.push(parseFormField(tokens.shift()));
    } else if (token === "--get") {
      request.method = "GET";
    } else if (token === "--output") {
      request.outputFile = tokens.shift();
    } else if (token === "--no-buffer") {
      request.noBuffer = true;
    } else if (token === "--include") {
      request.includeHeaders = true;
    } else if (token === "--fail-with-body") {
      request.failOnHttpError = true;
    } else if (token?.startsWith("-")) {
      throw new Error(`Unsupported cURL option ${token}`);
    } else if (request.url) {
      throw new Error(`Unexpected cURL argument ${token}`);
    } else {
      request.url = token;
    }
  }
  if (!request.url) {
    throw new Error("Missing URL in cURL example");
  }
  request.url = appendQuery(request.url, request.query);
  request.method ??= data || binaryFile || form.length > 0 ? "POST" : "GET";
  if (data !== undefined) {
    request.body = { content: data, type: "json" };
  } else if (binaryFile) {
    request.body = { path: binaryFile, type: "file" };
  } else if (form.length > 0) {
    request.body = { fields: form, type: "multipart" };
  } else {
    request.body = { type: "none" };
  }
  return request;
}

function quote(value) {
  return JSON.stringify(value);
}

function stringExpression(value, environment, join = " + ") {
  const parts = [];
  let start = 0;
  for (const match of value.matchAll(ENVIRONMENT_VARIABLE)) {
    if (match.index > start) {
      parts.push(quote(value.slice(start, match.index)));
    }
    parts.push(environment(match[1]));
    start = match.index + match[0].length;
  }
  if (start < value.length || parts.length === 0) {
    parts.push(quote(value.slice(start)));
  }
  return parts.join(join);
}

function requestHeaders(request, environment, separator = ": ") {
  return request.headers.map(
    ({ name, value }) =>
      `${stringExpression(name, environment)}${separator}${stringExpression(value, environment)}`
  );
}

function renderPython(request) {
  const environment = (name) => `os.environ[${quote(name)}]`;
  const lines = [
    "import os",
    ...(request.noBuffer ? ["import sys"] : []),
    "import requests",
    "",
    `url = ${stringExpression(request.url, environment)}`,
  ];
  const headers = requestHeaders(request, environment);
  if (headers.length > 0) {
    lines.push(`headers = {${headers.join(", ")}}`);
  }
  const options = [`method=${quote(request.method)}`, "url=url"];
  if (headers.length > 0) {
    options.push("headers=headers");
  }
  if (request.body.type === "json") {
    lines.push(`body = ${stringExpression(request.body.content, environment)}`);
    options.push("data=body");
  } else if (request.body.type === "file") {
    lines.push(`body = open(${quote(request.body.path)}, "rb")`);
    options.push("data=body");
  } else if (request.body.type === "multipart") {
    const files = request.body.fields
      .filter(({ type }) => type === "file")
      .map(({ contentType, name, path }) => {
        const tuple = contentType
          ? `(${quote(path.split("/").at(-1))}, open(${quote(path)}, "rb"), ${quote(contentType)})`
          : `open(${quote(path)}, "rb")`;
        return `${quote(name)}: ${tuple}`;
      });
    const fields = request.body.fields
      .filter(({ type }) => type === "text")
      .map(({ name, value }) => `${quote(name)}: ${quote(value)}`);
    if (files.length > 0) {
      lines.push(`files = {${files.join(", ")}}`);
      options.push("files=files");
    }
    if (fields.length > 0) {
      lines.push(`data = {${fields.join(", ")}}`);
      options.push("data=data");
    }
  }
  if (request.noBuffer) {
    options.push("stream=True");
  }
  lines.push("", `response = requests.request(${options.join(", ")})`);
  if (request.failOnHttpError) {
    lines.push("response.raise_for_status()");
  }
  if (request.includeHeaders) {
    lines.push("print(response.headers)");
  }
  if (request.outputFile) {
    lines.push(
      `open(${quote(request.outputFile)}, "wb").write(response.content)`
    );
  } else if (request.noBuffer) {
    lines.push(
      "for chunk in response.iter_content(chunk_size=None):",
      "    sys.stdout.buffer.write(chunk)",
      "    sys.stdout.buffer.flush()"
    );
  } else {
    lines.push("print(response.text)");
  }
  return lines.join("\n");
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Each branch renders one normalized request body or response mode.
function renderJavaScript(request) {
  const environment = (name) => `process.env.${name}`;
  const imports = [];
  const lines = [`const url = ${stringExpression(request.url, environment)};`];
  const headers = requestHeaders(request, environment);
  const options = [`method: ${quote(request.method)}`];
  if (headers.length > 0) {
    options.push(`headers: { ${headers.join(", ")} }`);
  }
  if (request.body.type === "json") {
    options.push(
      `body: ${stringExpression(request.body.content, environment)}`
    );
  } else if (request.body.type === "file") {
    imports.push('import { readFile } from "node:fs/promises";');
    options.push(`body: await readFile(${quote(request.body.path)})`);
  } else if (request.body.type === "multipart") {
    imports.push('import { openAsBlob } from "node:fs";');
    lines.push("const form = new FormData();");
    for (const field of request.body.fields) {
      if (field.type === "file") {
        lines.push(
          `form.append(${quote(field.name)}, await openAsBlob(${quote(field.path)}${field.contentType ? `, { type: ${quote(field.contentType)} }` : ""}), ${quote(field.path.split("/").at(-1))});`
        );
      } else {
        lines.push(`form.append(${quote(field.name)}, ${quote(field.value)});`);
      }
    }
    options.push("body: form");
  }
  lines.push(
    "",
    `const response = await fetch(url, { ${options.join(", ")} });`
  );
  if (request.failOnHttpError) {
    lines.push("if (!response.ok) throw new Error(await response.text());");
  }
  if (request.includeHeaders) {
    lines.push("console.log(Object.fromEntries(response.headers));");
  }
  if (request.outputFile) {
    if (!imports.some((value) => value.includes("writeFile"))) {
      imports.push('import { writeFile } from "node:fs/promises";');
    }
    lines.push(
      `await writeFile(${quote(request.outputFile)}, Buffer.from(await response.arrayBuffer()));`
    );
  } else if (request.noBuffer) {
    lines.push(
      "for await (const chunk of response.body) {",
      "  process.stdout.write(chunk);",
      "}"
    );
  } else {
    lines.push("console.log(await response.text());");
  }
  return [...imports, imports.length > 0 ? "" : undefined, ...lines]
    .filter((line) => line !== undefined)
    .join("\n");
}

function renderPhp(request) {
  const environment = (name) => `getenv(${quote(name)})`;
  const lines = [
    "<?php",
    `$url = ${stringExpression(request.url, environment, " . ")};`,
    "$curl = curl_init($url);",
    `curl_setopt($curl, CURLOPT_CUSTOMREQUEST, ${quote(request.method)});`,
    `curl_setopt($curl, CURLOPT_RETURNTRANSFER, ${request.noBuffer ? "false" : "true"});`,
  ];
  if (request.headers.length > 0) {
    const headers = request.headers.map(({ name, value }) =>
      stringExpression(`${name}: ${value}`, environment, " . ")
    );
    lines.push(
      `curl_setopt($curl, CURLOPT_HTTPHEADER, [${headers.join(", ")}]);`
    );
  }
  if (request.body.type === "json") {
    lines.push(
      `curl_setopt($curl, CURLOPT_POSTFIELDS, ${stringExpression(request.body.content, environment, " . ")});`
    );
  } else if (request.body.type === "file") {
    lines.push(
      `curl_setopt($curl, CURLOPT_POSTFIELDS, file_get_contents(${quote(request.body.path)}));`
    );
  } else if (request.body.type === "multipart") {
    const fields = request.body.fields.map((field) =>
      field.type === "file"
        ? `${quote(field.name)} => new CURLFile(${quote(field.path)}${field.contentType ? `, ${quote(field.contentType)}` : ""})`
        : `${quote(field.name)} => ${quote(field.value)}`
    );
    lines.push(
      `curl_setopt($curl, CURLOPT_POSTFIELDS, [${fields.join(", ")}]);`
    );
  }
  if (request.includeHeaders) {
    lines.push("curl_setopt($curl, CURLOPT_HEADER, true);");
  }
  lines.push("$response = curl_exec($curl);");
  if (request.failOnHttpError) {
    lines.push(
      "$status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);",
      "if ($status >= 400) { throw new RuntimeException((string) $response); }"
    );
  }
  lines.push("curl_close($curl);");
  if (request.outputFile) {
    lines.push(`file_put_contents(${quote(request.outputFile)}, $response);`);
  } else if (!request.noBuffer) {
    lines.push("echo $response;");
  }
  return lines.join("\n");
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Each branch renders one normalized request body or response mode.
function renderGo(request) {
  const environment = (name) => `os.Getenv(${quote(name)})`;
  const imports = new Set(["io", "net/http", "os"]);
  if (request.includeHeaders) {
    imports.add("fmt");
  }
  const lines = [
    `url := ${stringExpression(request.url, environment)}`,
    "var body io.Reader = http.NoBody",
  ];
  if (request.body.type === "json") {
    imports.add("strings");
    lines.push(
      `body = strings.NewReader(${stringExpression(request.body.content, environment)})`
    );
  } else if (request.body.type === "file") {
    lines.push(
      `file, err := os.Open(${quote(request.body.path)})`,
      "if err != nil { panic(err) }",
      "defer file.Close()",
      "body = file"
    );
  } else if (request.body.type === "multipart") {
    imports.add("bytes");
    imports.add("mime/multipart");
    imports.add("path/filepath");
    imports.add("strings");
    lines.push(
      "buffer := new(bytes.Buffer)",
      "writer := multipart.NewWriter(buffer)"
    );
    for (const field of request.body.fields) {
      if (field.type === "text") {
        lines.push(
          `_ = writer.WriteField(${quote(field.name)}, ${quote(field.value)})`
        );
      } else {
        if (field.contentType) {
          imports.add("net/textproto");
          lines.push(
            "partHeader := make(textproto.MIMEHeader)",
            `partHeader.Set("Content-Disposition", "form-data; name=\\"${field.name}\\"; filename=\\"" + filepath.Base(${quote(field.path)}) + "\\"")`,
            `partHeader.Set("Content-Type", ${quote(field.contentType)})`,
            "part, err := writer.CreatePart(partHeader)"
          );
        } else {
          lines.push(
            `part, err := writer.CreateFormFile(${quote(field.name)}, filepath.Base(${quote(field.path)}))`
          );
        }
        lines.push(
          "if err != nil { panic(err) }",
          `file, err := os.Open(${quote(field.path)})`,
          "if err != nil { panic(err) }",
          "_, _ = io.Copy(part, file)",
          "_ = file.Close()"
        );
      }
    }
    lines.push(
      "_ = writer.Close()",
      "body = strings.NewReader(buffer.String())"
    );
  }
  lines.push(
    `request, err := http.NewRequest(${quote(request.method)}, url, body)`,
    "if err != nil { panic(err) }"
  );
  for (const { name, value } of request.headers) {
    lines.push(
      `request.Header.Set(${quote(name)}, ${stringExpression(value, environment)})`
    );
  }
  if (request.body.type === "multipart") {
    lines.push(
      'request.Header.Set("Content-Type", writer.FormDataContentType())'
    );
  }
  lines.push(
    "response, err := http.DefaultClient.Do(request)",
    "if err != nil { panic(err) }",
    "defer response.Body.Close()"
  );
  if (request.failOnHttpError) {
    lines.push("if response.StatusCode >= 400 { panic(response.Status) }");
  }
  if (request.includeHeaders) {
    lines.push("fmt.Println(response.Header)");
  }
  if (request.outputFile) {
    lines.push(
      `output, err := os.Create(${quote(request.outputFile)})`,
      "if err != nil { panic(err) }",
      "defer output.Close()",
      "_, _ = io.Copy(output, response.Body)"
    );
  } else {
    lines.push("_, _ = io.Copy(os.Stdout, response.Body)");
  }
  const importsList = [...imports]
    .sort()
    .map((name) => `\t${quote(name)}`)
    .join("\n");
  return `package main\n\nimport (\n${importsList}\n)\n\nfunc main() {\n${lines.map((line) => `\t${line}`).join("\n")}\n}`;
}

function renderJava(request) {
  const environment = (name) => `System.getenv(${quote(name)})`;
  const lines = [
    `var url = ${stringExpression(request.url, environment)};`,
    "var builder = HttpRequest.newBuilder(URI.create(url));",
  ];
  for (const { name, value } of request.headers) {
    lines.push(
      `builder.header(${quote(name)}, ${stringExpression(value, environment)});`
    );
  }
  let publisher = "HttpRequest.BodyPublishers.noBody()";
  if (request.body.type === "json") {
    publisher = `HttpRequest.BodyPublishers.ofString(${stringExpression(request.body.content, environment)})`;
  } else if (request.body.type === "file") {
    publisher = `HttpRequest.BodyPublishers.ofFile(Path.of(${quote(request.body.path)}))`;
  } else if (request.body.type === "multipart") {
    lines.push(
      'var boundary = "BlazingAgentsBoundary";',
      "var parts = new ByteArrayOutputStream();"
    );
    for (const field of request.body.fields) {
      if (field.type === "text") {
        lines.push(
          `parts.write(("--" + boundary + "\\r\\nContent-Disposition: form-data; name=\\"${field.name}\\"\\r\\n\\r\\n${field.value}\\r\\n").getBytes(StandardCharsets.UTF_8));`
        );
      } else {
        const fileName = field.path.split("/").at(-1);
        const contentType = field.contentType ?? "application/octet-stream";
        lines.push(
          `parts.write(("--" + boundary + "\\r\\nContent-Disposition: form-data; name=\\"${field.name}\\"; filename=\\"${fileName}\\"\\r\\nContent-Type: ${contentType}\\r\\n\\r\\n").getBytes(StandardCharsets.UTF_8));`,
          `parts.write(Files.readAllBytes(Path.of(${quote(field.path)})));`,
          'parts.write("\\r\\n".getBytes(StandardCharsets.UTF_8));'
        );
      }
    }
    lines.push(
      'parts.write(("--" + boundary + "--\\r\\n").getBytes(StandardCharsets.UTF_8));',
      'builder.header("Content-Type", "multipart/form-data; boundary=" + boundary);'
    );
    publisher = "HttpRequest.BodyPublishers.ofByteArray(parts.toByteArray())";
  }
  lines.push(`builder.method(${quote(request.method)}, ${publisher});`);
  if (request.noBuffer) {
    lines.push(
      "var response = HttpClient.newHttpClient().send(builder.build(), HttpResponse.BodyHandlers.ofInputStream());"
    );
  } else {
    lines.push(
      "var response = HttpClient.newHttpClient().send(builder.build(), HttpResponse.BodyHandlers.ofByteArray());"
    );
  }
  if (request.failOnHttpError) {
    lines.push(
      'if (response.statusCode() >= 400) throw new IOException("HTTP " + response.statusCode());'
    );
  }
  if (request.includeHeaders) {
    lines.push("System.out.println(response.headers().map());");
  }
  if (request.outputFile) {
    lines.push(
      `Files.write(Path.of(${quote(request.outputFile)}), response.body());`
    );
  } else if (request.noBuffer) {
    lines.push("response.body().transferTo(System.out);");
  } else {
    lines.push(
      "System.out.print(new String(response.body(), StandardCharsets.UTF_8));"
    );
  }
  const imports = [
    "java.io.*",
    "java.net.URI",
    "java.net.http.*",
    "java.nio.charset.StandardCharsets",
    "java.nio.file.*",
  ];
  return `${imports.map((name) => `import ${name};`).join("\n")}\n\npublic class Example {\n  public static void main(String[] args) throws Exception {\n${lines.map((line) => `    ${line}`).join("\n")}\n  }\n}`;
}

function renderRuby(request) {
  const environment = (name) => `ENV.fetch(${quote(name)})`;
  const lines = [
    'require "net/http"',
    'require "uri"',
    "",
    `uri = URI(${stringExpression(request.url, environment)})`,
    `request = Net::HTTPGenericRequest.new(${quote(request.method)}, ${request.body.type === "none" ? "false" : "true"}, true, uri.request_uri)`,
  ];
  for (const { name, value } of request.headers) {
    lines.push(
      `request[${quote(name)}] = ${stringExpression(value, environment)}`
    );
  }
  if (request.body.type === "json") {
    lines.push(
      `request.body = ${stringExpression(request.body.content, environment)}`
    );
  } else if (request.body.type === "file") {
    lines.push(`request.body = File.binread(${quote(request.body.path)})`);
  } else if (request.body.type === "multipart") {
    lines.push('boundary = "BlazingAgentsBoundary"', "parts = []");
    for (const field of request.body.fields) {
      if (field.type === "text") {
        lines.push(
          `parts << "--#{boundary}\\r\\nContent-Disposition: form-data; name=\\"${field.name}\\"\\r\\n\\r\\n${field.value}\\r\\n"`
        );
      } else {
        lines.push(
          `parts << "--#{boundary}\\r\\nContent-Disposition: form-data; name=\\"${field.name}\\"; filename=\\"${field.path.split("/").at(-1)}\\"\\r\\nContent-Type: ${field.contentType ?? "application/octet-stream"}\\r\\n\\r\\n"`,
          `parts << File.binread(${quote(field.path)})`,
          'parts << "\\r\\n"'
        );
      }
    }
    lines.push(
      'parts << "--#{boundary}--\\r\\n"',
      'request["Content-Type"] = "multipart/form-data; boundary=#{boundary}"',
      "request.body = parts.join"
    );
  }
  if (request.noBuffer) {
    lines.push(
      'Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|',
      "  http.request(request) do |response|",
      ...(request.includeHeaders ? ["    puts response.each_header.to_h"] : []),
      "    response.read_body { |chunk| $stdout.write(chunk) }",
      "  end",
      "end"
    );
    return lines.join("\n");
  }
  lines.push(
    'response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") { |http| http.request(request) }'
  );
  if (request.failOnHttpError) {
    lines.push(
      "raise response.message unless response.is_a?(Net::HTTPSuccess)"
    );
  }
  if (request.includeHeaders) {
    lines.push("puts response.each_header.to_h");
  }
  if (request.outputFile) {
    lines.push(`File.binwrite(${quote(request.outputFile)}, response.body)`);
  } else {
    lines.push("puts response.body");
  }
  return lines.join("\n");
}

function createRequestExamples(curl, request) {
  return [
    { code: curl, label: "cURL", language: "bash" },
    { code: renderPython(request), label: "Python", language: "python" },
    {
      code: renderJavaScript(request),
      label: "JavaScript",
      language: "javascript",
    },
    { code: renderPhp(request), label: "PHP", language: "php" },
    { code: renderGo(request), label: "Go", language: "go" },
    { code: renderJava(request), label: "Java", language: "java" },
    { code: renderRuby(request), label: "Ruby", language: "ruby" },
  ];
}

function responseNote(content, status, request) {
  if (status === "204") {
    return "No response body";
  }
  if (request.outputFile) {
    return "Binary response body";
  }
  if (request.noBuffer) {
    return "Streaming response body";
  }
  const statusParagraph =
    content
      .split(PARAGRAPH_BREAK)
      .find((paragraph) => paragraph.includes(`${status} `)) ?? content;
  if (statusParagraph.toLowerCase().includes("empty body")) {
    return "No response body";
  }
  const linkedBody = statusParagraph
    .match(MARKDOWN_LINK)
    ?.groups?.name.replaceAll("`", "");
  if (linkedBody) {
    return linkedBody;
  }
  const schema = content.match(RESPONSE_SCHEMA)?.groups?.name;
  if (schema) {
    return schema;
  }
  if (content.includes("application/octet-stream")) {
    return "application/octet-stream";
  }
  if (content.includes("text/plain")) {
    return "text/plain";
  }
  return "JSON response body";
}

function parseErrorResponses(section, successStatuses) {
  const content = section.match(ERROR_SECTION)?.groups?.content;
  if (!content) {
    return [];
  }
  const codes = new Map();
  for (const match of content.matchAll(DOCUMENTED_ERROR)) {
    for (const status of match.groups.statuses.matchAll(ERROR_NUMBER)) {
      if (!codes.has(status[0])) {
        codes.set(status[0], match.groups.code);
      }
    }
  }
  const statuses = new Set(
    [...content.matchAll(ERROR_STATUS)].map(({ groups }) => groups.status)
  );
  for (const status of codes.keys()) {
    statuses.add(status);
  }
  return [...statuses]
    .filter((status) => !successStatuses.has(status))
    .map((status) => {
      const code =
        codes.get(status) ?? DEFAULT_ERROR_CODES.get(status) ?? "internal";
      const message =
        code === "validation_failed"
          ? "One or more request values failed validation."
          : "The request could not be completed.";
      return {
        code: JSON.stringify({ error: { code, message } }, null, 2),
        contentType: "application/json",
        language: "json",
        status,
      };
    });
}

function addRepresentativeResponse(response) {
  if (response.code || !response.note) {
    return response;
  }
  const key = response.note.toLowerCase().replaceAll(NON_ALPHANUMERIC, "");
  const representative = REPRESENTATIVE_RESPONSES.get(key);
  if (!representative) {
    return response;
  }
  return {
    ...response,
    code: JSON.stringify(representative, null, 2),
    contentType: "application/json",
    language: "json",
  };
}

function addSharedRestErrors(responses, request) {
  const statuses = new Set(responses.map(({ status }) => status));
  const applicable = [
    ...(request.body.type === "json"
      ? [
          {
            code: "invalid_request",
            message: "Malformed JSON in request body",
            status: "400",
          },
        ]
      : []),
    ...SHARED_REST_ERRORS,
  ];
  const shared = applicable
    .filter(({ status }) => !statuses.has(status))
    .map(({ code, message, status }) => ({
      code: JSON.stringify({ error: { code, message } }, null, 2),
      contentType: "application/json",
      language: "json",
      status,
    }));
  return [...responses, ...shared];
}

function getResponseContentType(content, status, request) {
  if (status === "204" || content.toLowerCase().includes("empty body")) {
    return;
  }
  if (request.outputFile || content.includes("application/octet-stream")) {
    return "application/octet-stream";
  }
  if (request.noBuffer && content.includes("text/event-stream")) {
    return "text/event-stream";
  }
  if (request.noBuffer || content.includes("text/plain")) {
    return "text/plain";
  }
  return "application/json";
}

function parseResponses(section, request) {
  const content = section.match(RESPONSE_SECTION)?.groups?.content;
  if (!content) {
    throw new Error("Missing Response section");
  }
  const statuses = [
    ...new Set(
      [...content.matchAll(SUCCESS_STATUS)].map(({ groups }) => groups.status)
    ),
  ];
  const fences = [...content.matchAll(FENCED_RESPONSE)].map(({ groups }) => ({
    code: groups.code,
    language: groups.language || "text",
  }));
  const supportsStreamToggle =
    content.includes("text/event-stream") &&
    (content.includes("stream: false") || content.includes("`stream: false`"));
  let successResponses;
  if (supportsStreamToggle) {
    successResponses = statuses.flatMap((status) => [
      {
        contentType: "text/event-stream",
        note: "Streaming response body",
        status,
      },
      ...(fences.length > 0
        ? fences.map((fence) => ({
            ...fence,
            contentType: "application/json",
            note: responseNote(content, status, {
              ...request,
              noBuffer: false,
            }),
            status,
          }))
        : [
            {
              contentType: "application/json",
              note:
                content.match(RESPONSE_SCHEMA)?.groups?.name ??
                "JSON response body",
              status,
            },
          ]),
    ]);
  } else if (statuses.length === 1 && fences.length > 0) {
    successResponses = fences.map((fence) => ({
      ...fence,
      contentType: getResponseContentType(content, statuses[0], request),
      note: responseNote(content, statuses[0], request),
      status: statuses[0],
    }));
  } else {
    successResponses = statuses.map((status) => ({
      contentType: getResponseContentType(content, status, request),
      note: responseNote(content, status, request),
      status,
    }));
  }
  return addSharedRestErrors(
    [
      ...successResponses.map(addRepresentativeResponse),
      ...parseErrorResponses(section, new Set(statuses)),
    ],
    request
  );
}

function cleanResponseText(value) {
  return value
    .replaceAll(INLINE_MARKDOWN_LINK, "$<label>")
    .replaceAll("`", "")
    .replaceAll(/\s+/g, " ")
    .trim()
    .replace(TRAILING_PERIOD, "");
}

function parseResponseMetadata(section, responses) {
  const content = section.match(RESPONSE_SECTION)?.groups?.content;
  if (!content) {
    throw new Error("Missing Response section");
  }
  const success = responses.find(({ status }) => status.startsWith("2"));
  const schemaLink = content.match(RESPONSE_SCHEMA_LINK)?.groups;
  const schemaName =
    schemaLink?.name ?? content.match(RESPONSE_SCHEMA)?.groups?.name;
  const tableRows = [...content.matchAll(RESPONSE_TABLE_ROW)];
  const tableRow = tableRows.find(
    ({ groups }) => groups.status === success?.status
  )?.groups;
  const tableBodyLink = tableRow?.body.matchAll(INLINE_MARKDOWN_LINK).next()
    .value?.groups;
  const paragraphs = content
    .split(PARAGRAPH_BREAK)
    .filter(
      (paragraph) =>
        !(
          paragraph.startsWith("|") ||
          paragraph.startsWith("```") ||
          paragraph.startsWith("Response schema:")
        )
    );
  const prose = paragraphs.find((paragraph) =>
    paragraph.includes(`${success?.status ?? "2"}`)
  );
  const description = cleanResponseText(
    prose ??
      tableRow?.description ??
      (success?.note === "No response body"
        ? "Returns an empty response body"
        : (success?.note ?? "Returns the documented response body"))
  );
  const schema =
    schemaName || tableBodyLink?.label
      ? {
          ...(schemaLink?.href || tableBodyLink?.href
            ? { href: schemaLink?.href ?? tableBodyLink?.href }
            : {}),
          name:
            schemaName ??
            tableBodyLink?.label.replaceAll("`", "") ??
            "response",
        }
      : undefined;
  return {
    description: TERMINAL_PUNCTUATION.test(description)
      ? description
      : `${description}.`,
    ...(schema ? { schema } : {}),
  };
}

const restApiOperations = restApiMetadata.pages.slice(2).map((page) => {
  const markdownPath = resolve(restApiDirectory, `${page}.md`);
  const source = readFileSync(
    existsSync(markdownPath)
      ? markdownPath
      : resolve(restApiDirectory, `${page}.mdx`),
    "utf8"
  );
  const title = source.match(TITLE)?.groups?.title;
  if (!title) {
    throw new Error(`Missing REST API title for ${page}`);
  }
  const matches = [...source.matchAll(REST_API_OPERATION)];
  const operations = matches.map(({ 0: heading, groups, index }, position) => {
    const sectionEnd = matches[position + 1]?.index ?? source.length;
    const section = source.slice(index + heading.length, sectionEnd);
    const description = section
      .trim()
      .split(PARAGRAPH_BREAK)[0]
      ?.replaceAll("\n", " ");
    if (!description) {
      throw new Error(
        `Missing description for REST operation ${groups.operation}`
      );
    }
    const curl = section.match(CURL_BLOCK)?.groups?.code;
    if (!curl) {
      throw new Error(
        `Missing cURL example for REST operation ${groups.operation}`
      );
    }
    const request = parseCurl(curl);
    if (request.method !== groups.method) {
      throw new Error(
        `cURL method mismatch for ${groups.operation}: ${request.method} !== ${groups.method}`
      );
    }
    const responses = parseResponses(section, request);
    return {
      description,
      examples: createRequestExamples(curl, request),
      method: groups.method,
      operation: groups.operation,
      path: groups.path,
      responseMetadata: parseResponseMetadata(section, responses),
      responses,
      url: `/api-reference/rest-api/${page}/${groups.operation}`,
    };
  });
  if (operations.length === 0) {
    throw new Error(`Missing REST API operations for ${page}`);
  }
  return {
    operations,
    pageId: `api-reference/rest-api/${page}.md`,
    title,
    url: `/api-reference/rest-api/${page}`,
  };
});

function applyNavigationLabels(node) {
  if (node && typeof node === "object") {
    if (typeof node.$id === "string" && navigationLabels.has(node.$id)) {
      node.name = navigationLabels.get(node.$id);
    }
    for (const value of Object.values(node)) {
      applyNavigationLabels(value);
    }
  }
}
const vite = await createServer({
  appType: "custom",
  configFile: false,
  logLevel: "error",
  plugins: [fumadocs()],
  root: webappDirectory,
  server: { middlewareMode: true },
});

try {
  const { docs } = await vite.ssrLoadModule("/.source/server.ts");
  const source = loader({
    baseUrl: "/",
    source: docs.toFumadocsSource(),
  });
  const pages = source
    .getPages()
    .map(({ path, url }) => ({ path, url }))
    .sort((left, right) => left.url.localeCompare(right.url));
  const tree = await source.serializePageTree(source.pageTree);
  applyNavigationLabels(tree);
  const output = [
    "/** This file is generated by scripts/generate-docs-manifest.mjs. */",
    'import type { SerializedPageTree } from "fumadocs-core/source/client";',
    `export const documentationPages = ${JSON.stringify(pages, null, 2)} as const;`,
    `export const restApiOperations = ${JSON.stringify(restApiOperations, null, 2)} as const;`,
    `export const documentationTree: SerializedPageTree = ${JSON.stringify(tree, null, 2)};`,
    "",
  ].join("\n");

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, output);
} finally {
  await vite.close();
}
