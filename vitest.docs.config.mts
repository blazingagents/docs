import fumadocs from "fumadocs-mdx/vite";
import { defineConfig } from "vitest/config";
import { documentationCoverageInclude } from "./scripts/documentation-coverage.mjs";

export default defineConfig({
  plugins: [fumadocs()],
  test: {
    coverage: {
      enabled: true,
      exclude: ["src-docs/**/*.test.ts"],
      include: documentationCoverageInclude,
      provider: "v8",
      reporter: ["text", "json-summary", "json", "html"],
      thresholds: {
        branches: 99,
        functions: 99,
        lines: 99,
        statements: 99,
      },
    },
    environment: "node",
    include: ["src-docs/**/*.test.ts"],
  },
});
