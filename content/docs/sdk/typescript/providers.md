---
title: Providers
description: TypeScript SDK Provider CRUD and cost-free model discovery.
---

# Providers

## Overview [#overview]

`client.providers` manages Tenant Provider credentials. Keys are write-only. Provider model discovery makes no inference request and returns only normalized Provider-native IDs.

## Available operations [#available-operations]

| Method | Result |
| --- | --- |
| `create(body)` | `ProviderResponse` |
| `list()` | `ProvidersResponse` |
| `get(id)` | `ProviderResponse` |
| `listModels(id)` | `ProviderModelsResponse` |
| `update(id, body)` | `ProviderResponse` |
| `delete(id, options?)` | `void` |

## Methods [#methods]

### `create()` [#create]

**Signature:** `create(body: CreateProviderBody): Promise<ProviderResponse>`

`body` contains `name`, `providerType`, `apiKey`, and optional `baseUrl`; custom Providers require `baseUrl`. `ProviderType` includes `vercel_ai_gateway`, which accepts only a Vercel AI Gateway key and no `baseUrl` or underlying vendor/routing configuration.

### `list()` [#list]

**Signature:** `list(): Promise<ProvidersResponse>`

### `get()` [#get]

**Signature:** `get(id: string): Promise<ProviderResponse>`

### `listModels()` [#list-models]

**Signature:** `listModels(id: string): Promise<ProviderModelsResponse>`

Fetches a fresh cost-free catalog, returning trimmed, deduplicated, lexically sorted model IDs. Custom Providers raise `model_discovery_unsupported`; unavailable catalogs raise `model_validation_unavailable`.

Gateway discovery is public. Its result proves catalog membership only, not saved-key access, credits, Team policy, routing, or successful inference.

```typescript
const { models } = await client.providers.listModels(providerId);
```

### `update()` [#update]

**Signature:** `update(id: string, body: UpdateProviderBody): Promise<ProviderResponse>`

Only `body.name` is mutable. Provider type, API key, and base URL are immutable; create a replacement Provider to change them.

### `delete()` [#delete]

**Signature:** `delete(id: string, options?: { confirmVersionInvalidation?: boolean }): Promise<void>`

Current Agent references raise `provider_in_use` even when confirmation is true. Historical Versions or explicit Session and Task Pins raise `provider_historical_use` with impact details. Pass `{ confirmVersionInvalidation: true }` to delete the key while preserving immutable history; affected execution and restoration then raise `provider_not_found`.

## Response types [#response-types]

### `ProviderResponse` [#providerresponse]

Contains `id`, `name`, `providerType`, `baseUrl`, `keyFragment`, `createdAt`, and `updatedAt`. `ProviderModelsResponse` is `{ models: Array<{ id: string }> }`.

## Errors [#errors]

SDK failures throw `BlazingAgentsError`. Agent writes using configured Provider/model pairs may return `model_not_found` when a fresh catalog omits the model or `model_validation_unavailable` when validation cannot complete. Custom Provider Agent models are manual and skip catalog validation.

## End-to-end workflow [#end-to-end-workflow]

```typescript
const provider = await client.providers.create({
  name: "OpenAI",
  providerType: "openai",
  baseUrl: null,
  apiKey: process.env.OPENAI_API_KEY!,
});
const { models } = await client.providers.listModels(provider.id);
await client.agents.update(agentId, {
  providerId: provider.id,
  model: models[0].id,
});
```

## Related [#related]

- [REST Providers](/api-reference/rest-api/providers)
- [Models and Providers](/agents/providers-and-models)
