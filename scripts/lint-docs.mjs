import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const EXAMPLE_MODEL = "openai/gpt-6-luna";
const ALLOWED_PHRASES = ["Cloudflare Worker relay"];
const INTERNAL_TERMS = [
  /\bR2\b/,
  /\bCloudflare\b/,
  /\bDBOS\b/,
  /\bSupabase\b/,
  /\bContainers?\b/,
  /\bdispatchers?\b/i,
];
const VERSION = String.raw`v?\d+\.\d+(?:\.\d+)?`;
const CHANGELOG_PATTERNS = [
  /\bstarting in v/i,
  /\bolder SDKs?\b/i,
  new RegExp(String.raw`\(SDK\s+${VERSION}\+\)`, "i"),
];
const OR_LATER = new RegExp(String.raw`\b${VERSION}\+?\s+or\s+later\b`, "i");
const SDK_MENTION = /\bSDK\b|@blazingagents\/sdk|blazing-agents|blazingagents/i;
const MODEL_ASSIGNMENT =
  /\bmodel(?:Id|_id)?["']?\s*[:=]\s*["']([^"']+)["']/g;
const MODEL_FAMILY =
  /(?<![\w/.-])(?:[a-z-]+\/)?(?:gpt-[\w.-]+|claude-[\w.-]+|gemini-[\w.-]+|llama-?[\w.-]*|mistral-[\w.-]+)/gi;
const UNPREFIXED_LUNA = /(?<!openai\/)\bgpt-6-luna\b/;
const TYPESCRIPT_LANGUAGES = new Set(["ts", "typescript", "tsx", "mts", "cts"]);
const TYPE_CAST = /\bas\s+(?!const\b)[A-Za-z_$[{(]/;
const LINK = /\]\((\/[^)\s]*)\)|href=["'](\/[^"']*)["']/g;
const EXPLICIT_ID = /\[#([^\]\s]+)\]\s*$/;
const HTML_ID = /<[a-z]+\s[^>]*\bid=["']([^"']+)["']/g;
const FENCE = /^\s*(`{3,}|~{3,})\s*([^\s`]*)/;

function pageRoute(file) {
  const route = file
    .replace(/\.mdx?$/, "")
    .replace(/(?:^|\/)index$/, "")
    .replace(/\/$/, "");
  return `/${route}`;
}

function scanLines(text, visit) {
  let fence;
  text.split("\n").forEach((line, index) => {
    const match = FENCE.exec(line);
    if (fence) {
      if (
        match &&
        match[1][0] === fence.marker[0] &&
        match[1].length >= fence.marker.length &&
        !match[2]
      ) {
        fence = undefined;
        return;
      }
      visit(line, index + 1, fence.language);
      return;
    }
    if (match) {
      fence = { language: match[2].toLowerCase(), marker: match[1] };
      return;
    }
    visit(line, index + 1, undefined);
  });
}

export function buildIndex(files) {
  const pages = new Map();
  for (const { file, text } of files) {
    const ids = new Set();
    scanLines(text, (line, _number, language) => {
      if (language !== undefined) {
        return;
      }
      const heading = /^#{1,6}\s/.test(line) && EXPLICIT_ID.exec(line);
      if (heading) {
        ids.add(heading[1]);
      }
      for (const anchor of line.matchAll(HTML_ID)) {
        ids.add(anchor[1]);
      }
    });
    pages.set(pageRoute(file), ids);
  }
  return pages;
}

function stripCode(line) {
  return line
    .replace(/\/\/.*$/, "")
    .replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""');
}

function resolveLink(target, pages) {
  const [location, anchor] = target.split("#");
  const path = location.split("?")[0];
  const route = path.length > 1 ? path.replace(/\/$/, "") : path;
  const ids = pages.get(route);
  if (!ids) {
    return `page ${route} does not exist`;
  }
  return anchor && !ids.has(anchor)
    ? `page ${route} has no explicit heading id [#${anchor}]`
    : undefined;
}

export function lintFile(file, text, pages) {
  const violations = [];
  const report = (line, rule, message) =>
    violations.push({ file, line, message, rule });
  scanLines(text, (line, number, language) => {
    const checked = ALLOWED_PHRASES.reduce(
      (current, phrase) => current.replaceAll(phrase, ""),
      line
    );
    for (const term of INTERNAL_TERMS) {
      const match = term.exec(checked);
      if (match) {
        report(number, "internal-term", `"${match[0]}"`);
      }
    }
    const changelog =
      CHANGELOG_PATTERNS.map((pattern) => pattern.exec(line)).find(Boolean) ??
      (SDK_MENTION.test(line) ? OR_LATER.exec(line) : null);
    if (changelog) {
      report(number, "sdk-changelog", `"${changelog[0]}"`);
    }
    if (UNPREFIXED_LUNA.test(line)) {
      report(number, "model-id", `gpt-6-luna must be written as ${EXAMPLE_MODEL}`);
    }
    if (language === undefined) {
      const prose = line.replace(/`[^`]*`/g, "");
      for (const match of prose.matchAll(LINK)) {
        const problem = resolveLink(match[1] ?? match[2], pages);
        if (problem) {
          report(number, "broken-link", `${match[1] ?? match[2]}: ${problem}`);
        }
      }
      return;
    }
    const models = new Set([
      ...[...line.matchAll(MODEL_ASSIGNMENT)].map((match) => match[1]),
      ...[...line.matchAll(MODEL_FAMILY)].map((match) => match[0]),
    ]);
    for (const model of models) {
      if (model !== EXAMPLE_MODEL && !model.endsWith("gpt-6-luna")) {
        report(number, "model-id", `"${model}" is not ${EXAMPLE_MODEL}`);
      }
    }
    if (
      TYPESCRIPT_LANGUAGES.has(language) &&
      !/^\s*(?:import|export)\b/.test(line) &&
      TYPE_CAST.test(stripCode(line))
    ) {
      report(number, "type-cast", "remove the `as` type cast");
    }
  });
  return violations;
}

export function lintDocs(files) {
  const pages = buildIndex(files);
  return files.flatMap(({ file, text }) => lintFile(file, text, pages));
}

export function formatReport(violations) {
  if (violations.length === 0) {
    return "No documentation style violations.";
  }
  const counts = new Map();
  for (const { file } of violations) {
    counts.set(file, (counts.get(file) ?? 0) + 1);
  }
  return [
    ...violations.map(
      ({ file, line, message, rule }) => `${file}:${line} ${rule}: ${message}`
    ),
    "",
    "Violations per file:",
    ...[...counts].map(([file, count]) => `${String(count).padStart(4)} ${file}`),
    `${String(violations.length).padStart(4)} total`,
  ].join("\n");
}

function readDocs(root) {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name))
    .map((entry) => {
      const path = resolve(entry.parentPath, entry.name);
      return {
        file: relative(root, path).replaceAll("\\", "/"),
        text: readFileSync(path, "utf8"),
      };
    })
    .sort((a, b) => a.file.localeCompare(b.file));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const root = resolve(process.cwd(), "content/docs");
  const violations = lintDocs(readDocs(root)).map((violation) => ({
    ...violation,
    file: `content/docs/${violation.file}`,
  }));
  console.log(formatReport(violations));
  process.exitCode = violations.length === 0 ? 0 : 1;
}
