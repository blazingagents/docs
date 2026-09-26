---
title: Usage and quotas
description: See what every turn consumed, break it down by agent, model, session, or user, and set monthly safety ceilings.
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

## What is recorded [#what-is-recorded]

Each turn adds one usage record with input tokens, output tokens, one request, duration, the agent version, provider, model, session, and the turn's [user label](/platform/tenancy-and-attribution).

Failed and cancelled turns are recorded too. A turn that fails before the model responds records zero tokens but still counts the request and duration. If it fails after some model steps finished, the tokens from those steps stay in usage.

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
