import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import {
  documentationCodeLanguageAliases,
  documentationCodeLanguages,
} from "./src-docs/lib/code-languages.ts";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    postprocess: {
      /** The loader, search index, and Markdown downloads share this output. */
      includeProcessedMarkdown: true,
    },
  },
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      langs: [...Object.values(documentationCodeLanguages)],
      langAlias: documentationCodeLanguageAliases,
      themes: {
        dark: "github-dark-default",
        light: "github-light-default",
      },
    },
  },
});
