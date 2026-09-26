---
title: Providers
description: Store model provider keys and discover the models each provider offers.
---

# Providers

## Overview [#overview]

A provider stores the API key your agents use to call a model vendor such as OpenRouter. Blazing Agents encrypts the key and never returns it. List a provider's models to pick an ID for your agent; listing makes no model call, and the same list checks the model whenever you configure an agent.

## Endpoints [#endpoints]

### POST /v1/providers [#create-provider]

Creates a provider in your tenant.

#### Request

| Body field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes | Unique display name, 1–80 characters |
| `providerType` | string | yes | `openai`, `anthropic`, `openrouter`, `google`, `vercel_ai_gateway`, or `custom` |
| `baseUrl` | string \| null | no | Endpoint override; required for `custom`, not accepted for `vercel_ai_gateway` |
| `apiKey` | string | yes | Write-only Provider key |

#### Response

Returns `201 Created` with the provider. The key is never returned; only its last characters appear as `keyFragment`.

Response schema: [`providerResponseSchema`](/api-reference/protocols/objects-and-schemas#provider-response).

```json
{
  "id": "prv_1234567890ABCDEF",
  "name": "Production OpenRouter",
  "providerType": "openrouter",
  "baseUrl": null,
  "keyFragment": "wxyz",
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

Errors include `validation_failed`, `provider_name_conflict`, and `provider_limit_reached`.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/providers" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"Production OpenRouter","providerType":"openrouter","baseUrl":null,"apiKey":"'"$OPENROUTER_API_KEY"'"}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/providers#create), [Python](/sdk/python/providers#create).

### GET /v1/providers [#list-providers]

Lists your tenant's providers. Keys are never returned.

#### Request

Requires bearer authentication. There are no path, query, or body parameters.

#### Response

Returns `200 OK` with list items containing only `id`, `name`, `providerType`, `createdAt`, and `updatedAt`. Get a single provider for its base URL and key fragment.

Response schema: [`providersResponseSchema`](/api-reference/protocols/objects-and-schemas#providers-response).

```json
{
  "providers": [
    {
      "id": "prv_1234567890ABCDEF",
      "name": "Production OpenRouter",
      "providerType": "openrouter",
      "createdAt": "2026-07-10T10:00:00Z",
      "updatedAt": "2026-07-10T10:00:00Z"
    }
  ]
}
```

#### Errors

Standard authentication and service errors apply.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/providers" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/providers#list), [Python](/sdk/python/providers#list).

### GET /v1/providers/:id [#get-provider]

Returns one provider without its key, or `404 provider_not_found` when it is missing or in another tenant.

#### Request

Requires bearer authentication and a Provider `id` path parameter.

#### Response

Returns `200 OK` with one provider.

Response schema: [`providerResponseSchema`](/api-reference/protocols/objects-and-schemas#provider-response).

```json
{
  "id": "prv_1234567890ABCDEF",
  "name": "Production OpenRouter",
  "providerType": "openrouter",
  "baseUrl": null,
  "keyFragment": "wxyz",
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

Malformed IDs return `validation_failed`; missing or foreign Providers return `provider_not_found`.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/providers/prv_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/providers#get), [Python](/sdk/python/providers#get).

### GET /v1/providers/:id/models [#list-provider-models]

Lists the models the provider offers right now, without calling a model. IDs are trimmed, deduplicated, and sorted.

Vercel AI Gateway uses its public catalog without your saved key. A listed ID only means the model is in the catalog. It does not prove your key can use it, that you have credits, or that a request will succeed.

#### Request

Requires bearer authentication and a Provider `id` path parameter.

#### Response

Returns `200 OK` with the provider's model IDs.

Response schema: [`providerModelsResponseSchema`](/api-reference/protocols/objects-and-schemas#provider-models-response).

```json
{ "models": [{ "id": "openai/gpt-5-mini" }, { "id": "openai/gpt-6-luna" }] }
```

#### Errors

Returns `422 model_discovery_unsupported` for `custom`. If the vendor rejects the key, is unreachable, or returns something unreadable, you get `503 model_validation_unavailable`; the vendor's response is not passed through.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/providers/prv_1234567890ABCDEF/models" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

Blazing Agents checks the same list whenever you create an agent, change its model or provider, or restore a version. If the model is not in the list, the write returns `400 model_not_found`. Custom providers skip this check, so you type their model IDs yourself.

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/providers#list-models), [Python](/sdk/python/providers#list-models).

### PATCH /v1/providers/:id [#update-provider]

Renames a provider. Only `name` can change; create a new provider to change its type, API key, or base URL.

#### Request

Requires bearer authentication, a Provider `id`, and JSON containing `name`.

#### Response

Returns `200 OK` with the renamed Provider.

Response schema: [`providerResponseSchema`](/api-reference/protocols/objects-and-schemas#provider-response).

```json
{
  "id": "prv_1234567890ABCDEF",
  "name": "Primary OpenRouter",
  "providerType": "openrouter",
  "baseUrl": null,
  "keyFragment": "wxyz",
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:05:00Z"
}
```

#### Errors

Errors include `validation_failed`, `provider_name_conflict`, and `provider_not_found`.

#### cURL

```bash
curl --request PATCH \
  "$BLAZING_AGENTS_BASE_URL/v1/providers/prv_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"Primary OpenRouter"}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/providers#update), [Python](/sdk/python/providers#update).

### DELETE /v1/providers/:id [#delete-provider]

Deletes a provider and its key. You cannot delete a provider an agent uses now; one used by older versions or pins needs your confirmation.

#### Request

Requires bearer authentication and a Provider `id` path parameter. Optional query `confirmVersionInvalidation=true` confirms that pinned sessions, tasks, and version restores that use this provider may stop working. It never overrides use by a current agent.

#### Response

Returns `204 No Content` with an empty body.

#### Errors

Use by a current agent returns `provider_in_use` with `details.agentIds`. Use by older versions returns `provider_historical_use` with `details.agentVersions`, `details.sessionIds`, and `details.taskIds`. A missing provider, or one in another tenant, returns `provider_not_found`.

#### cURL

```bash
curl --request DELETE \
  "$BLAZING_AGENTS_BASE_URL/v1/providers/prv_1234567890ABCDEF?confirmVersionInvalidation=true" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/providers#delete), [Python](/sdk/python/providers#delete).

## GET /v1/providers/:id/thinking-levels [#get-thinking-levels]

Lists the thinking levels a model supports. Requires bearer authentication and
the `model` query parameter, the provider's own model ID. Returns `200 OK` with
`{ "known": true, "levels": ["off", "low", "medium", "high"] }`, or
`{ "known": false, "levels": [] }` when capabilities cannot be discovered.
A known empty list means only the provider's default is available. It works
for model IDs you typed yourself and for custom providers. A provider you
cannot reach returns `provider_not_found`, and invalid input returns
`validation_failed`. If the capabilities cannot be looked up, you get
`known: false`. See [Thinking level](/agents/providers-and-models#thinking-level)
for how levels are chosen.

## Next [#next]

- [Providers and models](/agents/providers-and-models) to choose a provider and model.
- [Agents API](/api-reference/rest-api/agents#create-agent) to use the provider in an agent.
