import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve(
  process.env.BA_PLATFORM_OPENAPI ?? "../ba-platform/servers/api/openapi.json"
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
