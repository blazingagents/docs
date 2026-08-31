import { documentationCatalog } from "./documentation-catalog.ts";

const REDIRECT_STATUS = 308;

export const cloudflarePagesRedirects = `${documentationCatalog.redirects
  .map(([source, destination]) => `${source} ${destination} ${REDIRECT_STATUS}`)
  .join("\n")}\n`;

export const documentationNotFoundHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Page not found · Blazing Agents Documentation</title>
    <style>
      :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; background: #0a0a0a; color: #fafafa; }
      body { margin: 0; }
      main { box-sizing: border-box; max-width: 42rem; margin: 0 auto; padding: 6rem 1.5rem; }
      h1 { margin: 0; font-size: 2rem; }
      p { color: #a3a3a3; line-height: 1.6; }
      a { color: #facc15; }
    </style>
  </head>
  <body>
    <main>
      <h1>Page not found</h1>
      <p>The documentation page you requested does not exist.</p>
      <a href="/">Return to documentation home</a>
    </main>
  </body>
</html>
`;
