---
title: Providers
description: Store model provider keys, list their models, and check reasoning levels with the Rust SDK.
---

# Providers

`client.providers()` registers the model providers your agents run on. A provider's API key is never returned; responses carry only its `key_fragment`.

Providers are tenant administration: a `UserClient` has no `providers()`. Examples receive a `client: blazing_agents::Client`. Every call also takes the `with_timeout`, `without_timeout`, `with_header`, and `with_client_request_id` transport options.

```rust
use blazing_agents::providers::ProviderType;

let provider = client
    .providers()
    .create(
        "OpenRouter",
        ProviderType::OpenRouter,
        std::env::var("OPENROUTER_API_KEY")?,
    )
    .await?;
println!("{} {}", provider.id, provider.name);
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Register a provider with its API key | [`Provider`](#provider) |
| [`list()`](#list) | List providers | `ProviderList` |
| [`get()`](#get) | Get one provider | [`Provider`](#provider) |
| [`list_models()`](#list-models) | List the models a provider offers | `ProviderModelList` |
| [`get_thinking_levels()`](#get-thinking-levels) | List one model's reasoning levels | `ProviderThinkingLevels` |
| [`update()`](#update) | Rename a provider | [`Provider`](#provider) |
| [`delete()`](#delete) | Delete a provider | `()` |

## Methods [#methods]

### `create()` [#create]

Registers a provider with its API key. The key is never returned.

```rust
use blazing_agents::providers::ProviderType;

let provider = client
    .providers()
    .create(
        "OpenRouter",
        ProviderType::OpenRouter,
        std::env::var("OPENROUTER_API_KEY")?,
    )
    .await?;
```

**Signature:** `create(name: impl Into<String>, provider_type: ProviderType, api_key: impl Into<String>) -> Call<CreateProvider>`

`ProviderType` is `OpenAi`, `Anthropic`, `OpenRouter`, `Google`, `VercelAiGateway`, or `Custom`.

| Setter | Description |
| --- | --- |
| `base_url(base_url)` | The provider's endpoint override. Required for `Custom`, rejected for `VercelAiGateway`, and fixed after creation |

Awaiting returns [`Provider`](#provider). Fails with `Error::Api` whose code is [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`provider_name_conflict`](/api-reference/protocols/errors#provider_name_conflict), or [`provider_limit_reached`](/api-reference/protocols/errors#provider_limit_reached). If a response ever echoes credential material back, the call fails client-side with `Error::CredentialEcho` and the body is discarded.

### `list()` [#list]

Lists providers.

```rust
let providers = client.providers().list().await?.providers;
```

**Signature:** `list() -> Call<ListProviders>`

Awaiting returns `ProviderList` with `providers: Vec<ProviderSummary>` (`id`, `name`, `provider_type`, timestamps) without endpoint or key details.

### `get()` [#get]

Gets one provider.

```rust
let provider = client.providers().get("prv_0123456789abcdef").await?;
```

**Signature:** `get(provider_id: impl Into<ProviderId>) -> Call<GetProvider>`

Awaiting returns [`Provider`](#provider). Fails with `validation_failed` or [`provider_not_found`](/api-reference/protocols/errors#provider_not_found).

### `list_models()` [#list-models]

Lists the models a provider offers.

```rust
let models = client
    .providers()
    .list_models("prv_0123456789abcdef")
    .await?;
for model in &models.models {
    println!("{}", model.id);
}
```

**Signature:** `list_models(provider_id: impl Into<ProviderId>) -> Call<ListProviderModels>`

Awaiting returns `ProviderModelList` with `models: Vec<ProviderModel>` (each with its provider-native `id`, sorted and without duplicates). A `Custom` provider fails with [`model_discovery_unsupported`](/api-reference/protocols/errors#model_discovery_unsupported); a temporarily unavailable catalog fails with [`model_validation_unavailable`](/api-reference/protocols/errors#model_validation_unavailable). Also fails with `validation_failed` or `provider_not_found`.

### `get_thinking_levels()` [#get-thinking-levels]

Lists the thinking levels of one model.

```rust
let levels = client
    .providers()
    .get_thinking_levels("prv_0123456789abcdef", "openai/gpt-6-luna")
    .await?;
if levels.known {
    println!("{:?}", levels.levels);
}
```

**Signature:** `get_thinking_levels(provider_id: impl Into<ProviderId>, model: impl Into<String>) -> Call<ListThinkingLevels>`

Awaiting returns `ProviderThinkingLevels`: `known` says whether the provider knows this model's levels, and `levels` lists the supported ones. When `known` is `false`, Blazing Agents has no data for the model and accepts any string, which the provider can still reject at run time. Fails with `validation_failed` or `provider_not_found`.

### `update()` [#update]

Renames a provider.

```rust
let provider = client
    .providers()
    .update("prv_0123456789abcdef", "OpenRouter main")
    .await?;
```

**Signature:** `update(provider_id: impl Into<ProviderId>, name: impl Into<String>) -> Call<UpdateProvider>`

Only the name can change. To change the type, key, or base URL, create a new provider and move your agents to it. Awaiting returns [`Provider`](#provider). Fails with `validation_failed`, `provider_name_conflict`, or `provider_not_found`.

### `delete()` [#delete]

Deletes a provider.

```rust
client
    .providers()
    .delete("prv_0123456789abcdef")
    .confirm_snapshot_invalidation(true)
    .await?;
```

**Signature:** `delete(provider_id: impl Into<ProviderId>) -> Call<DeleteProvider>`

| Setter | Description |
| --- | --- |
| `confirm_snapshot_invalidation(confirm)` | Confirms that sessions and queued or running task runs with a saved reference to this provider may stop working. It never overrides use by a current agent |

| Code | Meaning |
| --- | --- |
| [`provider_in_use`](/api-reference/protocols/errors#provider_in_use) | A current agent uses it. Move the agent first; confirmation does not override this |
| [`provider_historical_use`](/api-reference/protocols/errors#provider_historical_use) | Saved sessions or queued or running task runs use it. `ApiError::details()` lists them under `sessionIds` and `taskRunIds`. Confirm to delete anyway |

After a confirmed delete, session and task run history remains, but any later turn that needs the provider fails with `provider_not_found`. The delete itself also fails with `validation_failed`, or with `provider_not_found` when the provider does not exist.

## Response models [#response-models]

### `Provider` [#provider]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `ProviderId` | Provider ID (`prv_...`) |
| `name` | `String` | Display name |
| `provider_type` | `ProviderType` | The model vendor |
| `base_url` | `Option<String>` | Endpoint override, if any |
| `key_fragment` | `String` | The last characters of the stored API key |
| `created_at`, `updated_at` | `Timestamp` | Timestamps |

## Next [#next]

- [Providers and models](/agents/providers-and-models)
- [Agents](/sdk/rust/agents)
