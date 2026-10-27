---
title: Usage and spending limits
description: Track model usage and set dollar spending limits for your account and agents.
---

# Usage and spending limits

See how many tokens and requests your agents use, broken down the way you need, and set a dollar spending limit so a runaway loop cannot burn through your model budget. Blazing Agents records usage for every turn automatically. A spending limit is an optional safety limit you set, separate from your plan and billing.

## Query usage [#query-usage]

This example prints token totals per agent for July:

```typescript tab="TypeScript"
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});

const report = await client.usage.get({
  from: "2026-07-01",
  to: "2026-07-31",
  groupBy: "agent",
});
for (const bucket of report.buckets) {
  console.log(bucket.agentId, bucket.inputTokens + bucket.outputTokens);
}
```

```python tab="Python"
from blazing_agents import BlazingAgents

client = BlazingAgents()

report = client.usage.get(from_="2026-07-01", to="2026-07-31", group_by="agent")
for bucket in report.buckets:
    print(bucket.agent_id, bucket.input_tokens + bucket.output_tokens)
```

```rust tab="Rust"
use blazing_agents::usage::UsageGroupBy;
use blazing_agents::Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::from_env()?;

    let report = client
        .usage()
        .get()
        .range("2026-07-01", "2026-07-31")
        .group_by(UsageGroupBy::Agent)
        .await?;
    for bucket in &report.buckets {
        println!(
            "{:?} {}",
            bucket.agent_id,
            bucket.input_tokens + bucket.output_tokens
        );
    }
    Ok(())
}
```

```go tab="Go"
package main

import (
	"context"
	"fmt"
	"log"
	"time"

	ba "github.com/blazingagents/golang-sdk"
)

func main() {
	ctx := context.Background()
	client, err := ba.NewClient()
	if err != nil {
		log.Fatal(err)
	}

	report, err := client.Usage.Get(ctx, ba.UsageParams{
		DateRange: &ba.DateRange{
			From: ba.Date{Year: 2026, Month: time.July, Day: 1},
			To:   ba.Date{Year: 2026, Month: time.July, Day: 31},
		},
		GroupBy: new(ba.UsageGroupByAgent),
	})
	if err != nil {
		log.Fatal(err)
	}
	for _, bucket := range report.Buckets {
		if bucket.AgentID != nil {
			fmt.Println(*bucket.AgentID, bucket.InputTokens+bucket.OutputTokens)
		}
	}
}
```

You see one line per agent that ran in July.

## Set a model spending limit [#model-spending-limits]

Set a dollar allowance for one agent, your whole account, or both. An agent's limit covers all its sessions and tasks. The account limit covers all agents, including those without their own limit. The same model cost counts toward both limits when both are enabled.

