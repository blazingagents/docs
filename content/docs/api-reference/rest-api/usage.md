---
title: Usage
description: Query Tenant and Agent usage over bounded time ranges.
---

# Usage

## Overview [#overview]

Usage endpoints aggregate metered Agent activity into bounded UTC ranges. Use them to monitor Tenant totals or narrow reporting to an Agent, Session, or attribution value.

## Endpoints [#endpoints]

### GET /v1/usage [#get-usage]

Returns Tenant usage rollups for ranges of up to 31 days.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |

| Query parameter | Type         | Default      | Description                                   |
| --------------- | ------------ | ------------ | --------------------------------------------- |
| `from`, `to`    | `YYYY-MM-DD` | last 30 days | Supply both or neither                        |
| `agentId`       | string       | —            | Agent filter                                  |
| `sessionId`     | string       | —            | Session filter; `""` means stateless turns    |
| `userId`        | string       | —            | Attribution filter; `""` means tenant-level   |
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
quotas](/platform/usage-and-quotas) and [Monitor usage and
quotas](/platform/usage-and-quotas).

### GET /v1/agents/:agentId/usage [#get-agent-usage]

Returns usage rollups for the Agent in the path; any query-string `agentId` is ignored.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and an `ag_…` `agentId` path parameter. It accepts `from`, `to`, `sessionId`, `userId`, `groupBy`, and `limit` exactly as [Get tenant usage](/api-reference/rest-api/usage#get-usage). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |

#### Response

Returns `200 OK` with `{ buckets, totals }`; see [Usage response](/api-reference/protocols/objects-and-schemas#usage-response).

Response schema: [`usageResponseSchema`](/api-reference/protocols/objects-and-schemas#usage-response).

#### Errors

`400 validation_failed` for a malformed Agent ID or invalid usage query. This
aggregation does not require an Agent existence read; a scope with no rows
returns zero totals and empty buckets. See [REST errors](/api-reference/protocols/errors).

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
quotas](/platform/usage-and-quotas) and [Monitor usage and
quotas](/platform/usage-and-quotas).

## Related [#related]

- [TypeScript SDK](/sdk/typescript)
- [Python SDK Usage](/sdk/python/usage)
- [Objects and schemas](/api-reference/protocols/objects-and-schemas)
- [Errors](/api-reference/protocols/errors)
