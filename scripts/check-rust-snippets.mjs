/**
 * Compiles every `rust` fenced block under a Markdown root against the pinned Rust SDK.
 * A block with `fn main` compiles as written. Any other block compiles as the body of
 * `async fn snippet(client: blazing_agents::Client, agent_id: &str, session_id: &str)
 *   -> Result<(), Box<dyn Error + Send + Sync>>`, like a continuation of the page's earlier
 * examples, so it may use `client`, `agent_id`, `session_id`, `?` and `.await` without boilerplate.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const [root = "content/docs", crate = "snippets-rust"] = process.argv.slice(2);
const crateDir = resolve(crate);
const examples = join(crateDir, "examples");
rmSync(examples, { recursive: true, force: true });
mkdirSync(examples);

const FENCE = /^(\s*)(`{3,}|~{3,})\s*([^\s`]*)/;
const PRELUDE =
  "#[allow(unused, clippy::all)]\nasync fn snippet(client: blazing_agents::Client, agent_id: &str, session_id: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {\n";
const PRELUDE_LINES = PRELUDE.split("\n").length - 1;

/** Example file name -> { file, line, offset } so compiler lines map back to Markdown. */
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
        if (open.lang === "rust" || open.lang === "rs") {
          const code = open.body.map((line) => line.slice(Math.min(open.indent, line.search(/\S|$/)))).join("\n");
          const name = `snippet_${sources.size}`;
          const program = /\bfn\s+main\s*\(/.test(code);
          writeFileSync(
            join(examples, `${name}.rs`),
            program ? `${code}\n` : `${PRELUDE}${code}\nOk(())\n}\n\nfn main() {}\n`,
          );
          sources.set(name, { file, line: open.line, offset: program ? 0 : PRELUDE_LINES });
        }
        open = undefined;
        return;
      }
      open.body.push(text);
    });
}

if (sources.size === 0) {
  console.log(`No Rust snippets under ${root}.`);
  process.exit(0);
}

const cargo = spawnSync(
  "cargo",
  ["check", "--examples", "--locked", "--quiet", "--message-format=short", "--manifest-path", join(crateDir, "Cargo.toml")],
  { encoding: "utf8" },
);
if (cargo.error) throw cargo.error;
let failures = 0;
for (const text of `${cargo.stdout}${cargo.stderr}`.split("\n").filter(Boolean)) {
  const match = /examples\/(snippet_\d+)\.rs:(\d+):\d+: (error.*)$/.exec(text);
  if (!match) {
    if (/^error/.test(text)) console.error(text);
    continue;
  }
  const source = sources.get(match[1]);
  failures++;
  console.error(`${relative(process.cwd(), source.file)}:${source.line + Number(match[2]) - source.offset}: ${match[3]}`);
}
if (cargo.status !== 0 && failures === 0) failures++;
if (failures > 0) {
  console.error(`${failures} Rust snippet error(s).`);
  process.exit(1);
}
console.log(`Compiled ${sources.size} Rust snippets.`);
