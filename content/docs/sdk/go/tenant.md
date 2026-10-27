---
title: Tenant
description: Read and change your tenant's name, billing switch, and model spending limit with the Go SDK.
---

# Tenant

`client.Tenant` reads and changes tenant-wide settings, and `client.SpendingLimits` sets the model spending limits. Both are tenant only: a `*ba.UserClient` has neither.

Examples are function bodies that receive `ctx context.Context`, `client *ba.Client`, `agentID ba.AgentID`, and `sessionID ba.SessionID`, and return an `error`. Every method also takes the per-call options `ba.WithRequestTimeout`, `ba.WithRequestHeader`, `ba.WithClientRequestID`, and `ba.CaptureResponse`.

```go
tenant, err := client.Tenant.Get(ctx)
if err != nil {
	return err
}
fmt.Println(tenant.Name)
return nil
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`Tenant.Get`](#get) | Get the tenant's settings | [`*TenantSettings`](#tenantsettings) |
| [`Tenant.Update`](#update) | Change name or monetization | [`*TenantSettings`](#tenantsettings) |
| [`SpendingLimits.GetTenant`](#get-spending-limit) | Get the account's model spending limit | `*ModelSpendingLimitStatus` |
| [`SpendingLimits.UpdateTenant`](#update-spending-limit) | Set or turn off the account's model spending limit | `*ModelSpendingLimitStatus` |

## Methods [#methods]

### `Tenant.Get` [#get]

Gets the tenant's settings.

```go
tenant, err := client.Tenant.Get(ctx)
if err != nil {
	return err
}
fmt.Println(tenant.MonetizationEnabled)
return nil
```

**Signature:** `func (s *TenantService) Get(ctx context.Context, opts ...RequestOption) (*TenantSettings, error)`

Returns [`*ba.TenantSettings`](#tenantsettings).

### `Tenant.Update` [#update]

Changes the tenant's settings. Fields you leave unset keep their values.

```go
tenant, err := client.Tenant.Update(ctx, ba.UpdateTenantParams{Name: new("Acme agents")})
if err != nil {
	return err
}
fmt.Println(tenant.Name)
return nil
```

**Signature:** `func (s *TenantService) Update(ctx context.Context, params UpdateTenantParams, opts ...RequestOption) (*TenantSettings, error)`

| Field | Type | Description |
| --- | --- | --- |
| `Name` | `*string` | A new display name, within the [name limit](/api-reference/protocols/service-limits#tenant-display-name) |
| `MonetizationEnabled` | `*bool` | Bills usage to your end users through your merchant account. Turning it off drops usage events your merchant has not yet accepted |

Returns [`*ba.TenantSettings`](#tenantsettings). Fails with `*ba.APIError` whose `Code` is [`validation_failed`](/api-reference/protocols/errors#validation_failed).

### `SpendingLimits.GetTenant` [#get-spending-limit]

Gets the account's model spending limit and the current period.

```go
budget, err := client.SpendingLimits.GetTenant(ctx)
if err != nil {
	return err
}
if budget.Period != nil {
	fmt.Println(budget.Period.SpentUSD, budget.Period.AvailableUSD)
}
return nil
```

**Signature:** `func (s *SpendingLimitsService) GetTenant(ctx context.Context, opts ...RequestOption) (*ModelSpendingLimitStatus, error)`

Returns `*ba.ModelSpendingLimitStatus` with `SpendingLimit`, `Period` (a `*ba.SpendingLimitPeriod` with `StartsAt`, `EndsAt`, `SpentUSD`, and `AvailableUSD`), and `NextResetAt`. All three are nil while no limit is set. `AvailableUSD` is the amount minus `SpentUSD`, never below zero.

### `SpendingLimits.UpdateTenant` [#update-spending-limit]

Sets the account's dollar allowance for model tokens, or turns it off with a nil `SpendingLimit`. The limit covers every agent.

```go
_, err := client.SpendingLimits.UpdateTenant(ctx, ba.UpdateSpendingLimitParams{
	SpendingLimit: &ba.ModelSpendingLimit{
		AmountUSD:      100,
		ResetStartDate: ba.Date{Year: 2026, Month: time.October, Day: 1},
		ResetInterval:  ba.ResetIntervalMonthly,
	},
})
return err
```

**Signature:** `func (s *SpendingLimitsService) UpdateTenant(ctx context.Context, params UpdateSpendingLimitParams, opts ...RequestOption) (*ModelSpendingLimitStatus, error)`

`ba.ModelSpendingLimit` takes a USD `AmountUSD`, a UTC `ResetStartDate`, and a `ResetInterval` of `ba.ResetIntervalDaily`, `ba.ResetIntervalWeekly`, `ba.ResetIntervalBiweekly`, or `ba.ResetIntervalMonthly`. See [model spending limits](/platform/usage-and-spending-limits#model-spending-limits). Returns `*ba.ModelSpendingLimitStatus`. Fails with `validation_failed`.

## Pause billing [#pause-billing]

To pause billing, turn monetization off with `client.Tenant.Update(ctx, ba.UpdateTenantParams{MonetizationEnabled: new(false)})`. This drops usage events your merchant has not yet accepted. See [Monetization](/platform/monetization) before you change it.

## Response model [#response-model]

### `TenantSettings` [#tenantsettings]

| Field | Type | Description |
| --- | --- | --- |
| `Name` | `string` | Display name |
| `Deletion` | `*ba.TenantDeletion` | A scheduled deletion (`DeletesAt`, `RequestedAt`), or nil |
| `MonetizationEnabled` | `bool` | Whether usage is billed to your end users |

## Next [#next]

- [Usage and spending limits](/platform/usage-and-spending-limits)
- [Usage](/sdk/go/usage)
