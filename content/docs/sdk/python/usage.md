---
title: Usage
description: Read token, request, and duration totals for your tenant or one agent with the Python SDK.
---

# Usage

`client.usage` reports how many tokens, requests, and milliseconds your agents used, by day, agent, model, session, or end user. Use it for dashboards, per-customer reporting, or spotting a runaway agent. These numbers are operational measurements, not invoices.

Examples assume `client = BlazingAgents()`. Every method also accepts `extra_headers` and `timeout`. On `AsyncBlazingAgents`, await the same method names.

To show an end user their own usage, call `get()`, `sessions()`, and `get_for_agent()` on [`client.for_user(verified_user_id)`](/sdk/python/client#for-user), which counts only that user's usage. The tenant client counts every user's usage and is for your backend's administration. `overview()` is on the tenant client only.

```python
usage = client.usage.get(group_by="agent")
for bucket in usage.buckets:
    print(bucket.agent_id, bucket.input_tokens, bucket.output_tokens)
print(usage.totals.request_count)
```

## Date ranges [#date-ranges]

Every method takes an optional `from_` and `to`, inclusive UTC dates such as `"2026-09-01"`. Pass both or neither. The [usage query window](/api-reference/protocols/service-limits#usage-query-window) sets the default range and the longest custom range. The argument is `from_` because `from` is a Python keyword.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`overview()`](#overview-method) | Get dashboard totals and top breakdowns | `UsageOverview` |
| [`get()`](#get) | Get usage for your tenant | `Usage` |
| [`sessions()`](#sessions) | Get exact totals for selected sessions | `SessionUsageList` |
| [`get_for_agent()`](#get-for-agent) | Get usage for one agent | `Usage` |

## Methods [#methods]

### `overview()` [#overview-method]

Gets everything a usage dashboard needs in one call: totals, a daily series, and the top agents, end users, and models.

```python
dashboard = client.usage.overview(from_="2026-09-01", to="2026-09-07", limit=5)
print(dashboard.totals.request_count, dashboard.active_agent_count)
for day in dashboard.daily:
    print(day.day, day.input_tokens + day.output_tokens)
```

**Signature:** `overview(*, from_=..., to=..., limit=...) -> UsageOverview`

`limit` caps the agent and end-user rankings, within the [overview ranking limit](/api-reference/protocols/service-limits#usage-overview-top-n). Tenant client only. Returns [`UsageOverview`](#usageoverview). Raises `APIStatusError` with [`validation_failed`](/api-reference/protocols/errors#validation_failed) for a partial, reversed, or too-long range, or an invalid limit.

### `get()` [#get]

Gets usage across your tenant, optionally filtered and grouped. On a scoped client, it counts only that user's usage.

```python
user = client.for_user(verified_user_id)
usage = user.usage.get(
    from_="2026-09-01",
    to="2026-09-20",
    group_by="day",
)
```

**Signature:** `get(*, from_=..., to=..., agent_id=..., session_id=..., user_id=..., group_by=..., limit=...) -> Usage`

| Parameter | Type | Description |
| --- | --- | --- |
| `agent_id` | `str` | Only this agent |
| `session_id` | `str` | Only this session; `""` selects calls outside any session, such as `completion()` |
| `user_id` | `str` | Tenant client: only this end user; `""` selects tenant-level usage |
| `group_by` | `UsageGroupBy` | `"day"` (default), `"agent"`, `"model"`, `"session"`, or `"user"` |
| `limit` | `int` | Number of top sessions, within the [session ranking limit](/api-reference/protocols/service-limits#usage-session-top-n). Only applies to `group_by="session"` |

Returns [`Usage`](#usage). Raises `validation_failed` for a bad range, filter, grouping, or limit.

### `sessions()` [#sessions]

Returns exact totals for the session IDs you provide. Use it when you already have a list of sessions and need each one's usage. The result keeps the input order and includes zero totals for a visible session with no usage.

```python
result = client.for_user(verified_user_id).usage.sessions(
    ["ss_0123456789abcdef", "ss_abcdef0123456789"],
    from_="2026-09-01",
    to="2026-09-26",
)
for row in result.data:
    print(row.session_id, row.totals.input_tokens + row.totals.output_tokens)
```

**Signature:** `sessions(session_ids: Sequence[str], *, from_=..., to=...) -> SessionUsageList`

Pass distinct session IDs, within the [batch limit](/api-reference/protocols/service-limits#usage-exact-session-batch). `from_` and `to` follow the [date range rules](#date-ranges). A missing session, or one outside the tenant or user scope, returns `not_found` for the whole request. This method does not rank or truncate sessions. It is also available on a [`for_user()`](/sdk/python/client#for-user) client.

### `get_for_agent()` [#get-for-agent]

Gets usage for one agent.

```python
usage = client.usage.get_for_agent("ag_0123456789abcdef", group_by="session", limit=20)
```

**Signature:** `get_for_agent(agent_id: str, *, from_=..., to=..., session_id=..., user_id=..., group_by=..., limit=...) -> Usage`

Takes the same parameters as [`get()`](#get), except `agent_id`, which is the first argument. The agent does not need to still exist: a deleted agent's history is still reported, and an ID with no usage returns empty buckets and zero totals. It is also available on a [`for_user()`](/sdk/python/client#for-user) client. Raises `validation_failed` for a malformed ID or query.

## Response models [#response-models]

### `Usage` [#usage]

`buckets` is a list of `UsageBucket`, one per group, and `totals` is a `UsageTotals` with `input_tokens`, `output_tokens`, `request_count`, and `duration_ms` summed over the range.

| `UsageBucket` field | Type | Description |
| --- | --- | --- |
| `day` | `str \| None` | Date, when grouped by day |
| `agent_id` | `str \| None` | Agent, when grouped by agent |
| `session_id` | `str \| None` | Session, when grouped by session |
| `user_id` | `str \| None` | End user, when grouped by user; `""` for tenant level |
| `provider`, `model` | `str \| None` | Provider and model, when grouped by model |
| `input_tokens`, `output_tokens` | `int` | Tokens |
| `request_count` | `int` | Requests |
| `duration_ms` | `int` | Total duration in milliseconds |

Fields that do not match the grouping are `None`.

### `SessionUsageList` [#sessionusagelist]

`data` is a list of `SessionUsage`, one per requested session, in request order. Each has `session_id` and `totals`, a `UsageTotals`.

### `UsageOverview` [#usageoverview]

| Field | Type | Description |
| --- | --- | --- |
| `totals` | `UsageTotals` | Totals for the range |
| `daily` | `list[UsageBucket]` | One bucket per day in the range, oldest first, including days with no usage |
| `by_agent`, `by_user` | `list[UsageBucket]` | Top agents and end users, up to `limit` each. Tenant-level usage appears with `user_id=""` |
| `by_model` | `list[UsageBucket]` | Usage per model. A last bucket with `provider` and `model` set to `None` holds the remainder, so the list adds up to `totals` |
| `active_agent_count` | `int` | Agents with any usage in the range, including those beyond `limit` |

## Next [#next]

- [Usage and spending limits](/platform/usage-and-spending-limits)
- [Tenant spending limit](/sdk/python/tenant#update-spending-limit)
- [Tenancy and attribution](/platform/tenancy-and-attribution)
