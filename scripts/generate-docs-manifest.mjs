import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loader } from "fumadocs-core/source";
import fumadocs from "fumadocs-mdx/vite";
import { createServer } from "vite";
import { documentationContractSchema } from "../src-docs/lib/documentation-contract-schema.ts";
import { loadRestApi } from "./rest-api.mjs";

const ENVIRONMENT_VARIABLE = /\$([A-Z][A-Z0-9_]*)/g;
const WHITESPACE = /\s/;
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

function toManifestResponses(operation) {
  const success = operation.responses.map((response) => {
    if (response.contentType === "application/json") {
      return {
        code: JSON.stringify(response.example, null, 2),
        contentType: response.contentType,
        language: "json",
        status: response.status,
      };
    }
    const note = {
      "application/octet-stream": "Binary response body",
      "text/event-stream": "Streaming response body",
      "text/plain": "Streaming response body",
    }[response.contentType];
    return note
      ? { contentType: response.contentType, note, status: response.status }
      : { note: "No response body", status: response.status };
  });
  const errors = operation.errors.map(({ example, status }) => ({
    code: JSON.stringify(example, null, 2),
    contentType: "application/json",
    language: "json",
    status,
  }));
  return [...success, ...errors];
}

const restApiOperations = loadRestApi().map((page) => ({
  operations: page.operations.map((operation) => {
    const request = parseCurl(operation.curl);
    const [success] = operation.responses;
    return {
      description: `${operation.summary}.`,
      examples: createRequestExamples(operation.curl, request),
      method: operation.method,
      operation: operation.anchor,
      path: operation.path,
      responseMetadata: {
        description: `${success.description}.`,
        ...(success.schema ? { schema: { name: success.schema } } : {}),
      },
      responses: addSharedRestErrors(toManifestResponses(operation), request),
      url: `/api-reference/rest-api/${page.slug}/${operation.anchor}`,
    };
  }),
  pageId: `api-reference/rest-api/${page.slug}.md`,
  title: page.title,
  url: `/api-reference/rest-api/${page.slug}`,
}));

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
