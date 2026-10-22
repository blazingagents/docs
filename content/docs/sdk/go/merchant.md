---
title: Merchant
description: Connect your billing provider, link end users to customers, and follow usage delivery with the Go SDK.
---

# Merchant

`client.MerchantConnection`, `client.MerchantBindings`, and `client.MerchantUsageEvents` bill your end users' model-token usage through your own Polar or Dodo account. All three are tenant only: a `*ba.UserClient` has none of them. See [Monetization](/platform/monetization) for how billing works, the guard rules, and the delivery states.

Examples are function bodies that receive `ctx context.Context`, `client *ba.Client`, `agentID ba.AgentID`, and `sessionID ba.SessionID`, and return an `error`. Every method also takes the per-call options `ba.WithRequestTimeout`, `ba.WithRequestHeader`, `ba.WithClientRequestID`, and `ba.CaptureResponse`.

```go
connection, err := client.MerchantConnection.Get(ctx)
if err != nil {
	return err
}
if connection == nil {
	fmt.Println("no merchant connection")
	return nil
}
summary, err := client.MerchantUsageEvents.Summary(ctx, ba.MerchantUsageSummaryParams{})
if err != nil {
	return err
}
fmt.Println(connection.Provider, summary.Counts.Pending, summary.Counts.Failed)
return nil
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`MerchantConnection.Get`](#get-connection) | Get the current connection | [`*MerchantConnection`](#merchantconnection), or nil |
| [`MerchantConnection.Create`](#create-connection) | Connect or replace your billing account | [`*MerchantConnection`](#merchantconnection) |
| [`MerchantConnection.Update`](#update-connection) | Change the guard or rotate the credential | [`*MerchantConnection`](#merchantconnection) |
| [`MerchantConnection.Retire`](#retire-connection) | Retire the connection | `error` |
| [`MerchantBindings.List`](#list-bindings), `All` | List links between end users and customers | [`*MerchantBindingList`](#merchantbinding) |
| [`MerchantBindings.Set`](#set-binding) | Link an end user to a customer | [`*MerchantBinding`](#merchantbinding) |
| [`MerchantBindings.Delete`](#delete-binding) | Remove an end user's link | `error` |
| [`MerchantUsageEvents.List`](#list-events), `All` | List usage events | [`*MerchantUsageEventList`](#merchantusageevent) |
| [`MerchantUsageEvents.Summary`](#event-summary) | Count events and total accepted usage | [`*MerchantUsageSummary`](#merchantusagesummary) |
| [`MerchantUsageEvents.Get`](#get-event) | Get one usage event | [`*MerchantUsageEvent`](#merchantusageevent) |
| [`MerchantUsageEvents.Retry`](#retry-event) | Send an event again | [`*MerchantUsageEvent`](#merchantusageevent) |
| [`MerchantUsageEvents.Discard`](#discard-event) | Stop delivering an event | [`*MerchantUsageEvent`](#merchantusageevent) |

## Methods [#methods]

### `MerchantConnection.Get` [#get-connection]

**Signature:** `func (s *MerchantConnectionService) Get(ctx context.Context, opts ...RequestOption) (*MerchantConnection, error)`

Returns the current [`*ba.MerchantConnection`](#merchantconnection). When you have no connection, it returns `nil, nil`, so check for nil before you read a field.

### `MerchantConnection.Create` [#create-connection]

**Signature:** `func (s *MerchantConnectionService) Create(ctx context.Context, params CreateMerchantConnectionParams, opts ...RequestOption) (*MerchantConnection, error)`

| Field | Type | Description |
| --- | --- | --- |
| `Provider` | `ba.MerchantProvider` | `ba.MerchantProviderPolar` or `ba.MerchantProviderDodo` |
| `Environment` | `ba.MerchantEnvironment` | `ba.MerchantEnvironmentSandbox` or `ba.MerchantEnvironmentLive` |
| `Credential` | `ba.Secret` | A Polar Organization Access Token, or a Dodo API key in the mode that matches `Environment`. Never returned |
| `Guard` | `*ba.MerchantGuard` | Checks each end user's plan or balance before every turn. Nil leaves the guard off |

Your provider checks the credential first. A new connection replaces the current one, which is retired as [`Retire`](#retire-connection) does, and customer links do not carry over. Monetization stays off until you set `MonetizationEnabled` with [`Tenant.Update`](/sdk/go/tenant#update). Fails with [`merchant_connection_in_use`](/api-reference/protocols/errors#merchant_connection_in_use) (409) while the current connection cannot be retired, [`merchant_credential_invalid`](/api-reference/protocols/errors#merchant_credential_invalid) (422), [`merchant_provider_unavailable`](/api-reference/protocols/errors#merchant_provider_unavailable) (503), or [`validation_failed`](/api-reference/protocols/errors#validation_failed), which carries one `merchant_guard_id_unknown` issue for each guard ID your provider does not know.

### `MerchantConnection.Update` [#update-connection]

**Signature:** `func (s *MerchantConnectionService) Update(ctx context.Context, params UpdateMerchantConnectionParams, opts ...RequestOption) (*MerchantConnection, error)`

`ba.UpdateMerchantConnectionParams` has `Credential` and `Guard`; a field you leave zero keeps its value. A new `Credential` must belong to the same merchant account; to switch accounts, create a new connection. `Guard` replaces the whole guard. Fails with [`merchant_connection_not_found`](/api-reference/protocols/errors#merchant_connection_not_found), [`merchant_account_mismatch`](/api-reference/protocols/errors#merchant_account_mismatch) (409), `merchant_credential_invalid`, `merchant_provider_unavailable`, or `validation_failed`.

### `MerchantConnection.Retire` [#retire-connection]

**Signature:** `func (s *MerchantConnectionService) Retire(ctx context.Context, opts ...RequestOption) error`

Retires the connection. Its `failed` events are discarded and its credential is deleted at once, so nothing more is delivered through it. Fails with `merchant_connection_in_use` while a turn or task run that started on the connection is still running or one of its events is `pending`; retry `pending` events whose `NextAction` is `retry` first. Also fails with `merchant_connection_not_found`.

### `MerchantBindings.List` [#list-bindings]

**Signature:** `func (s *MerchantBindingsService) List(ctx context.Context, params ListMerchantBindingsParams, opts ...RequestOption) (*MerchantBindingList, error)`

Lists the current connection's bindings, sorted by `UserID`. `ba.ListMerchantBindingsParams` has `UserID` to return only one end user's binding, `Cursor`, and `Limit`, within the [page size limit](/api-reference/protocols/service-limits#merchant-page). Returns a `*ba.MerchantBindingList` with `Bindings` and `NextCursor`, which is `""` on the last page; `All` walks every page lazily. Fails with `merchant_connection_not_found`, `validation_failed`, or [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor).

### `MerchantBindings.Set` [#set-binding]

**Signature:** `func (s *MerchantBindingsService) Set(ctx context.Context, userID string, params SetMerchantBindingParams, opts ...RequestOption) (*MerchantBinding, error)`

Links the end user with this `userID` to the customer in `CustomerID`, or changes the customer an existing link points to. `userID` is the ID you send with that user's turns. Your provider checks that the customer exists first. Fails with [`merchant_customer_not_found`](/api-reference/protocols/errors#merchant_customer_not_found) (422), `merchant_connection_not_found`, `merchant_provider_unavailable`, or `validation_failed`.

### `MerchantBindings.Delete` [#delete-binding]

**Signature:** `func (s *MerchantBindingsService) Delete(ctx context.Context, userID string, opts ...RequestOption) error`

Removes the end user's link. Their usage is then recorded as `discarded` and never billed, even after you link them again. Fails with [`merchant_binding_not_found`](/api-reference/protocols/errors#merchant_binding_not_found), `merchant_connection_not_found`, or `validation_failed`.

### `MerchantUsageEvents.List` [#list-events]

**Signature:** `func (s *MerchantUsageEventsService) List(ctx context.Context, params ListMerchantUsageEventsParams, opts ...RequestOption) (*MerchantUsageEventList, error)`

Lists usage events, one per turn, newest first. `ba.ListMerchantUsageEventsParams` has `Status` to return only one `ba.MerchantUsageEventStatus`, `Cursor`, and `Limit`, within the [page size limit](/api-reference/protocols/service-limits#merchant-page). Returns a `*ba.MerchantUsageEventList` with `Events` and `NextCursor`; `All` walks every page lazily. Fails with `validation_failed` or `invalid_cursor`.

### `MerchantUsageEvents.Summary` [#event-summary]

**Signature:** `func (s *MerchantUsageEventsService) Summary(ctx context.Context, params MerchantUsageSummaryParams, opts ...RequestOption) (*MerchantUsageSummary, error)`

Shows whether usage is reaching your provider. `Days` sets the UTC days in the daily series, ending today, within the [summary window limit](/api-reference/protocols/service-limits#merchant-usage-summary-days). Returns a [`*ba.MerchantUsageSummary`](#merchantusagesummary). Fails with `validation_failed`.

### `MerchantUsageEvents.Get` [#get-event]

**Signature:** `func (s *MerchantUsageEventsService) Get(ctx context.Context, eventID MerchantUsageEventID, opts ...RequestOption) (*MerchantUsageEvent, error)`

Returns one [`*ba.MerchantUsageEvent`](#merchantusageevent) with the exact `Payload` sent to your provider. Fails with [`merchant_event_not_found`](/api-reference/protocols/errors#merchant_event_not_found) or `validation_failed`.

### `MerchantUsageEvents.Retry` [#retry-event]

**Signature:** `func (s *MerchantUsageEventsService) Retry(ctx context.Context, eventID MerchantUsageEventID, opts ...RequestOption) (*MerchantUsageEvent, error)`

Sends a `failed` event again, or a `pending` event whose `NextAction` is `retry`. The event goes back to `pending` with the same payload. Retrying is safe because your provider drops duplicates by event ID. Fix the cause of a `failed` event, such as a revoked credential, first. Fails with [`merchant_event_state_conflict`](/api-reference/protocols/errors#merchant_event_state_conflict) (409) for an event in another state, `merchant_event_not_found`, or `validation_failed`.

### `MerchantUsageEvents.Discard` [#discard-event]

**Signature:** `func (s *MerchantUsageEventsService) Discard(ctx context.Context, eventID MerchantUsageEventID, opts ...RequestOption) (*MerchantUsageEvent, error)`

Marks an `incomplete`, `failed`, or `expired` event as `discarded`, so Blazing Agents stops trying to deliver it. The event stays in the list. Correct an `expired` event in your provider directly. Fails with `merchant_event_state_conflict` for an event in another state, `merchant_event_not_found`, or `validation_failed`.

## Response models [#response-models]

### `MerchantConnection` [#merchantconnection]

| Field | Type | Description |
| --- | --- | --- |
| `ID` | `ba.MerchantConnectionID` | Connection ID |
| `Provider`, `Environment` | `ba.MerchantProvider`, `ba.MerchantEnvironment` | Your provider and its environment |
| `MerchantAccountID` | `string` | Your account at the provider |
| `KeyFragment` | `string` | Last characters of the credential, for display |
| `Guard` | `ba.MerchantGuard` | `Enabled`, `ProductIDs`, and `MeterID`. An enabled guard needs at least one product ID or a meter ID, and takes a [limited number of product IDs](/api-reference/protocols/service-limits#monetization-guard-products). See [guard rules](/platform/monetization#guard-rules) |
| `ConfigVersion` | `int64` | Incremented on each change |
| `CreatedAt`, `UpdatedAt` | `time.Time` | Timestamps |

### `MerchantBinding` [#merchantbinding]

A `ba.MerchantBinding` has `UserID`, `CustomerID`, `CreatedAt`, and `UpdatedAt`.

### `MerchantUsageEvent` [#merchantusageevent]

| Field | Type | Description |
| --- | --- | --- |
| `ID` | `ba.MerchantUsageEventID` | Event ID (`mev_...`) |
| `TurnID`, `AgentID`, `SessionID` | `ba.TurnID`, `ba.AgentID`, `*ba.SessionID` | The turn the usage came from |
| `ConnectionID`, `Provider` | `ba.MerchantConnectionID`, `ba.MerchantProvider` | The connection it is delivered through |
| `UserID`, `CustomerID` | `string`, `*string` | The end user, and their customer; nil until the user is linked |
| `Model`, `ModelProvider` | `string`, `ba.ProviderType` | The model the turn used |
| `InputTokens`, `OutputTokens`, `TotalTokens` | `int64` | Token counts |
| `TurnStatus` | `ba.MerchantTurnStatus` | `succeeded`, `failed`, or `cancelled` |
| `StartedAt`, `OccurredAt` | `time.Time` | When the turn started and when the usage was recorded |
| `Status` | `ba.MerchantUsageEventStatus` | `pending`, `accepted`, `failed`, `incomplete`, `expired`, or `discarded`. See [delivery states](/platform/monetization#delivery-states) |
| `NextAction` | `ba.MerchantUsageEventAction` | What to do: `wait`, `retry`, `investigate`, `discard`, or `none` |
| `Payload` | `ba.Metadata` | What your provider is sent; nil for `incomplete` events, and possibly for `discarded` ones |
| `AttemptCount`, `LastAttemptAt`, `LastErrorCode` | `int64`, `*time.Time`, `*string` | Delivery attempts and the last failure |
| `AttemptGeneration` | `int64` | Goes up by one with each `Retry` |
| `AcceptedAt` | `*time.Time` | When your provider accepted it |

### `MerchantUsageSummary` [#merchantusagesummary]

`Counts` holds the all-time number of events in each status (`Pending`, `Accepted`, `Failed`, `Incomplete`, `Expired`, and `Discarded`). `LastAcceptedAt` is when an event was last accepted, and `OldestPendingOccurredAt` is when the oldest pending event happened; each is nil when there is none. `Daily` holds one `ba.MerchantUsageDay` per UTC day with `Day`, `AcceptedEvents`, `AcceptedTokens`, and `PendingEvents`.

## Next [#next]

- [Monetization](/platform/monetization)
- [Tenant](/sdk/go/tenant)
- [Usage](/sdk/go/usage)
