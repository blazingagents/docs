---
title: Bill your users for model tokens
description: Send each user's model-token usage to your Polar or Dodo account and charge them with your own prices.
---

# Bill your users for model tokens

Charge your customers for the model tokens they use, through your own Polar or Dodo account. Blazing Agents measures every turn, tags it with your end user, and sends one usage event to your billing provider. You set prices, allowances, and invoices there. Blazing Agents never handles your customers' payments, and your own Blazing Agents bill stays separate.

## Who does what [#who-does-what]

- **Blazing Agents** measures each turn's tokens, creates one usage event per turn, and retries its delivery for a while. If delivery still fails, the event waits for you to retry or discard it.
- **Your backend** links each of your users (`userId`) to a customer in your billing provider.
- **Polar or Dodo** turns events into charges: meters, prices, allowances, credit balances, and invoices.

Monetization is off until you turn it on. While it is off, nothing is sent to your provider.

## Set up monetization [#set-up-monetization]

You can do every step in the dashboard under **Monetization**, or from your backend with any SDK as shown here.

<Steps>
<Step>
### Connect your billing account

Create one connection with your provider, the environment (`sandbox` or `live`), and a credential:

```typescript tab="TypeScript"
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

```python tab="Python"
import os

from blazing_agents import BlazingAgents

client = BlazingAgents()

client.merchant_connection.create(
    provider="polar",
    environment="sandbox",
    credential=os.environ["POLAR_ACCESS_TOKEN"],
)
client.tenant.update(monetization_enabled=True)
```

```rust tab="Rust"
use blazing_agents::merchant::{MerchantEnvironment, MerchantProvider};
use blazing_agents::Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::from_env()?;

    client
        .merchant_connection()
        .create(
            MerchantProvider::Polar,
            MerchantEnvironment::Sandbox,
            std::env::var("POLAR_ACCESS_TOKEN")?,
        )
        .await?;
    client
        .tenant()
        .update()
        .monetization_enabled(true)
        .await?;
    Ok(())
}
```

```go tab="Go"
package main

import (
	"context"
	"log"
	"os"

	ba "github.com/blazingagents/golang-sdk"
)

func main() {
	ctx := context.Background()
	client, err := ba.NewClient()
	if err != nil {
		log.Fatal(err)
	}

	_, err = client.MerchantConnection.Create(ctx, ba.CreateMerchantConnectionParams{
		Provider:    ba.MerchantProviderPolar,
		Environment: ba.MerchantEnvironmentSandbox,
		Credential:  ba.NewSecret(os.Getenv("POLAR_ACCESS_TOKEN")),
	})
	if err != nil {
		log.Fatal(err)
	}
	_, err = client.Tenant.Update(ctx, ba.UpdateTenantParams{MonetizationEnabled: new(true)})
	if err != nil {
		log.Fatal(err)
	}
}
```

- **Polar:** use an Organization Access Token (`polar_oat_...`) with `organizations:read`, `customers:read`, and `events:write`. If you turn on the guard, also grant `products:read` and `meters:read`, so Blazing Agents can check the guard's IDs. Grant nothing else.
- **Dodo:** use an API key from your Dodo dashboard in the mode that matches the environment.

Blazing Agents checks the credential with your provider before the connection goes live. After that, only a short fragment of it is shown.
</Step>
<Step>
### Link users to customers

When a user signs up or starts a paid plan, create the customer in your provider, then link your `userId` to it:

```typescript tab="TypeScript"
await client.merchantBindings.put({
  userId: "app:user-42",
  customerId: "cus_from_polar_or_dodo",
});
```

```python tab="Python"
client.merchant_bindings.put("app:user-42", customer_id="cus_from_polar_or_dodo")
```

```rust tab="Rust"
client
    .merchant_bindings()
    .put("app:user-42", "cus_from_polar_or_dodo")
    .await?;
```

```go tab="Go"
_, err := client.MerchantBindings.Set(ctx, "app:user-42", ba.SetMerchantBindingParams{
	CustomerID: "cus_from_polar_or_dodo",
})
return err
```

Blazing Agents checks that the customer exists. Link each user before their first turn. Usage of a user with no link is recorded as `discarded` and never billed, even if you link the user later. To refuse turns from unlinked users instead, turn on the [guard](#guard-rules).
</Step>
<Step>
### Create a meter

In your provider, create a meter for events named `ba.model_tokens.v1`, using the recipes below. Attach it to a price or an allowance so usage turns into charges.
</Step>
<Step>
### Optionally require a paid plan

Turn on the guard to check each user's plan or balance with your provider before every turn starts:

```typescript tab="TypeScript"
await client.merchantConnection.update({
  guard: {
    enabled: true,
    productIds: ["prod_..."],
    meterId: "meter_or_credit_entitlement_id",
  },
});
```

```python tab="Python"
client.merchant_connection.update(
    guard={
        "enabled": True,
        "product_ids": ["prod_..."],
        "meter_id": "meter_or_credit_entitlement_id",
    },
)
```

```rust tab="Rust"
use blazing_agents::merchant::MerchantGuard;

