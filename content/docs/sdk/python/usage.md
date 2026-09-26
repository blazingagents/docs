---
title: Usage
description: Read token, request, and duration totals for your tenant or one agent with the Python SDK.
---

# Usage

`client.usage` reports how many tokens, requests, and milliseconds your agents used, by day, agent, model, session, or end user. Use it for dashboards, per-customer reporting, or spotting a runaway agent. These numbers are operational measurements, not invoices.

Examples assume `client = BlazingAgents()`. Every method also accepts `extra_headers` and `timeout`. On `AsyncBlazingAgents`, await the same method names.

```python
usage = client.usage.get(group_by="agent")
for bucket in usage.buckets:
    print(bucket.agent_id, bucket.input_tokens, bucket.output_tokens)
print(usage.totals.request_count)
```

## Date ranges [#date-ranges]

Every method takes an optional `from_` and `to`, inclusive UTC dates such as `"2026-09-01"`. Pass both or neither. Without them you get the last 30 days, ending today. A custom range can span at most 31 days. The argument is `from_` because `from` is a Python keyword.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`overview()`](#overview-method) | Get dashboard totals and top breakdowns | `UsageOverview` |
| [`get()`](#get) | Get usage for your tenant | `Usage` |
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

`limit` caps the agent and end-user rankings. It is 1 to 20 and defaults to 5. Returns [`UsageOverview`](#usageoverview). Raises `APIStatusError` with [`validation_failed`](/api-reference/protocols/errors#validation_failed) for a partial, reversed, or too-long range, or an invalid limit.

### `get()` [#get]

Gets usage across your tenant, optionally filtered and grouped.

```python
usage = client.usage.get(
    from_="2026-09-01",
    to="2026-09-20",
    user_id="customer_123",
    group_by="day",
)
```

**Signature:** `get(*, from_=..., to=..., agent_id=..., session_id=..., user_id=..., group_by=..., limit=...) -> Usage`

| Parameter | Type | Description |
| --- | --- | --- |
| `agent_id` | `str` | Only this agent |
| `session_id` | `str` | Only this session; `""` selects calls outside any session, such as `completion()` |
| `user_id` | `str` | Only this end user; `""` selects tenant-level usage |
| `group_by` | `UsageGroupBy` | `"day"` (default), `"agent"`, `"model"`, `"session"`, or `"user"` |
| `limit` | `int` | 1 to 200, default 50. Only applies to `group_by="session"`, where it returns the top sessions |

Returns [`Usage`](#usage). Raises `validation_failed` for a bad range, filter, grouping, or limit.

### `get_for_agent()` [#get-for-agent]

Gets usage for one agent.

```python
usage = client.usage.get_for_agent("ag_0123456789abcdef", group_by="session", limit=20)
```

**Signature:** `get_for_agent(agent_id: str, *, from_=..., to=..., session_id=..., user_id=..., group_by=..., limit=...) -> Usage`

Takes the same parameters as [`get()`](#get), except `agent_id`, which is the first argument. The agent does not need to still exist: a deleted agent's history is still reported, and an ID with no usage returns empty buckets and zero totals. Raises `validation_failed` for a malformed ID or query.

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

### `UsageOverview` [#usageoverview]

| Field | Type | Description |
| --- | --- | --- |
| `totals` | `UsageTotals` | Totals for the range |
| `daily` | `list[UsageBucket]` | One bucket per day in the range, oldest first, including days with no usage |
| `by_agent`, `by_user` | `list[UsageBucket]` | Top agents and end users, up to `limit` each. Tenant-level usage appears with `user_id=""` |
| `by_model` | `list[UsageBucket]` | Usage per model. A last bucket with `provider` and `model` set to `None` holds the remainder, so the list adds up to `totals` |
| `active_agent_count` | `int` | Agents with any usage in the range, including those beyond `limit` |

## Next [#next]

- [Usage and quotas](/platform/usage-and-quotas)
- [Tenant quota](/sdk/python/tenant#update)
- [Tenancy and attribution](/platform/tenancy-and-attribution)
