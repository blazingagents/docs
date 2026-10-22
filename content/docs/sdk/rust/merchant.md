---
title: Merchant
description: Connect your Polar or Dodo account, link end users to customers, and follow usage deliveries with the Rust SDK.
---

# Merchant

`client.merchant_connection()`, `client.merchant_bindings()`, and `client.merchant_usage_events()` bill your end users for model tokens through your own Polar or Dodo account. Tenant only: a `UserClient` has none of them. For the concepts and the setup order, read [Bill your users for model tokens](/platform/monetization).

Examples receive a `client: blazing_agents::Client`. Every call also takes the `with_timeout`, `without_timeout`, `with_header`, and `with_client_request_id` transport options.

```rust
use blazing_agents::merchant::{MerchantEnvironment, MerchantProvider, MerchantUsageEventStatus};

client
    .merchant_connection()
    .create(
        MerchantProvider::Polar,
        MerchantEnvironment::Sandbox,
        std::env::var("POLAR_ACCESS_TOKEN")?,
    )
    .await?;
client
    .merchant_bindings()
    .put("user_42", "cus_from_polar_or_dodo")
    .await?;
client.tenant().update().monetization_enabled(true).await?;

let failed = client
    .merchant_usage_events()
    .list()
    .status(MerchantUsageEventStatus::Failed)
    .await?;
for event in &failed.events {
    println!("{} {}", event.id, event.user_id);
}
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`merchant_connection().get()`](#get-connection) | Get the merchant connection | `Option<MerchantConnection>` |
| [`merchant_connection().create()`](#create-connection) | Connect a billing account | [`MerchantConnection`](#merchantconnection) |
| [`merchant_connection().update()`](#update-connection) | Change the guard or rotate the credential | [`MerchantConnection`](#merchantconnection) |
| [`merchant_connection().retire()`](#retire-connection) | Retire the merchant connection | `()` |
| [`merchant_bindings().list()`](#list-bindings) | List links between end users and customers | [`BindingsPage`](#merchantbinding) |
| [`merchant_bindings().put()`](#put-binding) | Link an end user to a customer | [`MerchantBinding`](#merchantbinding) |
| [`merchant_bindings().delete()`](#delete-binding) | Remove an end user's link | `()` |
| [`merchant_usage_events().list()`](#list-events) | List usage events | [`UsageEventsPage`](#merchantusageevent) |
| [`merchant_usage_events().get()`](#get-event) | Get one usage event | [`MerchantUsageEvent`](#merchantusageevent) |
| [`merchant_usage_events().summary()`](#summary) | Summarize deliveries | [`MerchantUsageSummary`](#merchantusagesummary) |
| [`merchant_usage_events().retry()`](#retry-event) | Send an event again | [`MerchantUsageEvent`](#merchantusageevent) |
| [`merchant_usage_events().discard()`](#discard-event) | Stop delivering an event | [`MerchantUsageEvent`](#merchantusageevent) |

## Connection [#connection]

### `get()` [#get-connection]

**Signature:** `merchant_connection().get() -> Call<GetMerchantConnection>`

Awaiting returns `Option<MerchantConnection>`, `None` when you have no connection. The credential is never returned.

### `create()` [#create-connection]

**Signature:** `merchant_connection().create(provider: MerchantProvider, environment: MerchantEnvironment, credential: impl Into<String>) -> Call<CreateMerchantConnection>`

Connects your account. `MerchantProvider` is `Polar` or `Dodo`, and `MerchantEnvironment` is `Sandbox` or `Live`. Blazing Agents checks the credential with your provider first. The `guard(MerchantGuard)` setter adds a pre-turn plan or balance check; it is off when left out. Monetization stays off until you call `client.tenant().update().monetization_enabled(true)`.

Creating a connection replaces your current one: the old connection is retired as [`retire()`](#retire-connection) does. Bindings belong to a connection, so link your users again after you replace it.

Fails with `Error::Api` whose code is [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`merchant_credential_invalid`](/api-reference/protocols/errors#merchant_credential_invalid) when your provider rejects the credential, [`merchant_connection_in_use`](/api-reference/protocols/errors#merchant_connection_in_use) when the current connection cannot be replaced yet, or [`merchant_provider_unavailable`](/api-reference/protocols/errors#merchant_provider_unavailable) when your provider does not answer. An enabled guard needs at least one product ID or a meter ID, and each must exist at your provider, or the call fails with `validation_failed`.

### `update()` [#update-connection]

**Signature:** `merchant_connection().update() -> Call<UpdateMerchantConnection>`

| Setter | Description |
| --- | --- |
| `credential(credential)` | A replacement credential for the same merchant account. It is checked with your provider |
| `guard(guard)` | The complete guard, replacing the current one |

Setters you do not call keep their values. Fails with `validation_failed`, [`merchant_connection_not_found`](/api-reference/protocols/errors#merchant_connection_not_found), [`merchant_account_mismatch`](/api-reference/protocols/errors#merchant_account_mismatch) when the credential belongs to another account (create a new connection to switch accounts), `merchant_credential_invalid`, or `merchant_provider_unavailable`.

`MerchantGuard::new(enabled)` builds a guard, and `.product_ids([...])` and `.meter_id(...)` set what a user's plan must hold. See [guard rules](/platform/monetization#guard-rules).

### `retire()` [#retire-connection]

**Signature:** `merchant_connection().retire() -> Call<RetireMerchantConnection>`

Retires the connection. Its `Failed` events are discarded and its credential is deleted at once, so nothing more is delivered through it. Fails with `merchant_connection_not_found`, or with `merchant_connection_in_use` while a turn or task run that started on it is still running or one of its events is `Pending`. Try again once they finish; a `Pending` event whose `next_action` is `Retry` also blocks until you [retry](#retry-event) it.

## Bindings [#bindings]

### `list()` [#list-bindings]

**Signature:** `merchant_bindings().list() -> Call<ListMerchantBindings>`

Lists the current connection's links, sorted by `user_id`. The `user_id` setter returns only one end user's link, and `limit` sets the page size, within the [page size limit](/api-reference/protocols/service-limits#merchant-page). Awaiting returns a `BindingsPage` with `bindings` and `next_cursor`; `.items()` and `.pages()` walk every page lazily. Fails with `validation_failed`, [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor), or `merchant_connection_not_found`.

### `put()` [#put-binding]

**Signature:** `merchant_bindings().put(user_id: impl AsRef<str>, customer_id: impl Into<String>) -> Call<SetMerchantBinding>`

Links an end user to a customer at your provider, or changes the customer an existing link points to. Blazing Agents checks that the customer exists first. Link each user before their first turn: usage of an unlinked user is recorded as `Discarded` and never billed. Fails with `validation_failed`, `merchant_connection_not_found`, [`merchant_customer_not_found`](/api-reference/protocols/errors#merchant_customer_not_found), or `merchant_provider_unavailable`.

### `delete()` [#delete-binding]

**Signature:** `merchant_bindings().delete(user_id: impl AsRef<str>) -> Call<DeleteMerchantBinding>`

Removes an end user's link. Their usage is then recorded as `Discarded` and never billed, even after you link them again. Fails with `validation_failed`, `merchant_connection_not_found`, or [`merchant_binding_not_found`](/api-reference/protocols/errors#merchant_binding_not_found).

## Usage events [#usage-events]

Blazing Agents records one usage event per turn of a linked end user and delivers it to your provider. Each event has a delivery `status` and a suggested `next_action`. See [delivery states](/platform/monetization#delivery-states).

### `list()` [#list-events]

**Signature:** `merchant_usage_events().list() -> Call<ListMerchantUsageEvents>`

Lists events, newest first. The `status(MerchantUsageEventStatus)` setter keeps one delivery status, and `limit` sets the page size, within the [page size limit](/api-reference/protocols/service-limits#merchant-page). Awaiting returns a `UsageEventsPage` with `events` and `next_cursor`; `.items()` and `.pages()` walk every page lazily. Fails with `validation_failed` or `invalid_cursor`.

### `get()` [#get-event]

**Signature:** `merchant_usage_events().get(event_id: impl Into<MerchantUsageEventId>) -> Call<GetMerchantUsageEvent>`

Returns one event with the exact `payload` sent to your provider. `payload` is `None` for `Incomplete` events and can be `None` for `Discarded` ones. Fails with `validation_failed` or [`merchant_event_not_found`](/api-reference/protocols/errors#merchant_event_not_found).

### `summary()` [#summary]

**Signature:** `merchant_usage_events().summary() -> Call<GetMerchantUsageSummary>`

Shows whether usage is reaching your provider. The `days` setter sets how many UTC days, ending today, the `daily` series covers, within the [summary window](/api-reference/protocols/service-limits#merchant-usage-summary-days). Fails with `validation_failed`.

### `retry()` [#retry-event]

**Signature:** `merchant_usage_events().retry(event_id: impl Into<MerchantUsageEventId>) -> Call<RetryMerchantUsageEvent>`

Sends a `Failed` event again, or a `Pending` event whose `next_action` is `Retry` because automatic delivery gave up. The event goes back to `Pending` with the same payload. Retrying is safe, because your provider drops duplicates by event ID. Fix the cause of a `Failed` event, such as a revoked credential, first. Fails with `validation_failed`, `merchant_event_not_found`, or [`merchant_event_state_conflict`](/api-reference/protocols/errors#merchant_event_state_conflict) for any other status.

### `discard()` [#discard-event]

**Signature:** `merchant_usage_events().discard(event_id: impl Into<MerchantUsageEventId>) -> Call<DiscardMerchantUsageEvent>`

Marks an `Incomplete`, `Failed`, or `Expired` event as `Discarded`, so Blazing Agents stops trying to deliver it. The event stays in the list. Correct an `Expired` event in your provider directly. Fails with `validation_failed`, `merchant_event_not_found`, or `merchant_event_state_conflict`.

## Response models [#response-models]

### `MerchantConnection` [#merchantconnection]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `MerchantConnectionId` | Connection ID (`mch_...`) |
| `provider` | `MerchantProvider` | `Polar` or `Dodo` |
| `environment` | `MerchantEnvironment` | `Sandbox` or `Live` |
| `merchant_account_id` | `String` | The account the credential belongs to at your provider |
| `key_fragment` | `String` | The last characters of the credential, for display |
| `guard` | `MerchantGuard` | `enabled`, `product_ids`, and `meter_id` |
| `config_version` | `u64` | Incremented on each change |
| `created_at`, `updated_at` | `Timestamp` | Timestamps |

### `MerchantBinding` [#merchantbinding]

| Field | Type | Description |
| --- | --- | --- |
| `user_id` | `String` | The end user |
| `customer_id` | `String` | The customer at your provider |
| `created_at`, `updated_at` | `Timestamp` | Timestamps |

### `MerchantUsageEvent` [#merchantusageevent]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `MerchantUsageEventId` | Event ID (`mev_...`) |
| `turn_id`, `agent_id`, `session_id` | `TurnId`, `AgentId`, `Option<SessionId>` | The turn the event bills, its agent, and its session when it has one |
| `connection_id`, `provider` | `MerchantConnectionId`, `MerchantProvider` | The connection the event goes through |
| `user_id`, `customer_id` | `String`, `Option<String>` | The end user and the linked customer |
| `model`, `model_provider` | `String`, `ProviderType` | The model the turn ran |
| `input_tokens`, `output_tokens`, `total_tokens` | `u64` | Billed tokens |
| `turn_status` | `MerchantTurnStatus` | `Succeeded`, `Cancelled`, or `Failed` |
| `status` | `MerchantUsageEventStatus` | `Pending`, `Accepted`, `Failed`, `Incomplete`, `Discarded`, or `Expired` |
| `next_action` | `MerchantNextAction` | `None`, `Wait`, `Retry`, `Investigate`, or `Discard` |
| `payload` | `Option<serde_json::Map<String, serde_json::Value>>` | What was sent to your provider, in its own shape |
| `attempt_count`, `last_attempt_at`, `last_error_code` | `u64`, `Option<Timestamp>`, `Option<String>` | Delivery attempts so far |
| `started_at`, `occurred_at`, `accepted_at` | `Timestamp`, `Timestamp`, `Option<Timestamp>` | When the turn started, when the usage occurred, and when your provider accepted it |

### `MerchantUsageSummary` [#merchantusagesummary]

| Field | Type | Description |
| --- | --- | --- |
| `counts` | `MerchantUsageCounts` | All-time event counts: `pending`, `accepted`, `failed`, `incomplete`, `expired`, and `discarded` |
| `last_accepted_at` | `Option<Timestamp>` | When your provider last accepted an event |
| `oldest_pending_occurred_at` | `Option<Timestamp>` | When the oldest pending event's usage occurred |
| `daily` | `Vec<MerchantUsageDay>` | Per UTC day: `day`, `accepted_events`, `accepted_tokens`, and `pending_events` |

## Next [#next]

- [Bill your users for model tokens](/platform/monetization)
- [Tenant](/sdk/rust/tenant)
- [Usage](/sdk/rust/usage)
