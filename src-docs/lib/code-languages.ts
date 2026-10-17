export const documentationCodeLanguages = {
  bash: import("shiki/langs/bash.mjs"),
  dotenv: import("shiki/langs/dotenv.mjs"),
  go: import("shiki/langs/go.mjs"),
  http: import("shiki/langs/http.mjs"),
  json: import("shiki/langs/json.mjs"),
  markdown: import("shiki/langs/markdown.mjs"),
  powershell: import("shiki/langs/powershell.mjs"),
  python: import("shiki/langs/python.mjs"),
  rust: import("shiki/langs/rust.mjs"),
  tsx: import("shiki/langs/tsx.mjs"),
  typescript: import("shiki/langs/typescript.mjs"),
  yaml: import("shiki/langs/yaml.mjs"),
} as const;

export const documentationCodeLanguageAliases = {
  env: "dotenv",
  md: "markdown",
  ps1: "powershell",
  pyi: "python",
  rs: "rust",
  text: "plaintext",
  yml: "yaml",
} as const;