Read and change these limits with your tenant API key. A [user-scoped client](/sdk/typescript/client#for-user) gets [`forbidden`](/api-reference/protocols/errors#forbidden).

This example sets a $25 monthly account allowance. Use a UTC start date to anchor the resets.

```typescript tab="TypeScript"
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});

const budget = await client.tenant.updateSpendingLimit({
  spendingLimit: {
    amountUsd: 25,
    resetStartDate: "2026-10-01",
    resetInterval: "monthly",
  },
});
console.log(budget.period?.spentUsd, budget.nextResetAt);
```

```python tab="Python"
from blazing_agents import BlazingAgents

client = BlazingAgents()

budget = client.tenant.update_spending_limit(
    spending_limit={
        "amount_usd": 25,
        "reset_start_date": "2026-10-01",
        "reset_interval": "monthly",
    }
)
print(budget.period.spent_usd if budget.period else None, budget.next_reset_at)
```

```rust tab="Rust"
use blazing_agents::spending_limits::{ResetInterval, SpendingLimitInput};
use blazing_agents::Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::from_env()?;

    let budget = client
        .tenant()
        .update_spending_limit(Some(SpendingLimitInput::new(
            25.0,
            "2026-10-01",
            ResetInterval::Monthly,
        )))
        .await?;
    println!(
        "{:?} {:?}",
        budget.period.map(|period| period.spent_usd),
        budget.next_reset_at
    );
    Ok(())
}
```

```go tab="Go"
package main

import (
	"context"
	"fmt"
	"log"
	"time"

	ba "github.com/blazingagents/golang-sdk"
)

func main() {
	ctx := context.Background()
	client, err := ba.NewClient()
	if err != nil {
		log.Fatal(err)
	}

	budget, err := client.SpendingLimits.UpdateTenant(ctx, ba.UpdateSpendingLimitParams{
		SpendingLimit: &ba.ModelSpendingLimit{
			AmountUSD:      25,
			ResetStartDate: ba.Date{Year: 2026, Month: time.October, Day: 1},
			ResetInterval:  ba.ResetIntervalMonthly,
		},
	})
	if err != nil {
		log.Fatal(err)
	}
	if budget.Period != nil && budget.NextResetAt != nil {
		fmt.Println(budget.Period.SpentUSD, *budget.NextResetAt)
	}
}
```

For one agent, use `client.agents.updateSpendingLimit({ agentId, spendingLimit })` in TypeScript, `client.agents.update_spending_limit(agent_id=agent_id, spending_limit=...)` in Python, `client.agents().update_spending_limit(agent_id, Some(limit))` in Rust, or `client.SpendingLimits.UpdateAgent(ctx, agentID, params)` in Go. Read account settings with `client.tenant.getSpendingLimit()`, `client.tenant.get_spending_limit()`, `client.tenant().get_spending_limit()`, or `client.SpendingLimits.GetTenant(ctx)`. For an agent, use `client.agents.getSpendingLimit({ agentId })`, `client.agents.get_spending_limit(agent_id=agent_id)`, `client.agents().get_spending_limit(agent_id)`, or `client.SpendingLimits.GetAgent(ctx, agentID)`. Pass `spendingLimit: null`, `spending_limit=None`, `None` in Rust, or a nil `SpendingLimit` in Go to disable that limit. Disabling one scope does not disable the other.

### Choose when the allowance resets [#spending-limit-resets]

Resets happen at midnight UTC. Choose `daily`, `weekly`, `biweekly`, or `monthly`. Weekly means every seven days from the start date. Biweekly means every fourteen days, not twice per month.

Monthly resets keep the original day. A January 31 start resets on February 28 or 29, then March 31. If the start date is in the future, the limit applies immediately for a first period ending on that date. A past start date anchors the current period without adding historical costs.

Changing the schedule moves `nextResetAt` at once, counted from the new schedule and the current time. The current period keeps its start and the spending counted so far. Unused allowance does not carry forward.

Changing only the dollar amount keeps the reset time and the spending counted so far. Lowering the amount does not stop a model request that has already started, and its cost counts in the period when its response arrives.

If you turn a limit off and on again within one period, its spending count picks up where it was. Model requests made while it was off do not count toward it. Turning a limit on affects turns that start afterward. A turn that started with no limit in force runs to the end.

### Understand the reported dollars [#spending-limit-costs]

The limit counts model tokens, including cache tokens, priced from the model price list built into Blazing Agents. It excludes Blazing Agents platform, workspace, storage, network, and web search charges. This cost can differ from your provider's invoice or negotiated prices.

Models from a `custom` provider, and models missing from that price list, cannot be priced. While a limit applies, turns that use them are refused. If a model response arrives without a cost Blazing Agents can determine, its cost is not counted and the turn stops after that response with `unpriced`.

`spentUsd` is the cost of model responses in the current period. `availableUsd` is the amount minus `spentUsd`, never below zero.

Blazing Agents checks the limit before each model request and adds each response's cost after it arrives. A running turn can therefore finish one request past the limit, and concurrent turns can together go over it by about one request each. Treat the allowance as a spending control, not an exact invoice ceiling.

### Handle a spending stop [#spending-limit-stops]

A request blocked before streaming returns HTTP `429` with [`model_spending_limit_exceeded`](/api-reference/protocols/errors#model_spending_limit_exceeded). The error details, and the stream event below, carry `scope`, which names the limit that stopped the request (`agent`, `tenant` for your account, or `both`), and a `reason`:

| `reason` | What happened | What to do |
| --- | --- | --- |
| `exhausted` | Spending reached the limit for this period. | Wait for `nextResetAt`, or raise the amount. |
| `unpriced` | The model has no price in the built-in price list, so the turn is refused before it runs. Or a model response arrived without a cost Blazing Agents could determine, so its cost is not counted and the turn stops after that response, keeping the finished output. | Switch the agent to a priced model, or turn off the limit that applies. |

Chat and approval-continuation streams report a stop that happens mid-turn through a `data-ba-error` event with code `model_spending_limit_exceeded` and the same `details` as the HTTP error. Completion and object streams instead fail with `stream_error`. See [streaming errors](/api-reference/protocols/streaming#spending-stop-events). Chat messages and tool results that finished before the stop stay in the session. A task run that a spending limit refuses before any model work ends as `blocked`. A task run stopped after model work started ends as `failed`, and the work that finished stays in its transcript.

Do not retry a budget stop automatically. Read the current limit and its reset time. Wait for the reset, or increase the allowance. Changing a limit does not undo completed tools or restart a stopped turn.

## What is recorded [#what-is-recorded]

Each turn adds one usage record with input tokens, output tokens, one request, duration, the provider, model, session, and the turn's [user label](/platform/tenancy-and-attribution).

Failed and cancelled turns are recorded too. A turn that fails before the model responds records zero tokens but still counts the request and duration. If it fails after some model steps finished, the tokens from those steps stay in usage.

These reports show model usage, not the compute, network, and web search charges on your Blazing Agents bill. Those charges can reach your bill some time after the work runs, once they are measured.

- **Compute:** if a later measurement is lower, Blazing Agents adds a separate correction in your favor and leaves the original charge as it was. A higher later measurement is never charged to you.
- **Network egress:** Blazing Agents charges it every hour against the billing period's running total. A later measurement inside the period, higher or lower, changes the next hourly charge. About an hour after the period ends, Blazing Agents settles it once more, and later measurements no longer change it. That last settlement can draw on the next period's usage credit.

## Break down usage [#break-down-usage]

- `client.usage.get()` covers your whole account, and `client.usage.getForAgent()` covers one agent. Group results by `day`, `agent`, `model`, `session`, or `user`, and filter by date range, agent, session, or `userId`.
- `client.usage.overview()` returns what a dashboard needs in one call: totals, every day in the range, your top agents and users, the model mix, and how many agents were active.

Dates are UTC and inclusive. Pass both `from` and `to`, or neither for the [default window](/api-reference/protocols/service-limits#usage-query-window). Usage includes finished turns, not one still running. See [`usage.get()`](/sdk/typescript/usage#get) for ranges and limits.

## Limit and capacity outcomes [#limit-and-capacity-outcomes]

| Situation | What you see |
| --- | --- |
| A chat or generation call starts while a model spending limit has nothing left | HTTP `429` with [`model_spending_limit_exceeded`](/api-reference/protocols/errors#model_spending_limit_exceeded) |
| Any call without an active plan, reads included | HTTP `402` with [`subscription_required`](/api-reference/protocols/errors#subscription_required). Tenant settings, chat connections, stopping a turn, and cancelling a task run still work |
| A chat or generation call starts without usage credit | HTTP `402` with [`usage_credit_required`](/api-reference/protocols/errors#usage_credit_required) |
| A task run lacks a required subscription or usage credit | The run ends as `blocked` |
| A task run starts while a model spending limit has nothing left | The run ends as `blocked`, without running |
| A task run starts while your [monetization guard](/platform/monetization) refuses the end user | The run ends as `blocked`, without running |
| A task run starts after you requested account deletion | The run ends as `blocked`, without running |
| Billing status cannot be checked | The run ends as `failed` |
| More turns run at once than your plan's [concurrent turn limit](/api-reference/protocols/service-limits#concurrent-turns) | HTTP `429` with [`rate_limited`](/api-reference/protocols/errors#rate_limited) |
| You create agents, tasks, or workspaces faster than the [creation rate](/api-reference/protocols/service-limits#tenant-resource-creation-rate) | HTTP `429` with `rate_limited` and a `Retry-After` header |
| More task runs are active than your plan's [concurrent task run limit](/api-reference/protocols/service-limits#concurrent-task-runs) | Extra runs wait as `queued` until a slot frees up |

A `blocked` run's `errorCode` names the check that stopped it, such as `usage_credit_required`, `model_spending_limit_exceeded`, `merchant_balance_required`, or `tenant_deleting`. A blocked task run frees the task for its next scheduled time, which runs normally once the limit allows.

## Production notes [#production-notes]

- Watch real usage for a while before you set a spending limit, and alert well before you reach it.
- Keep failed and cancelled turns in your reports. They cost tokens too.
- A spending limit covers model tokens only. Your plan and its other charges are separate.

## Next [#next]

- [Tenancy and attribution](/platform/tenancy-and-attribution) to report usage per end user.
- [Bill your users for model tokens](/platform/monetization) through your own Polar or Dodo account.
- [Task runs](/automation/task-runs) to handle `blocked` runs.
