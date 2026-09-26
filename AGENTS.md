All changes must use a topic branch and merge through a PR after required checks pass. Never commit or push directly to `main`.

Follow [the documentation style guide](STYLE.md) when editing `content/docs/`, and run `npm run lint:docs` before submitting.

The error code catalog on `content/docs/api-reference/protocols/errors.md` is generated from `src-docs/data/error-codes.json` by `npm run generate`. Edit the data file, never the marked regions of the page. `scripts/error-catalog.test.mjs` fails when the data file's codes differ from the `error.code` enum in `openapi/openapi.json`.
