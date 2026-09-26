import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";

export const ERROR_CATALOG_DATA = "src-docs/data/error-codes.json";
export const ERROR_CATALOG_PAGE = "content/docs/api-reference/protocols/errors.md";

const errorCatalogSchema = z
  .object({
    groups: z.array(
      z
        .object({
          id: z.string().regex(/^[a-z-]+$/),
          summary: z.string().min(1),
          title: z.string().min(1),
        })
        .strict()
    ),
    codes: z.array(
      z
        .object({
          code: z.string().regex(/^[a-z_]+$/),
          group: z.string(),
          howToFix: z.array(z.string().min(1)).min(1),
          retryable: z.boolean(),
          statuses: z.array(z.number().int().min(400).max(599)).min(1),
          title: z.string().min(1),
          whatHappened: z.string().min(1),
        })
        .strict()
    ),
  })
  .strict()
  .superRefine(({ codes, groups }, context) => {
    const groupIds = new Set(groups.map(({ id }) => id));
    const seen = new Set();
    for (const { code, group } of codes) {
      if (seen.has(code)) {
        context.addIssue({ code: "custom", message: `Duplicate code ${code}` });
      }
      seen.add(code);
      if (!groupIds.has(group)) {
        context.addIssue({ code: "custom", message: `${code}: unknown group ${group}` });
      }
    }
    for (const id of groupIds) {
      if (!codes.some(({ group }) => group === id)) {
        context.addIssue({ code: "custom", message: `Empty group ${id}` });
      }
    }
  });

export function loadErrorCatalog(path = ERROR_CATALOG_DATA) {
  return errorCatalogSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

const codeLink = (code) => `[\`${code}\`](#${code})`;

function listStatuses(statuses) {
  const codes = statuses.map((status) => `\`${status}\``);
  return codes.length === 1
    ? codes[0]
    : `${codes.slice(0, -1).join(", ")}, or ${codes.at(-1)}`;
}

function codesIn(catalog, group) {
  return catalog.codes.filter((entry) => entry.group === group.id);
}

export function renderErrorIndex(catalog) {
  return [
    "| Area | Codes |",
    "| --- | --- |",
    ...catalog.groups.map(
      (group) =>
        `| [${group.title}](#${group.id}) | ${codesIn(catalog, group)
          .map(({ code }) => codeLink(code))
          .join(", ")} |`
    ),
  ].join("\n");
}

function renderEntry(entry) {
  return [
    `### \`${entry.code}\` [#${entry.code}]`,
    `**${entry.title}**`,
    entry.whatHappened,
    `HTTP ${listStatuses(entry.statuses)}. ${
      entry.retryable
        ? "Retrying the same request can succeed."
        : "Retrying the same request fails the same way until you fix the cause."
    }`,
    `To fix it:\n\n${entry.howToFix.map((step) => `- ${step}`).join("\n")}`,
  ].join("\n\n");
}

export function renderErrorCatalog(catalog) {
  return catalog.groups
    .map((group) =>
      [
        `## ${group.title} [#${group.id}]`,
        group.summary,
        ...codesIn(catalog, group).map(renderEntry),
      ].join("\n\n")
    )
    .join("\n\n");
}

export function replaceRegion(page, name, body) {
  const start = `<!-- ${name}:start -->`;
  const end = `<!-- ${name}:end -->`;
  const from = page.indexOf(start);
  const to = page.indexOf(end);
  if (from === -1 || to < from) {
    throw new Error(`Missing ${start} ... ${end} markers`);
  }
  return `${page.slice(0, from + start.length)}\n\n${body}\n\n${page.slice(to)}`;
}

export function renderErrorPage(page, catalog) {
  return replaceRegion(
    replaceRegion(page, "error-index", renderErrorIndex(catalog)),
    "error-catalog",
    renderErrorCatalog(catalog)
  );
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? "")).href) {
  const page = readFileSync(ERROR_CATALOG_PAGE, "utf8");
  writeFileSync(ERROR_CATALOG_PAGE, renderErrorPage(page, loadErrorCatalog()));
}
