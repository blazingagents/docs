---
title: Merchant
description: Connect your billing provider, link end users to customers, and manage usage events with the TypeScript SDK.
---

# Merchant

`client.merchantConnection`, `client.merchantBindings`, and `client.merchantUsageEvents` bill your end users' model-token usage through your own Polar or Dodo account. Connect the account once, link each end user to a customer, then watch the usage events Blazing Agents sends. To learn how monetization works, read [Monetization](/platform/monetization).

```typescript
await client.merchantConnection.create({
  provider: "polar",
  environment: "sandbox",
  credential: process.env.POLAR_ACCESS_TOKEN!,
});
await client.merchantBindings.put({ userId: "user_42", customerId: "cus_0123456789" });
await client.tenant.patch({ monetizationEnabled: true });

const { events } = await client.merchantUsageEvents.list({ status: "failed" });
for (const event of events) {
  if (event.nextAction === "retry") await client.merchantUsageEvents.retry({ eventId: event.id });
}
```

These are tenant administration methods, so only the tenant client has them; a [`forUser()`](/sdk/typescript/client#for-user) client does not. Every method takes one input object and accepts an optional `abortSignal`. Usage is billed only while `monetizationEnabled` is on in your [tenant settings](/sdk/typescript/tenant#patch).

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`merchantConnection.get()`](#connection-get) | Read your connection | `MerchantConnectionResponse` |
| [`merchantConnection.create()`](#connection-create) | Connect or replace your billing account | `MerchantConnectionResponse` |
| [`merchantConnection.update()`](#connection-update) | Change the guard or rotate the credential | `MerchantConnectionResponse` |
| [`merchantConnection.retire()`](#connection-retire) | Remove the connection | `void` |
| [`merchantBindings.list()`](#bindings-list) | List end user to customer links | `MerchantBindingsResponse` |
| [`merchantBindings.put()`](#bindings-put) | Link an end user to a customer | `MerchantBindingResponse` |
| [`merchantBindings.delete()`](#bindings-delete) | Remove an end user's link | `void` |
| [`merchantUsageEvents.list()`](#events-list) | List usage events | `MerchantUsageEventsResponse` |
| [`merchantUsageEvents.get()`](#events-get) | Read one event and its payload | `MerchantUsageEventResponse` |
| [`merchantUsageEvents.summary()`](#events-summary) | Check that deliveries are flowing | `MerchantUsageSummaryResponse` |
| [`merchantUsageEvents.retry()`](#events-retry) | Send an event again | `MerchantUsageEventResponse` |
| [`merchantUsageEvents.discard()`](#events-discard) | Stop delivering an event | `MerchantUsageEventResponse` |

## Connection [#connection]

### `merchantConnection.get()` [#connection-get]

Reads your merchant connection.

**Signature:** `get(input?: ResourceRequestOptions): Promise<MerchantConnectionResponse>`

```typescript
const { connection } = await client.merchantConnection.get();
console.log(connection?.provider, connection?.keyFragment);
```

`connection` is `null` when you have none. The credential is never returned; `keyFragment` shows its last few characters.

### `merchantConnection.create()` [#connection-create]

Connects your Polar or Dodo account. Blazing Agents checks the credential with your provider before it saves anything.

**Signature:** `create(input: CreateMerchantConnectionBody & ResourceRequestOptions): Promise<MerchantConnectionResponse>`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `provider` | `"polar" \| "dodo"` | yes | Your billing provider |
| `environment` | `"sandbox" \| "live"` | yes | The provider environment that receives usage |
| `credential` | `string` | yes | A Polar Organization Access Token, or a Dodo API key in the mode that matches `environment`. It is never returned |
| `guard` | `MerchantGuard` | no | Check each end user's plan or balance before every turn starts. Off when left out |

`MerchantGuard` is `{ enabled: boolean; productIds: string[]; meterId: string | null }`. An enabled guard needs at least one product ID or a `meterId`, and each must exist at your provider. `productIds` stays within the [guard product limit](/api-reference/protocols/service-limits#monetization-guard-products). See [guard rules](/platform/monetization#guard-rules).

Creating a connection replaces your current one. The old connection's `failed` events are discarded and its credential is deleted at once. Customer links belong to a connection, so link your end users again afterwards.

Returns [`MerchantConnectionResponse`](#merchantconnectionresponse) with HTTP `201`. Errors: [`validation_failed`](/api-reference/protocols/errors#validation_failed), with an issue coded `merchant_guard_id_unknown` for each unknown guard ID; [`merchant_credential_invalid`](/api-reference/protocols/errors#merchant_credential_invalid); [`merchant_provider_unavailable`](/api-reference/protocols/errors#merchant_provider_unavailable); and [`merchant_connection_in_use`](/api-reference/protocols/errors#merchant_connection_in_use) while a turn or task run that started on the current connection is still running or one of its events is `pending`.

### `merchantConnection.update()` [#connection-update]

Changes the guard, rotates the credential, or both. Fields you leave out keep their current value.

**Signature:** `update(input: UpdateMerchantConnectionBody & ResourceRequestOptions): Promise<MerchantConnectionResponse>`

```typescript
await client.merchantConnection.update({
  guard: { enabled: true, productIds: ["prod_0123456789"], meterId: null },
});
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `credential` | `string` | no | A replacement credential from the same merchant account |
| `guard` | `MerchantGuard` | no | The complete guard, replacing the current one |

To move to another merchant account, create a new connection instead. Returns [`MerchantConnectionResponse`](#merchantconnectionresponse). Errors: `validation_failed`, [`merchant_connection_not_found`](/api-reference/protocols/errors#merchant_connection_not_found), `merchant_credential_invalid`, [`merchant_account_mismatch`](/api-reference/protocols/errors#merchant_account_mismatch), and `merchant_provider_unavailable`.

### `merchantConnection.retire()` [#connection-retire]

Removes your connection. Nothing more is delivered through it, and new usage is no longer recorded against it.

**Signature:** `retire(input?: ResourceRequestOptions): Promise<void>`

```typescript
await client.merchantConnection.retire();
```

The connection's `failed` events are discarded and its credential is deleted at once. Errors: `merchant_connection_not_found`, and `merchant_connection_in_use` while a turn or task run that started on it is still running or one of its events is `pending`. A `pending` event whose `nextAction` is `retry` also blocks removal until you retry it.

## Customer links [#bindings]

### `merchantBindings.list()` [#bindings-list]

Lists the links between your end users and your provider's customers on the current connection, sorted by `userId`.

**Signature:** `list(input?: MerchantBindingsListOptions): Promise<MerchantBindingsResponse>`

```typescript
const { bindings, nextCursor } = await client.merchantBindings.list({ limit: 100 });
```

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `userId` | `string` | no | none | Only this end user's link |
| `limit` | `number` | no | `50` | Page size; see the [merchant page limit](/api-reference/protocols/service-limits#merchant-page) |
| `cursor` | `string` | no | none | `nextCursor` from the previous page |

Returns [`MerchantBindingsResponse`](#merchantbindingsresponse). Errors: `validation_failed`, `merchant_connection_not_found`.

### `merchantBindings.put()` [#bindings-put]

Links one end user to a customer in your provider, or changes the customer an existing link points to. Blazing Agents checks that the customer exists first. That end user's usage then goes to this customer.

**Signature:** `put(input: UpsertMerchantBindingBody & { userId: string } & ResourceRequestOptions): Promise<MerchantBindingResponse>`

```typescript
const { binding } = await client.merchantBindings.put({
  userId: "user_42",
  customerId: "cus_0123456789",
});
```

`userId` is the ID you pass to [`forUser()`](/sdk/typescript/client#for-user) or send with turns. Returns [`MerchantBindingResponse`](#merchantbindingsresponse). Errors: `validation_failed`, `merchant_connection_not_found`, [`merchant_customer_not_found`](/api-reference/protocols/errors#merchant_customer_not_found), and `merchant_provider_unavailable`.

### `merchantBindings.delete()` [#bindings-delete]

Removes one end user's link on the current connection.

**Signature:** `delete(input: { userId: string } & ResourceRequestOptions): Promise<void>`

```typescript
await client.merchantBindings.delete({ userId: "user_42" });
```

That end user's usage is then recorded as `discarded` and never billed, even after you link them again. Errors: `merchant_connection_not_found`, [`merchant_binding_not_found`](/api-reference/protocols/errors#merchant_binding_not_found).

## Usage events [#usage-events]

Blazing Agents records usage events for your provider, one per turn. Each event has a delivery `status` and a suggested `nextAction`. See [delivery states](/platform/monetization#delivery-states).

### `merchantUsageEvents.list()` [#events-list]

Lists usage events, newest first.

**Signature:** `list(input?: MerchantUsageEventsListOptions): Promise<MerchantUsageEventsResponse>`

```typescript
const { events, nextCursor } = await client.merchantUsageEvents.list({ status: "pending" });
```

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `status` | `MerchantUsageEventStatus` | no | none | Only events with this status |
| `limit` | `number` | no | `50` | Page size; see the [merchant page limit](/api-reference/protocols/service-limits#merchant-page) |
| `cursor` | `string` | no | none | `nextCursor` from the previous page |

Returns [`MerchantUsageEventsResponse`](#merchantusageeventsresponse). Errors: `validation_failed`.

### `merchantUsageEvents.get()` [#events-get]

Reads one event, including the exact `payload` sent to your provider.

**Signature:** `get(input: { eventId: string } & ResourceRequestOptions): Promise<MerchantUsageEventResponse>`

```typescript
const { event } = await client.merchantUsageEvents.get({ eventId: "mev_0123456789abcdef" });
```

`payload` is `null` for an `incomplete` event and can be `null` for a `discarded` one. Returns [`MerchantUsageEventResponse`](#merchantusageeventsresponse). Errors: `validation_failed`, [`merchant_event_not_found`](/api-reference/protocols/errors#merchant_event_not_found).

### `merchantUsageEvents.summary()` [#events-summary]

Shows whether usage is reaching your provider: all-time counts per status, when an event was last accepted, when the oldest pending event happened, and a daily series.

**Signature:** `summary(input?: { days?: number } & ResourceRequestOptions): Promise<MerchantUsageSummaryResponse>`

```typescript
const { summary } = await client.merchantUsageEvents.summary({ days: 30 });
console.log(summary.counts.failed, summary.oldestPendingOccurredAt);
```

`days` sets how many UTC days the `daily` series covers, ending today, within the [summary window limit](/api-reference/protocols/service-limits#merchant-usage-summary-days). Returns [`MerchantUsageSummaryResponse`](#merchantusagesummaryresponse). Errors: `validation_failed`.

### `merchantUsageEvents.retry()` [#events-retry]

Sends a `failed` event again, or a `pending` event whose automatic delivery gave up. The event goes back to `pending` with the same payload.

**Signature:** `retry(input: { eventId: string } & ResourceRequestOptions): Promise<MerchantUsageEventResponse>`

```typescript
const { event } = await client.merchantUsageEvents.retry({ eventId: "mev_0123456789abcdef" });
```

Retrying is safe, because your provider drops duplicates by the event ID. Fix the cause of a `failed` event, such as a revoked credential, first. Errors: `validation_failed`, `merchant_event_not_found`, and [`merchant_event_state_conflict`](/api-reference/protocols/errors#merchant_event_state_conflict) for an event in another state.

### `merchantUsageEvents.discard()` [#events-discard]

Marks an `incomplete`, `failed`, or `expired` event as `discarded`, so Blazing Agents stops trying to deliver it. The event stays in the list.

**Signature:** `discard(input: { eventId: string } & ResourceRequestOptions): Promise<MerchantUsageEventResponse>`

```typescript
await client.merchantUsageEvents.discard({ eventId: "mev_0123456789abcdef" });
```

Correct an `expired` event in your provider directly. Errors: `validation_failed`, `merchant_event_not_found`, and `merchant_event_state_conflict` for an event in another state.

## Response types [#response-types]

### `MerchantConnectionResponse` [#merchantconnectionresponse]

```typescript
interface MerchantConnectionResponse {
  connection: MerchantConnection | null;
}

interface MerchantConnection {
  id: string;
  provider: "polar" | "dodo";
  environment: "sandbox" | "live";
  merchantAccountId: string;
  keyFragment: string;
  guard: MerchantGuard;
  configVersion: number;
  createdAt: string;
  updatedAt: string;
}
```

`merchantAccountId` is the provider account the credential belongs to.

### `MerchantBindingsResponse` [#merchantbindingsresponse]

```typescript
interface MerchantBindingsResponse {
  bindings: MerchantCustomerBinding[];
  nextCursor: string | null;
}

interface MerchantBindingResponse {
  binding: MerchantCustomerBinding;
}

interface MerchantCustomerBinding {
  userId: string;
  customerId: string;
  createdAt: string;
  updatedAt: string;
}
```

`MerchantBindingResponse` wraps one link.

### `MerchantUsageEventsResponse` [#merchantusageeventsresponse]

```typescript
interface MerchantUsageEventsResponse {
  events: MerchantUsageEvent[];
  nextCursor: string | null;
}

interface MerchantUsageEventResponse {
  event: MerchantUsageEvent;
}

interface MerchantUsageEvent {
  id: string;
  turnId: string;
  connectionId: string;
  provider: "polar" | "dodo";
  userId: string;
  customerId: string | null;
  agentId: string;
  sessionId: string | null;
  model: string;
  modelProvider: ProviderType;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  turnStatus: "succeeded" | "cancelled" | "failed";
  startedAt: string;
  occurredAt: string;
  status: MerchantUsageEventStatus;
  payload: Record<string, unknown> | null;
  attemptCount: number;
  attemptGeneration: number;
  lastAttemptAt: string | null;
  lastErrorCode: string | null;
  acceptedAt: string | null;
  nextAction: "none" | "wait" | "retry" | "investigate" | "discard";
}

type MerchantUsageEventStatus =
  | "pending"
  | "accepted"
  | "failed"
  | "incomplete"
  | "discarded"
  | "expired";
```

`nextAction` is `retry` for a `failed` event and for a `pending` event whose automatic delivery gave up, and `wait` for any other `pending` event. `sessionId` is `null` for turns without a session. `lastErrorCode` is the code of the last failed delivery attempt, or `null`.

### `MerchantUsageSummaryResponse` [#merchantusagesummaryresponse]

```typescript
interface MerchantUsageSummaryResponse {
  summary: {
    counts: Record<MerchantUsageEventStatus, number>;
    lastAcceptedAt: string | null;
    oldestPendingOccurredAt: string | null;
    daily: { day: string; acceptedEvents: number; acceptedTokens: number; pendingEvents: number }[];
  };
}
```

`counts` covers all time. `daily` has one entry per UTC day in the `days` window.

The package exports `MerchantConnection`, `MerchantConnectionResponse`, `MerchantGuard`, `MerchantProviderKind`, `MerchantCustomerBinding`, `MerchantBindingResponse`, `MerchantBindingsResponse`, `MerchantUsageEvent`, `MerchantUsageEventResponse`, `MerchantUsageEventStatus`, `MerchantUsageEventsResponse`, `MerchantUsageSummary`, `MerchantUsageSummaryResponse`, `CreateMerchantConnectionBody`, `UpdateMerchantConnectionBody`, and `UpsertMerchantBindingBody`.

## Next [#next]

- [Monetization](/platform/monetization)
- [Tenant reference](/sdk/typescript/tenant#patch)
- [Usage reference](/sdk/typescript/usage)
