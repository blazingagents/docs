import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const document = JSON.parse(readFileSync("openapi/openapi.json", "utf8"));

describe("vendored OpenAPI contract", () => {
  it("is an OpenAPI 3.x document with paths", () => {
    expect(document.openapi).toMatch(/^3\./);
    expect(Object.keys(document.paths).length).toBeGreaterThan(0);
  });

  it("defines ApiError with an error.code enum", () => {
    const code =
      document.components.schemas.ApiError.properties.error.properties.code;
    expect(code.enum.length).toBeGreaterThan(0);
  });

  it("names every built-in tool from the contract on the tools page", () => {
    const page = readFileSync(
      "content/docs/agents/tools/built-in-tools.mdx",
      "utf8"
    );
    const missing = document["x-agent-tools"].tools
      .map((tool) => tool.name)
      .filter((name) => !page.includes(`\`${name}\``));
    expect(
      missing,
      "tools in openapi x-agent-tools but missing from the built-in tools page"
    ).toEqual([]);
  });
});
