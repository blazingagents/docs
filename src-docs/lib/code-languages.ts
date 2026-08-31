export const documentationCodeLanguages = {
  bash: import("shiki/langs/bash.mjs"),
  dotenv: import("shiki/langs/dotenv.mjs"),
  http: import("shiki/langs/http.mjs"),
  json: import("shiki/langs/json.mjs"),
  markdown: import("shiki/langs/markdown.mjs"),
  powershell: import("shiki/langs/powershell.mjs"),
  python: import("shiki/langs/python.mjs"),
  tsx: import("shiki/langs/tsx.mjs"),
  typescript: import("shiki/langs/typescript.mjs"),
  yaml: import("shiki/langs/yaml.mjs"),
} as const;

export const documentationCodeLanguageAliases = {
  env: "dotenv",
  md: "markdown",
  ps1: "powershell",
  text: "plaintext",
  yml: "yaml",
} as const;
