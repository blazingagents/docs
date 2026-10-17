---
title: Tenant
description: Read and change your tenant's name, monthly usage quota, and model spending limit with the Go SDK.
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
| [`Tenant.Update`](#update) | Change name, quota, or monetization | [`*TenantSettings`](#tenantsettings) |
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
| `Name` | `*string` | A new display name, 1 to 80 characters |
| `MonetizationEnabled` | `*bool` | Bills usage to your end users through your merchant account. Turning it off drops usage events your merchant has not yet accepted |
| `Quota` | `ba.Nullable[ba.QuotaInput]` | `ba.Value(quota)` replaces the whole monthly quota; `ba.Null[ba.QuotaInput]()` removes it |

```go
tenant, err := client.Tenant.Update(ctx, ba.UpdateTenantParams{
	Quota: ba.Value(ba.QuotaInput{ResetDay: 1, MonthlyRequestLimit: new(10_000)}),
})
if err != nil {
	return err
}
fmt.Println(tenant.Quota != nil)
return nil
```

`ba.QuotaInput` takes `ResetDay`, the reset day of each month from 1 to 28, and the `MonthlyTokenLimit` and `MonthlyRequestLimit` pointers. Every field is always sent; a nil limit goes out as `null`, which means unlimited.

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

Returns `*ba.ModelSpendingLimitStatus` with `SpendingLimit`, `Period` (`StartsAt`, `EndsAt`, `SpentUSD`, `ReservedUSD`, `AvailableUSD`), and `NextResetAt`. All three are nil while no limit is set.

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

`ba.ModelSpendingLimit` takes a USD `AmountUSD`, a UTC `ResetStartDate`, and a `ResetInterval` of `ba.ResetIntervalDaily`, `ba.ResetIntervalWeekly`, `ba.ResetIntervalBiweekly`, or `ba.ResetIntervalMonthly`. See [model spending limits](/platform/usage-and-quotas#model-spending-limits). Returns `*ba.ModelSpendingLimitStatus`. Fails with `validation_failed`.

## How quotas apply [#how-quotas-apply]

Blazing Agents checks usage in the current quota period before each turn starts. When a limit is reached, new turns fail with [`quota_exceeded`](/api-reference/protocols/errors#quota_exceeded), and task runs end as blocked instead of failed. A turn that is already running is never cut off, so usage can go past a limit, especially with turns running at the same time. With no quota, or a quota removed with `ba.Null[ba.QuotaInput]()`, that measure is unlimited.

A quota is your own safety setting. It is not a plan limit, credit balance, or bill.

Turning `MonetizationEnabled` off drops usage events your merchant has not yet accepted. See [Monetization](/platform/monetization) before you change it.

## Response model [#response-model]

### `TenantSettings` [#tenantsettings]

| Field | Type | Description |
| --- | --- | --- |
| `Name` | `string` | Display name |
| `Quota` | pointer, or nil | The monthly quota (`MonthlyTokenLimit`, `MonthlyRequestLimit`, `ResetDay`), or nil |
| `Deletion` | pointer, or nil | A scheduled deletion (`DeletesAt`, `RequestedAt`), or nil |
| `MonetizationEnabled` | `bool` | Whether usage is billed to your end users |

## Next [#next]

- [Usage and quotas](/platform/usage-and-quotas)
- [Usage](/sdk/go/usage)
