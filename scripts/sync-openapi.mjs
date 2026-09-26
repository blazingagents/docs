import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

/** The main checkout, so the sibling default also works from a git worktree. */
const checkout = dirname(
  execFileSync(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    { encoding: "utf8" }
  ).trim()
);
const source = resolve(
  process.env.BA_PLATFORM_OPENAPI ??
    resolve(checkout, "../ba-platform/servers/api/openapi.json")
);
const target = resolve("openapi/openapi.json");

if (!existsSync(source)) {
  console.error(
    `OpenAPI source not found at ${source}.\nCheck out ba-platform next to this repository, or set BA_PLATFORM_OPENAPI to the path of servers/api/openapi.json.`
  );
  process.exit(1);
}

copyFileSync(source, target);
console.log(`Copied ${source} to ${target}`);
