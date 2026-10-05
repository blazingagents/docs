/**
 * Runs the getting-started examples, exactly as a reader copies them from the
 * pages, against a live Blazing Agents API. Not part of `npm run check`.
 *
 * Required: BLAZING_AGENTS_BASE_URL, BLAZING_AGENTS_API_KEY.
 * Optional: OPENROUTER_API_KEY. Without it the run stops at the first step that
 * calls the model provider and exits with status 2.
 * Optional: SMOKE_PYTHON, a Python 3.11+ interpreter (default python3).
 * Optional: SMOKE_PYTHON_SDK, a pip requirement (for example a path to a local
 * python-sdk checkout) used instead of the published package.
 */
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const SYSTEM_PYTHON = process.env.SMOKE_PYTHON ?? "python3";
const PYTHON_SDK = process.env.SMOKE_PYTHON_SDK ?? "blazing-agents==0.14.0";
const PYTHON_SERVER_DEPS = ["fastapi==0.141.1", "uvicorn==0.53.0"];
const PLACEHOLDER_OPENROUTER_KEY = "sk-or-smoke-placeholder";
const TIMEOUT_MS = 180_000;
/** The temp project is not part of this repo's `npm run` context. */
const baseEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith("npm_"))
);

const { BLAZING_AGENTS_BASE_URL: baseUrl, BLAZING_AGENTS_API_KEY: apiKey } =
  process.env;
const openRouterKey = process.env.OPENROUTER_API_KEY;
if (!(baseUrl && apiKey)) {
  console.error("Set BLAZING_AGENTS_BASE_URL and BLAZING_AGENTS_API_KEY.");
  process.exit(1);
}
if (process.versions.node.split(".")[0] !== "24") {
  console.error(`Run under Node 24 (found ${process.version}).`);
  process.exit(1);
}

const results = [];
function record(status, name, detail = "") {
  results.push({ status, name, detail });
  console.log(`${status.padEnd(7)} ${name}${detail ? `\n        ${detail}` : ""}`);
}

