---
title: Providers
description: Store model provider keys, list their models, and check reasoning levels with the Go SDK.
---

# Providers

`client.Providers` registers the model providers your agents run on. A provider's API key is never returned; responses carry only its `KeyFragment`.

Providers are tenant administration: a `*ba.UserClient` has no `Providers`. Examples are function bodies that receive `ctx context.Context`, `client *ba.Client`, `agentID ba.AgentID`, and `sessionID ba.SessionID`, and return an `error`. Every method also takes the per-call options `ba.WithRequestTimeout`, `ba.WithRequestHeader`, `ba.WithClientRequestID`, and `ba.CaptureResponse`.

```go
provider, err := client.Providers.Create(ctx, ba.CreateProviderParams{
	Name:         "OpenRouter",
	ProviderType: ba.ProviderTypeOpenRouter,
	APIKey:       ba.NewSecret(os.Getenv("OPENROUTER_API_KEY")),
})
if err != nil {
	return err
}
fmt.Println(provider.ID, provider.Name)
return nil
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`Create`](#create) | Register a provider with its API key | [`*Provider`](#provider) |
| [`List`](#list) | List providers | `[]ProviderSummary` |
| [`Get`](#get) | Get one provider | [`*Provider`](#provider) |
| [`ListModels`](#list-models) | List the models a provider offers | `[]ProviderModel` |
| [`ThinkingLevels`](#get-thinking-levels) | List one model's reasoning levels | `*ProviderThinkingLevels` |
| [`Update`](#update) | Rename a provider | [`*Provider`](#provider) |
| [`Delete`](#delete) | Delete a provider | `error` |

## Methods [#methods]

### `Create` [#create]

Registers a provider with its API key. The key is never returned.

```go
provider, err := client.Providers.Create(ctx, ba.CreateProviderParams{
	Name:         "OpenRouter",
	ProviderType: ba.ProviderTypeOpenRouter,
	APIKey:       ba.NewSecret(os.Getenv("OPENROUTER_API_KEY")),
})
if err != nil {
	return err
}
fmt.Println(provider.KeyFragment)
return nil
```

**Signature:** `func (s *ProvidersService) Create(ctx context.Context, params CreateProviderParams, opts ...RequestOption) (*Provider, error)`

| Field | Type | Description |
| --- | --- | --- |
| `Name` | `string` | Display name, unique in your tenant |
| `ProviderType` | `ba.ProviderType` | `ba.ProviderTypeOpenAI`, `ba.ProviderTypeAnthropic`, `ba.ProviderTypeOpenRouter`, `ba.ProviderTypeGoogle`, `ba.ProviderTypeVercelAIGateway`, or `ba.ProviderTypeCustom` |
| `APIKey` | `ba.Secret` | The provider's API key, wrapped with `ba.NewSecret` |
| `BaseURL` | `ba.Nullable[string]` | The provider's endpoint override. Required for a custom provider, rejected for the Vercel AI Gateway, and fixed after creation |

A `ba.Secret` prints as `[redacted]` through every `fmt` verb, `log/slog`, and `encoding/json`, so the key cannot leak into logs; `Reveal()` returns the value. Returns [`*ba.Provider`](#provider). Fails with `*ba.APIError` whose `Code` is [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`provider_name_conflict`](/api-reference/protocols/errors#provider_name_conflict), or [`provider_limit_reached`](/api-reference/protocols/errors#provider_limit_reached). If a response ever echoes credential material back, the call fails client-side with `*ba.CredentialEchoError` and the body is discarded.

### `List` [#list]

Lists providers.

```go
providers, err := client.Providers.List(ctx)
if err != nil {
	return err
}
for _, provider := range providers {
	fmt.Println(provider.ID, provider.Name)
}
return nil
```

**Signature:** `func (s *ProvidersService) List(ctx context.Context, opts ...RequestOption) ([]ProviderSummary, error)`

Returns every `ba.ProviderSummary` (`ID`, `Name`, `ProviderType`, timestamps) without endpoint or key details.

### `Get` [#get]

Gets one provider.

```go
provider, err := client.Providers.Get(ctx, "prv_0123456789abcdef")
if err != nil {
	return err
}
fmt.Println(provider.Name)
return nil
```

**Signature:** `func (s *ProvidersService) Get(ctx context.Context, providerID ProviderID, opts ...RequestOption) (*Provider, error)`

Returns [`*ba.Provider`](#provider). Fails with `validation_failed` or [`provider_not_found`](/api-reference/protocols/errors#provider_not_found).

### `ListModels` [#list-models]

Lists the models a provider offers.

```go
models, err := client.Providers.ListModels(ctx, "prv_0123456789abcdef")
if err != nil {
	return err
}
for _, model := range models {
	fmt.Println(model.ID)
}
return nil
```

**Signature:** `func (s *ProvidersService) ListModels(ctx context.Context, providerID ProviderID, opts ...RequestOption) ([]ProviderModel, error)`

Returns every `ba.ProviderModel`, each with its provider-native `ID`, sorted and without duplicates. A custom provider fails with [`model_discovery_unsupported`](/api-reference/protocols/errors#model_discovery_unsupported); a temporarily unavailable catalog fails with [`model_validation_unavailable`](/api-reference/protocols/errors#model_validation_unavailable). Also fails with `validation_failed` or `provider_not_found`.

### `ThinkingLevels` [#get-thinking-levels]

Lists the thinking levels of one model.

```go
levels, err := client.Providers.ThinkingLevels(ctx, "prv_0123456789abcdef", "openai/gpt-6-luna")
if err != nil {
	return err
}
if levels.Known {
	fmt.Println(levels.Levels)
}
return nil
```

**Signature:** `func (s *ProvidersService) ThinkingLevels(ctx context.Context, providerID ProviderID, model string, opts ...RequestOption) (*ProviderThinkingLevels, error)`

Returns `*ba.ProviderThinkingLevels`: `Known` says whether the provider knows this model's levels, and `Levels` lists the supported ones. When `Known` is `false`, Blazing Agents has no data for the model and accepts any string, which the provider can still reject at run time. Fails with `validation_failed` or `provider_not_found`.

### `Update` [#update]

Renames a provider.

```go
provider, err := client.Providers.Update(ctx, "prv_0123456789abcdef", ba.UpdateProviderParams{
	Name: "OpenRouter main",
})
if err != nil {
	return err
}
fmt.Println(provider.Name)
return nil
```

**Signature:** `func (s *ProvidersService) Update(ctx context.Context, providerID ProviderID, params UpdateProviderParams, opts ...RequestOption) (*Provider, error)`

Only the name can change. To change the type, key, or base URL, create a new provider and move your agents to it. Returns [`*ba.Provider`](#provider). Fails with `validation_failed`, `provider_name_conflict`, or `provider_not_found`.

### `Delete` [#delete]

Deletes a provider.

```go
return client.Providers.Delete(ctx, "prv_0123456789abcdef", ba.DeleteProviderParams{
	ConfirmSnapshotInvalidation: new(true),
})
```

**Signature:** `func (s *ProvidersService) Delete(ctx context.Context, providerID ProviderID, params DeleteProviderParams, opts ...RequestOption) error`

| Field | Type | Description |
| --- | --- | --- |
| `ConfirmSnapshotInvalidation` | `*bool` | Confirms that sessions and queued or running task runs with a saved reference to this provider may stop working. It never overrides use by a current agent |

| Code | Meaning |
| --- | --- |
| [`provider_in_use`](/api-reference/protocols/errors#provider_in_use) | A current agent uses it. Move the agent first; confirmation does not override this |
| [`provider_historical_use`](/api-reference/protocols/errors#provider_historical_use) | Saved sessions or queued or running task runs use it. `APIError.Details` lists them under `sessionIds` and `taskRunIds`. Confirm to delete anyway |

After a confirmed delete, session and task run history remains, but any later turn that needs the provider fails with `provider_not_found`. The delete itself also fails with `validation_failed`, or with `provider_not_found` when the provider does not exist.

## Response models [#response-models]

### `Provider` [#provider]

| Field | Type | Description |
| --- | --- | --- |
| `ID` | `ba.ProviderID` | Provider ID (`prv_...`) |
| `Name` | `string` | Display name |
| `ProviderType` | `ba.ProviderType` | The model vendor |
| `BaseURL` | `*string` | Endpoint override, if any |
| `KeyFragment` | `string` | The last characters of the stored API key |
| `CreatedAt`, `UpdatedAt` | `time.Time` | Timestamps |

## Next [#next]

- [Providers and models](/agents/providers-and-models)
- [Agents](/sdk/go/agents)
