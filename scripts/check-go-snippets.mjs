/**
 * Compiles every `go` fenced block under a Markdown root against the pinned Go SDK.
 * A block with `func main` compiles as written. Any other block compiles as the body of
 * `func snippet(ctx context.Context, client *ba.Client, agentID ba.AgentID, sessionID ba.SessionID) error`,
 * like a continuation of the page's earlier examples, so it may use `ctx`, `client`, `agentID`
 * and `sessionID` without boilerplate. Standard library imports are added for the packages it names.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const [root = "content/docs", module = "snippets-go"] = process.argv.slice(2);
const moduleDir = resolve(module);
const blocks = join(moduleDir, "blocks");
rmSync(blocks, { recursive: true, force: true });
mkdirSync(blocks);

const FENCE = /^(\s*)(`{3,}|~{3,})\s*([^\s`]*)/;
const STDLIB = [
  "bufio", "bytes", "context", "crypto/hmac", "crypto/sha256", "encoding/base64", "encoding/hex",
  "encoding/json", "errors", "fmt", "io", "iter", "log", "log/slog", "maps", "net/http", "net/url",
  "os", "os/signal", "path/filepath", "slices", "strconv", "strings", "sync", "time",
];

/** Import paths for the standard library packages a fragment names, as goimports would add them. */
function imports(code) {
  const bare = code.replace(/\/\/.*$/gm, "").replace(/`[^`]*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g, '""');
  return STDLIB.filter((path) => path !== "context" && new RegExp(`(?<![\\w.])${path.split("/").at(-1)}\\.[A-Za-z_]`).test(bare));
}

function fragment(code) {
  const header = [
    "package main",
    "",
    "import (",
    ...["context", ...imports(code)].map((path) => `\t"${path}"`),
    "",
    '\tba "github.com/blazingagents/golang-sdk"',
    ")",
    "",
    "func snippet(ctx context.Context, client *ba.Client, agentID ba.AgentID, sessionID ba.SessionID) error {",
  ];
  return { text: `${header.join("\n")}\n${code}\n}\n\nfunc main() {}\n`, offset: header.length };
}

/** Block directory name -> { file, line, offset } so compiler lines map back to Markdown. */
const sources = new Map();
for (const path of readdirSync(root, { recursive: true }).sort()) {
  if (!/\.mdx?$/.test(path)) continue;
  const file = join(root, path);
  let open;
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((text, index) => {
      const match = FENCE.exec(text);
      if (!open) {
        if (match) open = { indent: match[1].length, fence: match[2], lang: match[3].toLowerCase(), line: index + 1, body: [] };
        return;
      }
      if (match && match[2][0] === open.fence[0] && match[2].length >= open.fence.length && !match[3]) {
        if (open.lang === "go" || open.lang === "golang") {
          const code = open.body.map((line) => line.slice(Math.min(open.indent, line.search(/\S|$/)))).join("\n");
          const name = `snippet_${sources.size}`;
          const program = /^func main\(\)/m.test(code);
          const { text: source, offset } = program ? { text: `${code}\n`, offset: 0 } : fragment(code);
          mkdirSync(join(blocks, name));
          writeFileSync(join(blocks, name, "main.go"), source);
          sources.set(name, { file, line: open.line, offset });
        }
        open = undefined;
        return;
      }
      open.body.push(text);
    });
}

if (sources.size === 0) {
  console.log(`No Go snippets under ${root}.`);
  process.exit(0);
}

const go = spawnSync("go", ["vet", "-mod=readonly", "./..."], { cwd: moduleDir, encoding: "utf8" });
if (go.error) throw go.error;
let failures = 0;
for (const text of `${go.stdout}${go.stderr}`.split("\n").filter(Boolean)) {
  const match = /blocks\/(snippet_\d+)\/main\.go:(\d+)(?::\d+)?: (.*)$/.exec(text);
  if (!match) {
    if (!/^#/.test(text)) console.error(text);
    continue;
  }
  const source = sources.get(match[1]);
  failures++;
  console.error(`${relative(process.cwd(), source.file)}:${source.line + Number(match[2]) - source.offset}: ${match[3]}`);
}
if (go.status !== 0 && failures === 0) failures++;
if (failures > 0) {
  console.error(`${failures} Go snippet error(s).`);
  process.exit(1);
}
console.log(`Compiled ${sources.size} Go snippets.`);
