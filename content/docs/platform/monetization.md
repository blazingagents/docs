---
title: Bill your users for model tokens
description: Collect model-token usage and bill your own customers through your Polar or Dodo merchant account.
---

# Bill your users for model tokens

Merchant monetization lets each Tenant bill its own customers for model-token usage through its own Polar or Dodo merchant account. Blazing Agents records usage per Turn, attributes it to your end user, and delivers one immutable usage event to your provider. Your provider owns invoicing, allowances, and money movement; Blazing Agents never touches your customers' payments and BA's own billing stays entirely separate.

## What each side owns [#what-each-side-owns]

- **Blazing Agents** measures settled Turn usage, freezes one immutable Merchant usage event per Turn, keeps a delivery ledger, and retries delivery durably until the provider accepts the event or you resolve it.
- **Your tenant backend** binds each end user (`userId`) to a provider customer, so usage is attributed to the right payer.
- **Polar or Dodo** owns the meter, pricing, allowances or credit balances, and invoices. The event name and metadata it receives are documented below so you can wire meters without guessing.

## Set up monetization [#set-up-monetization]

<Steps>
<Step>
### Connect your merchant account

Create one Merchant connection per Tenant, in the dashboard under **Monetization** or through `POST /v1/merchant-connection`. A connection stores the provider, the environment (`sandbox` or `live`), and a write-only credential.

- **Polar**: an Organization Access Token (`polar_oat_…`) scoped to the merchant organization. Grant `organizations:read`, `customers:read`, and `events:write`; add nothing else. The token's organization becomes the recorded `merchantAccountId`.
- **Dodo**: an API key from your Dodo dashboard, in the mode matching the environment you select.

The credential is verified against the provider before the connection activates, and only a short `keyFragment` is ever shown afterward.
</Step>
<Step>
### Bind users to provider customers

From your backend, when a user signs up or starts a paid plan, create the provider customer and bind your `userId` to it:

```typescript
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY,
});

// After creating the customer in Polar or Dodo:
await client.merchantBindings.put({
  userId: "user_123",
  customerId: "cust_polar_or_dodo_id",
});
```

The provider validates that the customer exists before the binding is stored. Usage for a `userId` with no binding is recorded as `unmapped` and held until you bind the user and release the events — it is never exported as zero usage. `PUT` replaces an existing binding, `DELETE` removes it, and `list` supports a `userId` filter.
</Step>
<Step>
### Configure provider billing

Point a meter at the `ba.model_tokens.v1` events using the recipes below so usage becomes charges, credits, or allowance consumption.
</Step>
<Step>
### Optionally enable the eligibility guard

The guard checks the bound customer's provider-reported eligibility at every execution admission — before any model call. Configure it on the connection with `productIds` (an active subscription to at least one is required) and/or `meterId` (a positive balance on the meter or credit entitlement is required).

```typescript
await client.merchantConnection.update({
  guard: {
    enabled: true,
    productIds: ["prod_..."],
    meterId: "meter_or_credit_entitlement_id",
  },
});
```

The guard is a provider-reported eligibility check, not a spending lock: it does not track mid-Turn consumption, and a provider outage fails closed with `merchant_eligibility_unavailable` rather than admitting or denying on stale data.
</Step>
</Steps>

## Provider meter recipes [#provider-meter-recipes]

Every delivered event is named `ba.model_tokens.v1` and carries this flat metadata, so meters can filter and aggregate without nested paths:

| Metadata key | Type | Contents |
| ------------ | ---- | -------- |
| `input_tokens` | number | Prompt tokens for the Turn |
| `output_tokens` | number | Completion tokens for the Turn |
| `total_tokens` | number | `input_tokens + output_tokens` |
| `model` | string | Provider-native model ID |
| `model_provider` | string | The upstream model provider |
| `ba_event_id` | string | The immutable `mev_` event ID (also the provider dedup key) |
| `turn_id` | string | The Turn that produced the usage |
| `agent_id` | string | The Agent that ran the Turn |
| `session_id` | string | The Session; omitted for stateless executions |
| `status` | string | The Turn outcome (`succeeded`, `failed`, `cancelled`) |

