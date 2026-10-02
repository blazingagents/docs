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

Lists your tenant's providers, most recently updated first. Items leave out the base URL and key fragment; get a single provider to see them.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

There are no parameters and no request body.

#### Response

Returns `200 OK` as `application/json`. Your tenant's providers.

Response schema: `ProviderList`.

```json
{
  "providers": [
    {
      "id": "prv_7Tn4Kd9QwE2sLx5R",
      "name": "Production OpenRouter",
      "providerType": "openrouter",
      "createdAt": "2026-07-10T10:00:00.000Z",
      "updatedAt": "2026-07-10T10:00:00.000Z"
    }
  ]
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/providers" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/providers [#create-provider]

Create a provider.

Stores a model vendor API key for your agents to use. Names are unique within your tenant, and your tenant can hold up to 20 providers. The key is never returned; only its last characters appear as `keyFragment`. Send `baseUrl` for a `custom` provider, and leave it out for `vercel_ai_gateway`. Only the name can change later, so create a new provider to change the type, key, or base URL.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `name` | string | body | required | Display name, unique within your tenant. 1–80 characters. |
| `providerType` | string | body | required | The model vendor. Cannot be changed later. One of `openai`, `anthropic`, `openrouter`, `google`, `vercel_ai_gateway`, `custom`. |
| `baseUrl` | string \| null | body |  | Endpoint override. Required for `custom`, not accepted for `vercel_ai_gateway`, and optional otherwise. Cannot be changed later. Defaults to `null`. |
| `apiKey` | string | body | required | The vendor API key. It is stored encrypted, never returned, and cannot be changed later. |

#### Response

Returns `201 Created` as `application/json`. The created provider.

Response schema: `Provider`.

```json
{
  "id": "prv_7Tn4Kd9QwE2sLx5R",
  "name": "Production OpenRouter",
  "providerType": "openrouter",
  "baseUrl": null,
  "keyFragment": "9f2c",
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`provider_limit_reached`](/api-reference/protocols/errors#provider_limit_reached) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `409` | [`provider_name_conflict`](/api-reference/protocols/errors#provider_name_conflict) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/providers" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"Production OpenRouter","providerType":"openrouter","baseUrl":null,"apiKey":"sk-or-v1-3b7e...9f2c"}'
```

### GET /v1/providers/:id/models [#list-provider-models]

List a provider's models.

Lists the model IDs the provider offers right now, trimmed, deduplicated, and sorted. Listing makes no model call. Vercel AI Gateway uses its public catalog without your key, so a listed model does not prove your key can use it. Custom providers do not support listing. Creating or updating an agent checks its model against this same list.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the provider. |

#### Response

Returns `200 OK` as `application/json`. The provider's model IDs.

Response schema: `ProviderModelList`.

```json
{
  "models": [
    {
      "id": "openai/gpt-6-luna"
    }
  ]
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`provider_not_found`](/api-reference/protocols/errors#provider_not_found) | The resource was not found |
| `422` | [`model_discovery_unsupported`](/api-reference/protocols/errors#model_discovery_unsupported) | The request was understood but rejected |
| `503` | [`model_validation_unavailable`](/api-reference/protocols/errors#model_validation_unavailable) | The service is temporarily unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/providers/prv_1234567890ABCDEF/models" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/providers/:id/thinking-levels [#list-thinking-levels]

List a model's thinking levels.

Lists the thinking levels a model supports on this provider. It works for model IDs you typed yourself and for custom providers. `known` is `false`, with no levels, when the model's capabilities cannot be looked up. A known empty list means only the provider's default is available.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the provider. |
| `model` | string | query | required | The provider's own model ID. |

#### Response

Returns `200 OK` as `application/json`. The model's supported thinking levels.

Response schema: `ProviderThinkingLevels`.

```json
{
  "known": true,
  "levels": [
    "off",
    "low",
    "medium",
    "high"
  ]
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`provider_not_found`](/api-reference/protocols/errors#provider_not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/providers/prv_1234567890ABCDEF/thinking-levels?model=openai%2Fgpt-6-luna" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/providers/:id [#get-provider]

Get a provider.

Returns a provider, including its base URL and `keyFragment`, the last characters of its key. The key itself is never returned.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the provider. |

#### Response

Returns `200 OK` as `application/json`. The provider.

Response schema: `Provider`.

```json
{
  "id": "prv_7Tn4Kd9QwE2sLx5R",
  "name": "Production OpenRouter",
  "providerType": "openrouter",
  "baseUrl": null,
  "keyFragment": "9f2c",
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
| `404` | [`provider_not_found`](/api-reference/protocols/errors#provider_not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/providers/prv_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PATCH /v1/providers/:id [#update-provider]

Rename a provider.

Renames a provider. Only `name` can change. To rotate a key or change the type or base URL, create a new provider, point your agents at it, then delete the old one.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the provider. |
| `name` | string | body | required | New display name, unique within your tenant. 1–80 characters. |

#### Response

Returns `200 OK` as `application/json`. The renamed provider.

Response schema: `Provider`.

```json
{
  "id": "prv_7Tn4Kd9QwE2sLx5R",
  "name": "Primary OpenRouter",
  "providerType": "openrouter",
  "baseUrl": null,
  "keyFragment": "9f2c",
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:05:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`provider_not_found`](/api-reference/protocols/errors#provider_not_found) | The resource was not found |
| `409` | [`provider_name_conflict`](/api-reference/protocols/errors#provider_name_conflict) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/providers/prv_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"Primary OpenRouter"}'
```

### DELETE /v1/providers/:id [#delete-provider]

Delete a provider.

Deletes a provider and its key. While a current agent uses the provider, deletion fails with `provider_in_use` and the agent IDs in `details.agentIds`; point those agents at another provider first. When saved session or task run configurations use it, deletion fails with `provider_historical_use` and their IDs in `details`, unless you send `confirmSnapshotInvalidation=true`.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the provider. |
| `confirmSnapshotInvalidation` | string | query |  | `true` confirms that sessions and queued or running task runs with a saved reference to this provider may stop working. It never overrides use by a current agent. One of `true`, `false`. Defaults to `false`. |

#### Response

Returns `204 No Content`. The provider was deleted.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`provider_not_found`](/api-reference/protocols/errors#provider_not_found) | The resource was not found |
| `409` | [`provider_in_use`](/api-reference/protocols/errors#provider_in_use), [`provider_historical_use`](/api-reference/protocols/errors#provider_historical_use) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/providers/prv_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Providers and models](/agents/providers-and-models) to choose a provider and model.
- [Agents API](/api-reference/rest-api/agents#create-agent) to use the provider in an agent.
