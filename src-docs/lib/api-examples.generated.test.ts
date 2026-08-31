import { describe, expect, test } from "vitest";
import { restApiOperations } from "../generated/documentation-manifest.ts";

interface GeneratedOperation {
  description: string;
  examples: readonly {
    code: string;
    label: string;
    language: string;
  }[];
  operation: string;
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
  test("generates every request language and documented success response", () => {
    expect(operations).toHaveLength(80);
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
      expect(candidate.examples.every(({ code }) => code.length > 0)).toBe(
        true
      );
      expect(candidate.responses.length).toBeGreaterThan(0);
      expect(candidate.responses[0]?.status.startsWith("2")).toBe(true);
      expect(candidate.responseMetadata.description.length).toBeGreaterThan(0);
    }
  });

  test("keeps endpoint header descriptions compact", () => {
    for (const candidate of operations) {
      expect(
        candidate.description.length,
        `${candidate.operation}: ${candidate.description}`
      ).toBeLessThanOrEqual(180);
      expect(
        candidate.description.split(" ").length,
        `${candidate.operation}: ${candidate.description}`
      ).toBeLessThanOrEqual(25);
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
              (response.code &&
                response.language &&
                response.contentType) ||
              (!response.code &&
                !response.language &&
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
      operation("create-session-turn").responses
        .filter(({ status }) => status === "201")
        .map(({ contentType }) => contentType)
    ).toEqual(["text/event-stream"]);
    expect(operation("generate").responses[0]?.contentType).toBe("text/plain");
    expect(operation("get-artifact").responses[0]?.contentType).toBe(
      "application/json"
    );
    expect(operation("delete-agent").responses[0]).toMatchObject({
      note: "No response body",
      status: "204",
    });
  });

  test("preserves shell interpolation without embedding shell syntax", () => {
    const examples = operation("create-provider").examples;
    expect(examples[0]?.code).toContain(`'"$PROVIDER_API_KEY"'`);
    expect(examples[1]?.code).toContain(
      'os.environ["PROVIDER_API_KEY"]'
    );
    expect(examples[2]?.code).toContain("process.env.PROVIDER_API_KEY");
    expect(examples.slice(1).every(({ code }) => !code.includes(`'"$`))).toBe(
      true
    );
  });

  test("generates query, multipart, file, download, and stream semantics", () => {
    expect(operation("list-task-run-messages").examples[0]?.code).toContain(
      "--data-urlencode"
    );
    expect(operation("list-task-run-messages").examples[2]?.code).toContain(
      "after=eyJzZXEiOjF9"
    );
    expect(operation("upload-agent-avatar").examples[2]?.code).toContain(
      "FormData"
    );
    expect(operation("put-skill-file").examples[1]?.code).toContain(
      'open("deploy.sh", "rb")'
    );
    expect(operation("get-artifact").examples[4]?.code).toContain(
      "/v1/artifacts/at_1234567890ABCDEF"
    );
    expect(operation("generate").examples[5]?.code).toContain(
      "BodyHandlers.ofInputStream()"
    );
  });

  test("preserves authored and generates representative response examples", () => {
    expect(operation("create-agent").responses[0]).toMatchObject({
      language: "json",
      status: "201",
    });
    expect(operation("create-agent").responses[0]?.code).toContain(
      "2026-07-10T10:00:00Z"
    );
    expect(operation("list-tool-approvals").responses[0]).toMatchObject({
      language: "json",
      status: "200",
    });
    expect(
      JSON.parse(operation("list-tool-approvals").responses[0]?.code ?? "")
    ).toMatchObject({
      continuation: { state: "waiting" },
      data: [{ decision: "pending", toolName: "agents" }],
    });
    expect(
      JSON.parse(operation("disable-agent").responses[0]?.code ?? "")
    ).toMatchObject({
      id: "ag_1234567890ABCDEF",
      status: "active",
    });
  });

  test("keeps bodyless alternatives and documented errors concise", () => {
    expect(operation("delete-agent").responses[0]).toEqual({
      note: "No response body",
      status: "204",
    });
    expect(
      operation("delete-workspace").responses.map(({ status }) => status)
    ).toEqual(expect.arrayContaining(["204", "202"]));
    expect(
      operation("delete-workspace").responses.filter(({ status }) =>
        ["202", "204"].includes(status)
      )
    ).toEqual([
      { note: "No response body", status: "204" },
      { note: "No response body", status: "202" },
    ]);
    expect(
      operation("put-skill-file").responses.map(({ status }) => status)
    ).toEqual(
      expect.arrayContaining(["200", "400", "404", "409"])
    );
    expect(
      JSON.parse(
        operation("put-skill-file").responses.find(
          ({ status }) => status === "404"
        )?.code ?? ""
      )
    ).toEqual({
      error: {
        code: "skill_not_found",
        message: "The request could not be completed.",
      },
    });
    expect(
      operation("upload-agent-avatar").responses.map(({ status }) => status)
    ).not.toContain("512");
  });

  test.each([
    ["delete-agent", "bodyless"],
    ["get-agent", "authenticated read"],
    ["update-agent", "JSON mutation"],
    ["upload-agent-avatar", "multipart upload"],
    ["generate", "streaming response"],
  ])("adds shared REST errors to the %s %s endpoint", (operationId) => {
    const responses = operation(operationId).responses;
    expect(responses.map(({ status }) => status)).toEqual(
      expect.arrayContaining(["401", "500", "503"])
    );
    expect(
      JSON.parse(
        responses.find(({ status }) => status === "401")?.code ?? ""
      )
    ).toEqual({
      error: { code: "unauthorized", message: "Unauthorized" },
    });
    expect(
      JSON.parse(
        responses.find(({ status }) => status === "500")?.code ?? ""
      )
    ).toEqual({
      error: { code: "internal", message: "Internal Server Error" },
    });
    expect(
      JSON.parse(
        responses.find(({ status }) => status === "503")?.code ?? ""
      )
    ).toEqual({
      error: {
        code: "service_unavailable",
        message: "Service unavailable",
      },
    });
  });

  test("adds shared REST errors to every authenticated operation once", () => {
    for (const candidate of operations) {
      for (const status of ["401", "500", "503"]) {
        expect(
          candidate.responses.filter((response) => response.status === status)
        ).toHaveLength(1);
      }
    }
  });

  test("adds malformed JSON errors only to JSON request operations", () => {
    expect(
      operation("create-provider").responses.some(
        ({ status }) => status === "400"
      )
    ).toBe(true);
    expect(
      operation("list-providers").responses.some(
        ({ status }) => status === "400"
      )
    ).toBe(false);
  });
});
