---
title: Usage and quotas
description: Query per-Turn metering and configure Tenant-set monthly safety ceilings without conflating them with billing.
---

# Usage and quotas

Usage records what each Turn consumed and rolls those records up for reporting. A quota is an optional, Tenant-set monthly token or request safety ceiling; it is not a billing entitlement, plan limit, credit balance, or invoice meter.

## What is metered [#what-is-metered]

Every Turn appends one usage record with input tokens, output tokens, one request count, duration, Agent Version, provider, model, Session or stateless marker, and Attribution. Daily rollups aggregate token, request, and duration fields for queries and quota windows.

Settlement runs for successful, failed, and cancelled Turns. A failure before the model reports usage can therefore record zero tokens but still records the request and duration. If an error or abort happens after completed model steps, tokens already reported by those steps remain in usage. A failed interactive Turn retains only the submitted user message; cancellation leaves its transcript unchanged, though an admitted first Turn has already materialized the Session.

## Query usage [#query-usage]

Use `client.usage.get()` for the Tenant rollup or `getForAgent()` for one Agent. Queries return `totals` plus `buckets` grouped by `day`, `agent`, `model`, `session`, or `user`; filters include date range, Agent, Session, and `userId`. Supplying only one of the `from` and `to` date bounds is invalid, and a custom range is bounded by the [service limits](/api-reference/protocols/service-limits).

The first half of this example queries one grouped Tenant report:

```typescript
import { BlazingAgents } from "@blazing-agents/sdk";

const apiKey = process.env.BLAZING_AGENTS_API_KEY;
if (!apiKey) throw new Error("BLAZING_AGENTS_API_KEY is required");

const client = new BlazingAgents({ apiKey });
const report = await client.usage.get({
  from: "2026-07-01",
  to: "2026-07-31",
  groupBy: "agent",
});

for (const bucket of report.buckets) {
  console.log(bucket.agentId, bucket.inputTokens + bucket.outputTokens);
}

const settings = await client.tenant.patch({
  quota: {
    monthlyTokenLimit: 1_000_000,
    monthlyRequestLimit: null,
    resetDay: 1,
  },
});

console.log(settings.quota?.monthlyTokenLimit, settings.quota?.resetDay);
```

Each non-empty grouped bucket has an `agentId`. The returned Tenant settings show a token ceiling of `1000000`, an unlimited request dimension, and reset day `1`.

## Configure a quota [#configure-a-quota]

Update Tenant settings with positive monthly token and/or request ceilings and a reset day from 1 through 28. A `null` dimension is unlimited. Setting `quota: null` removes the quota row; omitting `quota` from an update leaves the current setting unchanged.

No quota row means unlimited, so enforcement fails open. The platform checks current-window usage before an ordinary Turn. A running Turn is not stopped when it crosses a ceiling, and concurrent Turns can overshoot before their usage settles.

Task runs have quota and billing preflights before creating their Session, but
their Turns reuse the Task admission instead of consuming interactive capacity.
Developer Tenants may run 25 interactive Turns and 50 Task runs concurrently;
Pro Tenants may run 50 interactive Turns and 100 Task runs. Interactive overflow
receives HTTP `429 rate_limited`, while Task run overflow remains `queued` until
Task run capacity is available. Expected quota or billing denials end the run as
`blocked` without executing. Sandbox operations inside a Task run reuse its Task
run admission.

## Quota outcomes [#quota-outcomes]

| Situation | Outcome |
| --- | --- |
| A synchronous Turn starts while current-window usage is over a configured ceiling | HTTP `429` with error code `quota_exceeded` |
| A Task run fails its preflight or later Turn quota gate | Terminal Task run status `blocked`; it is not `failed` |
| A Task run is denied for a missing required subscription or insufficient Usage credit at either billing gate | Terminal Task run status `blocked`; it is not `failed` |
| Billing state is unavailable or returns an unknown error | Terminal Task run status `failed` |
| A Turn fails or is cancelled after consuming model work | Its request, duration, and any usage reported before the failure or abort remain recorded |

A blocked Task run has no execution Session at the preflight path and frees the Task's active-run slot. A later scheduled fire may try again after its admission condition changes.

## Monitor usage and quotas [#monitor-usage-and-quotas]

Query Tenant and Agent totals for the same inclusive UTC date window, preserve any quota dimension you are not changing, and read the settings back to verify persistence:

```typescript
const tenantUsage = await client.usage.get({ from, to, groupBy: "agent" });
const agentUsage = await client.usage.getForAgent(agentId, {
  from,
  to,
  groupBy: "day",
});

if (tenantUsage.totals.requestCount < agentUsage.totals.requestCount) {
  throw new Error("Agent requests exceed the Tenant total");
}

const current = await client.tenant.get();
await client.tenant.patch({
  quota: {
    monthlyRequestLimit,
    monthlyTokenLimit: current.quota?.monthlyTokenLimit ?? null,
    resetDay,
  },
});
const verified = await client.tenant.get();

if (verified.quota?.monthlyRequestLimit !== monthlyRequestLimit) {
  throw new Error("The quota update was not persisted");
}
```

Valid reset days are 1 through 28. Usage reads include settled Turns, not a currently running Turn. Alert before the ceiling and leave headroom for concurrent work.

## Production considerations [#production-considerations]

- Monitor representative usage before enabling ceilings, then alert before the threshold rather than treating rejection as the first signal.
- Calculate operational windows using the configured reset day and account for month boundaries.
- Leave headroom for in-flight and concurrent Turns because quota enforcement is soft and can overshoot.
- Keep failed and cancelled Turn usage visible in operational reporting.
- Treat billing separately. The billing policy defines infrastructure charges and plan entitlements; this quota covers only the implemented Turn token and request counters.

See [Tenancy and end-user attribution](/platform/tenancy-and-attribution), [Limits and reliability](/platform/limits-and-reliability), and [Task runs](/automation/task-runs) for related controls.

## Related concepts [#related-concepts]

- [Task runs](/automation/task-runs)
- [Tenancy and attribution](/platform/tenancy-and-attribution)
- [Limits and reliability](/platform/limits-and-reliability)

## Reference [#reference]

- [TypeScript SDK Usage](/sdk/typescript/usage)
- [Python SDK Usage](/sdk/python/usage)
- [Update Tenant settings](/sdk/typescript/tenant#patch)
- [Python SDK Tenant settings](/sdk/python/tenant#update)
- [REST Usage](/api-reference/rest-api/usage)
- [REST Tenant settings](/api-reference/rest-api/tenant#update-tenant-settings)
- [Task reference](/sdk/typescript/tasks)
- [Python SDK Task reference](/sdk/python/tasks)
- [Errors](/api-reference/protocols/errors)
- [Service limits](/api-reference/protocols/service-limits)
