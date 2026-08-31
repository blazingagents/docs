---
title: Usage
description: Query Tenant-wide and Agent-scoped usage with the Python SDK.
---

# Usage

`client.usage` reads daily rollups of the append-only per-Turn usage log.
These operational measurements are not billing records. The asynchronous
client exposes the same operation names; await each method.

## Overview [#overview]

Queries return input tokens, output tokens, request count, and duration in
milliseconds. They can filter by Agent, Session, or End-user Attribution and
group by `day`, `agent`, `model`, `session`, or `user`.

Supply both `from_` and `to` or neither. The server defaults to the last 30
days ending today in UTC; a custom inclusive range spans at most 31 days.
`group_by` defaults to `day`. `limit` defaults to 50, ranges from 1 to 200,
and affects only the top Sessions returned by `group_by="session"`.

Every method accepts `extra_headers: Mapping[str, str] | None` and
`timeout: Timeout`. `from_` is the Python spelling of the wire parameter
`from`; all other keyword-only arguments are translated to their camel-case
wire names.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`get()`](#get) | Query Tenant-wide usage | `Usage` |
| [`get_for_agent()`](#get-for-agent) | Query usage scoped to one Agent | `Usage` |

## Methods [#methods]

### `get()` [#get]

**Signature:** `get(*, from_: str = ..., to: str = ..., agent_id: str = ..., session_id: str = ..., user_id: str = ..., group_by: UsageGroupBy = ..., limit: int = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Usage`

Returns usage across the authenticated Tenant, optionally narrowed by Agent,
Session, or Attribution.

| Argument | Description |
| --- | --- |
| `from_`, `to` | Inclusive UTC dates (`YYYY-MM-DD`); supply both or neither |
| `agent_id` | Exact Agent filter (`ag_…`) |
| `session_id` | Exact Session filter (`ss_…`); `""` selects stateless Turns |
| `user_id` | Exact Attribution filter; `""` selects Tenant-level usage |
| `group_by` | `day`, `agent`, `model`, `session`, or `user` |
| `limit` | Integer 1–200; top-N limit only for Session grouping |

```python
usage = client.usage.get(
    from_="2026-07-01",
    to="2026-07-20",
    group_by="day",
)
print(usage.totals.request_count)
```

Failures include `validation_failed` for a partial, reversed, or oversized
range or an invalid filter, grouping, or limit. See
[`GET /v1/usage`](/api-reference/rest-api/usage#get-usage).

### `get_for_agent()` [#get-for-agent]

**Signature:** `get_for_agent(agent_id: str, *, from_: str = ..., to: str = ..., session_id: str = ..., user_id: str = ..., group_by: UsageGroupBy = ..., limit: int = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Usage`

Returns usage scoped to the Agent in the path. It accepts the same range,
Session, Attribution, grouping, and limit arguments as `get()`, but not
`agent_id` as a query filter. The aggregation does not require the Agent to
exist; a valid ID with no matching rows returns empty buckets and zero totals.

```python
usage = client.usage.get_for_agent(
    "ag_0123456789abcdef",
    user_id="user-42",
    group_by="session",
    limit=20,
)
```

Failures include `validation_failed` for a malformed Agent ID or invalid
query. See
[`GET /v1/agents/:agentId/usage`](/api-reference/rest-api/usage#get-agent-usage).

## Response models [#response-models]

`Usage` contains `buckets: list[UsageBucket]` and `totals: UsageTotals`.
`UsageBucket` exposes `day`, `agent_id`, `session_id`, `user_id`, `provider`,
`model`, `input_tokens`, `output_tokens`, `request_count`, and `duration_ms`.
Fields unrelated to the selected grouping are `None`; Tenant-level user
grouping retains `user_id=""`. `UsageTotals` exposes the four aggregate
counter fields.

These are Pydantic v2 models that preserve unknown server fields. The
top-level `Usage` carries a non-serialized `_request_id`.

## Async, errors, and request correlation [#async-errors-and-request-correlation]

Async usage uses the same names and arguments:

```python
usage = await async_client.usage.get(group_by="model")
agent_usage = await async_client.usage.get_for_agent(
    "ag_0123456789abcdef",
    group_by="day",
)
```

API failures raise `APIStatusError`; connection and timeout failures raise
`APIConnectionError` and `APITimeoutError`. Inspect `error.request_id` on a
failure or `usage._request_id` on a successful response. The SDK performs no
automatic retries. Use
`client.with_options(client_request_id="report-2026-07")` to send a stable
`X-Client-Request-Id` on these resource requests. See [Client errors and response
observation](/sdk/python/client#errors).

## Related [#related]

- [Usage and quotas](/platform/usage-and-quotas)
- [Tenancy and End-user Attribution](/platform/tenancy-and-attribution)
- [REST Usage](/api-reference/rest-api/usage)
- [TypeScript Usage](/sdk/typescript/usage)
