---
title: Merchant
description: Connect your billing provider, link end users to customers, and manage usage events with the Python SDK.
---

# Merchant

`client.merchant_connection`, `client.merchant_bindings`, and `client.merchant_usage_events` bill your end users' model-token usage through your own Polar or Dodo account. Connect the account once, link each end user to a customer, then watch the usage events Blazing Agents sends. To learn how monetization works, read [Monetization](/platform/monetization).

```python
import os

client.merchant_connection.create(
    provider="polar",
    environment="sandbox",
    credential=os.environ["POLAR_ACCESS_TOKEN"],
)
client.merchant_bindings.put("user_42", customer_id="cus_0123456789")
client.tenant.update(monetization_enabled=True)

page = client.merchant_usage_events.list(status="failed")
for event in page.events:
    if event.next_action == "retry":
        client.merchant_usage_events.retry(event.id)
```

These are tenant administration methods, so only the tenant client has them. A [`for_user()`](/sdk/python/client#for-user) client does not. Usage is billed only while `monetization_enabled` is on in your [tenant settings](/sdk/python/tenant#update). Every method also accepts `extra_headers` and `timeout`. On `AsyncBlazingAgents`, await the same method names and use `async for` with `iter()`.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`merchant_connection.get()`](#connection-get) | Read your connection | `MerchantConnectionResponse` |
| [`merchant_connection.create()`](#connection-create) | Connect or replace your billing account | `MerchantConnectionResponse` |
| [`merchant_connection.update()`](#connection-update) | Change the guard or rotate the credential | `MerchantConnectionResponse` |
| [`merchant_connection.retire()`](#connection-retire) | Remove the connection | `None` |
| [`merchant_bindings.list()`](#bindings-list) | Get one page of end user to customer links | `MerchantBindingsPage` |
| [`merchant_bindings.iter()`](#bindings-iter) | Iterate every link | `Iterator[MerchantCustomerBinding]` |
| [`merchant_bindings.put()`](#bindings-put) | Link an end user to a customer | `MerchantBindingResponse` |
| [`merchant_bindings.delete()`](#bindings-delete) | Remove an end user's link | `None` |
| [`merchant_usage_events.list()`](#events-list) | Get one page of usage events | `MerchantUsageEventsPage` |
| [`merchant_usage_events.iter()`](#events-iter) | Iterate every usage event | `Iterator[MerchantUsageEvent]` |
| [`merchant_usage_events.get()`](#events-get) | Read one event and its payload | `MerchantUsageEventResponse` |
| [`merchant_usage_events.summary()`](#events-summary) | Check that deliveries are flowing | `MerchantUsageSummaryResponse` |
| [`merchant_usage_events.retry()`](#events-retry) | Send an event again | `MerchantUsageEventResponse` |
| [`merchant_usage_events.discard()`](#events-discard) | Stop delivering an event | `MerchantUsageEventResponse` |

## Connection [#connection]

### `merchant_connection.get()` [#connection-get]

Reads your merchant connection.

```python
connection = client.merchant_connection.get().connection
if connection is not None:
    print(connection.provider, connection.key_fragment)
```

**Signature:** `get() -> MerchantConnectionResponse`

`connection` is `None` when you have none. The credential is never returned; `key_fragment` shows its last few characters.

### `merchant_connection.create()` [#connection-create]

Connects your Polar or Dodo account. Blazing Agents checks the credential with your provider before it saves anything.

**Signature:** `create(*, provider: MerchantProvider, environment: MerchantEnvironment, credential: str, guard=...) -> MerchantConnectionResponse`

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `provider` | `Literal["polar", "dodo"]` | required | Your billing provider |
| `environment` | `Literal["sandbox", "live"]` | required | The provider environment that receives usage |
| `credential` | `str` | required | A Polar Organization Access Token, or a Dodo API key in the mode that matches `environment`. It is never returned |
| `guard` | `MerchantGuardInput` | off | Check each end user's plan or balance before every turn starts |

A guard is a dictionary with `enabled`, `product_ids`, and `meter_id`. An enabled guard needs at least one product ID or a `meter_id`, and each must exist at your provider. See [guard rules](/platform/monetization#guard-rules).

Creating a connection replaces your current one. The old connection's `failed` events are discarded and its credential is deleted at once. Customer links belong to a connection, so link your end users again afterwards.

Returns [`MerchantConnectionResponse`](#merchantconnectionresponse). Raises `APIStatusError` with [`validation_failed`](/api-reference/protocols/errors#validation_failed), with an issue coded `merchant_guard_id_unknown` for each unknown guard ID, [`merchant_credential_invalid`](/api-reference/protocols/errors#merchant_credential_invalid), [`merchant_provider_unavailable`](/api-reference/protocols/errors#merchant_provider_unavailable), or [`merchant_connection_in_use`](/api-reference/protocols/errors#merchant_connection_in_use) while a turn or task run that started on the current connection is still running or one of its events is `pending`.

### `merchant_connection.update()` [#connection-update]

Changes the guard, rotates the credential, or both. Omitted parameters keep their current value.

```python
client.merchant_connection.update(
    guard={"enabled": True, "product_ids": ["prod_0123456789"], "meter_id": None},
)
```

**Signature:** `update(*, credential=..., guard=...) -> MerchantConnectionResponse`

`credential` must come from the same merchant account. `guard` replaces the whole guard. To move to another merchant account, create a new connection instead.

Returns [`MerchantConnectionResponse`](#merchantconnectionresponse). Raises `validation_failed`, [`merchant_connection_not_found`](/api-reference/protocols/errors#merchant_connection_not_found), `merchant_credential_invalid`, [`merchant_account_mismatch`](/api-reference/protocols/errors#merchant_account_mismatch), or `merchant_provider_unavailable`.

### `merchant_connection.retire()` [#connection-retire]

Removes your connection. Nothing more is delivered through it, and new usage is no longer recorded against it.

```python
client.merchant_connection.retire()
```

**Signature:** `retire() -> None`

The connection's `failed` events are discarded and its credential is deleted at once. Raises `merchant_connection_not_found`, or `merchant_connection_in_use` while a turn or task run that started on it is still running or one of its events is `pending`. A `pending` event whose `next_action` is `"retry"` also blocks removal until you retry it.

## Customer links [#bindings]

### `merchant_bindings.list()` [#bindings-list]

Gets one page of the links between your end users and your provider's customers on the current connection, sorted by `user_id`.

```python
page = client.merchant_bindings.list(limit=100)
for binding in page.bindings:
    print(binding.user_id, binding.customer_id)
```

**Signature:** `list(*, user_id=..., cursor=..., limit=...) -> MerchantBindingsPage`

`user_id` returns only that end user's link. `limit` follows the [merchant page limit](/api-reference/protocols/service-limits#merchant-page). Pass the previous page's `next_cursor` as `cursor`.

Returns [`MerchantBindingsPage`](#merchantbindingspage). Raises `validation_failed`, [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor), or `merchant_connection_not_found`.

### `merchant_bindings.iter()` [#bindings-iter]

Iterates every link, fetching pages as you go.

```python
for binding in client.merchant_bindings.iter():
    print(binding.user_id, binding.customer_id)
```

**Signature:** `iter(*, user_id=..., cursor=..., limit=...) -> Iterator[MerchantCustomerBinding]`

Takes the same parameters as [`list()`](#bindings-list). No request is sent until you start iterating.

### `merchant_bindings.put()` [#bindings-put]

Links one end user to a customer in your provider, or changes the customer an existing link points to. Blazing Agents checks that the customer exists first. That end user's usage then goes to this customer.

```python
binding = client.merchant_bindings.put("user_42", customer_id="cus_0123456789").binding
```

**Signature:** `put(user_id: str, *, customer_id: str) -> MerchantBindingResponse`

`user_id` is the ID you pass to [`for_user()`](/sdk/python/client#for-user) or send with turns. Returns `MerchantBindingResponse`, whose `binding` is a [`MerchantCustomerBinding`](#merchantbindingspage). Raises `validation_failed`, `merchant_connection_not_found`, [`merchant_customer_not_found`](/api-reference/protocols/errors#merchant_customer_not_found), or `merchant_provider_unavailable`.

### `merchant_bindings.delete()` [#bindings-delete]

Removes one end user's link on the current connection.

```python
client.merchant_bindings.delete("user_42")
```

**Signature:** `delete(user_id: str) -> None`

That end user's usage is then recorded as `discarded` and never billed, even after you link them again. Raises `validation_failed`, `merchant_connection_not_found`, or [`merchant_binding_not_found`](/api-reference/protocols/errors#merchant_binding_not_found).

## Usage events [#usage-events]

Blazing Agents records usage events for your provider, one per turn. Each event has a delivery `status` and a suggested `next_action`. See [delivery states](/platform/monetization#delivery-states).

### `merchant_usage_events.list()` [#events-list]

Gets one page of usage events, newest first.

```python
page = client.merchant_usage_events.list(status="pending", limit=50)
```

**Signature:** `list(*, status=..., cursor=..., limit=...) -> MerchantUsageEventsPage`

`status` returns only events with that status: `"pending"`, `"accepted"`, `"failed"`, `"incomplete"`, `"discarded"`, or `"expired"`. `limit` follows the [merchant page limit](/api-reference/protocols/service-limits#merchant-page). Pass the previous page's `next_cursor` as `cursor`.

Returns [`MerchantUsageEventsPage`](#merchantusageeventspage). Raises `validation_failed` or `invalid_cursor`.

### `merchant_usage_events.iter()` [#events-iter]

Iterates every matching usage event, fetching pages as you go.

```python
for event in client.merchant_usage_events.iter(status="failed"):
    print(event.id, event.last_error_code)
```

**Signature:** `iter(*, status=..., cursor=..., limit=...) -> Iterator[MerchantUsageEvent]`

Takes the same parameters as [`list()`](#events-list). No request is sent until you start iterating.

### `merchant_usage_events.get()` [#events-get]

Reads one event, including the exact `payload` sent to your provider.

```python
event = client.merchant_usage_events.get("mev_0123456789abcdef").event
```

**Signature:** `get(event_id: str) -> MerchantUsageEventResponse`

`payload` is `None` for an `incomplete` event and can be `None` for a `discarded` one. Returns `MerchantUsageEventResponse`, whose `event` is a [`MerchantUsageEvent`](#merchantusageeventspage). Raises `validation_failed` or [`merchant_event_not_found`](/api-reference/protocols/errors#merchant_event_not_found).

### `merchant_usage_events.summary()` [#events-summary]

Shows whether usage is reaching your provider: all-time counts per status, when an event was last accepted, when the oldest pending event happened, and a daily series.

```python
summary = client.merchant_usage_events.summary(days=30).summary
print(summary.counts.failed, summary.oldest_pending_occurred_at)
```

**Signature:** `summary(*, days=...) -> MerchantUsageSummaryResponse`

`days` sets how many UTC days the `daily` series covers, ending today, within the [summary window limit](/api-reference/protocols/service-limits#merchant-usage-summary-days). Returns [`MerchantUsageSummaryResponse`](#merchantusagesummaryresponse). Raises `validation_failed`.

### `merchant_usage_events.retry()` [#events-retry]

Sends a `failed` event again, or a `pending` event whose automatic delivery gave up. The event goes back to `pending` with the same payload.

```python
event = client.merchant_usage_events.retry("mev_0123456789abcdef").event
```

**Signature:** `retry(event_id: str) -> MerchantUsageEventResponse`

Retrying is safe, because your provider drops duplicates by the event ID. Fix the cause of a `failed` event, such as a revoked credential, first. Raises `validation_failed`, `merchant_event_not_found`, or [`merchant_event_state_conflict`](/api-reference/protocols/errors#merchant_event_state_conflict) for an event in another state.

### `merchant_usage_events.discard()` [#events-discard]

Marks an `incomplete`, `failed`, or `expired` event as `discarded`, so Blazing Agents stops trying to deliver it. The event stays in the list.

```python
client.merchant_usage_events.discard("mev_0123456789abcdef")
```

**Signature:** `discard(event_id: str) -> MerchantUsageEventResponse`

Correct an `expired` event in your provider directly. Raises `validation_failed`, `merchant_event_not_found`, or `merchant_event_state_conflict` for an event in another state.

## Response models [#response-models]

### `MerchantConnectionResponse` [#merchantconnectionresponse]

`connection` is a `MerchantConnection`, or `None` when you have none.

| `MerchantConnection` field | Type | Description |
| --- | --- | --- |
| `id` | `str` | Connection ID (`mch_...`) |
| `provider` | `str` | `"polar"` or `"dodo"` |
| `environment` | `str` | `"sandbox"` or `"live"` |
| `merchant_account_id` | `str` | The provider account the credential belongs to |
| `key_fragment` | `str` | Last few characters of the credential |
| `guard` | `MerchantGuard` | `enabled`, `product_ids`, and `meter_id` |
| `config_version` | `int` | Version of the connection's settings, starting at 1 |
| `created_at`, `updated_at` | `datetime` | Timestamps |

A connection response that contains a credential raises `CredentialEchoError`. See [errors](/sdk/python/client#errors).

### `MerchantBindingsPage` [#merchantbindingspage]

`MerchantBindingsPage` has `bindings: list[MerchantCustomerBinding]` and `next_cursor: str | None`. `MerchantBindingResponse` wraps one link in `binding`.

| `MerchantCustomerBinding` field | Type | Description |
| --- | --- | --- |
| `user_id` | `str` | Your end user's ID |
| `customer_id` | `str` | The provider customer ID |
| `created_at`, `updated_at` | `datetime` | Timestamps |

### `MerchantUsageEventsPage` [#merchantusageeventspage]

`MerchantUsageEventsPage` has `events: list[MerchantUsageEvent]` and `next_cursor: str | None`. `MerchantUsageEventResponse` wraps one event in `event`.

| `MerchantUsageEvent` field | Type | Description |
| --- | --- | --- |
| `id` | `str` | Event ID (`mev_...`) |
| `turn_id` | `str` | The turn that produced the usage |
| `connection_id` | `str` | The connection the event belongs to |
| `provider` | `str` | `"polar"` or `"dodo"` |
| `user_id` | `str` | Your end user's ID |
| `customer_id` | `str \| None` | The linked customer, when there was one |
| `agent_id` | `str` | The agent that ran the turn |
| `session_id` | `str \| None` | The turn's session, or `None` for a turn without one |
| `model`, `model_provider` | `str` | The model and its provider type |
| `input_tokens`, `output_tokens`, `total_tokens` | `int` | Tokens |
| `turn_status` | `str` | `"succeeded"`, `"cancelled"`, or `"failed"` |
| `started_at`, `occurred_at` | `datetime` | When the turn started and when the event occurred |
| `status` | `str` | Delivery status |
| `payload` | `dict[str, object] \| None` | The exact body sent to your provider |
| `attempt_count`, `attempt_generation` | `int` | Delivery attempt counters |
| `last_attempt_at` | `datetime \| None` | Time of the last delivery attempt |
| `last_error_code` | `str \| None` | Code of the last failed delivery attempt |
| `accepted_at` | `datetime \| None` | When your provider accepted the event |
| `next_action` | `str` | `"none"`, `"wait"`, `"retry"`, `"investigate"`, or `"discard"` |

`next_action` is `"retry"` for a `failed` event and for a `pending` event whose automatic delivery gave up, and `"wait"` for any other `pending` event.

### `MerchantUsageSummaryResponse` [#merchantusagesummaryresponse]

`summary` has `counts`, `last_accepted_at`, `oldest_pending_occurred_at`, and `daily`. `counts` holds the all-time number of events per status, one field per status. `daily` has one entry per UTC day in the `days` window, each with `day`, `accepted_events`, `accepted_tokens`, and `pending_events`.

## Next [#next]

- [Monetization](/platform/monetization)
- [Tenant reference](/sdk/python/tenant#update)
- [Usage reference](/sdk/python/usage)
