---
title: Tenant
description: Read and change your tenant's name and monthly usage quota with the Python SDK.
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

## How quotas apply [#how-quotas-apply]

Blazing Agents checks usage in the current quota period before each turn starts. When a limit is reached, new turns fail with [`quota_exceeded`](/api-reference/protocols/errors#quota_exceeded), and task runs end as `"blocked"` instead of `"failed"`. A turn that is already running is never cut off, so usage can go past a limit, especially with turns running at the same time. With no quota, or a limit set to `None`, that measure is unlimited.

A quota is your own safety setting. It is not a plan limit, credit balance, or bill.

## Response model [#response-model]

`TenantSettings` has `name: str` and `quota: Quota | None`. `Quota` has `monthly_token_limit`, `monthly_request_limit`, and `reset_day`.

## Next [#next]

- [Usage and quotas](/platform/usage-and-quotas)
- [Usage](/sdk/python/usage)
- [Tenancy and attribution](/platform/tenancy-and-attribution)
