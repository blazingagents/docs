# Blazing Agents Documentation

Source for the public [Blazing Agents documentation](https://docs.blazingagents.com).

The site is built with TanStack Start and Fumadocs. It includes product guides,
SDK documentation, examples, and the REST API reference.

## Requirements

- Node.js 24 or later
- npm
- Access to the npm registry

## Development

```bash
npm install
npm run dev
```

The development server runs at <http://localhost:3761>.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Generate documentation metadata and start the development server |
| `npm run generate` | Generate Fumadocs sources and the documentation manifest |
| `npm run build` | Create and verify the production build |
| `npm run typecheck` | Generate sources and run TypeScript checks |
| `npm test` | Run documentation tests and coverage checks |
| `npm run check` | Run the required type-check and test gate |

## Repository structure

| Path | Purpose |
| --- | --- |
| `content/docs/` | Authored MDX and Markdown documentation |
| `src-docs/` | Documentation application, components, routes, and validation |
| `public/` | Icons, social images, and other static assets |
| `scripts/` | Manifest generation, coverage, and build verification |
| `source.config.ts` | Fumadocs content configuration |
| `vite.docs.config.mts` | Development and production build configuration |

## Editing documentation

Add or update pages under `content/docs/`. Keep each section's `meta.json` in
sync with its navigation order. Run `npm run check` before submitting changes.

The production build is written to `.output/public` for deployment to
`docs.blazingagents.com`.

## Deployment

Cloudflare Pages project `blazing-agents-docs` deploys this repository through
its GitHub integration with these settings:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Node.js version | `24` |
| Build command | `npm run build` |
| Build output directory | `.output/public` |
| Custom domain | `docs.blazingagents.com` |

No deployment credentials belong in this repository. Cloudflare owns DNS and
TLS, and its GitHub integration starts production deployments after changes
land on `main`.

## Related repositories

- [Python SDK](https://github.com/blazingagents/python-sdk)
- [TypeScript SDK](https://github.com/blazingagents/typescript-sdk)
- [Examples](https://github.com/blazingagents/examples)
