import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { documentationCoverageFiles } from "./documentation-coverage.mjs";

const expected = documentationCoverageFiles;
const coverage = JSON.parse(
  readFileSync(resolve(process.cwd(), "coverage/coverage-final.json"), "utf8")
);
const actual = Object.keys(coverage)
  .map((file) => relative(process.cwd(), file).replaceAll("\\", "/"))
  .sort();
if (JSON.stringify(actual) !== JSON.stringify(expected.sort())) {
  throw new Error(
    `Documentation runtime coverage inventory mismatch:\n${JSON.stringify({ actual, expected }, null, 2)}`
  );
}
console.log(
  `Verified documentation runtime coverage inventory (${actual.length} files).`
);