### Polar

Create a Meter with a filter clause matching event name `ba.model_tokens.v1` and a **Sum** aggregation over `total_tokens`. For separate prompt/completion pricing, create meters aggregating `input_tokens` and `output_tokens` instead. Optional filter clauses can narrow by metadata keys directly — for example `model` for per-model pricing or `status` to bill only `succeeded` Turns. Then attach a metered price to a Product to charge per unit, or grant an allowance through the product's metered benefit.

Polar deduplicates on the event's `external_id`, which carries the `mev_` event ID, so redeliveries are safe. Events Polar accepts late still bill in the cycle in which they are ingested.

### Dodo

Create a Meter whose **Event Name** is `ba.model_tokens.v1` (case-sensitive) with a **Sum** aggregation **Over Property** `total_tokens`; use `input_tokens` or `output_tokens` for split metering. Attach the meter to a usage-based product and either set a per-unit price or toggle **Bill usage in Credits** and link a **Credit Entitlement** for prepaid allowances, choosing the meter-units-per-credit ratio and free threshold. Optional meter filters can match metadata properties such as `model` or `status`.

Dodo deduplicates on `event_id` (the `mev_` event ID). Dodo rejects events older than one hour, so an event that cannot be delivered within that window is marked `expired` in the ledger and requires a provider-side correction rather than a retry.

## Guard rules [#guard-rules]

Choose the rule shape that matches your pricing model:

| Rule | `productIds` | `meterId` | Effect when enabled |
| ---- | ------------ | --------- | ------------------- |
| Subscription-only | one or more | `null` | Requires an active subscription to at least one listed product (`merchant_subscription_required` otherwise) |
| Balance-only | empty | set | Requires a positive balance on the meter/credit entitlement (`merchant_balance_required` otherwise) |
| Both | one or more | set | Requires both an active subscription and a positive balance |

On Polar, `meterId` is the meter whose balance appears on the customer state; on Dodo it is the credit entitlement ID whose per-customer balance is read. A `userId` with no bound customer is denied with `merchant_customer_unmapped`.

## Delivery states and next actions [#delivery-states-and-next-actions]

The ledger (`client.merchantUsageEvents.list()`) shows every event with a `status` and a computed `nextAction`:

| Status | Meaning | Next action |
| ------ | ------- | ----------- |
| `pending` | Queued or delivering | `wait` — or `retry` when the delivery workflow is exhausted |
| `accepted` | Provider confirmed ingestion | none |
| `uncertain` | A transient failure may have landed provider-side | `retry` — deduplication makes retry safe |
| `failed` | Terminal provider rejection (e.g. dead credential) | `retry` after fixing the cause |
| `unmapped` | No customer bound for the `userId` | `bind_and_release` — bind, then release |
| `incomplete` | Payload could not be built for delivery | `investigate` |
| `expired` | Dodo's one-hour ingestion window passed | `discard` + provider-side correction |
| `discarded` | Operator-excluded or force-deletion cleanup | none |

Events are immutable; corrections never rewrite a recorded timestamp or token count. For `uncertain` events you can confirm provider-side state first: Dodo events are retrievable by `event_id`, and Polar events can be searched by `ba_event_id` metadata.

## Limits [#limits]

- Asynchronous provider eligibility is not a spending lock: a Turn can exceed a balance while running, and the guard only gates admission.
- An ingestion receipt confirms the provider accepted the event; it is not invoice proof. Billing disputes are resolved at the provider.
- `unmapped` and `incomplete` events are held in the ledger — never exported as zero usage — until bound, retried, or discarded.
- Tenant deletion holds cleanup until every event reaches `accepted` or `discarded`; a forced deletion discards unresolved events and accepts that their usage is unbilled.
