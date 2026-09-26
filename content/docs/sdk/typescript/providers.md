---
title: Providers
description: Store model provider keys, list their models, and check reasoning levels with the TypeScript SDK.
---

# Providers

`client.providers` stores the model keys your agents run on. You save a key once as a provider, then point any number of agents at it with `providerId` and a `model`. To choose a provider type and model, read [Providers and models](/agents/providers-and-models).

```typescript
const provider = await client.providers.create({
  name: "OpenRouter",
  providerType: "openrouter",
  baseUrl: null,
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const { models } = await client.providers.listModels({ providerId: provider.id });
console.log(models.some(({ id }) => id === "openai/gpt-6-luna"));
```

Every method takes one input object and accepts an optional `abortSignal`. Blazing Agents never returns a key after you save it; responses show only its last four characters in `keyFragment`.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Save a provider key | `ProviderResponse` |
| [`list()`](#list) | List providers | `ProvidersResponse` |
| [`get()`](#get) | Read one provider | `ProviderResponse` |
| [`listModels()`](#list-models) | List the provider's models | `ProviderModelsResponse` |
| [`getThinkingLevels()`](#get-thinking-levels) | List a model's reasoning levels | `ThinkingLevelsResponse` |
| [`update()`](#update) | Rename a provider | `ProviderResponse` |
| [`delete()`](#delete) | Delete a provider and its key | `void` |

## Methods [#methods]

### `create()` [#create]

Saves a provider key.

**Signature:** `create(input: CreateProviderBody & ResourceRequestOptions): Promise<ProviderResponse>`

```typescript
const provider = await client.providers.create({
  name: "OpenRouter",
  providerType: "openrouter",
  baseUrl: null,
  apiKey: process.env.OPENROUTER_API_KEY!,
});
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | yes | 1 to 80 characters |
| `providerType` | `ProviderType` | yes | `"openai"`, `"anthropic"`, `"openrouter"`, `"google"`, `"vercel_ai_gateway"`, or `"custom"` |
| `apiKey` | `string` | yes | The provider's API key |
| `baseUrl` | `string \| null` | yes | `null` for the provider's standard endpoint; required for `"custom"`; must be `null` for `"vercel_ai_gateway"` |

Use `"custom"` with a `baseUrl` for any other OpenAI-compatible endpoint. The type, key, and base URL cannot change later, so create a new provider to rotate a key. Returns [`ProviderResponse`](#providerresponse). Errors: `validation_failed`.

### `list()` [#list]

Lists your providers.

**Signature:** `list(input?: ResourceRequestOptions): Promise<ProvidersResponse>`

```typescript
const { providers } = await client.providers.list();
```

Returns `{ providers: ProviderListItem[] }`. List items have `id`, `name`, `providerType`, `createdAt`, and `updatedAt`; call [`get()`](#get) for `baseUrl` and `keyFragment`.

### `get()` [#get]

Reads one provider.

**Signature:** `get(input: { providerId: string } & ResourceRequestOptions): Promise<ProviderResponse>`

```typescript
const provider = await client.providers.get({ providerId });
```

Returns [`ProviderResponse`](#providerresponse). Errors: `validation_failed`, `not_found`.

### `listModels()` [#list-models]

Lists the model IDs the provider offers right now. It runs no model and costs nothing.

**Signature:** `listModels(input: { providerId: string } & ResourceRequestOptions): Promise<ProviderModelsResponse>`

```typescript
const { models } = await client.providers.listModels({ providerId });
```

Returns `{ models: Array<{ id: string }> }`, sorted by ID. Pass one of these IDs as an agent's `model`; agent create and update check the model against this same list.

For `"vercel_ai_gateway"`, the list shows what the gateway offers, not what your key can use: credits, team policy, or routing can still make a turn fail. `"custom"` providers raise `model_discovery_unsupported`, and you type the model ID yourself. Errors: `not_found`, `model_discovery_unsupported`, `model_validation_unavailable`.

### `getThinkingLevels()` [#get-thinking-levels]

Lists the reasoning levels a model accepts for an agent's `thinkingLevel`.

**Signature:** `getThinkingLevels(input: { providerId: string; model: string } & ResourceRequestOptions): Promise<ThinkingLevelsResponse>`

```typescript
const { known, levels } = await client.providers.getThinkingLevels({
  providerId,
  model: "openai/gpt-6-luna",
});
if (known && levels.includes("high")) {
  await client.agents.update({ agentId, thinkingLevel: "high" });
}
```

Returns `{ known: boolean; levels: string[] }`. When `known` is `true`, `levels` lists every accepted value, and an empty list means only the provider default (`null`) works. When `known` is `false`, Blazing Agents does not know the model, so any value is accepted but the provider may reject it during a turn. It works for any model ID, including custom providers.

### `update()` [#update]

Renames a provider. The name is the only field you can change.

**Signature:** `update(input: UpdateProviderBody & { providerId: string } & ResourceRequestOptions): Promise<ProviderResponse>`

```typescript
const provider = await client.providers.update({ providerId, name: "OpenRouter production" });
```

Returns [`ProviderResponse`](#providerresponse). Errors: `validation_failed`, `not_found`.

### `delete()` [#delete]

Deletes a provider and its key.

**Signature:** `delete(input: DeleteProviderOptions & { providerId: string } & ResourceRequestOptions): Promise<void>`

```typescript
await client.providers.delete({ providerId, confirmVersionInvalidation: true });
```

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `providerId` | `string` | yes | — | Provider ID (`prv_…`) |
| `confirmVersionInvalidation` | `boolean` | no | `false` | Delete even though old agent versions or pinned sessions and tasks use it |

Deletion fails with `provider_in_use` while any agent's current configuration uses the provider; move those agents first. It fails with `provider_historical_use` when only old versions, pinned sessions, or tasks refer to it; `details` lists them. Pass `confirmVersionInvalidation: true` to delete anyway. History stays readable, but running or restoring those versions then fails with `provider_not_found`.

## Response types [#response-types]

### `ProviderResponse` [#providerresponse]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Provider ID (`prv_…`) |
| `name` | `string` | Provider name |
| `providerType` | `ProviderType` | Provider type |
| `baseUrl` | `string \| null` | Custom endpoint, or `null` |
| `keyFragment` | `string` | The last four characters of the key |
| `createdAt` | `string` | ISO 8601 timestamp |
| `updatedAt` | `string` | ISO 8601 timestamp |

## Errors [#errors]

Failures throw [`BlazingAgentsError`](/sdk/typescript/client#errors). The provider codes:

| Code | Meaning |
| --- | --- |
| `model_discovery_unsupported` | Custom providers have no model list |
| `model_validation_unavailable` | The provider's model list could not be fetched; try again |
| `provider_in_use` | An agent currently uses this provider |
| `provider_historical_use` | Old versions, sessions, or tasks use it; confirm to delete |

## Next [#next]

- [Providers and models](/agents/providers-and-models)
- [Agents reference](/sdk/typescript/agents)
