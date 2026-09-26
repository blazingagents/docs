---
title: Prompts
description: Save message templates once and reuse them in sessions and generation.
---

# Prompts

## Overview [#overview]

A prompt is a saved message template with `{{variable}}` placeholders. Store it once, then pass its `promptId` and values to generation or a session turn instead of building the message in your code. Blazing Agents finds the variables in the template for you.

## Endpoints [#endpoints]

### POST /v1/prompts [#create-prompt]

Creates a prompt and finds the variables in its template.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and JSON. There are no path or query parameters. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |

| Body field | Type   | Required | Description                                                  |
| ---------- | ------ | -------- | ------------------------------------------------------------ |
| `name`     | string | yes      | 1–80 characters                                              |
| `template` | string | yes      | Non-empty template, up to 10,240 characters and 10 variables |
| `agentId` | string or null | no | Same-Tenant Agent link; omission or null means unlinked |
| `userId`   | string | no       | Defaults to `""`                                             |
| `metadata` | object | no       | Defaults to `{}`                                             |

Deleting a linked agent also deletes its prompts. Prompts without an agent
stay. Linking an agent that is missing or in another tenant returns
`404 not_found`.

Variable names match `[A-Za-z_][A-Za-z0-9_]*`.

#### Response

Returns `201 Created` with a [Prompt object](/api-reference/protocols/objects-and-schemas#prompt).

Response schema: [`promptResponseSchema`](/api-reference/protocols/objects-and-schemas#prompt-response).

```json
{
  "id": "prompt_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": null,
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

`400 validation_failed` for a parsed body that fails schema validation. Filling in
variables can fail with `prompt_variable_missing` or `prompt_variable_unknown`;
a duplicate name returns `409 prompt_name_conflict`; and reaching the tenant
limit returns `prompt_limit_reached`. See [REST errors](/api-reference/protocols/errors).

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

Lists prompts, most recently updated first, in a single response.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |

| Query parameter | Type   | Required | Description                                           |
| --------------- | ------ | -------- | ----------------------------------------------------- |
| `agentId` | string | no | Exact Agent link filter; combines with userId |
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

Gets one prompt.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a `prompt_…` `promptId` path parameter. There are no query or body parameters. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `promptId`      | yes      | Prompt ID (`prompt_…`).                   |

#### Response

Returns `200 OK` with a complete [Prompt object](/api-reference/protocols/objects-and-schemas#prompt).

Response schema: [`promptResponseSchema`](/api-reference/protocols/objects-and-schemas#prompt-response).

```json
{
  "id": "prompt_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": null,
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

Updates a prompt and finds its variables again when the template changes.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), JSON, and a `prompt_…` `promptId`. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `promptId`      | yes      | Prompt ID (`prompt_…`).                   |

| Body field | Type   | Required | Description                           |
| ---------- | ------ | -------- | ------------------------------------- |
| `agentId` | string or null | no | Set or clear the Agent link |
| `name`     | string | no       | New name                              |
| `template` | string | no       | New template, up to 10,240 characters |
| `metadata` | object | no       | Replacement metadata                  |

At least one body field is required. There are no query parameters. A missing
or foreign Agent link returns `404 not_found`.

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

Permanently deletes a prompt. Messages already sent with it stay in their transcripts.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a `prompt_…` `promptId`. There are no query or body parameters. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
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

## Next [#next]

- [Prompts](/agents/prompts) to write and use templates.
- [Generation API](/api-reference/rest-api/generation) to run a prompt without a session.
