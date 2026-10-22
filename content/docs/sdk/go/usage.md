---
title: Usage
description: Read token, request, and duration totals for your tenant or one agent with the Go SDK.
---

# Usage

`client.Usage` reads token, request, and duration usage.

In a route that serves a signed-in end user, call `Get`, `Sessions`, and `ForAgent` on the [scoped client](/sdk/go/client#for-user) from `client.ForUser(userID)`, which counts only that user's usage. The tenant client counts every user's usage and is for your backend's administration. `Overview` is tenant only, so a `*ba.UserClient` does not have it.

Examples are function bodies that receive `ctx context.Context`, `client *ba.Client`, `agentID ba.AgentID`, and `sessionID ba.SessionID`, and return an `error`. Every method also takes the per-call options `ba.WithRequestTimeout`, `ba.WithRequestHeader`, `ba.WithClientRequestID`, and `ba.CaptureResponse`.

```go
usage, err := client.Usage.Get(ctx, ba.UsageParams{
	DateRange: &ba.DateRange{
		From: ba.Date{Year: 2026, Month: time.September, Day: 1},
		To:   ba.Date{Year: 2026, Month: time.September, Day: 30},
	},
})
if err != nil {
	return err
}
fmt.Println(usage.Totals.InputTokens)
return nil
```

## Date ranges [#date-ranges]

Every usage params struct embeds a `*ba.DateRange`, whose `From` and `To` are the UTC `ba.Date` days to cover. Left nil, the period ends today. The [query window limit](/api-reference/protocols/service-limits#usage-query-window) sets the default length and how far apart `From` and `To` can be.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`Overview`](#overview-method) | Tenant usage overview | [`*UsageOverview`](#usageoverview) |
| [`Get`](#get) | Usage over a period, grouped | [`*Usage`](#usage) |
| [`Sessions`](#sessions) | Usage of specific sessions | [`*SessionUsage`](#sessionusagelist) |
| [`ForAgent`](#get-for-agent) | One agent's usage over a period | [`*Usage`](#usage) |

## Methods [#methods]

### `Overview` [#overview-method]

Gets the tenant's usage overview. Tenant only.

```go
overview, err := client.Usage.Overview(ctx, ba.UsageOverviewParams{})
if err != nil {
	return err
}
fmt.Println(overview.Totals.RequestCount)
return nil
```

**Signature:** `func (s *UsageService) Overview(ctx context.Context, params UsageOverviewParams, opts ...RequestOption) (*UsageOverview, error)`

The embedded `DateRange` limits the period, and `Limit` sets rows per ranked breakdown, within the [overview limit](/api-reference/protocols/service-limits#usage-overview-top-n). Returns [`*ba.UsageOverview`](#usageoverview) with `Totals`, `Daily`, `ByAgent`, `ByUser`, `ByModel`, and `ActiveAgentCount`. Fails with `*ba.APIError` whose `Code` is [`validation_failed`](/api-reference/protocols/errors#validation_failed).

### `Get` [#get]

Gets usage over a period, grouped by day by default.

```go
usage, err := client.Usage.Get(ctx, ba.UsageParams{GroupBy: new(ba.UsageGroupByAgent)})
if err != nil {
	return err
}
for _, bucket := range usage.Buckets {
	if bucket.AgentID != nil {
		fmt.Println(*bucket.AgentID, bucket.InputTokens)
	}
}
return nil
```

**Signature:** `func (s *UserUsageService) Get(ctx context.Context, params UsageParams, opts ...RequestOption) (*Usage, error)`

| Field | Type | Description |
| --- | --- | --- |
| `DateRange` | `*ba.DateRange` | The UTC days to cover |
| `AgentID` | `*ba.AgentID` | Only usage by this agent |
| `SessionID` | `*string` | Only usage in this session; `new("")` selects calls made without a session |
| `UserID` | `*string` | For a tenant-wide view on the tenant client: only usage for this end user; `new("")` selects tenant-level usage. Leave it unset on a scoped client |
| `GroupBy` | `*ba.UsageGroupBy` | `ba.UsageGroupByDay`, `ba.UsageGroupByAgent`, `ba.UsageGroupByModel`, `ba.UsageGroupBySession`, or `ba.UsageGroupByUser`. Session grouping returns the top sessions by total tokens |
| `Limit` | `*int` | Sessions returned with session grouping, within the [session ranking limit](/api-reference/protocols/service-limits#usage-session-top-n); other groupings ignore it |

Returns [`*ba.Usage`](#usage). Fails with `validation_failed`.

### `Sessions` [#sessions]

Gets the usage of specific sessions, within the [batch limit](/api-reference/protocols/service-limits#usage-exact-session-batch). On a scoped client, name only that user's sessions.

```go
user, err := client.ForUser("user_0123456789abcdef")
if err != nil {
	return err
}
usage, err := user.Usage.Sessions(ctx, ba.SessionUsageParams{
	SessionIDs: []ba.SessionID{sessionID},
})
if err != nil {
	return err
}
for _, entry := range usage.Data {
	fmt.Println(entry.SessionID, entry.Totals.InputTokens)
}
return nil
```

**Signature:** `func (s *UserUsageService) Sessions(ctx context.Context, params SessionUsageParams, opts ...RequestOption) (*SessionUsage, error)`

The embedded `DateRange` limits the period. An empty `SessionIDs` fails client-side with `*ba.ArgumentError`. Returns [`*ba.SessionUsage`](#sessionusagelist) with one `Data` entry per requested session, each with `SessionID` and `Totals`. Fails with `validation_failed` or [`not_found`](/api-reference/protocols/errors#not_found).

### `ForAgent` [#get-for-agent]

Gets one agent's usage over a period. On a `*ba.UserClient`, it counts only that user's usage of the agent.

```go
user, err := client.ForUser("user_0123456789abcdef")
if err != nil {
	return err
}
usage, err := user.Usage.ForAgent(ctx, agentID, ba.AgentUsageParams{})
if err != nil {
	return err
}
fmt.Println(usage.Totals.OutputTokens)
return nil
```

**Signature:** `func (s *UserUsageService) ForAgent(ctx context.Context, agentID AgentID, params AgentUsageParams, opts ...RequestOption) (*Usage, error)`

Takes the same fields as [`Get`](#get) except `AgentID`. Returns [`*ba.Usage`](#usage). An agent without usage, including one that does not exist, has zero totals and no buckets. Fails with `validation_failed`.

## Response models [#response-models]

### `Usage` [#usage]

| Field | Type | Description |
| --- | --- | --- |
| `Buckets` | `[]ba.UsageBucket` | One bucket per group |
| `Totals` | `ba.UsageTotals` | Usage across all buckets |

Each `ba.UsageBucket` has `InputTokens`, `OutputTokens`, `RequestCount` (each an `int64`), `Duration` (a `time.Duration`), and the group's key: `Day`, `AgentID`, `SessionID`, `UserID`, or `Provider` and `Model`, each nil when unused. `ba.UsageTotals` has the same four counters.

### `SessionUsage` [#sessionusagelist]

`Data` holds one entry per requested session, in request order. Each has `SessionID` and `Totals`, a `ba.UsageTotals`.

### `UsageOverview` [#usageoverview]

| Field | Type | Description |
| --- | --- | --- |
| `Totals` | `ba.UsageTotals` | Totals for the range |
| `Daily` | `[]ba.UsageBucket` | One bucket per day in the range, oldest first, including days with no usage |
| `ByAgent`, `ByUser` | `[]ba.UsageBucket` | Top agents and end users, up to `Limit` each. Tenant-level usage appears with `UserID` `""` |
| `ByModel` | `[]ba.UsageBucket` | Usage per model. A last bucket with nil `Provider` and `Model` holds the remainder, so the list adds up to `Totals` |
| `ActiveAgentCount` | `int64` | Agents with any usage in the range, including those beyond `Limit` |

## Next [#next]

- [Usage and quotas](/platform/usage-and-quotas)
- [Tenant](/sdk/go/tenant)
