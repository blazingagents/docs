import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { compile } from "@mdx-js/mdx";
import { applyMdxPreset } from "fumadocs-mdx/config";
import { describe, expect, test } from "vitest";

import sourceConfig from "../../source.config.ts";

const fenceFixture = resolve(
  process.cwd(),
  "src-docs/fixtures/shiki-fences.mdx"
);
const FENCE = /```(?<label>[a-z0-9]+)\n[\s\S]*?\n```/g;
const HIGHLIGHTED_BLOCK = /className: "shiki shiki-themes/g;
const REQUIRED_FENCE_LABELS = ["tsx", "yaml", "powershell", "yml", "ps1"];

describe("documentation source configuration", () => {
  test("highlights planned fence languages and aliases", async () => {
    const source = await readFile(fenceFixture, "utf8");
    const mdxOptions =
      typeof sourceConfig.mdxOptions === "function"
        ? await sourceConfig.mdxOptions()
        : sourceConfig.mdxOptions;
    if (!(mdxOptions && "rehypeCodeOptions" in mdxOptions)) {
      throw new Error("Expected documentation code highlighting options");
    }
    const codeOptions = mdxOptions.rehypeCodeOptions;
    if (!codeOptions) {
      throw new Error("Expected documentation code highlighting options");
    }
    const languages = await Promise.all(codeOptions.langs ?? []);
    const processorOptions = await applyMdxPreset(mdxOptions)("bundler");
    const fences = [...source.matchAll(FENCE)].map((match) => ({
      label: match.groups?.label,
      source: match[0],
    }));

    expect(fences.map(({ label }) => label)).toEqual(REQUIRED_FENCE_LABELS);
    expect(languages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          default: [expect.objectContaining({ name: "powershell" })],
        }),
        expect.objectContaining({
          default: [expect.objectContaining({ name: "tsx" })],
        }),
        expect.objectContaining({
          default: [expect.objectContaining({ name: "yaml" })],
        }),
      ])
    );
    expect(codeOptions.langAlias?.ps1).toBe("powershell");
    expect(codeOptions.langAlias?.yml).toBe("yaml");

    for (const fence of fences) {
      const output = String(
        await compile(
          { path: fenceFixture, value: fence.source },
          processorOptions
        )
      );

      expect(output.match(HIGHLIGHTED_BLOCK), fence.label).toHaveLength(1);
      expect(output, fence.label).toContain('"--shiki-dark"');
      expect(output, fence.label).toContain('"--shiki-light"');
    }
  });
});
