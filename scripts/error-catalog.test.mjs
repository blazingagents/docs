import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ERROR_CATALOG_PAGE,
  loadErrorCatalog,
  renderErrorCatalog,
  renderErrorPage,
} from "./error-catalog.mjs";

const contract = JSON.parse(readFileSync("openapi/openapi.json", "utf8"));
const contractCodes = new Set(
  contract.components.schemas.ApiError.properties.error.properties.code.enum
);
const catalog = loadErrorCatalog();
const documentedCodes = new Set(catalog.codes.map(({ code }) => code));

describe("error catalog", () => {
  it("documents every code in the API contract", () => {
    expect(
      [...contractCodes].filter((code) => !documentedCodes.has(code)),
      "codes in the contract but missing from src-docs/data/error-codes.json"
    ).toEqual([]);
  });

  it("documents only codes in the API contract", () => {
    expect(
      [...documentedCodes].filter((code) => !contractCodes.has(code)),
      "codes in src-docs/data/error-codes.json but not in the contract"
    ).toEqual([]);
  });

  it("renders the page from the data file", () => {
    const page = readFileSync(ERROR_CATALOG_PAGE, "utf8");
    expect(page, "run npm run generate and commit the page").toBe(
      renderErrorPage(page, catalog)
    );
  });

  it("says a code with no status arrives only in a stream's error event", () => {
    const entry = {
      code: "stream_only",
      group: "g",
      howToFix: ["Send it again."],
      retryable: false,
      title: "Title.",
      whatHappened: "What happened.",
    };
    const render = (statuses) =>
      renderErrorCatalog({
        codes: [{ ...entry, statuses }],
        groups: [{ id: "g", summary: "Summary.", title: "Group" }],
      });
    expect(render([])).toContain(
      "Sent only in a stream's [error event](/api-reference/protocols/streaming#error-events). No HTTP response returns it. Retrying"
    );
    expect(render([409])).toContain("HTTP `409`. Retrying");
  });
});
