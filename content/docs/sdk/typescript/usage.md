---
title: Usage
description: Query bounded Tenant-wide and per-Agent token, request, and duration rollups.
---

# Usage

`client.usage` reads append-only per-Turn usage after it has been rolled up daily. Results are operational measurements, not billing records.

## Overview [#overview]

Usage reports input tokens, output tokens, requests, and duration in milliseconds. Queries may filter by Agent, Session, or End-user Attribution and group by `day`, `agent`, `model`, `session`, or `user`.

Supply both `from` and `to` or neither. The default is the last 30 days ending today in UTC; a custom inclusive range spans at most 31 days. `groupBy` defaults to `day`. `limit` defaults to 50, ranges from 1 to 200, and affects only the top Sessions returned by `groupBy: "session"`.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`get()`](#get) | Query Tenant-wide usage | `UsageResponse` |
| [`getForAgent()`](#get-for-agent) | Query usage scoped to one Agent | `UsageResponse` |

## Methods [#methods]

### `get()` [#get]

Returns usage across the Tenant, optionally narrowed by Agent, Session, or Attribution.

**Signature:** `get(query?: Partial<UsageQuery>): Promise<UsageResponse>`

| Query field | Type | Required | Description |
| --- | --- | --- | --- |
| `from` | `string` | with `to` | Inclusive UTC date (`YYYY-MM-DD`) |
| `to` | `string` | with `from` | Inclusive UTC date (`YYYY-MM-DD`) |
| `agentId` | `string` | no | Agent filter (`ag_…`) |
| `sessionId` | `string` | no | Session filter (`ss_…`); `""` selects stateless Turns |
| `userId` | `string` | no | Exact Attribution filter; `""` selects Tenant-level usage |
| `groupBy` | `UsageGroupBy` | no | `day`, `agent`, `model`, `session`, or `user`; defaults to `day` |
| `limit` | `number` | no | Integer 1–200; top-N limit for Session grouping |

```typescript
const usage = await client.usage.get({
  from: "2026-07-01",
  to: "2026-07-20",
  groupBy: "day",
});
```

Returns [`UsageResponse`](#usageresponse). Raises `validation_failed` for a partial, reversed, or oversized range or an invalid filter, grouping, or limit. See [`GET /v1/usage`](/api-reference/rest-api/usage#get-usage).

### `getForAgent()` [#get-for-agent]

Returns usage scoped to the Agent in the path. The aggregation does not require the Agent to exist; a valid ID with no matching rows returns empty buckets and zero totals.

**Signature:** `getForAgent(agentId: string, query?: Partial<UsageQuery>): Promise<UsageResponse>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent scope (`ag_…`) |
| `query` | `Partial<UsageQuery>` | no | Same filters and grouping as `get()` |

The path fixes the Agent scope. If `query.agentId` is supplied, it does not override the path.

```typescript
const usage = await client.usage.getForAgent("ag_0123456789abcdef", {
  userId: "user-42",
  groupBy: "session",
  limit: 20,
});
```

Returns [`UsageResponse`](#usageresponse). Raises `validation_failed` for a malformed Agent ID or invalid usage query. See [`GET /v1/agents/:agentId/usage`](/api-reference/rest-api/usage#get-agent-usage).

## Response types [#response-types]

### `UsageQuery` [#usagequery]

```typescript
type UsageGroupBy = "day" | "agent" | "model" | "session" | "user";

interface UsageQuery {
  from?: string;
  to?: string;
  agentId?: string;
  sessionId?: string;
  userId?: string;
  groupBy: UsageGroupBy;
  limit: number;
}
```

The SDK accepts `Partial<UsageQuery>`, so defaults may fill `groupBy`, `limit`, and the date window.

### `UsageBucket` [#usagebucket]

| Field | Type | Description |
| --- | --- | --- |
| `day` | `string \| null` | UTC date for day grouping; otherwise `null` |
| `agentId` | `string \| null` | Agent ID for Agent grouping; otherwise `null` |
| `sessionId` | `string \| null` | Session ID for Session grouping; stateless usage is `null` |
| `userId` | `string \| null` | Attribution for user grouping; `""` remains the Tenant-level bucket |
| `provider` | `string \| null` | Provider for model grouping; otherwise `null` |
| `model` | `string \| null` | Model for model grouping; otherwise `null` |
| `inputTokens` | `number` | Non-negative input-token count |
| `outputTokens` | `number` | Non-negative output-token count |
| `requestCount` | `number` | Non-negative request count |
| `durationMs` | `number` | Non-negative total duration in milliseconds |

### `UsageResponse` [#usageresponse]

```typescript
interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  requestCount: number;
  durationMs: number;
}

interface UsageResponse {
  buckets: UsageBucket[];
  totals: UsageTotals;
}
```

Fields unrelated to the selected grouping are `null`. See the canonical [Usage schemas](/api-reference/protocols/objects-and-schemas#usage-response).

## Errors [#errors]

SDK request failures throw `BlazingAgentsError`. Branch on its stable `code`, not its message.

| Code | Applies to | Action |
| --- | --- | --- |
| `validation_failed` | Both methods | Correct the date range, ID, filter, grouping, or limit |

Authentication, transport, malformed-response, and service failures may also throw. See [SDK errors](/api-reference/protocols/errors).

## End-to-end workflow [#end-to-end-workflow]

Compare Tenant totals with one Agent's model breakdown over the same range:

```typescript
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({ apiKey: process.env.BLAZING_AGENTS_API_KEY! });
const range = { from: "2026-07-01", to: "2026-07-20" };

const [tenantUsage, agentUsage] = await Promise.all([
  client.usage.get({ ...range, groupBy: "day" }),
  client.usage.getForAgent("ag_0123456789abcdef", {
    ...range,
    groupBy: "model",
  }),
]);

console.log({
  tenantRequests: tenantUsage.totals.requestCount,
  agentModels: agentUsage.buckets.map(({ provider, model, inputTokens }) => ({
    provider,
    model,
    inputTokens,
  })),
});
```

## Related [#related]

- [Usage and quotas](/platform/usage-and-quotas)
- [Monitor usage and quotas](/platform/usage-and-quotas)
- [REST Usage](/api-reference/rest-api/usage)
- [Pagination and filtering](/api-reference/protocols/pagination-and-filtering)
