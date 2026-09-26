---
title: Usage
description: See how many tokens, requests, and minutes your agents use, by day, agent, model, session, or user.
---

# Usage

## Overview [#overview]

See how much your agents use: tokens, requests, and run time, added up over UTC date ranges of up to 31 days. Look at your whole tenant or narrow it to one agent, session, or end user.

## Endpoints [#endpoints]

### GET /v1/usage/overview [#get-usage-overview]

Returns everything a usage dashboard needs in one response: totals, a daily series, and top agents, users, and models.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |

| Query parameter | Type         | Default      | Description                    |
| --------------- | ------------ | ------------ | ------------------------------ |
| `from`, `to`    | `YYYY-MM-DD` | last 30 days | Supply both or neither         |
| `limit`         | integer      | 5            | 1–20 rows per ranked breakdown |

The inclusive date range uses the same 31-day maximum as other usage queries.

#### Response

Returns `200 OK` with [dashboard usage totals and breakdowns](/api-reference/protocols/objects-and-schemas#usage-overview-response).

Response schema: [`usageOverviewResponseSchema`](/api-reference/protocols/objects-and-schemas#usage-overview-response).

```json
{
  "totals": {
    "inputTokens": 120,
    "outputTokens": 80,
    "requestCount": 2,
    "durationMs": 1400
  },
  "daily": [
    {
      "day": "2026-07-10",
      "agentId": null,
      "sessionId": null,
      "userId": null,
      "provider": null,
      "model": null,
      "inputTokens": 120,
      "outputTokens": 80,
      "requestCount": 2,
      "durationMs": 1400
    }
  ],
  "byAgent": [],
  "byUser": [],
  "byModel": [],
  "activeAgentCount": 1
}
```

`daily` has one entry for every day in the range, oldest first, including days with no usage. `byAgent` and `byUser` are sorted by total tokens, highest first, and cut off at `limit`; ties are broken by ID. `byModel` is sorted and cut off the same way, then can add one bucket with `provider: null` and `model: null` for all the models left out, so the model rows still add up to the totals. Tenant-level usage (`userId: ""`) can appear in `byUser`. `activeAgentCount` counts every agent with usage in the range, not only those shown.

#### Errors

`400 validation_failed` for a partial, reversed, or oversized range or an invalid limit. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --get "$BLAZING_AGENTS_BASE_URL/v1/usage/overview" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --data-urlencode "from=2026-07-10" \
  --data-urlencode "to=2026-07-10" \
  --data-urlencode "limit=5"
```

#### SDK and related guides

SDK: [TypeScript `overview`](/sdk/typescript/usage#overview-method) or [Python `overview`](/sdk/python/usage#overview-method). See [Usage and quotas](/platform/usage-and-quotas).

### GET /v1/usage [#get-usage]

Returns your tenant's usage totals and buckets for a range of up to 31 days.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |

| Query parameter | Type         | Default      | Description                                   |
| --------------- | ------------ | ------------ | --------------------------------------------- |
| `from`, `to`    | `YYYY-MM-DD` | last 30 days | Supply both or neither                        |
| `agentId`       | string       | none            | Agent filter                                  |
| `sessionId`     | string       | none            | Session filter; `""` means stateless turns    |
| `userId`        | string       | none            | Attribution filter; `""` means tenant-level   |
| `groupBy`       | string       | `day`        | `day`, `agent`, `model`, `session`, or `user` |
| `limit`         | integer      | 50           | 1–200; top-N only for `groupBy=session`       |

#### Response

Returns `200 OK` with [usage buckets and totals](/api-reference/protocols/objects-and-schemas#usage-response).

Response schema: [`usageResponseSchema`](/api-reference/protocols/objects-and-schemas#usage-response).

```json
{
  "buckets": [
    {
      "day": "2026-07-10",
      "agentId": null,
      "sessionId": null,
      "userId": null,
      "provider": null,
      "model": null,
      "inputTokens": 120,
      "outputTokens": 80,
      "requestCount": 2,
      "durationMs": 1400
    }
  ],
  "totals": {
    "inputTokens": 120,
    "outputTokens": 80,
    "requestCount": 2,
    "durationMs": 1400
  }
}
```

#### Errors

`400 validation_failed` for a partial, reversed, or oversized range or an
invalid filter, grouping, or limit. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --get "$BLAZING_AGENTS_BASE_URL/v1/usage" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --data-urlencode "from=2026-07-01" \
  --data-urlencode "to=2026-07-10" \
  --data-urlencode "groupBy=day"
```

#### SDK and related guides

SDK: [TypeScript `get`](/sdk/typescript/usage#get) or [Python
`get`](/sdk/python/usage#get). See [Usage and
quotas](/platform/usage-and-quotas).

### GET /v1/agents/:agentId/usage [#get-agent-usage]

Returns usage for the agent in the path. An `agentId` in the query string is ignored.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and an `ag_…` `agentId` path parameter. It accepts `from`, `to`, `sessionId`, `userId`, `groupBy`, and `limit` exactly as [Get tenant usage](/api-reference/rest-api/usage#get-usage). You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |

#### Response

Returns `200 OK` with `{ buckets, totals }`; see [Usage response](/api-reference/protocols/objects-and-schemas#usage-response).

Response schema: [`usageResponseSchema`](/api-reference/protocols/objects-and-schemas#usage-response).

#### Errors

`400 validation_failed` for a malformed agent ID or invalid query. An agent
with no usage, including one that does not exist, returns zero totals and empty
buckets rather than `404`. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --get \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/usage" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --data-urlencode "groupBy=model"
```

#### SDK and related guides

SDK: [TypeScript `getForAgent`](/sdk/typescript/usage#get-for-agent)
or [Python
`get_for_agent`](/sdk/python/usage#get-for-agent). See [Usage and
quotas](/platform/usage-and-quotas).

## Next [#next]

- [Usage and quotas](/platform/usage-and-quotas) to track spend and set a quota.
- [Tenant API](/api-reference/rest-api/tenant#update-tenant-settings) to change your quota.
