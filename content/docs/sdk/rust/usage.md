---
title: Usage
description: Read token, request, and duration totals for your tenant or one agent with the Rust SDK.
---

# Usage

`client.usage()` reads token, request, and duration usage. The overview is tenant only: a `UserClient` has `get()`, `sessions()`, and `get_for_agent()` but not `overview()`.

Examples receive a `client: blazing_agents::Client`. Every call also takes the `with_timeout`, `without_timeout`, `with_header`, and `with_client_request_id` transport options.

In a route that serves a signed-in end user, call these methods on the [scoped client](/sdk/rust/client#for-user) from `client.for_user()`, which counts only that user's usage. The tenant client counts every user's usage and is for your backend's administration, as in this tenant-wide report:

```rust
let usage = client
    .usage()
    .get()
    .range("2026-09-01", "2026-09-30")
    .await?;
println!("{}", usage.totals.input_tokens);
```

## Date ranges [#date-ranges]

The `range` setter takes the UTC `YYYY-MM-DD` days to cover, `from` first and `to` last, within the [usage query window](/api-reference/protocols/service-limits#usage-query-window). Omitted, the period is the last 30 days ending today.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`overview()`](#overview-method) | Tenant usage overview | [`UsageOverview`](#usageoverview) |
| [`get()`](#get) | Usage over a period, grouped | [`Usage`](#usage) |
| [`sessions()`](#sessions) | Usage of specific sessions | [`SessionUsage`](#sessionusagelist) |
| [`get_for_agent()`](#get-for-agent) | One agent's usage over a period | [`Usage`](#usage) |

## Methods [#methods]

### `overview()` [#overview-method]

Gets the tenant's usage overview. Tenant only.

```rust
let overview = client.usage().overview().await?;
println!("{}", overview.totals.request_count);
```

**Signature:** `overview() -> Call<GetUsageOverview>`

The `range` setter limits the period, and `limit` sets rows per ranked breakdown, within the [overview ranking limit](/api-reference/protocols/service-limits#usage-overview-top-n). Awaiting returns [`UsageOverview`](#usageoverview) with `totals`, `daily`, `by_agent`, `by_user`, `by_model`, and `active_agent_count`. Fails with `Error::Api` whose code is [`validation_failed`](/api-reference/protocols/errors#validation_failed).

### `get()` [#get]

Gets usage over a period, grouped by day by default.

```rust
use blazing_agents::usage::UsageGroupBy;

let usage = client
    .usage()
    .get()
    .group_by(UsageGroupBy::Agent)
    .await?;
for bucket in &usage.buckets {
    println!("{:?} {}", bucket.agent_id, bucket.input_tokens);
}
```

**Signature:** `get() -> Call<GetUsage>`

| Setter | Description |
| --- | --- |
| `range(from, to)` | The UTC days to cover |
| `agent_id(agent_id)` | Only usage by this agent |
| `session_id(session_id)` | Only usage in this session; `""` selects calls made without a session |
| `user_id(user_id)` | Only usage for this end user; `""` selects tenant-level usage |
| `group_by(group_by)` | `UsageGroupBy::Day`, `Agent`, `Model`, `Session`, or `User`. `Session` returns the top sessions by total tokens |
| `limit(limit)` | Sessions returned with `Session` grouping, within the [session ranking limit](/api-reference/protocols/service-limits#usage-session-top-n); other groupings ignore it |

Awaiting returns [`Usage`](#usage). Fails with `validation_failed`.

### `sessions()` [#sessions]

Gets the usage of specific sessions, within the [session batch limit](/api-reference/protocols/service-limits#usage-exact-session-batch).

```rust
let user = client.for_user("user_0123456789abcdef")?;
let usage = user
    .usage()
    .sessions(["ss_0123456789abcdef"])
    .await?;
for entry in &usage.data {
    println!("{} {}", entry.session_id, entry.totals.input_tokens);
}
```

**Signature:** `sessions(session_ids: impl IntoIterator<Item = impl Into<SessionId>>) -> Call<GetSessionUsage>`

The `range` setter limits the period. Awaiting returns [`SessionUsage`](#sessionusagelist) with `data: Vec<SessionUsageEntry>` (`session_id`, `totals`), one entry per requested session. Fails with `validation_failed` or [`not_found`](/api-reference/protocols/errors#not_found).

### `get_for_agent()` [#get-for-agent]

Gets one agent's usage over a period.

```rust
let usage = client
    .usage()
    .get_for_agent("ag_0123456789abcdef")
    .await?;
```

**Signature:** `get_for_agent(agent_id: impl Into<AgentId>) -> Call<GetAgentUsage>`

Takes the same setters as [`get()`](#get) except `agent_id`. Awaiting returns [`Usage`](#usage). Fails with `validation_failed`.

## Response models [#response-models]

### `Usage` [#usage]

| Field | Type | Description |
| --- | --- | --- |
| `buckets` | `Vec<UsageBucket>` | One bucket per group |
| `totals` | `UsageTotals` | Usage across all buckets |

Each `UsageBucket` has `input_tokens`, `output_tokens`, `request_count`, `duration_ms`, and the group's key: `day`, `agent_id`, `session_id`, `user_id`, or `provider` and `model`, each `None` when unused. `UsageTotals` has the same four counters.

### `SessionUsage` [#sessionusagelist]

`data` is a `Vec<SessionUsageEntry>`, one per requested session, in request order. Each has `session_id` and `totals`, a `UsageTotals`.

### `UsageOverview` [#usageoverview]

| Field | Type | Description |
| --- | --- | --- |
| `totals` | `UsageTotals` | Totals for the range |
| `daily` | `Vec<UsageBucket>` | One bucket per day in the range, oldest first, including days with no usage |
| `by_agent`, `by_user` | `Vec<UsageBucket>` | Top agents and end users, up to `limit` each. Tenant-level usage appears with `user_id` `""` |
| `by_model` | `Vec<UsageBucket>` | Usage per model. A last bucket with `provider` and `model` `None` holds the remainder, so the list adds up to `totals` |
| `active_agent_count` | `u64` | Agents with any usage in the range, including those beyond `limit` |

## Next [#next]

- [Usage and spending limits](/platform/usage-and-spending-limits)
- [Tenant](/sdk/rust/tenant)
