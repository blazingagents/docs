---
title: Providers
description: Manage Tenant Provider credentials and discover Provider-native models.
---

# Providers

## Overview [#overview]

Providers store Tenant model credentials and endpoint configuration. API keys are encrypted and write-only. Model discovery returns only normalized IDs, makes no inference request, and is reused to validate configured Agent writes.

## Endpoints [#endpoints]

### POST /v1/providers [#create-provider]

Creates a Provider. The authenticated credential selects the Tenant boundary.

#### Request

| Body field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes | Unique display name, 1–80 characters |
| `providerType` | string | yes | `openai`, `anthropic`, `openrouter`, `google`, `vercel_ai_gateway`, or `custom` |
| `baseUrl` | string \| null | no | Endpoint override; required for `custom`, not accepted for `vercel_ai_gateway` |
| `apiKey` | string | yes | Write-only Provider key |

#### Response

Returns `201 Created` with the redacted Provider.

Response schema: [`providerResponseSchema`](/api-reference/protocols/objects-and-schemas#provider-response).

```json
{
  "id": "prv_1234567890ABCDEF",
  "name": "Production OpenAI",
  "providerType": "openai",
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
  --data '{"name":"Production OpenAI","providerType":"openai","baseUrl":null,"apiKey":"'"$PROVIDER_API_KEY"'"}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/providers#create), [Python](/sdk/python/providers#create).

### GET /v1/providers [#list-providers]

Lists the authenticated Tenant's Providers with keys redacted. Returns `200` with [`providersResponseSchema`](/api-reference/protocols/objects-and-schemas#providers-response).

#### Request

Requires bearer authentication. There are no path, query, or body parameters.

#### Response

Returns `200 OK` with the redacted Provider collection.

Response schema: [`providersResponseSchema`](/api-reference/protocols/objects-and-schemas#providers-response).

```json
{
  "providers": [
    {
      "id": "prv_1234567890ABCDEF",
      "name": "Production OpenAI",
      "providerType": "openai",
      "baseUrl": null,
      "keyFragment": "wxyz",
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

Returns one redacted Provider or `404 provider_not_found` when it is missing or foreign.

#### Request

Requires bearer authentication and a Provider `id` path parameter.

#### Response

Returns `200 OK` with one redacted Provider.

Response schema: [`providerResponseSchema`](/api-reference/protocols/objects-and-schemas#provider-response).

```json
{
  "id": "prv_1234567890ABCDEF",
  "name": "Production OpenAI",
  "providerType": "openai",
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

Fetches the current Provider catalog without inference. IDs are trimmed, deduplicated, and lexically sorted.

Vercel AI Gateway uses its public catalog without the saved key. A returned ID proves only catalog membership, not key access, credits, Team policy, routing, or successful inference.

#### Request

Requires bearer authentication and a Provider `id` path parameter.

#### Response

Returns `200 OK` with the Provider-native model catalog.

Response schema: [`providerModelsResponseSchema`](/api-reference/protocols/objects-and-schemas#provider-models-response).

```json
{ "models": [{ "id": "gpt-4.1" }, { "id": "gpt-5-mini" }] }
```

#### Errors

Returns `422 model_discovery_unsupported` for `custom`. Authentication, availability, network, and invalid-response failures return `503 model_validation_unavailable` without exposing credentials or vendor payloads.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/providers/prv_1234567890ABCDEF/models" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

The dashboard uses this same operation after Provider selection. Agent creation, model changes, complete Provider/model replacement, and Version restoration query a fresh catalog before writing. A completed catalog that omits the configured model returns `400 model_not_found`. Custom Provider IDs remain manual and skip catalog validation.

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/providers#list-models), [Python](/sdk/python/providers#list-models).

### PATCH /v1/providers/:id [#update-provider]

Renames a Provider. Only `name` is mutable; replace the Provider to change its type, API key, or base URL.

#### Request

Requires bearer authentication, a Provider `id`, and JSON containing `name`.

#### Response

Returns `200 OK` with the renamed Provider.

Response schema: [`providerResponseSchema`](/api-reference/protocols/objects-and-schemas#provider-response).

```json
{
  "id": "prv_1234567890ABCDEF",
  "name": "Primary OpenAI",
  "providerType": "openai",
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
  --data '{"name":"Primary OpenAI"}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/providers#update), [Python](/sdk/python/providers#update).

### DELETE /v1/providers/:id [#delete-provider]

Deletes a Provider and encrypted key. Current Agent references return `provider_in_use`; historical Versions or Pins require explicit confirmation.

#### Request

Requires bearer authentication and a Provider `id` path parameter. Optional query `confirmVersionInvalidation=true` confirms that affected historical execution and restoration may stop. It never overrides a current Agent reference.

#### Response

Returns `204 No Content` with an empty body.

#### Errors

Current Agent references return `provider_in_use` with `details.agentIds`. Historical references return `provider_historical_use` with `details.agentVersions`, `details.sessionIds`, and `details.taskIds`. Missing or foreign Providers return `provider_not_found`.

#### cURL

```bash
curl --request DELETE \
  "$BLAZING_AGENTS_BASE_URL/v1/providers/prv_1234567890ABCDEF?confirmVersionInvalidation=true" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/providers#delete), [Python](/sdk/python/providers#delete).

## Related [#related]

- [Models and Providers](/agents/providers-and-models)
- [TypeScript SDK](/sdk/typescript/providers)
- [Python SDK](/sdk/python/providers)
- [Objects and schemas](/api-reference/protocols/objects-and-schemas)
- [Errors](/api-reference/protocols/errors)

## GET /v1/providers/:id/thinking-levels [#get-thinking-levels]

Requires Tenant bearer authentication and the required query parameter
`model`, a nonempty Provider-native Model ID. Returns `200 OK` with
`{ "known": true, "levels": ["off", "low", "medium", "high"] }`, or
`{ "known": false, "levels": [] }` when capabilities cannot be discovered.
A known empty list means only Provider default is available. This endpoint
supports manual IDs and custom Providers without a model-listing request.
An inaccessible Provider returns `provider_not_found`; invalid input returns
`validation_failed`. Optional capability discovery failures return unknown.
See [Thinking level](/agents/providers-and-models#thinking-level) for Pi
precedence, cache scope, and independent model-access checks.
