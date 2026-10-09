---
title: Usage and quotas
description: Track model usage and set token quotas or dollar spending limits for your account and agents.
---

# Usage and quotas

See how many tokens and requests your agents use, broken down the way you need, and set a monthly ceiling so a runaway loop cannot burn through your model budget. Blazing Agents records usage for every turn automatically. A quota is an optional safety limit you set, separate from your plan and billing.

## Query usage and set a quota [#query-usage-and-set-a-quota]

This example prints token totals per agent for July, then caps the account at one million tokens a month:

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

const settings = await client.tenant.patch({
  quota: { monthlyTokenLimit: 1_000_000, monthlyRequestLimit: null, resetDay: 1 },
});
console.log(settings.quota);
```

```python tab="Python"
from blazing_agents import BlazingAgents

client = BlazingAgents()

report = client.usage.get(from_="2026-07-01", to="2026-07-31", group_by="agent")
for bucket in report.buckets:
    print(bucket.agent_id, bucket.input_tokens + bucket.output_tokens)

settings = client.tenant.update(
    quota={"monthly_token_limit": 1_000_000, "monthly_request_limit": None, "reset_day": 1}
)
print(settings.quota)
```

You see one line per agent that ran in July, then the saved quota: a token ceiling of `1000000`, no request ceiling, and a window that resets on the 1st of each month.

## Set a model spending limit [#model-spending-limits]

Set a dollar allowance for one agent, your whole account, or both. An agent's limit covers all its sessions and tasks. The account limit covers all agents, including those without their own limit. The same model cost counts toward both limits when both are enabled.

Use an unscoped tenant credential to read or change these settings. An end user's agent access does not grant permission to change the allowance.

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

For one agent, use `client.agents.updateSpendingLimit({ agentId, spendingLimit })` in TypeScript or `client.agents.update_spending_limit(agent_id=agent_id, spending_limit=...)` in Python. Read account settings with `client.tenant.getSpendingLimit()` or `client.tenant.get_spending_limit()`. For an agent, use `client.agents.getSpendingLimit({ agentId })` or `client.agents.get_spending_limit(agent_id=agent_id)`. Pass `spendingLimit: null` or `spending_limit=None` to disable that limit. Disabling one scope does not disable the other.

### Choose when the allowance resets [#spending-limit-resets]

Resets happen at midnight UTC. Choose `daily`, `weekly`, `biweekly`, or `monthly`. Weekly means every seven days from the start date. Biweekly means every fourteen days, not twice per month.

Monthly resets keep the original day. A January 31 start resets on February 28 or 29, then March 31. If the start date is in the future, the limit applies immediately for a short first period ending on that date. A past start date anchors the current period without adding historical costs.

Changing the schedule preserves the current period's end. The replacement schedule applies afterwards. Check `nextResetAt` and `scheduleChangeAt` in the response. Unused allowance does not carry forward. Changing the dollar amount keeps recorded spending and existing reservations. A lower limit does not cancel requests already admitted.

Disabling and re-enabling a limit within the same period preserves its counters. Usage admitted while that limit was disabled is excluded. Enabling a limit applies to newly started turns; it does not interrupt a turn that started with both limits off.

### Understand the reported dollars [#spending-limit-costs]

The limit covers model tokens, including supported cache usage, priced at supported catalogue rates. It excludes Blazing Agents platform, workspace, storage, and network charges. The estimate can differ from your provider's invoice or negotiated prices.

The feature needs supported model pricing and provider usage data. A provider response does not always contain a dollar amount. A request whose cost cannot be priced is refused when a limit applies. If a dispatched request's usage is unknown, its reserved allowance remains unavailable. A process crash can also leave reserved funds unresolved.

`spentUsd` shows costs already saved. `reservedUsd` shows money set aside for unfinished or unresolved work. `availableUsd` shows what remains available to other work. A running turn may have incurred costs that are still represented by its reservation.

Concurrent turns share the available allowance. Each model request uses a cost estimate before it starts, so actual spending can exceed the limit when the estimate is too low. Treat the allowance as a spending control, not an exact invoice ceiling.

### Handle a spending stop [#spending-limit-stops]

A request blocked before streaming returns HTTP `429` with `model_spending_limit_exceeded`. The details identify the agent or account scope and whether funds are exhausted, reserved, or cannot be priced. Chat and approval-continuation streams report a stop through a `data-model-spending-limit` event. Completion and object streams instead fail with `stream_error` after streaming starts. See [streaming errors](/api-reference/protocols/streaming#spending-stop-events). Completed chat messages and tool results remain available after a handled budget stop.

Do not retry a budget stop automatically. Read the current limit and its reset time. Wait for reserved funds to be settled, wait for the reset, or explicitly increase the allowance. Changing a limit does not undo completed tools or restart a stopped turn.

## What is recorded [#what-is-recorded]

Each turn adds one usage record with input tokens, output tokens, one request, duration, the provider, model, session, and the turn's [user label](/platform/tenancy-and-attribution).

Failed and cancelled turns are recorded too. A turn that fails before the model responds records zero tokens but still counts the request and duration. If it fails after some model steps finished, the tokens from those steps stay in usage.

These reports show model usage, not the infrastructure charges on your Blazing Agents bill. Usage charges can arrive later as measured execution and network usage becomes available. Charges already sent for billing keep their original records. Later decreases create separate corrections; they do not rewrite earlier charges.

## Break down usage [#break-down-usage]

- `client.usage.get()` covers your whole account, and `client.usage.getForAgent()` covers one agent. Group results by `day`, `agent`, `model`, `session`, or `user`, and filter by date range, agent, session, or `userId`.
- `client.usage.overview()` returns what a dashboard needs in one call: totals, every day in the range, your top agents and users, the model mix, and how many agents were active.

Dates are UTC and inclusive. Pass both `from` and `to`, or neither for the last 30 days. Usage includes finished turns, not one still running. See [`usage.get()`](/sdk/typescript/usage#get) for ranges and limits.

## How quotas work [#how-quotas-work]

A quota sets a monthly token ceiling, a request ceiling, or both, plus the day of the month (1 to 28) when the window resets. Update it with `client.tenant.patch()` in TypeScript or `client.tenant.update()` in Python, or remove it with `quota: null` (`quota=None` in Python). With no quota, usage is unlimited.

Blazing Agents checks the current window before each turn starts. It does not stop a turn that crosses the ceiling while running, and several turns running at once can overshoot before their usage lands. Leave headroom.

## Quota and capacity outcomes [#quota-and-capacity-outcomes]

| Situation | What you see |
| --- | --- |
| A chat or generation call starts while usage is over the ceiling | HTTP `429` with [`quota_exceeded`](/api-reference/protocols/errors#quota_exceeded) |
| A chat or generation call starts without an active plan or usage credit | HTTP `402` with [`subscription_required`](/api-reference/protocols/errors#subscription_required) or [`usage_credit_required`](/api-reference/protocols/errors#usage_credit_required) |
| A task run starts while usage is over the ceiling | The run ends as `blocked`, not `failed`, without running |
| A task run lacks a required subscription or usage credit | The run ends as `blocked` |
| Billing status cannot be checked | The run ends as `failed` |
| Too many interactive turns run at once | HTTP `429` with [`rate_limited`](/api-reference/protocols/errors#rate_limited) |
| Too many task runs are active at once | Extra runs wait as `queued` until a slot frees up |

Developer accounts can run 25 interactive turns and 50 task runs at the same time. Pro accounts can run 50 interactive turns and 100 task runs. A blocked task run frees the task for its next scheduled time, which runs normally once the quota allows.

## Production notes [#production-notes]

- Watch real usage for a while before you set ceilings, and alert well before you reach them.
- Work out your window from the reset day, not the calendar month.
- Keep failed and cancelled turns in your reports. They cost tokens too.
- A quota is only a token and request limit. Your plan and its charges are separate.

## Next [#next]

- [Tenancy and attribution](/platform/tenancy-and-attribution) to report usage per end user.
- [Bill your users for model tokens](/platform/monetization) through your own Polar or Dodo account.
- [Task runs](/automation/task-runs) to handle `blocked` runs.
