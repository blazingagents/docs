---
title: Prompts
description: Save message templates once and reuse them in sessions and generation.
---

# Prompts

## Overview [#overview]

A prompt is a saved message template with `{{variable}}` placeholders. Store it once, then pass its `promptId` and values to generation or a session turn instead of building the message in your code. Blazing Agents finds the variables in the template for you.

Prompt names can repeat. List results use `data` and `nextCursor`. Pass the cursor with the same filters to read another page.

## Endpoints [#endpoints]

### GET /v1/prompts [#list-prompts]

List prompts.

Lists your prompts, newest first, one page at a time. Pass `nextCursor` as `cursor` for older prompts. Filter by end user, by linked agent, or both.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `userId` | string | query |  | Return only prompts for this end user. Send an empty string for tenant-level prompts, or leave it out for all prompts. |
| `agentId` | string | query |  | Return only prompts linked to this agent. |
| `cursor` | string | query |  | `nextCursor` from the previous page. |
| `limit` | integer | query |  | Maximum number of prompts to return. 1–100. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. Your tenant's prompts.

Response schema: `PromptList`.

```json
{
  "data": [
    {
      "id": "prompt_5Wn3Hc7TbK2xQv9F",
      "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
      "agentId": "ag_4kP9sT2vXq7LmN3a",
      "name": "Refund reply",
      "template": "Write a short, friendly reply to {{customerName}} about order {{orderId}}.",
      "variables": [
        "customerName",
        "orderId"
      ],
      "userId": "",
      "metadata": {
        "team": "support"
      },
      "createdAt": "2026-07-10T10:00:00.000Z",
      "updatedAt": "2026-07-10T10:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/prompts" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/prompts [#create-prompt]

Create a prompt.

Saves a message template and lists the variables it uses in `variables`.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `name` | string | body | required | Display name, 1 to 80 characters. 1–80 characters. |
| `template` | string | body | required | Message template, up to 10,240 characters. Mark each variable as `{{name}}`; names match `[A-Za-z_][A-Za-z0-9_]*`, and a template can use up to 10 of them. 1–10240 characters. |
| `agentId` | string \| null | body |  | ID of an agent in your tenant to link the prompt to, or `null` for no link. Deleting the agent also deletes its linked prompts. |
| `userId` | string | body |  | Your end user's ID, used for attribution. An empty string means a tenant-level prompt. It cannot change after creation. Defaults to `""`. |
| `metadata` | object | body |  | Your own key-value data, returned unchanged. Defaults to `{}`. |

#### Response

Returns `201 Created` as `application/json`. The created prompt.

Response schema: `Prompt`.

```json
{
  "id": "prompt_5Wn3Hc7TbK2xQv9F",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "agentId": "ag_4kP9sT2vXq7LmN3a",
  "name": "Refund reply",
  "template": "Write a short, friendly reply to {{customerName}} about order {{orderId}}.",
  "variables": [
    "customerName",
    "orderId"
  ],
  "userId": "",
  "metadata": {
    "team": "support"
  },
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/prompts" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"Refund reply","template":"Write a short, friendly reply to {{customerName}} about order {{orderId}}.","agentId":"ag_4kP9sT2vXq7LmN3a","metadata":{"team":"support"}}'
```

### GET /v1/prompts/:promptId [#get-prompt]

Get a prompt.

Retrieves a prompt, including the variables its template uses.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `promptId` | string | path | required | ID of the prompt. |

#### Response

Returns `200 OK` as `application/json`. The prompt.

Response schema: `Prompt`.

```json
{
  "id": "prompt_5Wn3Hc7TbK2xQv9F",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "agentId": "ag_4kP9sT2vXq7LmN3a",
  "name": "Refund reply",
  "template": "Write a short, friendly reply to {{customerName}} about order {{orderId}}.",
  "variables": [
    "customerName",
    "orderId"
  ],
  "userId": "",
  "metadata": {
    "team": "support"
  },
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/prompts/prompt_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PATCH /v1/prompts/:promptId [#update-prompt]

Update a prompt.

Updates a prompt in place; prompts keep no earlier versions. Send at least one field. Fields you leave out keep their values. When the template changes, `variables` reflects the new template.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `promptId` | string | path | required | ID of the prompt. |
| `agentId` | string \| null | body |  | ID of an agent in your tenant to link the prompt to, or `null` for no link. Deleting the agent also deletes its linked prompts. |
| `name` | string | body |  | Display name, 1 to 80 characters. 1–80 characters. |
| `template` | string | body |  | Message template, up to 10,240 characters. Mark each variable as `{{name}}`; names match `[A-Za-z_][A-Za-z0-9_]*`, and a template can use up to 10 of them. 1–10240 characters. |
| `metadata` | object | body |  | Your own key-value data, returned unchanged. Replaces the current value. |

#### Response

Returns `200 OK` as `application/json`. The updated prompt.

Response schema: `Prompt`.

```json
{
  "id": "prompt_5Wn3Hc7TbK2xQv9F",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "agentId": "ag_4kP9sT2vXq7LmN3a",
  "name": "Refund reply",
  "template": "Write a short, friendly reply to {{customerName}} about order {{orderId}}. Mention the refund amount {{amount}}.",
  "variables": [
    "customerName",
    "orderId",
    "amount"
  ],
  "userId": "",
  "metadata": {
    "team": "support"
  },
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:15:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/prompts/prompt_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"template":"Write a short, friendly reply to {{customerName}} about order {{orderId}}. Mention the refund amount {{amount}}."}'
```

### DELETE /v1/prompts/:promptId [#delete-prompt]

Delete a prompt.

Permanently deletes a prompt. Messages already sent with it stay in their transcripts, and later requests that pass its `promptId` return `not_found`.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `promptId` | string | path | required | ID of the prompt. |

#### Response

Returns `204 No Content`. The prompt was deleted.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/prompts/prompt_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Prompts](/agents/prompts) to write and use templates.
- [Generation API](/api-reference/rest-api/generation) to run a prompt without a session.
