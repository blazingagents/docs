import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { restApiOperations } from "../generated/documentation-manifest.ts";

interface GeneratedOperation {
  description: string;
  examples: readonly {
    code: string;
    label: string;
    language: string;
  }[];
  method: string;
  operation: string;
  path: string;
  responseMetadata: {
    description: string;
    schema?: { href?: string; name: string };
  };
  responses: readonly {
    code?: string;
    contentType?: string;
    language?: string;
    note?: string;
    status: string;
  }[];
}

interface OpenApiOperation {
  security?: Record<string, string[]>[];
}

const spec: {
  paths: Record<string, Record<string, OpenApiOperation>>;
  security: Record<string, string[]>[];
} = JSON.parse(readFileSync("openapi/openapi.json", "utf8"));

const operations: GeneratedOperation[] = [];
for (const resource of restApiOperations) {
  for (const candidate of resource.operations) {
    operations.push(candidate);
  }
}

function operation(id: string) {
  const match = operations.find((candidate) => candidate.operation === id);
  if (!match) {
    throw new Error(`Missing generated operation ${id}`);
  }
  return match;
}

describe("generated REST API examples", () => {
  test("documents every operation a tenant API key can call", () => {
    const expected = Object.entries(spec.paths).flatMap(([path, item]) =>
      Object.entries(item)
        .filter(([, candidate]) =>
          (candidate.security ?? spec.security).some(
            (scheme) => "ApiKey" in scheme
          )
        )
        .map(
          ([method]) =>
            `${method.toUpperCase()} ${path.replaceAll(/\{([^}]+)\}/g, ":$1")}`
        )
    );
    expect(
      operations.map(({ method, path }) => `${method} ${path}`).sort()
    ).toEqual(expected.sort());
    expect(new Set(operations.map(({ operation: id }) => id)).size).toBe(
      operations.length
    );
  });

  test("generates every request language and documented success response", () => {
    for (const candidate of operations) {
      expect(candidate.examples.map(({ language }) => language)).toEqual([
        "bash",
        "python",
        "javascript",
        "php",
        "go",
        "java",
        "ruby",
      ]);
      expect(candidate.examples[0]?.code).toContain(
        'Authorization: Bearer $BLAZING_AGENTS_API_KEY'
      );
      expect(candidate.examples[0]?.code).toContain("$BLAZING_AGENTS_BASE_URL");
      expect(candidate.responses[0]?.status.startsWith("2")).toBe(true);
      expect(candidate.responseMetadata.description.length).toBeGreaterThan(0);
    }
  });

  test("keeps endpoint header descriptions compact", () => {
    for (const candidate of operations) {
      expect(candidate.description.split(" ").length).toBeLessThanOrEqual(25);
      expect(candidate.description.endsWith(".")).toBe(true);
    }
  });

  test("renders code or an explicit transport note for every success", () => {
    const transportNotes = new Set([
      "Binary response body",
      "No response body",
      "Streaming response body",
    ]);
    const invalidResponses = operations.flatMap((candidate) =>
      candidate.responses
        .filter(
          (response) =>
            response.status.startsWith("2") &&
            !(
              (response.code && response.language && response.contentType) ||
              (!(response.code || response.language) &&
                response.note &&
                transportNotes.has(response.note))
            )
        )
        .map((response) => `${candidate.operation}:${response.status}`)
    );
    expect(invalidResponses).toEqual([]);
  });

  test("models JSON, streaming, binary, and empty response transports", () => {
    expect(
      operation("create-session-turn").responses[0]?.contentType
    ).toBe("text/event-stream");
    expect(operation("generate").responses[0]?.contentType).toBe("text/plain");
    expect(operation("get-skill-file").responses[0]?.contentType).toBe(
      "application/octet-stream"
    );
    expect(operation("delete-agent").responses[0]).toEqual({
      note: "No response body",
      status: "204",
    });
    expect(
      operation("delete-workspace")
        .responses.filter(({ status }) => status.startsWith("2"))
        .map(({ status }) => status)
    ).toEqual(["202", "204"]);
  });

  test("generates query, multipart, file, download, and stream semantics", () => {
    expect(operation("delete-agent").examples[0]?.code).toContain(
      "?includeArtifacts="
    );
    expect(operation("upload-agent-avatar").examples[0]?.code).toContain(
      '--form "file=@./file"'
    );
    expect(operation("upload-agent-avatar").examples[2]?.code).toContain(
      "FormData"
    );
    expect(operation("put-skill-file").examples[1]?.code).toContain(
      'open("./file", "rb")'
    );
    expect(operation("get-skill-file").examples[0]?.code).toContain(
      "--output file"
    );
    expect(operation("generate").examples[0]?.code).toContain("--no-buffer");
    expect(operation("generate").examples[5]?.code).toContain(
      "BodyHandlers.ofInputStream()"
    );
  });

  test("synthesizes schema-shaped request and response examples", () => {
    expect(operation("create-agent").examples[0]?.code).toContain(
      `--data '{"name":"string"}'`
    );
    expect(operation("create-agent").responseMetadata.schema).toEqual({
      name: "Agent",
    });
    expect(
      JSON.parse(operation("create-agent").responses[0]?.code ?? "")
    ).toMatchObject({
      createdAt: "2026-07-10T10:00:00Z",
      id: "ag_1234567890ABCDEF",
      model: "openai/gpt-6-luna",
    });
  });

  test("renders every documented error with the standard envelope", () => {
    const errors = operation("create-agent").responses.filter(
      ({ status }) => !status.startsWith("2")
    );
    expect(errors.map(({ status }) => status)).toEqual([
      "400",
      "401",
      "404",
      "409",
      "500",
      "503",
    ]);
    expect(JSON.parse(errors[0]?.code ?? "")).toEqual({
      error: { code: "validation_failed", message: "Validation failed." },
    });
    expect(JSON.parse(errors.at(-1)?.code ?? "")).toEqual({
      error: { code: "service_unavailable", message: "Service unavailable" },
    });
    for (const candidate of operations) {
      for (const status of ["401", "500", "503"]) {
        expect(
          candidate.responses.filter((response) => response.status === status)
        ).toHaveLength(1);
      }
    }
  });
});