client
    .merchant_connection()
    .update()
    .guard(
        MerchantGuard::new(true)
            .product_ids(["prod_..."])
            .meter_id("meter_or_credit_entitlement_id"),
    )
    .await?;
```

```go tab="Go"
_, err := client.MerchantConnection.Update(ctx, ba.UpdateMerchantConnectionParams{
	Guard: &ba.MerchantGuard{
		Enabled:    true,
		ProductIDs: []string{"prod_..."},
		MeterID:    new("meter_or_credit_entitlement_id"),
	},
})
return err
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

Dodo drops duplicates by `event_id`, the `mev_` ID. Dodo rejects events older than one hour, so an event that misses that window is marked `expired` and needs a correction in Dodo. Retrying an event keeps the time it happened, so retrying a Dodo event more than one hour old also ends it `expired`.

## Guard rules [#guard-rules]

| Rule | `productIds` | `meterId` | A turn is allowed when |
| ---- | ------------ | --------- | ---------------------- |
| Subscription only | one or more | `null` | The customer has an active subscription to a listed product. Otherwise: [`merchant_subscription_required`](/api-reference/protocols/errors#merchant_subscription_required). |
| Balance only | empty | set | The meter or credit balance is above zero. Otherwise: [`merchant_balance_required`](/api-reference/protocols/errors#merchant_balance_required). |
| Both | one or more | set | Both conditions hold. |

On Polar, `meterId` is the meter shown in the customer's state. On Dodo, it is the credit entitlement ID. A user with no linked customer gets [`merchant_customer_unmapped`](/api-reference/protocols/errors#merchant_customer_unmapped).

When you save an enabled guard, Blazing Agents looks up each product and meter ID with your provider. An ID your provider does not know fails the request with [`validation_failed`](/api-reference/protocols/errors#validation_failed), and one issue with the code `merchant_guard_id_unknown` for each unknown ID.

The guard checks only when a turn starts. A turn can still run past a balance while it runs. If your provider cannot be reached, the turn is refused with [`merchant_eligibility_unavailable`](/api-reference/protocols/errors#merchant_eligibility_unavailable). A task run that the guard refuses for a missing customer link, subscription, or balance ends as `blocked`, and its `errorCode` names the refusal.

## Delivery states [#delivery-states]

`client.merchantUsageEvents.list()` (`client.merchant_usage_events.list()` in Python) shows every event with a `status` and a suggested `nextAction`:

| Status | Meaning | Next action |
| ------ | ------- | ----------- |
| `pending` | Waiting or being delivered | `wait`, or `retry` once automatic delivery gives up |
| `accepted` | Your provider confirmed it | none |
| `failed` | Your provider rejected it, for example because of a revoked credential, or delivery ran out of retries | `retry` after you fix the cause. A retry is safe because duplicates are dropped |
| `incomplete` | The turn's usage was not fully measured | `investigate` |
| `expired` | Dodo's one-hour window passed | `discard`, then correct it in Dodo |
| `discarded` | You discarded it, monetization was off, the user had no linked customer, or the connection was removed | none |

Events never change after they are created. Before you retry a `failed` event, you can check whether your provider already has it: Dodo can look up events by `event_id`, and Polar's events explorer can search by the `ba_event_id` metadata.

## Things to know [#things-to-know]

- To pause billing, turn monetization off. It discards every event your provider has not accepted yet. Your connection and customer links stay, but turning it back on does not recover discarded events or backfill usage.
- An accepted event means your provider received it. It is not proof of an invoice, so settle billing disputes in your provider.
- `incomplete` events wait in the list until you discard them.
- Do not delete or replace a customer in Polar or Dodo while that user's usage is still being delivered. If you do, the events that fail because of it can only be discarded.
- You cannot remove or replace your connection while a turn or task run that started on it is still running, or while one of its events is `pending`. The call fails with `merchant_connection_in_use`. When removal succeeds, the connection's `failed` events are discarded and its credential is deleted at once. Nothing more is delivered through it, and a later event of the removed connection shows as `discarded`.
- To switch providers, or to move from `sandbox` to `live`, without losing charges: retry the `failed` events you still want billed, and any `pending` event whose `nextAction` is `retry`. A retried event goes back to `pending`. Wait until no event is `pending`, then replace the connection.
- Customer links belong to a connection. After you replace it, link every user again. Until you do, their usage is recorded as `discarded` and never billed, or their turns are refused if the guard is on.
- Deleting your account is scheduled 24 hours ahead and can be cancelled until then. Unresolved events are deleted with the account, and usage still arriving at that point is not billed.

## Next [#next]

- [Tenancy and attribution](/platform/tenancy-and-attribution) to choose stable `userId` values.
- [Usage and spending limits](/platform/usage-and-spending-limits) to see the same usage in Blazing Agents.
