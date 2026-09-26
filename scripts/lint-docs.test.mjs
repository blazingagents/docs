import { describe, expect, it } from "vitest";
import { formatReport, lintDocs } from "./lint-docs.mjs";

const rules = (text, extra = []) =>
  lintDocs([{ file: "page.md", text }, ...extra]).map(
    ({ line, rule }) => `${line}:${rule}`
  );

describe("lint-docs", () => {
  it("flags internal terms outside the allowlist", () => {
    expect(
      rules(
        [
          "Files live in R2 behind Cloudflare.",
          "DBOS and Supabase run the Container.",
          "The dispatcher calls the Admin Agent.",
          "Deploy a Cloudflare Worker relay.",
          "Each workspace container starts lazily.",
        ].join("\n")
      )
    ).toEqual([
      "1:internal-term",
      "1:internal-term",
      "2:internal-term",
      "2:internal-term",
      "2:internal-term",
      "3:internal-term",
      "3:internal-term",
    ]);
  });

  it("flags SDK changelog phrasing", () => {
    expect(
      rules(
        [
          "Available starting in v0.8.0.",
          "Requires SDK 0.8.0 or later.",
          "Older SDK releases omit it.",
          "Chat integrations (SDK 0.7.0+)",
          "Requires Node.js 24 or later.",
        ].join("\n")
      )
    ).toEqual([
      "1:sdk-changelog",
      "2:sdk-changelog",
      "3:sdk-changelog",
      "4:sdk-changelog",
    ]);
  });

  it("flags non-example model IDs in fences and unprefixed gpt-6-luna", () => {
    expect(
      rules(
        [
          "Use gpt-6-luna for examples.",
          "```typescript",
          'const model = "openai/gpt-6-luna";',
          '{ model: "anthropic/claude-sonnet-4" }',
          'client.chat({ model: "gpt-6-luna" });',
          "```",
          "Compare with gpt-5 in prose.",
        ].join("\n")
      )
    ).toEqual(["1:model-id", "4:model-id", "5:model-id"]);
  });

  it("flags as casts only in TypeScript code", () => {
    expect(
      rules(
        [
          "```typescript",
          'import { thing as alias } from "pkg";',
          "const body = (await request.json()) as Body;",
          "const tuple = [1, 2] as const;",
          'const text = "known as Foo"; // cast as Bar',
          "```",
          "```python",
          "import numpy as np",
          "```",
        ].join("\n")
      )
    ).toEqual(["3:type-cast"]);
  });

  it("resolves internal links against pages and explicit ids", () => {
    const other = {
      file: "guides/index.mdx",
      text: '## Setup [#setup]\n<span id="legacy"></span>\n```md\n## Fake [#fake]\n```',
    };
    expect(
      rules(
        [
          "[home](/) [guides](/guides/) [setup](/guides#setup)",
          "[legacy](/guides#legacy) [page](/page)",
          "[fake](/guides#fake) [missing](/missing)",
          '<Card href="/nowhere" /> `[code](/ignored)`',
          "```md",
          "[inside](/ignored)",
          "```",
        ].join("\n"),
        [other, { file: "index.mdx", text: "# Home" }]
      )
    ).toEqual(["3:broken-link", "3:broken-link", "4:broken-link"]);
  });

  it("reports violations with per-file counts", () => {
    expect(formatReport([])).toBe("No documentation style violations.");
    expect(
      formatReport(
        lintDocs([
          { file: "a.md", text: "R2\nDBOS" },
          { file: "b.md", text: "Supabase" },
        ])
      )
    ).toBe(
      [
        'a.md:1 internal-term: "R2"',
        'a.md:2 internal-term: "DBOS"',
        'b.md:1 internal-term: "Supabase"',
        "",
        "Violations per file:",
        "   2 a.md",
        "   1 b.md",
        "   3 total",
      ].join("\n")
    );
  });
});
