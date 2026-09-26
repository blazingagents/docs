---
title: Prompts
description: Save message templates once and reuse them in sessions and generation.
---

# Prompts

## Overview [#overview]

A prompt is a saved message template with `{{variable}}` placeholders. Store it once, then pass its `promptId` and values to generation or a session turn instead of building the message in your code. Blazing Agents finds the variables in the template for you.

## Endpoints [#endpoints]

### GET /v1/prompts [#list-prompts]

List prompts.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `userId` | string | query |  |  |
| `agentId` | string | query |  | `ag_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The tenant's prompts.

Response schema: `PromptList`.

```json
{
  "prompts": [
    {
      "id": "prompt_1234567890ABCDEF",
      "tenantId": "ten_1234567890ABCDEF",
      "agentId": "ag_1234567890ABCDEF",
      "name": "string",
      "template": "string",
      "variables": [
        "string"
      ],
      "userId": "string",
      "metadata": {},
      "createdAt": "2026-07-10T10:00:00Z",
      "updatedAt": "2026-07-10T10:00:00Z"
    }
  ]
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/prompts" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/prompts [#create-prompt]

Create a prompt.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `name` | string | body | required | 1–80 characters. |
| `template` | string | body | required | 1–10240 characters. |
| `agentId` | string \| null | body |  | `ag_…` ID. |
| `userId` | string | body |  | Defaults to `""`. |
| `metadata` | object | body |  | Defaults to `{}`. |

#### Response

Returns `201 Created` as `application/json`. The created prompt.

Response schema: `Prompt`.

```json
{
  "id": "prompt_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "string",
  "template": "string",
  "variables": [
    "string"
  ],
  "userId": "string",
  "metadata": {},
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |
| `409` |  | Prompt name already exists |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/prompts" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"string","template":"string"}'
```

### GET /v1/prompts/:promptId [#get-prompt]

Get a prompt.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `promptId` | string | path | required | `prompt_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The prompt.

Response schema: `Prompt`.

```json
{
  "id": "prompt_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "string",
  "template": "string",
  "variables": [
    "string"
  ],
  "userId": "string",
  "metadata": {},
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/prompts/prompt_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PATCH /v1/prompts/:promptId [#update-prompt]

Update a prompt.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `promptId` | string | path | required | `prompt_…` ID. |
| `agentId` | string \| null | body |  | `ag_…` ID. |
| `name` | string | body |  | 1–80 characters. |
| `template` | string | body |  | 1–10240 characters. |
| `metadata` | object | body |  |  |

#### Response

Returns `200 OK` as `application/json`. The updated prompt.

Response schema: `Prompt`.

```json
{
  "id": "prompt_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "string",
  "template": "string",
  "variables": [
    "string"
  ],
  "userId": "string",
  "metadata": {},
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |
| `409` |  | Prompt name already exists |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/prompts/prompt_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"agentId":"ag_1234567890ABCDEF"}'
```

### DELETE /v1/prompts/:promptId [#delete-prompt]

Delete a prompt.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `promptId` | string | path | required | `prompt_…` ID. |

#### Response

Returns `204 No Content`. Deleted.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/prompts/prompt_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Prompts](/agents/prompts) to write and use templates.
- [Generation API](/api-reference/rest-api/generation) to run a prompt without a session.
