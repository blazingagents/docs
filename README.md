<div align="center">
  <a href="https://docs.blazingagents.com">
    <img src="./public/brand/icon.svg" alt="Blazing Agents logo" width="96">
  </a>
  <h1>Blazing Agents Documentation</h1>
  <p>Guides and API references for building production agents.</p>
  <p>
    <a href="https://docs.blazingagents.com">Read the documentation</a>
  </p>
</div>

The site is built with TanStack Start and Fumadocs. It includes product guides,
SDK documentation, examples, and the REST API reference.

## Features

- Getting-started and platform guides for Blazing Agents users.
- CLI, Python SDK, and TypeScript SDK documentation.
- Agent, automation, security, and operations guides.
- REST API reference with protocol and resource documentation.

## Documentation

Read the published documentation at
[docs.blazingagents.com](https://docs.blazingagents.com).

## Requirements

- Node.js 24 or later
- npm
- Access to the npm registry

## Installation

```bash
git clone https://github.com/blazingagents/docs.git
cd docs
npm install
npm run dev
```

The development server runs at <http://localhost:3761>.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Generate documentation metadata and start the development server |
| `npm run generate` | Generate Fumadocs sources and the documentation manifest |
| `npm run generate:rest-api` | Regenerate the REST API reference pages from `openapi/openapi.json` |
| `npm run build` | Create and verify the production build |
| `npm run typecheck` | Generate sources and run TypeScript checks |
| `npm test` | Run documentation tests and coverage checks |
| `npm run check` | Run the required type-check, test, style, and REST reference freshness gate |
| `npm run lint:docs` | Check `content/docs/` against the style guide's mechanical rules |
| `npm run sync:openapi` | Copy the platform's API contract into `openapi/openapi.json` |

## Smoke-testing the examples against a live API

`npm run smoke:examples` runs the TypeScript and Python code on the setup page,
the quickstart, and the home page chat route against a real API. It reads
every snippet from the page, so there are no copies to keep in sync. It needs a
live API, so it is not part of `npm run check`.

```bash
export BLAZING_AGENTS_BASE_URL="http://localhost:8787"
export BLAZING_AGENTS_API_KEY="ba_..."
export OPENROUTER_API_KEY="sk-or-..."
nvm exec 24 npm run smoke:examples
```

- Run it under Node 24. It needs `python3` 3.11 or later (or set
  `SMOKE_PYTHON`).
- It installs the pinned `@blazingagents/sdk` and `ai` from `package.json`
  and the published `blazing-agents` Python package in a temporary project.
  Set `SMOKE_PYTHON_SDK=../python-sdk` (any pip requirement) to test a local
  checkout.
- Neither SDK reads a base URL from the environment, so the harness adds only
  the `baseUrl`/`base_url` argument to each client constructor. The line is
  marked `SMOKE HARNESS`.
- Without `OPENROUTER_API_KEY`, the run stops at the first model step and exits
  with status 2. That step is quickstart step 2, where `agents.create` checks
  the model. The run uses a placeholder key for quickstart step 1 and deletes
  that provider afterwards.
- The quickstart's provider and agent stay in the tenant, as the page intends.
  The home page's agent and provider are deleted after the route test. If
  the tenant already has an agent named `Support agent`, the home page step
  fails, as the page says it would.

## Repository structure

| Path | Purpose |
| --- | --- |
| `content/docs/` | Authored MDX and Markdown documentation, plus the generated REST API resource pages |
| `content/rest-api-intros/` | Hand-written intro prose for each generated REST API page |
| `openapi/openapi.json` | The platform OpenAPI contract the REST API reference is generated from |
| `src-docs/` | Documentation application, components, routes, and validation |
| `openapi/` | Committed copy of the platform's OpenAPI contract |
| `public/` | Icons, social images, and other static assets |
| `scripts/` | Manifest generation, coverage, and build verification |
| `source.config.ts` | Fumadocs content configuration |
| `vite.docs.config.mts` | Development and production build configuration |

## Editing documentation

Add or update pages under `content/docs/`. Keep each section's `meta.json` in
sync with its navigation order. Follow the [style guide](STYLE.md), and run
`npm run lint:docs` and `npm run check` before submitting changes.

The production build is written to `.output/public` for deployment to
`docs.blazingagents.com`.

## Updating the API contract

`openapi/openapi.json` is a committed copy of the platform's public API
contract, `servers/api/openapi.json` in the `ba-platform` repository. CI has no
platform checkout, so it uses the committed copy.

After the platform contract changes, refresh the copy from a sibling checkout
and commit the result:

```bash
npm run sync:openapi
```

The script reads `../ba-platform/servers/api/openapi.json` by default. Set
`BA_PLATFORM_OPENAPI` to use another path, and it fails if the source file is
missing:

```bash
BA_PLATFORM_OPENAPI=/path/to/ba-platform/servers/api/openapi.json npm run sync:openapi
```

`npm test` fails when the contract's error codes differ from
`src-docs/data/error-codes.json`. Add or remove the matching entries there,
then run `npm run generate` to update the errors page.

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
- [CLI](https://github.com/blazingagents/cli)
- [Examples](https://github.com/blazingagents/examples)
- [Coding-agent skills](https://github.com/blazingagents/skills)
