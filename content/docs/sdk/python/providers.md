---
title: Providers
description: Store model provider keys, list their models, and check reasoning levels with the Python SDK.
---

# Providers

`client.providers` stores the model provider keys your agents run on. You send a key once; Blazing Agents keeps it and never returns it. You can then list the provider's models and check which reasoning levels a model supports, without running the model.

Examples assume `client = BlazingAgents()`. Every method also accepts `extra_headers` and `timeout`. On `AsyncBlazingAgents`, await the same method names.

```python
import os

provider = client.providers.create(
    name="OpenRouter",
    provider_type="openrouter",
    api_key=os.environ["OPENROUTER_API_KEY"],
)
models = client.providers.list_models(provider.id).models
print([model.id for model in models][:5])
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Store a provider key | `Provider` |
| [`list()`](#list) | List providers | `Providers` |
| [`get()`](#get) | Get one provider | `Provider` |
| [`list_models()`](#list-models) | List the provider's model IDs | `ProviderModels` |
| [`get_thinking_levels()`](#get-thinking-levels) | List a model's reasoning levels | `ThinkingLevels` |
| [`update()`](#update) | Rename a provider | `Provider` |
| [`delete()`](#delete) | Delete a provider and its key | `None` |

## Methods [#methods]

### `create()` [#create]

Stores a provider key under a name.

```python
provider = client.providers.create(
    name="Internal gateway",
    provider_type="custom",
    api_key=os.environ["GATEWAY_API_KEY"],
    base_url="https://llm.example.com/v1",
)
```

**Signature:** `create(*, name: str, provider_type: ProviderType, api_key: str, base_url=...) -> Provider`

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `str` | Display name, 1 to 80 characters |
| `provider_type` | `ProviderType` | `"openai"`, `"anthropic"`, `"openrouter"`, `"google"`, `"vercel_ai_gateway"`, or `"custom"` |
| `api_key` | `str` | The provider's API key. Never returned |
| `base_url` | `str \| None` | Required for `"custom"`; not accepted for `"vercel_ai_gateway"` |

A missing `base_url` for `"custom"` or a non-`None` `base_url` for `"vercel_ai_gateway"` raises `ValueError` before any request. Never log `api_key`.

Returns [`Provider`](#provider). Raises `APIStatusError` with `validation_failed`.

### `list()` [#list]

Lists your providers.

```python
providers = client.providers.list().providers
```

**Signature:** `list() -> Providers`

Returns `Providers`, whose `providers` field is a list of `ProviderListItem` with `id`, `name`, `provider_type`, `created_at`, and `updated_at`. Use [`get()`](#get) for the base URL and key fragment.

### `get()` [#get]

Gets one provider.

```python
provider = client.providers.get(provider.id)
print(provider.key_fragment)
```

**Signature:** `get(provider_id: str) -> Provider`

Returns [`Provider`](#provider). Raises `validation_failed` or `not_found`.

### `list_models()` [#list-models]

Lists the model IDs the provider offers. This never runs a model and costs nothing.

```python
ids = [model.id for model in client.providers.list_models(provider.id).models]
```

**Signature:** `list_models(provider_id: str) -> ProviderModels`

Returns `ProviderModels`, whose `models` field lists `ProviderModel` items with an `id`, sorted and without duplicates. Use an `id` as the agent's `model`.

A listed model is not a guarantee that your key can use it: credits, account policy, or routing can still reject a request. `"custom"` providers raise `model_discovery_unsupported`; type their model IDs yourself. A temporarily unavailable catalog raises `model_validation_unavailable`.

### `get_thinking_levels()` [#get-thinking-levels]

Lists the reasoning levels one model supports, for an agent's `thinking_level`.

```python
levels = client.providers.get_thinking_levels(provider.id, model="openai/gpt-6-luna")
if levels.known and "high" in levels.levels:
    client.agents.update("ag_0123456789abcdef", thinking_level="high")
```

**Signature:** `get_thinking_levels(provider_id: str, *, model: str) -> ThinkingLevels`

Returns `ThinkingLevels` with `known: bool` and `levels: list[str]`. When `known` is `True`, only the listed levels are accepted, and an empty list means the model supports only the provider default (`thinking_level=None`). When `known` is `False`, Blazing Agents has no data for the model and accepts any string, which the provider can still reject at run time.

### `update()` [#update]

Renames a provider.

```python
provider = client.providers.update(provider.id, name="OpenRouter production")
```

**Signature:** `update(provider_id: str, *, name=...) -> Provider`

Only the name can change. To change the type, key, or base URL, create a new provider and move your agents to it. Calling `update()` without `name` raises `ValueError` before any request. Returns [`Provider`](#provider).

### `delete()` [#delete]

Deletes a provider and its stored key.

```python
client.providers.delete(provider.id, confirm_version_invalidation=True)
```

**Signature:** `delete(provider_id: str, *, confirm_version_invalidation: bool = False) -> None`

| Code | Meaning |
| --- | --- |
| `provider_in_use` | A current agent uses it. Move the agent first; confirmation does not override this |
| `provider_historical_use` | Old agent versions or pinned sessions and tasks use it. `error.details` lists them. Pass `confirm_version_invalidation=True` to delete anyway |

After a confirmed delete, history is kept, but running or restoring anything that needs the provider raises `provider_not_found`.

## Response models [#response-models]

### `Provider` [#provider]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `str` | Provider ID (`prv_...`) |
| `name` | `str` | Display name |
| `provider_type` | `str` | Provider type |
| `base_url` | `str \| None` | Base URL, for custom providers |
| `key_fragment` | `str` | Short, non-secret fragment of the key, to help you recognize it |
| `created_at`, `updated_at` | `datetime` | Timestamps |

## Next [#next]

- [Providers and models](/agents/providers-and-models)
- [Agents](/sdk/python/agents)
- [Run your first agent](/getting-started/quickstart)
