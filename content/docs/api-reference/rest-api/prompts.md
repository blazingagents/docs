---
title: Prompts
description: Manage reusable Tenant Prompt templates.
---

# Prompts

## Overview [#overview]

Prompts are reusable Tenant templates with inferred variables. Use them to centralize instructions that Generation, Sessions, or other callers render repeatedly.

## Endpoints [#endpoints]

### POST /v1/prompts [#create-prompt]

Creates a reusable Prompt and infers variables from its template.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and JSON. There are no path or query parameters. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |

| Body field | Type   | Required | Description                                                  |
| ---------- | ------ | -------- | ------------------------------------------------------------ |
| `name`     | string | yes      | 1–80 characters                                              |
| `template` | string | yes      | Non-empty template, up to 10,240 characters and 10 variables |
| `userId`   | string | no       | Defaults to `""`                                             |
| `metadata` | object | no       | Defaults to `{}`                                             |

Variable names match `[A-Za-z_][A-Za-z0-9_]*`.

#### Response

Returns `201 Created` with a [Prompt object](/api-reference/protocols/objects-and-schemas#prompt).

Response schema: [`promptResponseSchema`](/api-reference/protocols/objects-and-schemas#prompt-response).

```json
{
  "id": "prompt_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "name": "Welcome",
  "template": "Welcome, {{name}}!",
  "variables": ["name"],
  "userId": "",
  "metadata": {},
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

`400 validation_failed` for a parsed body that fails schema validation. Prompt
expansion uses `prompt_variable_missing` or `prompt_variable_unknown`;
duplicate names use `409 prompt_name_conflict`; and the Tenant cap uses
`prompt_limit_reached`. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/prompts" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"Welcome","template":"Welcome, {{name}}!"}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/prompts#create) / [Python](/sdk/python/prompts#create). See [Prompts](/agents/prompts) and [Generate structured output](/agents/output/structured-output).

### GET /v1/prompts [#list-prompts]

Lists Prompts by most recent update. Results are not paginated.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |

| Query parameter | Type   | Required | Description                                           |
| --------------- | ------ | -------- | ----------------------------------------------------- |
| `userId`        | string | no       | Attribution filter; `""` selects tenant-level Prompts |

There is no request body.

#### Response

Returns `200 OK` with a `prompts` array. Each item is a complete [Prompt object](/api-reference/protocols/objects-and-schemas#prompt).

Response schema: [`promptsResponseSchema`](/api-reference/protocols/objects-and-schemas#prompts-response).

#### Errors

`400 validation_failed` for invalid or unknown query fields. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --get "$BLAZING_AGENTS_BASE_URL/v1/prompts" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --data-urlencode "userId="
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/prompts#list) / [Python](/sdk/python/prompts#list). See [Prompts](/agents/prompts) and [Generate structured output](/agents/output/structured-output).

### GET /v1/prompts/:promptId [#get-prompt]

Gets one Prompt.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a `prompt_…` `promptId` path parameter. There are no query or body parameters. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `promptId`      | yes      | Prompt ID (`prompt_…`).                   |

#### Response

Returns `200 OK` with a complete [Prompt object](/api-reference/protocols/objects-and-schemas#prompt).

Response schema: [`promptResponseSchema`](/api-reference/protocols/objects-and-schemas#prompt-response).

```json
{
  "id": "prompt_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "name": "Welcome",
  "template": "Welcome, {{name}}!",
  "variables": ["name"],
  "userId": "",
  "metadata": {},
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

`400 validation_failed` for a malformed ID. `404 not_found` when missing or foreign. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/prompts/prompt_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/prompts#get) / [Python](/sdk/python/prompts#get). See [Prompts](/agents/prompts) and [Generate structured output](/agents/output/structured-output).

### PATCH /v1/prompts/:promptId [#update-prompt]

Updates a Prompt in place and re-infers variables when its template changes.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), JSON, and a `prompt_…` `promptId`. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `promptId`      | yes      | Prompt ID (`prompt_…`).                   |

| Body field | Type   | Required | Description                           |
| ---------- | ------ | -------- | ------------------------------------- |
| `name`     | string | no       | New name                              |
| `template` | string | no       | New template, up to 10,240 characters |
| `metadata` | object | no       | Replacement metadata                  |

At least one body field is required. There are no query parameters.

#### Response

Returns `200 OK` with the complete updated [Prompt object](/api-reference/protocols/objects-and-schemas#prompt).

Response schema: [`promptResponseSchema`](/api-reference/protocols/objects-and-schemas#prompt-response).

#### Errors

`400 validation_failed` for invalid or empty parsed input.
`prompt_variable_missing`, `prompt_variable_unknown`, and
`409 prompt_name_conflict` identify expansion and name failures. `404
not_found` applies when the Prompt is missing or foreign. See [REST
errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request PATCH \
  "$BLAZING_AGENTS_BASE_URL/v1/prompts/prompt_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"template":"Hello, {{name}}!"}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/prompts#update) / [Python](/sdk/python/prompts#update). See [Prompts](/agents/prompts) and [Generate structured output](/agents/output/structured-output).

### DELETE /v1/prompts/:promptId [#delete-prompt]

Permanently deletes a Prompt without changing previously rendered transcripts.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a `prompt_…` `promptId`. There are no query or body parameters. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `promptId`      | yes      | Prompt ID (`prompt_…`).                   |

#### Response

Returns `204 No Content` with an empty body.

#### Errors

`400 validation_failed` for a malformed ID. `404 not_found` when missing or foreign. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request DELETE \
  "$BLAZING_AGENTS_BASE_URL/v1/prompts/prompt_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/prompts#delete) / [Python](/sdk/python/prompts#delete). See [Prompts](/agents/prompts) and [Generate structured output](/agents/output/structured-output).

## Related [#related]

- [TypeScript SDK](/sdk/typescript)
- [Python SDK Prompts](/sdk/python/prompts)
- [Objects and schemas](/api-reference/protocols/objects-and-schemas)
- [Errors](/api-reference/protocols/errors)
