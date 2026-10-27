---
title: Tenant
description: Read and change your tenant's name, billing switch, and model spending limit with the Rust SDK.
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
| [`update()`](#update) | Change name or monetization | [`TenantSettings`](#tenantsettings) |
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
| `name(name)` | A new display name, within the [display name limit](/api-reference/protocols/service-limits#tenant-display-name) |
| `monetization_enabled(enabled)` | Bills usage to your end users through your merchant account. Turning it off drops usage events your merchant has not yet accepted |

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

`SpendingLimitInput::new(amount_usd, reset_start_date, reset_interval)` takes a USD amount, a UTC `YYYY-MM-DD` start day, and a `ResetInterval` of `Daily`, `Weekly`, `Biweekly`, or `Monthly`. See [model spending limits](/platform/usage-and-spending-limits#model-spending-limits). Awaiting returns `SpendingLimitStatus`. Fails with `validation_failed`.

## Pause billing [#pause-billing]

To pause billing your users, turn monetization off with `client.tenant().update().monetization_enabled(false)`. This drops usage events your merchant has not yet accepted. See [Monetization](/platform/monetization) before you change it.

## Response model [#response-model]

### `TenantSettings` [#tenantsettings]

| Field | Type | Description |
| --- | --- | --- |
| `name` | `String` | Display name |
| `deletion` | `Option<TenantDeletion>` | A scheduled deletion (`deletes_at`, `requested_at`), or `None` |
| `monetization_enabled` | `bool` | Whether usage is billed to your end users |

## Next [#next]

- [Usage and spending limits](/platform/usage-and-spending-limits)
- [Usage](/sdk/rust/usage)
