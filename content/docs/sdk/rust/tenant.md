---
title: Tenant
description: Read and change your tenant's name, monthly usage quota, and model spending limit with the Rust SDK.
---

# Tenant

`client.tenant()` reads and changes tenant-wide settings. Tenant only: a `UserClient` has no `tenant()`.

Examples receive a `client: blazing_agents::Client`. Every call also takes the `with_timeout`, `without_timeout`, `with_header`, and `with_client_request_id` transport options.

```rust
let tenant = client.tenant().get().await?;
println!("{}", tenant.name);
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`get()`](#get) | Get the tenant's settings | [`TenantSettings`](#tenantsettings) |
| [`update()`](#update) | Change name, quota, or monetization | [`TenantSettings`](#tenantsettings) |
| [`get_spending_limit()`](#get-spending-limit) | Get the account's model spending limit | `SpendingLimitStatus` |
| [`update_spending_limit()`](#update-spending-limit) | Set or turn off the account's model spending limit | `SpendingLimitStatus` |

## Methods [#methods]

### `get()` [#get]

Gets the tenant's settings.

```rust
let tenant = client.tenant().get().await?;
```

**Signature:** `get() -> Call<GetTenantSettings>`

Awaiting returns [`TenantSettings`](#tenantsettings).

### `update()` [#update]

Changes the tenant's settings. Setters you do not call keep their values.

```rust
let tenant = client.tenant().update().name("Acme agents").await?;
```

**Signature:** `update() -> Call<UpdateTenantSettings>`

| Setter | Description |
| --- | --- |
| `name(name)` | A new display name, 1 to 80 characters |
| `monetization_enabled(enabled)` | Bills usage to your end users through your merchant account. Turning it off drops usage events your merchant has not yet accepted |
| `quota(quota)` | Replaces the whole monthly quota |
| `clear_quota()` | Removes the monthly quota |

```rust
use blazing_agents::tenant::QuotaInput;

let tenant = client
    .tenant()
    .update()
    .quota(QuotaInput::new(1).monthly_request_limit(10_000))
    .await?;
```

`QuotaInput::new(reset_day)` takes the reset day of each month, 1 to 28. Every field is always sent; a limit you do not set goes out as `null`, which means unlimited.

Awaiting returns [`TenantSettings`](#tenantsettings). Fails with `Error::Api` whose code is [`validation_failed`](/api-reference/protocols/errors#validation_failed).

### `get_spending_limit()` [#get-spending-limit]

Gets the account's model spending limit and the current period.

```rust
let budget = client.tenant().get_spending_limit().await?;
```

**Signature:** `get_spending_limit() -> Call<GetTenantSpendingLimit>`

Awaiting returns `SpendingLimitStatus` with `spending_limit`, `period` (`starts_at`, `ends_at`, `spent_usd`, `available_usd`), and `next_reset_at`. `available_usd` is the amount minus `spent_usd`, never below zero. All three are `None` while no limit is set.

### `update_spending_limit()` [#update-spending-limit]

Sets the account's dollar allowance for model tokens, or turns it off with `None`. The limit covers every agent.

```rust
use blazing_agents::spending_limits::{ResetInterval, SpendingLimitInput};

client
    .tenant()
    .update_spending_limit(Some(SpendingLimitInput::new(
        100.0,
        "2026-10-01",
        ResetInterval::Monthly,
    )))
    .await?;
```

**Signature:** `update_spending_limit(limit: Option<SpendingLimitInput>) -> Call<UpdateTenantSpendingLimit>`

`SpendingLimitInput::new(amount_usd, reset_start_date, reset_interval)` takes a USD amount, a UTC `YYYY-MM-DD` start day, and a `ResetInterval` of `Daily`, `Weekly`, `Biweekly`, or `Monthly`. See [model spending limits](/platform/usage-and-quotas#model-spending-limits). Awaiting returns `SpendingLimitStatus`. Fails with `validation_failed`.

## How quotas apply [#how-quotas-apply]

Blazing Agents checks usage in the current quota period before each turn starts. When a limit is reached, new turns fail with [`quota_exceeded`](/api-reference/protocols/errors#quota_exceeded), and task runs end as `Blocked` instead of `Failed`. A turn that is already running is never cut off, so usage can go past a limit, especially with turns running at the same time. With no quota, or a limit removed by `clear_quota()`, that measure is unlimited.

A quota is your own safety setting. It is not a plan limit, credit balance, or bill.

To pause billing your users, turn monetization off with `client.tenant().update().monetization_enabled(false)`. This drops usage events your merchant has not yet accepted. See [Monetization](/platform/monetization) before you change it.

## Response model [#response-model]

### `TenantSettings` [#tenantsettings]

| Field | Type | Description |
| --- | --- | --- |
| `name` | `String` | Display name |
| `quota` | `Option<Quota>` | The monthly quota (`monthly_token_limit`, `monthly_request_limit`, `reset_day`), or `None` |
| `deletion` | `Option<TenantDeletion>` | A scheduled deletion (`deletes_at`, `requested_at`), or `None` |
| `monetization_enabled` | `bool` | Whether usage is billed to your end users |

## Next [#next]

- [Usage and quotas](/platform/usage-and-quotas)
- [Usage](/sdk/rust/usage)
