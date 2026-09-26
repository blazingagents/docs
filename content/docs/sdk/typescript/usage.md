---
title: Usage
description: Read token, request, and duration usage by day, agent, model, session, or end user with the TypeScript SDK.
---

# Usage

`client.usage` tells you how many tokens and requests your agents used, and for whom. Use it to build a usage dashboard, show one end user their consumption, or find the sessions that used the most tokens. To learn how usage is counted and how quotas stop runaway spend, read [Usage and quotas](/platform/usage-and-quotas).

```typescript
const { buckets, totals } = await client.usage.get({ groupBy: "user" });
for (const bucket of buckets) {
  console.log(bucket.userId || "(tenant)", bucket.inputTokens + bucket.outputTokens);
}
console.log(totals.requestCount);
```

Every method takes one input object and accepts an optional `abortSignal`. Usage is summed per day. Use it to monitor your agents, not as billing records.

## Date ranges [#date-ranges]

`from` and `to` are UTC dates such as `"2026-09-01"`, both included. Pass both or neither. Without them you get the last 30 days ending today. A range covers at most 31 days.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`overview()`](#overview-method) | Totals, daily series, and top agents, users, and models in one call | `UsageOverviewResponse` |
| [`get()`](#get) | Usage across your tenant, grouped one way | `UsageResponse` |
| [`getForAgent()`](#get-for-agent) | Usage for one agent, grouped one way | `UsageResponse` |

## Methods [#methods]

### `overview()` [#overview-method]

Returns everything a usage dashboard needs in one response.

**Signature:** `overview(input?: Partial<UsageOverviewQuery> & ResourceRequestOptions): Promise<UsageOverviewResponse>`

```typescript
const overview = await client.usage.overview({ from: "2026-09-01", to: "2026-09-07" });
console.log(overview.totals.requestCount, overview.activeAgentCount);
```

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `from` | `string` | with `to` | 30 days ago | First UTC date |
| `to` | `string` | with `from` | today | Last UTC date |
| `limit` | `number` | no | `5` | 1 to 20 rows in each top list |

Returns [`UsageOverviewResponse`](#usageoverviewresponse). Errors: `validation_failed`.

### `get()` [#get]

Returns usage across your tenant, grouped by one dimension and optionally filtered.

**Signature:** `get(input?: Partial<UsageQuery> & ResourceRequestOptions): Promise<UsageResponse>`

```typescript
const usage = await client.usage.get({
  from: "2026-09-01",
  to: "2026-09-26",
  userId: "user_42",
  groupBy: "model",
});
```

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `from` | `string` | with `to` | 30 days ago | First UTC date |
| `to` | `string` | with `from` | today | Last UTC date |
| `groupBy` | `"day" \| "agent" \| "model" \| "session" \| "user"` | no | `"day"` | One bucket per value |
| `agentId` | `string` | no | — | Only this agent |
| `sessionId` | `string` | no | — | Only this session; `""` for turns without a session (`completion()` and `object()`) |
| `userId` | `string` | no | — | Only this end user; `""` for tenant-level usage |
| `limit` | `number` | no | `50` | 1 to 200; with `groupBy: "session"`, returns the top sessions by tokens |

Returns [`UsageResponse`](#usageresponse). Errors: `validation_failed`.

### `getForAgent()` [#get-for-agent]

Returns usage for one agent. It takes the same fields as [`get()`](#get), with `agentId` required.

**Signature:** `getForAgent(input: Partial<UsageQuery> & { agentId: string } & ResourceRequestOptions): Promise<UsageResponse>`

```typescript
const usage = await client.usage.getForAgent({
  agentId,
  userId: "user_42",
  groupBy: "session",
  limit: 20,
});
```

An agent with no usage, including one you deleted, returns empty buckets and zero totals. Returns [`UsageResponse`](#usageresponse). Errors: `validation_failed`.

## Response types [#response-types]

### `UsageBucket` [#usagebucket]

| Field | Type | Description |
| --- | --- | --- |
| `day` | `string \| null` | UTC date, when grouped by day |
| `agentId` | `string \| null` | Agent, when grouped by agent |
| `sessionId` | `string \| null` | Session, when grouped by session; `null` for turns without one |
| `userId` | `string \| null` | End user, when grouped by user; `""` is tenant-level usage |
| `provider` | `string \| null` | Provider, when grouped by model |
| `model` | `string \| null` | Model, when grouped by model |
| `inputTokens` | `number` | Input tokens |
| `outputTokens` | `number` | Output tokens |
| `requestCount` | `number` | Number of turns |
| `durationMs` | `number` | Total time in milliseconds |

Fields that do not match the grouping are `null`.

### `UsageResponse` [#usageresponse]

```typescript
interface UsageResponse {
  buckets: UsageBucket[];
  totals: UsageTotals;
}

interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  requestCount: number;
  durationMs: number;
}
```

### `UsageOverviewResponse` [#usageoverviewresponse]

```typescript
interface UsageOverviewResponse {
  totals: UsageTotals;
  daily: UsageBucket[];
  byAgent: UsageBucket[];
  byUser: UsageBucket[];
  byModel: UsageBucket[];
  activeAgentCount: number;
}
```

- `daily` has one bucket for every day in the range, oldest first, including days with no usage.
- `byAgent` and `byUser` list the top `limit` entries by total tokens, and `byModel` the top `limit` models.
- `byModel` may end with one bucket whose `provider` and `model` are both `null`. It holds all other models, so the model buckets add up to `totals`.
- `activeAgentCount` counts every agent with usage in the range, not only the top ones.

The package exports `UsageBucket`, `UsageTotals`, `UsageOverviewQuery`, and `UsageOverviewResponse`.

## Next [#next]

- [Usage and quotas](/platform/usage-and-quotas)
- [Tenant reference](/sdk/typescript/tenant#patch)
