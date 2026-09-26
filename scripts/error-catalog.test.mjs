import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ERROR_CATALOG_PAGE,
  loadErrorCatalog,
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
});
