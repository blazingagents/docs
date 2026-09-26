---
title: Providers
description: Store model provider keys and discover the models each provider offers.
---

# Providers

## Overview [#overview]

A provider stores the API key your agents use to call a model vendor such as OpenRouter. Blazing Agents encrypts the key and never returns it. List a provider's models to pick an ID for your agent; listing makes no model call, and the same list checks the model whenever you configure an agent.

List a model's thinking levels to see which `thinkingLevel` values an agent
can use with it. `known: false` means the capabilities could not be looked up;
a known empty list means only the provider's default is available. See
[Thinking level](/agents/providers-and-models#thinking-level) for how levels
are chosen.

## Endpoints [#endpoints]

### GET /v1/providers [#list-providers]

List providers.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

There are no parameters and no request body.

#### Response

Returns `200 OK` as `application/json`. The tenant's providers.

Response schema: `ProviderList`.

```json
{
  "providers": [
    {
      "id": "prv_1234567890ABCDEF",
      "name": "string",
      "providerType": "openai",
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
curl "$BLAZING_AGENTS_BASE_URL/v1/providers" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/providers [#create-provider]

Create a provider.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `name` | string | body | required | 1–80 characters. |
| `providerType` | string | body | required | One of `openai`, `anthropic`, `openrouter`, `google`, `vercel_ai_gateway`, `custom`. |
| `baseUrl` | string \| null | body |  | Defaults to `null`. |
| `apiKey` | string | body | required |  |

#### Response

Returns `201 Created` as `application/json`. The created provider.

Response schema: `Provider`.

```json
{
  "id": "prv_1234567890ABCDEF",
  "name": "string",
  "providerType": "openai",
  "baseUrl": "https://example.com",
  "keyFragment": "string",
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
| `409` |  | Provider name already exists |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/providers" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"string","providerType":"openai","apiKey":"string"}'
```

### GET /v1/providers/:id/models [#list-provider-models]

List a provider's models.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | `prv_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The provider's model ids.

Response schema: `ProviderModelList`.

```json
{
  "models": [
    {
      "id": "string"
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
curl "$BLAZING_AGENTS_BASE_URL/v1/providers/prv_1234567890ABCDEF/models" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/providers/:id/thinking-levels [#list-thinking-levels]

List a model's thinking levels.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | `prv_…` ID. |
| `model` | string | query | required |  |

#### Response

Returns `200 OK` as `application/json`. The model's supported thinking levels.

Response schema: `ProviderThinkingLevels`.

```json
{
  "known": true,
  "levels": [
    "string"
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
curl "$BLAZING_AGENTS_BASE_URL/v1/providers/prv_1234567890ABCDEF/thinking-levels?model=openai%2Fgpt-6-luna" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/providers/:id [#get-provider]

Get a provider.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | `prv_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The provider.

Response schema: `Provider`.

```json
{
  "id": "prv_1234567890ABCDEF",
  "name": "string",
  "providerType": "openai",
  "baseUrl": "https://example.com",
  "keyFragment": "string",
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
curl "$BLAZING_AGENTS_BASE_URL/v1/providers/prv_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PATCH /v1/providers/:id [#update-provider]

Update a provider's name.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | `prv_…` ID. |
| `name` | string | body | required | 1–80 characters. |

#### Response

Returns `200 OK` as `application/json`. The updated provider.

Response schema: `Provider`.

```json
{
  "id": "prv_1234567890ABCDEF",
  "name": "string",
  "providerType": "openai",
  "baseUrl": "https://example.com",
  "keyFragment": "string",
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
| `409` |  | Provider name already exists |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/providers/prv_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"string"}'
```

### DELETE /v1/providers/:id [#delete-provider]

Delete a provider.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | `prv_…` ID. |
| `confirmVersionInvalidation` | string | query |  | One of `true`, `false`. Defaults to `false`. |

#### Response

Returns `204 No Content`. Deleted.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |
| `409` |  | Provider is still in use by agents |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/providers/prv_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Providers and models](/agents/providers-and-models) to choose a provider and model.
- [Agents API](/api-reference/rest-api/agents#create-agent) to use the provider in an agent.
