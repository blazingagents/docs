import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const runtimeLibraries = [
  "src-docs/lib/documentation-catalog.ts",
  "src-docs/lib/hosting.ts",
];
const TYPESCRIPT_FILE = /\.(?:ts|tsx)$/;

function collectRoutes(directory, prefix = "src-docs/routes") {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return collectRoutes(path, `${prefix}/${entry.name}`);
    }
    return TYPESCRIPT_FILE.test(entry.name) && entry.name !== "__root.tsx"
      ? [`${prefix}/${entry.name}`]
      : [];
  });
}

export const documentationCoverageFiles = [
  ...runtimeLibraries,
  ...readdirSync(resolve(process.cwd(), "src-docs/lib"))
    .filter((file) => file.endsWith(".server.ts"))
    .map((file) => `src-docs/lib/${file}`),
  ...collectRoutes(resolve(process.cwd(), "src-docs/routes")),
].sort();

export const documentationCoverageInclude = documentationCoverageFiles.map(
  (file) => file.replaceAll("[", "\\[").replaceAll("]", "\\]")
);
