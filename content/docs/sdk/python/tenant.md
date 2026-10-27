---
title: Tenant
description: Read and change your tenant's name, billing switch, and model spending limit with the Python SDK.
---

# Tenant

`client.tenant` reads and changes settings for the tenant your API key belongs to: its display name, whether usage is billed to your end users, and the account's model spending limit.

The methods take no tenant ID; the API key selects the tenant. API keys themselves are managed in the [dashboard](https://www.blazingagents.com/app/keys), not through the SDK.

Examples assume `client = BlazingAgents()`. Every method also accepts `extra_headers` and `timeout`. On `AsyncBlazingAgents`, await the same method names.

```python
settings = client.tenant.update(name="Acme Support")
print(settings.name, settings.monetization_enabled)
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`get()`](#get) | Get the tenant's settings | `TenantSettings` |
| [`update()`](#update) | Change the name or billing switch | `TenantSettings` |
| [`get_spending_limit()`](#get-spending-limit) | Get the account's model spending limit | `SpendingLimitResponse` |
| [`update_spending_limit()`](#update-spending-limit) | Set or turn off the account's model spending limit | `SpendingLimitResponse` |

## Methods [#methods]

### `get()` [#get]

Gets your tenant's settings.

```python
settings = client.tenant.get()
print(settings.name, settings.monetization_enabled)
```

**Signature:** `get() -> TenantSettings`

Returns [`TenantSettings`](#response-model). Only the standard authentication and service errors apply.

### `update()` [#update]

Changes the tenant's display name, its billing switch, or both.

```python
settings = client.tenant.update(name="Acme Support")
```

**Signature:** `update(*, name=..., monetization_enabled=...) -> TenantSettings`

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `str` | 1 to 80 characters, not blank |
| `monetization_enabled` | `bool` | Bill usage to your end users through your merchant account |

Omitted parameters keep their current value. Calling `update()` with none of them raises `validation_failed`.
Returns [`TenantSettings`](#response-model). Raises `APIStatusError` with [`validation_failed`](/api-reference/protocols/errors#validation_failed) for a bad name.

### `get_spending_limit()` [#get-spending-limit]

Gets the account's model spending limit and the current period.

```python
budget = client.tenant.get_spending_limit()
if budget.period is not None:
    print(budget.period.available_usd, budget.next_reset_at)
```

**Signature:** `get_spending_limit() -> SpendingLimitResponse`

Returns a `SpendingLimitResponse` with `spending_limit`, `period` (`starts_at`, `ends_at`, `spent_usd`, `available_usd`), and `next_reset_at`. All three are `None` while no limit is set. `available_usd` is the limit's `amount_usd` minus `spent_usd`, never below zero.

### `update_spending_limit()` [#update-spending-limit]

Sets the account's dollar allowance for model tokens, or turns it off with `spending_limit=None`. The limit covers every agent.

```python
client.tenant.update_spending_limit(
    spending_limit={
        "amount_usd": 25,
        "reset_start_date": "2026-10-01",
        "reset_interval": "monthly",
    }
)
```

**Signature:** `update_spending_limit(*, spending_limit: SpendingLimitInput | None) -> SpendingLimitResponse`

`reset_interval` is `"daily"`, `"weekly"`, `"biweekly"`, or `"monthly"`, and `reset_start_date` is a UTC date. See [model spending limits](/platform/usage-and-spending-limits#model-spending-limits) for how resets and stops work. Raises [`validation_failed`](/api-reference/protocols/errors#validation_failed) for an invalid limit.

## Pause billing [#pause-billing]

To pause billing, turn monetization off with `client.tenant.update(monetization_enabled=False)`. This drops usage events your merchant has not yet accepted. See [Monetization](/platform/monetization) before you change it.

## Response model [#response-model]

| Field | Type | Description |
| --- | --- | --- |
| `name` | `str` | Display name |
| `monetization_enabled` | `bool` | Whether usage is billed to your end users |
| `deletion` | `TenantDeletion \| None` | Set when someone asked to delete the tenant from the dashboard |

`TenantDeletion` has `requested_at` and `deletes_at`, the time the deletion happens. It can be cancelled until then.

## Next [#next]

- [Usage and spending limits](/platform/usage-and-spending-limits)
- [Usage](/sdk/python/usage)
- [Tenancy and attribution](/platform/tenancy-and-attribution)
