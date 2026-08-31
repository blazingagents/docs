import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { PUBLIC_SITE_ORIGIN } from "../brand.ts";
import { documentationCatalog } from "../src-docs/lib/documentation-catalog.ts";
import {
  cloudflarePagesRedirects,
  documentationNotFoundHtml,
} from "../src-docs/lib/hosting.ts";

const webappDirectory = fileURLToPath(new URL("../", import.meta.url));
const outputDirectory = resolve(webappDirectory, ".output/public");
const maximumGzippedSearchIndexBytes = 2 * 1024 * 1024;
const documentationPaths = documentationCatalog.paths;

const missingHtml = documentationPaths.filter(
  (path) => !existsSync(getHtmlOutputPath(path))
);
const missingMarkdown = documentationPaths.filter(
  (path) => !existsSync(getMarkdownOutputPath(path))
);

if (missingHtml.length > 0 || missingMarkdown.length > 0) {
  const missing = [
    ...missingHtml.map((path) => `HTML ${path}`),
    ...missingMarkdown.map((path) => `Markdown ${path}`),
  ];
  throw new Error(
    `Missing static documentation output:\n${missing.join("\n")}`
  );
}

for (const path of [
  "404.html",
  "_redirects",
  "api/search",
  "llms.txt",
  "llms-full.txt",
  "sitemap.xml",
]) {
  const outputPath = resolve(outputDirectory, path);
  if (!existsSync(outputPath) || readFileSync(outputPath).length === 0) {
    throw new Error(`Missing or empty static output: /${path}`);
  }
}

const redirectOutput = readFileSync(
  resolve(outputDirectory, "_redirects"),
  "utf8"
);
if (redirectOutput !== cloudflarePagesRedirects) {
  throw new Error(
    "Built Cloudflare Pages redirects do not match the canonical redirect map."
  );
}
const redirectRules = new Map(
  redirectOutput
    .trim()
    .split("\n")
    .map((line) => {
      const [source, destination, status] = line.split(" ");
      return [source, { destination, status: Number(status) }];
    })
);
const notFoundOutput = readFileSync(
  resolve(outputDirectory, "404.html"),
  "utf8"
);
if (notFoundOutput !== documentationNotFoundHtml) {
  throw new Error(
    "Built Cloudflare Pages 404 output does not match its source artifact."
  );
}
const unknownPath = "/this-documentation-page-does-not-exist";
const unknownResponse = resolveBuiltResponse(unknownPath);
if (
  unknownResponse.status !== 404 ||
  !notFoundOutput.includes("<h1>Page not found</h1>")
) {
  throw new Error(
    "Unknown paths do not resolve to the deployment 404 artifact."
  );
}
for (const path of documentationPaths) {
  if (resolveBuiltResponse(path).status !== 200) {
    throw new Error(`Canonical built page did not return HTTP 200: ${path}`);
  }
}

const documentationHome = readFileSync(
  resolve(outputDirectory, "index.html"),
  "utf8"
);
const documentationLogoLinks =
  documentationHome.match(
    /<a[^>]*aria-label="Blazing Agents homepage"[^>]*>/g
  ) ?? [];
if (
  documentationLogoLinks.length === 0 ||
  documentationLogoLinks.some(
    (link) =>
      !link.includes(`href="${PUBLIC_SITE_ORIGIN}"`) ||
      link.includes('target="_blank"')
  )
) {
  throw new Error(
    "Built documentation logo does not link to the public homepage in the same tab."
  );
}

const sitemap = readFileSync(resolve(outputDirectory, "sitemap.xml"), "utf8");
for (const path of documentationPaths) {
  const url = `https://docs.blazingagents.com${path}`;
  if (!sitemap.includes(`<loc>${url}</loc>`)) {
    throw new Error(`Sitemap is missing ${url}`);
  }
}

const searchIndex = readFileSync(resolve(outputDirectory, "api/search"));
const gzippedSearchIndex = gzipSync(searchIndex);
if (gzippedSearchIndex.length > maximumGzippedSearchIndexBytes) {
  throw new Error(
    `Search index is ${gzippedSearchIndex.length} bytes gzipped; limit is ${maximumGzippedSearchIndexBytes}.`
  );
}

console.log(
  `Verified ${documentationPaths.length} docs pages, Markdown representations, ${redirectRules.size} HTTP 308 redirects, the HTTP 404 artifact, and static search output (${gzippedSearchIndex.length} bytes gzipped).`
);

function getHtmlOutputPath(path) {
  return resolve(
    outputDirectory,
    path === "/" ? "index.html" : `${path.slice(1)}/index.html`
  );
}

function getMarkdownOutputPath(path) {
  return resolve(
    outputDirectory,
    path === "/" ? "index.md" : `${path.slice(1)}.md`
  );
}

/** Resolves a request using only the emitted Cloudflare Pages artifacts. */
function resolveBuiltResponse(input) {
  const request = new URL(input, "https://docs.blazingagents.com");
  const rule = redirectRules.get(request.pathname);
  if (rule) {
    const destination = new URL(
      rule.destination,
      "https://docs.blazingagents.com"
    );
    if (!destination.search) {
      destination.search = request.search;
    }
    return new Response(null, {
      headers: {
        location: `${destination.pathname}${destination.search}${destination.hash}`,
      },
      status: rule.status,
    });
  }
  if (existsSync(getHtmlOutputPath(request.pathname))) {
    return new Response(null, { status: 200 });
  }
  return new Response(notFoundOutput, { status: 404 });
}
