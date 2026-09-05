---
title: Providers
description: Python SDK Provider CRUD and cost-free model discovery.
---

# Providers

## Overview [#overview]

`client.providers` and `async_client.providers` manage Tenant Provider credentials. Keys are write-only and model discovery never invokes inference.

## Available operations [#available-operations]

| Method | Result |
| --- | --- |
| `create(...)` | `Provider` |
| `list()` | `Providers` |
| `get(provider_id)` | `Provider` |
| `list_models(provider_id)` | `ProviderModels` |
| `update(provider_id, name=...)` | `Provider` |
| `delete(provider_id, confirm_version_invalidation=...)` | `None` |

## Methods [#methods]

### `create()` [#create]

**Signature:** `create(*, name: str, provider_type: ProviderType, api_key: str, base_url: str | None = ...) -> Provider`

Custom Providers require `base_url`. `ProviderType` includes `"vercel_ai_gateway"`, which accepts only a Vercel AI Gateway key and no `base_url` or underlying vendor/routing configuration.

### `list()` [#list]

**Signature:** `list() -> Providers`

### `get()` [#get]

**Signature:** `get(provider_id: str) -> Provider`

### `list_models()` [#list-models]

**Signature:** `list_models(provider_id: str) -> ProviderModels`

Returns fresh trimmed, unique, sorted Provider-native IDs. Custom Providers raise `model_discovery_unsupported`; unavailable catalogs raise `model_validation_unavailable`.

Gateway discovery uses the public catalog. Membership does not prove saved-key access, credits, Team policy, routing, or successful inference.

### `update()` [#update]

**Signature:** `update(provider_id: str, *, name: str = ...) -> Provider`

Only the display name is mutable. Provider type, API key, and base URL require Provider replacement.

### `delete()` [#delete]

**Signature:** `delete(provider_id: str, *, confirm_version_invalidation: bool = False) -> None`

Current Agent references raise `provider_in_use` even when confirmation is true. Historical Versions or explicit Session and Task Pins raise `provider_historical_use` with impact details. Set `confirm_version_invalidation=True` to delete the key while preserving immutable history; affected execution and restoration then raise `provider_not_found`.

## Response models [#response-models]

### `Provider` [#provider]

Contains `id`, `name`, `provider_type`, `base_url`, `key_fragment`, `created_at`, and `updated_at`. `ProviderModels.models` is `list[ProviderModel]`, containing only Provider-native IDs.

## Errors and secrets [#errors-and-secrets]

API failures raise `APIStatusError`. Configured Agent writes may return `model_not_found` or `model_validation_unavailable`. Custom Provider model IDs remain manual and skip catalog validation. Never log `api_key`.

## Related [#related]

- [REST Providers](/api-reference/rest-api/providers)
- [TypeScript Providers](/sdk/typescript/providers)

## `get_thinking_levels()` [#get-thinking-levels]

`get_thinking_levels(provider_id: str, model: str) -> ThinkingLevels`
returns `known: bool` and `levels: list[str]` for an exact native Model ID.
The same method is available on the async client. Unknown metadata permits a
custom string; a known empty list permits only Provider default (`None`).

```python
capabilities = client.providers.get_thinking_levels(provider.id, model=model)
client.agents.update(agent_id, thinking_level="high")
client.agents.update(agent_id, thinking_level=None)
```
