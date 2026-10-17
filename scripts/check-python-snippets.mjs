/**
 * Type-checks every `python` fenced block under a Markdown root against the pinned Python SDK.
 * A page's blocks run in order as the body of one `async def`, like a continuation of the page's
 * earlier examples, so they may use `client`, `agent_id`, `session_id` and `await` without
 * boilerplate. A block that binds its own `client` (by assignment, import or `as`) gets a function of its own. Names a page never
 * defines are left unchecked; calls, attributes and argument types on SDK objects are checked.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const [root = "content/docs", project = "snippets-python"] = process.argv.slice(2);
const projectDir = resolve(project);
const blocks = join(projectDir, "blocks");
rmSync(blocks, { recursive: true, force: true });
mkdirSync(blocks);

const FENCE = /^(\s*)(`{3,}|~{3,})\s*([^\s`]*)/;
const PRELUDE = [
  "from blazing_agents import BlazingAgents",
  "",
  "client = BlazingAgents()",
  'agent_id = "ag_0123456789abcdef"',
  'session_id = "ss_0123456789abcdef"',
];
const OWN_CLIENT = /^(?:client\s*(?::[^=]+)?=|from\s+\S+\s+import\s.*\bclient\b|.*\bas\s+client\b)/m;

/** Generated file name -> Markdown source for each generated line (undefined for scaffolding). */
const sources = new Map();
let snippetCount = 0;

/** Leading tabs become four spaces so a tab-indented example nests inside the generated function. */
function untab(line) {
  return line.replace(/^\t+/, (tabs) => "    ".repeat(tabs.length));
}

for (const path of readdirSync(root, { recursive: true }).sort()) {
  if (!/\.mdx?$/.test(path)) continue;
  const file = join(root, path);
  const found = [];
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
        if (open.lang === "python" || open.lang === "py") {
          found.push({ line: open.line, code: open.body.map((line) => untab(line.slice(Math.min(open.indent, line.search(/\S|$/))))) });
        }
        open = undefined;
        return;
      }
      open.body.push(text);
    });
  if (found.length === 0) continue;

  const units = [];
  let shared;
  for (const block of found) {
    if (OWN_CLIENT.test(block.code.join("\n"))) {
      units.push([block]);
    } else {
      if (!shared) units.push((shared = []));
      shared.push(block);
    }
  }

  const name = `page_${sources.size}.py`;
  const lines = [...PRELUDE];
  const origin = PRELUDE.map(() => undefined);
  units.forEach((unit, index) => {
    lines.push("", "", `async def _snippet_${index}() -> None:`);
    origin.push(undefined, undefined, undefined);
    for (const block of unit) {
      block.code.forEach((code, offset) => {
        lines.push(code.trim() === "" ? "" : `    ${code}`);
        origin.push({ file, line: block.line + 1 + offset });
      });
    }
    lines.push("    pass");
    origin.push(undefined);
  });
  snippetCount += found.length;
  writeFileSync(join(blocks, name), `${lines.join("\n")}\n`);
  sources.set(name, origin);
}

if (sources.size === 0) {
  console.log(`No Python snippets under ${root}.`);
  process.exit(0);
}

const pyright = spawnSync("uv", ["run", "--frozen", "--project", projectDir, "pyright", "--outputjson", "-p", projectDir], {
  cwd: projectDir,
  encoding: "utf8",
});
if (pyright.error) throw pyright.error;
let report;
try {
  report = JSON.parse(pyright.stdout);
} catch {
  console.error(pyright.stdout, pyright.stderr);
  process.exit(1);
}

let failures = 0;
for (const diagnostic of report.generalDiagnostics) {
  if (diagnostic.severity !== "error") continue;
  failures++;
  const name = relative(blocks, diagnostic.file);
  const source = sources.get(name)?.[diagnostic.range.start.line];
  const where = source ? `${relative(process.cwd(), source.file)}:${source.line}` : `${relative(process.cwd(), diagnostic.file)}:${diagnostic.range.start.line + 1}`;
  console.error(`${where}: ${diagnostic.message.split("\n")[0]}`);
}
if (pyright.status !== 0 && failures === 0) {
  console.error(pyright.stderr);
  failures++;
}
if (failures > 0) {
  console.error(`${failures} Python snippet error(s).`);
  process.exit(1);
}
console.log(`Type-checked ${snippetCount} Python snippets.`);
