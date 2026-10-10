---
title: Tenant
description: Read and change your tenant's name, monthly usage quota, and model spending limit with the Python SDK.
---

# Tenant

`client.tenant` reads and changes settings for the tenant your API key belongs to: its display name and an optional monthly quota. A quota is a safety ceiling you set so a bug or runaway agent cannot use unlimited tokens or requests.

The methods take no tenant ID; the API key selects the tenant. API keys themselves are managed in the [dashboard](https://www.blazingagents.com/app/keys), not through the SDK.

Examples assume `client = BlazingAgents()`. Every method also accepts `extra_headers` and `timeout`. On `AsyncBlazingAgents`, await the same method names.

```python
settings = client.tenant.update(
    quota={
        "monthly_token_limit": 5_000_000,
        "monthly_request_limit": None,
        "reset_day": 1,
    }
)
print(settings.name, settings.quota)
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`get()`](#get) | Get the tenant's settings | `TenantSettings` |
| [`update()`](#update) | Change the name or quota | `TenantSettings` |
| [`get_spending_limit()`](#get-spending-limit) | Get the account's model spending limit | `SpendingLimitResponse` |
| [`update_spending_limit()`](#update-spending-limit) | Set or turn off the account's model spending limit | `SpendingLimitResponse` |

## Methods [#methods]

### `get()` [#get]

Gets your tenant's settings.

```python
settings = client.tenant.get()
if settings.quota is None:
    print("No quota set")
```

**Signature:** `get() -> TenantSettings`

Returns [`TenantSettings`](#response-model). Only the standard authentication and service errors apply.

### `update()` [#update]

Changes the tenant's display name, its quota, or both.

```python
settings = client.tenant.update(name="Acme Support")
settings = client.tenant.update(quota=None)
```

**Signature:** `update(*, name=..., quota=...) -> TenantSettings`

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `str` | 1 to 80 characters, not blank |
| `quota` | `QuotaUpdate \| None` | The complete new quota, or `None` to remove it |

Omitted parameters keep their current value. Calling `update()` with neither raises `ValueError` before any request. A `quota` replaces the old one and must have exactly these three keys, or the SDK raises `TypeError`:

| Key | Type | Meaning |
| --- | --- | --- |
| `monthly_token_limit` | `int \| None` | Tokens allowed per month; `None` means no token limit |
| `monthly_request_limit` | `int \| None` | Turns allowed per month; `None` means no request limit |
| `reset_day` | `int` | Day of the month the count resets, 1 to 28 |

Returns [`TenantSettings`](#response-model). Raises `APIStatusError` with [`validation_failed`](/api-reference/protocols/errors#validation_failed) for a bad name, a limit that is not positive, or an invalid reset day.

### `get_spending_limit()` [#get-spending-limit]

Gets the account's model spending limit and the current period.

```python
budget = client.tenant.get_spending_limit()
if budget.period is not None:
    print(budget.period.available_usd, budget.next_reset_at)
```

**Signature:** `get_spending_limit() -> SpendingLimitResponse`

Returns a `SpendingLimitResponse` with `spending_limit`, `period` (`starts_at`, `ends_at`, `spent_usd`, `reserved_usd`, `available_usd`), and `next_reset_at`. All three are `None` while no limit is set.

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

`reset_interval` is `"daily"`, `"weekly"`, `"biweekly"`, or `"monthly"`, and `reset_start_date` is a UTC date. See [model spending limits](/platform/usage-and-quotas#model-spending-limits) for how resets and stops work. Raises [`validation_failed`](/api-reference/protocols/errors#validation_failed) for an invalid limit.

## How quotas apply [#how-quotas-apply]

Blazing Agents checks usage in the current quota period before each turn starts. When a limit is reached, new turns fail with [`quota_exceeded`](/api-reference/protocols/errors#quota_exceeded), and task runs end as `"blocked"` instead of `"failed"`. A turn that is already running is never cut off, so usage can go past a limit, especially with turns running at the same time. With no quota, or a limit set to `None`, that measure is unlimited.

A quota is your own safety setting. It is not a plan limit, credit balance, or bill.

## Response model [#response-model]

`TenantSettings` has `name: str` and `quota: Quota | None`. `Quota` has `monthly_token_limit`, `monthly_request_limit`, and `reset_day`.

## Next [#next]

- [Usage and quotas](/platform/usage-and-quotas)
- [Usage](/sdk/python/usage)
- [Tenancy and attribution](/platform/tenancy-and-attribution)
