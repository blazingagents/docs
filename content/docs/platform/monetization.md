---
title: Bill your users for model tokens
description: Send each user's model-token usage to your Polar or Dodo account and charge them with your own prices.
---

# Bill your users for model tokens

Charge your customers for the model tokens they use, through your own Polar or Dodo account. Blazing Agents measures every turn, tags it with your end user, and sends one usage event to your billing provider. You set prices, allowances, and invoices there. Blazing Agents never handles your customers' payments, and your own Blazing Agents bill stays separate.

## Who does what [#who-does-what]

- **Blazing Agents** measures each turn's tokens, creates one usage event per turn, and keeps delivering it until your provider accepts it or you resolve it.
- **Your backend** links each of your users (`userId`) to a customer in your billing provider.
- **Polar or Dodo** turns events into charges: meters, prices, allowances, credit balances, and invoices.

Monetization is off until you turn it on. While it is off, nothing is sent to your provider.

## Set up monetization [#set-up-monetization]

You can do every step in the dashboard under **Monetization**, or from your backend with the TypeScript SDK as shown here. The Python SDK has no monetization methods, so from Python use the dashboard or the [REST API](/api-reference/rest-api/merchant).

<Steps>
<Step>
### Connect your billing account

Create one connection with your provider, the environment (`sandbox` or `live`), and a credential:

```typescript
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});

await client.merchantConnection.create({
  provider: "polar",
  environment: "sandbox",
  credential: process.env.POLAR_ACCESS_TOKEN!,
});
await client.tenant.patch({ monetizationEnabled: true });
```

- **Polar:** use an Organization Access Token (`polar_oat_...`) with `organizations:read`, `customers:read`, and `events:write`, and nothing else.
- **Dodo:** use an API key from your Dodo dashboard in the mode that matches the environment.

Blazing Agents checks the credential with your provider before the connection goes live. After that, only a short fragment of it is shown.
</Step>
<Step>
### Link users to customers

When a user signs up or starts a paid plan, create the customer in your provider, then link your `userId` to it:

```typescript
await client.merchantBindings.put({
  userId: "app:user-42",
  customerId: "cus_from_polar_or_dodo",
});
```

Blazing Agents checks that the customer exists. Usage for a user with no link is held as `unmapped`, never sent as zero. Link the user, then release those events.
</Step>
<Step>
### Create a meter

In your provider, create a meter for events named `ba.model_tokens.v1`, using the recipes below. Attach it to a price or an allowance so usage turns into charges.
</Step>
<Step>
### Optionally require a paid plan

Turn on the guard to check each user's plan or balance with your provider before every turn starts:

```typescript
await client.merchantConnection.update({
  guard: {
    enabled: true,
    productIds: ["prod_..."],
    meterId: "meter_or_credit_entitlement_id",
  },
});
```

See [guard rules](#guard-rules) for what each setting requires.
</Step>
</Steps>

## Provider meter recipes [#provider-meter-recipes]

Every event is named `ba.model_tokens.v1` and carries this flat metadata, so meters can filter and sum without nested paths:

| Metadata key | Type | Contents |
| ------------ | ---- | -------- |
| `input_tokens` | number | Prompt tokens for the turn |
| `output_tokens` | number | Completion tokens for the turn |
| `total_tokens` | number | `input_tokens + output_tokens` |
| `model` | string | The model ID |
| `model_provider` | string | The upstream model provider |
| `ba_event_id` | string | The `mev_` event ID, also used to drop duplicates |
| `turn_id` | string | The turn that used the tokens |
| `agent_id` | string | The agent that ran the turn |
| `session_id` | string | The session, omitted for calls without one |
| `status` | string | The turn outcome: `succeeded`, `failed`, or `cancelled` |

### Polar

Create a meter that filters on event name `ba.model_tokens.v1` with a **Sum** over `total_tokens`. For separate prompt and completion prices, create one meter over `input_tokens` and one over `output_tokens`. Add filters on `model` for per-model prices, or on `status` to bill only `succeeded` turns. Then attach a metered price to a product, or grant an allowance with a metered benefit.

Polar drops duplicates by the event's `external_id`, which holds the `mev_` ID, so a resent event is never billed twice. An event Polar accepts late is billed in the cycle it arrives.

### Dodo

Create a meter with **Event Name** `ba.model_tokens.v1` (case-sensitive) and a **Sum** **Over Property** `total_tokens`, or use `input_tokens` and `output_tokens` for split pricing. Attach it to a usage-based product, then set a per-unit price, or turn on **Bill usage in Credits** and link a **Credit Entitlement** for prepaid allowances. Meter filters can match `model` or `status`.

Dodo drops duplicates by `event_id`, the `mev_` ID. Dodo rejects events older than one hour, so an event that misses that window is marked `expired` and needs a correction in Dodo.

## Guard rules [#guard-rules]

| Rule | `productIds` | `meterId` | A turn is allowed when |
| ---- | ------------ | --------- | ---------------------- |
| Subscription only | one or more | `null` | The customer has an active subscription to a listed product. Otherwise: [`merchant_subscription_required`](/api-reference/protocols/errors#merchant_subscription_required). |
| Balance only | empty | set | The meter or credit balance is above zero. Otherwise: [`merchant_balance_required`](/api-reference/protocols/errors#merchant_balance_required). |
| Both | one or more | set | Both conditions hold. |

On Polar, `meterId` is the meter shown in the customer's state. On Dodo, it is the credit entitlement ID. A user with no linked customer gets [`merchant_customer_unmapped`](/api-reference/protocols/errors#merchant_customer_unmapped).

The guard checks only when a turn starts. A turn can still run past a balance while it runs. If your provider cannot be reached, the turn is refused with [`merchant_eligibility_unavailable`](/api-reference/protocols/errors#merchant_eligibility_unavailable).

## Delivery states [#delivery-states]

`client.merchantUsageEvents.list()` shows every event with a `status` and a suggested `nextAction`:

| Status | Meaning | Next action |
| ------ | ------- | ----------- |
| `pending` | Waiting or being delivered | `wait`, or `retry` once automatic delivery gives up |
| `accepted` | Your provider confirmed it | none |
| `uncertain` | A temporary failure, and the event may have arrived | `retry`, which is safe because duplicates are dropped |
| `failed` | Your provider rejected it, for example because of a revoked credential | `retry` after you fix the cause |
| `unmapped` | No customer linked to the `userId` | `bind_and_release`: link the user, then call `release` |
| `incomplete` | The event could not be built | `investigate` |
| `expired` | Dodo's one-hour window passed | `discard`, then correct it in Dodo |
| `discarded` | You discarded it, or monetization was off | none |

Events never change after they are created. For an `uncertain` event, you can check your provider first: Dodo can look up events by `event_id`, and Polar can search by the `ba_event_id` metadata.

## Things to know [#things-to-know]

- Turning monetization off discards every event your provider has not accepted yet. Your connection and customer links stay, but turning it back on does not recover discarded events or backfill usage.
- An accepted event means your provider received it. It is not proof of an invoice, so settle billing disputes in your provider.
- `unmapped` and `incomplete` events wait in the list until you link, retry, or discard them.
- Deleting your account is scheduled 24 hours ahead and can be cancelled until then. Unresolved events are deleted with the account, and usage still arriving at that point is not billed.

## Next [#next]

- [Tenancy and attribution](/platform/tenancy-and-attribution) to choose stable `userId` values.
- [Usage and quotas](/platform/usage-and-quotas) to see the same usage in Blazing Agents.