/** Code fences of a page, dedented, with the id of the heading above them. */
async function readFences(page) {
  const source = await readFile(join(root, "content/docs", page), "utf8");
  const fences = [];
  let section = "";
  let open;
  for (const line of source.split("\n")) {
    if (open) {
      if (line.trim() === "```") {
        fences.push(open);
        open = undefined;
      } else {
        open.lines.push(line.slice(open.indent));
      }
      continue;
    }
    section = line.match(/^\s*#+ .*\[#([a-z0-9-]+)\]\s*$/)?.[1] ?? section;
    const start = line.match(/^(\s*)```(\w+)(.*)$/);
    if (start) {
      open = { indent: start[1].length, lang: start[2], meta: start[3], section, lines: [] };
    }
  }
  return fences.map(({ lines, ...fence }) => ({ ...fence, body: `${lines.join("\n")}\n` }));
}

function pick(fences, lang, predicate = () => true) {
  const matches = fences.filter((fence) => fence.lang === lang && predicate(fence));
  if (matches.length === 0) {
    throw new Error(`no ${lang} fence matched`);
  }
  return matches.map(({ body }) => body);
}

/** Neither SDK reads a base URL from the environment, so the snippets cannot reach a local API unedited. */
function pointAtBaseUrl(lang, code) {
  const pattern =
    lang === "typescript" ? /new BlazingAgents\(\{\n/g : /\b((?:Async)?BlazingAgents)\(\)(.*)$/gm;
  const count = code.match(pattern)?.length ?? 0;
  if (count !== 1) {
    throw new Error(`expected one client constructor to point at the base URL, found ${count}`);
  }
  return lang === "typescript"
    ? code.replace(
        pattern,
        "new BlazingAgents({\n  baseUrl: process.env.BLAZING_AGENTS_BASE_URL, // SMOKE HARNESS: base URL injected\n"
      )
    : code.replace(
        pattern,
        '$1(base_url=__import__("os").environ["BLAZING_AGENTS_BASE_URL"])$2  # SMOKE HARNESS: base URL injected'
      );
}

function run(command, args, { cwd, env = {}, allowFailure = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...baseEnv, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    const timer = setTimeout(() => child.kill("SIGKILL"), TIMEOUT_MS);
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 && !allowFailure) {
        reject(new Error(`${command} ${args.join(" ")} exited ${code}\n${output}`));
      } else {
        resolve({ code, output });
      }
    });
  });
}

async function api(method, path) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    throw new Error(`${method} ${path}: ${response.status} ${await response.text()}`);
  }
  return response.status === 204 ? undefined : response.json();
}

async function listAllAgents() {
  const agents = [];
  let cursor;
  do {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const page = await api("GET", `/v1/agents${query}`);
    agents.push(...page.data);
    cursor = page.nextCursor;
  } while (cursor);
  return agents;
}

function expectLine(output, pattern, label) {
  const match = output.match(pattern);
  if (!match) {
    throw new Error(`expected ${label}; output was:\n${output}`);
  }
  return match;
}

function freePort() {
  return new Promise((resolve) => {
    const server = createServer().listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

const workdir = await mkdtemp(join(tmpdir(), "ba-docs-smoke-"));
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const node = process.execPath;
const python = join(workdir, "py/.venv/bin/python");
const tsDir = join(workdir, "ts");
const pyDir = join(workdir, "py");
const exampleEnv = {
  BLAZING_AGENTS_BASE_URL: baseUrl,
  BLAZING_AGENTS_API_KEY: apiKey,
  OPENROUTER_API_KEY: openRouterKey ?? PLACEHOLDER_OPENROUTER_KEY,
};
const langs = {
  typescript: { dir: tsDir, ext: "ts", exec: (file) => [node, [file]] },
  python: { dir: pyDir, ext: "py", exec: (file) => [python, [file]] },
};

async function runExample(lang, name, code, options = {}) {
  const { dir, ext, exec } = langs[lang];
  const file = `${name}.${ext}`;
  await writeFile(join(dir, file), pointAtBaseUrl(lang, code));
  const [command, args] = exec(file);
  return run(command, args, { cwd: dir, env: exampleEnv, ...options });
}

async function step(name, fn) {
  try {
    await fn();
    record("PASS", name);
  } catch (error) {
    if (error instanceof Blocked) {
      record("BLOCKED", name, error.message);
    } else {
      record("FAIL", name, error.message.replaceAll("\n", "\n        "));
    }
  }
}

class Blocked extends Error {}

/** Deletions of resources the harness created, run newest first. */
const cleanups = [];
async function runCleanups() {
  while (cleanups.length > 0) {
    const { label, path } = cleanups.pop();
    try {
      await api("DELETE", path);
      console.log(`        cleanup: deleted ${label}`);
    } catch (error) {
      record("FAIL", `cleanup: delete ${label}`, error.message);
    }
  }
}

try {
  console.log(`Project: ${workdir}\nAPI: ${baseUrl}\nPython SDK: ${PYTHON_SDK}\n`);

  await step(`Install TypeScript project (@blazingagents/sdk@${pkg.dependencies["@blazingagents/sdk"]}, ai@${pkg.devDependencies.ai}, Node ${process.version})`, async () => {
    await mkdir(tsDir);
    await mkdir(pyDir);
    await run("npm", ["init", "-y"], { cwd: tsDir });
    await run("npm", ["pkg", "set", "type=module"], { cwd: tsDir });
    await run("npm", ["install", "--no-audit", "--no-fund", "--ignore-scripts", `@blazingagents/sdk@${pkg.dependencies["@blazingagents/sdk"]}`, `ai@${pkg.devDependencies.ai}`], { cwd: tsDir });
  });
  await step("Install Python project", async () => {
    await run(SYSTEM_PYTHON, ["-c", "import sys; assert sys.version_info >= (3, 11), sys.version"]);
    await run(SYSTEM_PYTHON, ["-m", "venv", ".venv"], { cwd: pyDir });
    await run(python, ["-m", "pip", "install", "-q", PYTHON_SDK, ...PYTHON_SERVER_DEPS], { cwd: pyDir });
    console.log(`        ${(await run(python, ["--version"])).output.trim()}`);
  });

  const setup = await readFences("getting-started/setup.mdx");
  for (const lang of Object.keys(langs)) {
    await step(`setup.mdx: check the connection (${lang})`, async () => {
      const [code] = pick(setup, lang, ({ meta }) => meta.includes('title="check.'));
      const { output } = await runExample(lang, "check", code);
      const agents = await listAllAgents();
      expectLine(output, new RegExp(`^Connected\\. Your tenant has ${agents.length} agents\\.$`, "m"), `"Connected. Your tenant has ${agents.length} agents."`);
    });
  }

  const quickstart = await readFences("getting-started/quickstart.mdx");
  const providerName = "Quickstart OpenRouter";
  const { providers: providersBefore } = await api("GET", "/v1/providers");
  const quickstartProviderExisted = providersBefore.some(({ name }) => name === providerName);
  const quickstartProviderIds = new Set();
  for (const lang of Object.keys(langs)) {
    const steps = pick(quickstart, lang, ({ meta }) => meta.includes('title="quickstart.'));
    if (steps.length !== 3) {
      throw new Error(`quickstart.mdx: expected 3 ${lang} steps, found ${steps.length}`);
    }
    const upTo = (count) => steps.slice(0, count).join("\n");
    await step(`quickstart.mdx: step 1, connect a model provider (${lang})`, async () => {
      const first = expectLine((await runExample(lang, "quickstart", upTo(1))).output, /^Provider: (prv_[A-Za-z0-9]{16})$/m, "Provider: prv_...")[1];
      const again = expectLine((await runExample(lang, "quickstart", upTo(1))).output, /^Provider: (prv_[A-Za-z0-9]{16})$/m, "Provider: prv_...")[1];
      if (first !== again) {
        throw new Error(`the page promises the same provider ID on every run; got ${first} then ${again}`);
      }
      if (!openRouterKey && !quickstartProviderExisted && !quickstartProviderIds.has(first)) {
        cleanups.push({ label: `placeholder-key provider ${first}`, path: `/v1/providers/${first}` });
      }
      quickstartProviderIds.add(first);
    });
    await step(`quickstart.mdx: step 2, create an agent (${lang})`, async () => {
      const { code, output } = await runExample(lang, "quickstart", upTo(2), { allowFailure: !openRouterKey });
      if (!openRouterKey) {
        if (code !== 0 && /model_validation_unavailable|Provider model discovery is unavailable/.test(output)) {
          throw new Blocked("needs OPENROUTER_API_KEY: agents.create validates the model with OpenRouter (got model_validation_unavailable)");
        }
        throw new Error(`expected model_validation_unavailable with the placeholder key; got:\n${output}`);
      }
      expectLine(output, /^Provider: prv_[A-Za-z0-9]{16}\nAgent: ag_[A-Za-z0-9]{16}$/m, "Provider: prv_... then Agent: ag_...");
    });
    await step(`quickstart.mdx: step 3, stream the first answer (${lang})`, async () => {
      if (!openRouterKey) {
        throw new Blocked("needs OPENROUTER_API_KEY (depends on step 2)");
      }
      const { output } = await runExample(lang, "quickstart", upTo(3));
      expectLine(output, /^Provider: prv_[A-Za-z0-9]{16}\nAgent: ag_[A-Za-z0-9]{16}\nSession: ss_[A-Za-z0-9]{16}\ndata: \{"type":"start"/m, "Provider, Agent, Session, then data: {\"type\":\"start\"...");
      expectLine(output, /^data: \{"type":"text-delta"/m, 'a data: {"type":"text-delta"...} line');
      expectLine(output, /^data: \[DONE\]$/m, "data: [DONE]");
    });
  }
  if (quickstartProviderIds.size > 1) {
    record("FAIL", "quickstart.mdx: both SDKs reuse one provider", [...quickstartProviderIds].join(", "));
  }
  await runCleanups();

  const home = await readFences("index.mdx");
  for (const lang of Object.keys(langs)) {
    const [createAgent] = pick(home, lang, ({ section }) => section === "create-the-agent");
    const [route] = pick(home, lang, ({ section }) => section === "add-the-chat-route");
    await step(`index.mdx: create the agent and serve the chat route (${lang})`, async () => {
      if (!openRouterKey) {
        throw new Blocked('needs OPENROUTER_API_KEY: "Run once" calls agents.create, which validates the model with OpenRouter');
      }
      const agents = await listAllAgents();
      if (agents.some(({ name }) => name === "Support agent")) {
        throw new Error('the tenant already has a "Support agent"; the "Run once" script would fail. Delete it and rerun.');
      }
      const agentsBefore = new Set(agents.map(({ id }) => id));
      const providersBefore = new Set((await api("GET", "/v1/providers")).providers.map(({ id }) => id));
      try {
        const agentId = expectLine((await runExample(lang, "create-agent", createAgent)).output, /^BLAZING_AGENTS_AGENT_ID=(ag_[A-Za-z0-9]{16})$/m, "BLAZING_AGENTS_AGENT_ID=ag_...")[1];
        await serveAndPost(lang, route, agentId);
      } finally {
        /** The "Run once" script may fail after creating either resource, so find what it left by name. */
        for (const { id, name } of (await api("GET", "/v1/providers")).providers) {
          if (name === "OpenRouter" && !providersBefore.has(id)) {
            cleanups.push({ label: `provider ${id}`, path: `/v1/providers/${id}` });
          }
        }
        for (const { id, name } of await listAllAgents()) {
          if (name === "Support agent" && !agentsBefore.has(id)) {
            cleanups.push({ label: `agent ${id}`, path: `/v1/agents/${id}?includeArtifacts=true` });
          }
        }
        await runCleanups();
      }
    });
  }
} finally {
  await runCleanups();
  await rm(workdir, { recursive: true, force: true });
}

async function serveAndPost(lang, route, agentId) {
  const { dir } = langs[lang];
  const port = await freePort();
  let command;
  let args;
  if (lang === "typescript") {
    await writeFile(join(dir, "route.ts"), pointAtBaseUrl(lang, route));
    await writeFile(
      join(dir, "server.mjs"),
      `import { createServer } from "node:http";
import { Readable } from "node:stream";
import { POST } from "./route.ts";

createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const response = await POST(new Request(\`http://localhost\${req.url}\`, {
    method: req.method,
    headers: { "content-type": req.headers["content-type"] ?? "" },
    body: Buffer.concat(chunks),
  })).catch((error) => new Response(String(error.stack), { status: 500 }));
  res.writeHead(response.status, Object.fromEntries(response.headers));
  if (response.body) Readable.fromWeb(response.body).pipe(res);
  else res.end();
}).listen(${port});
`
    );
    [command, args] = [node, ["server.mjs"]];
  } else {
    await writeFile(join(dir, "main.py"), pointAtBaseUrl(lang, route));
    [command, args] = [python, ["-m", "uvicorn", "main:app", "--port", String(port)]];
  }
  const url = `http://127.0.0.1:${port}${lang === "python" ? "/api/chat" : "/"}`;
  const server = spawn(command, args, {
    cwd: dir,
    env: { ...baseEnv, ...exampleEnv, BLAZING_AGENTS_AGENT_ID: agentId },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  let exited = false;
  server.on("exit", () => (exited = true));
  server.stdout.on("data", (chunk) => (log += chunk));
  server.stderr.on("data", (chunk) => (log += chunk));
  try {
    const post = (body) =>
      fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const message = (text) => ({ id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text }] });
    let response;
    for (let attempt = 0; !response; attempt++) {
      try {
        response = await post({ message: message("Say hello in one short sentence.") });
      } catch {
        if (exited || attempt > 100) throw new Error(`the route server did not answer\n${log}`);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    const sessionId = await assertStream(response, log, true);
    const next = await post({ message: message("Say it again."), sessionId });
    await assertStream(next, log, false);
  } finally {
    server.kill();
  }
}

async function assertStream(response, log, expectLocation) {
  const body = await response.text();
  const type = response.headers.get("content-type") ?? "";
  if (response.status !== 200 || !type.startsWith("text/event-stream")) {
    throw new Error(`expected 200 text/event-stream, got ${response.status} ${type}\n${body}\n${log}`);
  }
  expectLine(body, /^data: \{"type":"start"/m, 'data: {"type":"start"...}');
  expectLine(body, /^data: \[DONE\]$/m, "data: [DONE]");
  if (!expectLocation) return undefined;
  const location = response.headers.get("location") ?? "";
  return expectLine(location, /(ss_[A-Za-z0-9]{16})$/, `a Location header ending in ss_... (got "${location}")`)[1];
}

console.log();
const count = (status) => results.filter((result) => result.status === status).length;
console.log(`${count("PASS")} passed, ${count("FAIL")} failed, ${count("BLOCKED")} blocked`);
process.exit(count("FAIL") ? 1 : count("BLOCKED") ? 2 : 0);
