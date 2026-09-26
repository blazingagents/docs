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
});
