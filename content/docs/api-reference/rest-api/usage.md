---
title: Usage
description: See how many tokens, requests, and minutes your agents use, by day, agent, model, session, or user.
---

# Usage

## Overview [#overview]

See how much your agents use: tokens, requests, and run time, added up over UTC date ranges of up to 31 days. Look at your whole tenant or narrow it to one agent, session, or end user.

`POST /v1/usage/sessions` returns exact totals for 1 to 100 session IDs. It preserves input order, includes zero totals for visible sessions without usage, and returns `not_found` if any session is missing or outside your user scope.

## Endpoints [#endpoints]

### GET /v1/usage [#get-usage]

Get tenant usage.

Returns your tenant's token, request, and run-time totals for a UTC date range, split into buckets by `groupBy`. Send both `from` and `to` or neither; without them you get the last 30 days ending today, and `to` can be at most 31 days after `from`. The response is not paginated.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `from` | string | query |  | First UTC day to include, as `YYYY-MM-DD`. Send it with `to`, or leave both out for the last 30 days ending today. |
| `to` | string | query |  | Last UTC day to include, as `YYYY-MM-DD`. It must not be before `from` and can be at most 31 days after it. |
| `agentId` | string | query |  | Return only usage by this agent. |
| `sessionId` | string | query |  | Return only usage in this session. Send an empty string for calls made without a session. |
| `userId` | string | query |  | Return only usage for this end user. Send an empty string for tenant-level usage. |
| `groupBy` | string | query |  | How to group the buckets: `day`, `agent`, `model`, `session`, or `user`. `session` returns the top sessions by total tokens; the others return every group. One of `day`, `agent`, `model`, `session`, `user`. Defaults to `day`. |
| `limit` | integer | query |  | Number of sessions to return with `groupBy=session`, from 1 to 200. Other groupings ignore it. 1–200. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. Usage buckets and totals.

Response schema: `Usage`.

```json
{
  "buckets": [
    {
      "day": "2026-07-09",
      "agentId": null,
      "sessionId": null,
      "userId": null,
      "provider": null,
      "model": null,
      "inputTokens": 18240,
      "outputTokens": 6120,
      "requestCount": 14,
      "durationMs": 41300
    },
    {
      "day": "2026-07-10",
      "agentId": null,
      "sessionId": null,
      "userId": null,
      "provider": null,
      "model": null,
      "inputTokens": 9600,
      "outputTokens": 3050,
      "requestCount": 8,
      "durationMs": 22750
    }
  ],
  "totals": {
    "inputTokens": 27840,
    "outputTokens": 9170,
    "requestCount": 22,
    "durationMs": 64050
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/usage" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/usage/overview [#get-usage-overview]

Get a usage overview.

Returns everything a usage dashboard needs in one response: totals, a daily series, and your top agents, users, and models. Send both `from` and `to` or neither; without them you get the last 30 days ending today, and `to` can be at most 31 days after `from`. `daily` has one entry for every day in the range, oldest first, including days with no usage. `byAgent`, `byUser`, and `byModel` are sorted by total tokens, highest first, and cut off at `limit`. `byModel` can add one bucket with `provider` and `model` set to `null` for the models left out, so its rows still add up to the totals. `activeAgentCount` counts every agent with usage in the range, not only those shown.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `from` | string | query |  | First UTC day to include, as `YYYY-MM-DD`. Send it with `to`, or leave both out for the last 30 days ending today. |
| `to` | string | query |  | Last UTC day to include, as `YYYY-MM-DD`. It must not be before `from` and can be at most 31 days after it. |
| `limit` | integer | query |  | Rows to return in each ranked breakdown (`byAgent`, `byUser`, `byModel`), from 1 to 20. 1–20. Defaults to `5`. |

#### Response

Returns `200 OK` as `application/json`. The usage overview.

Response schema: `UsageOverview`.

```json
{
  "totals": {
    "inputTokens": 27840,
    "outputTokens": 9170,
    "requestCount": 22,
    "durationMs": 64050
  },
  "daily": [
    {
      "day": "2026-07-09",
      "agentId": null,
      "sessionId": null,
      "userId": null,
      "provider": null,
      "model": null,
      "inputTokens": 18240,
      "outputTokens": 6120,
      "requestCount": 14,
      "durationMs": 41300
    },
    {
      "day": "2026-07-10",
      "agentId": null,
      "sessionId": null,
      "userId": null,
      "provider": null,
      "model": null,
      "inputTokens": 9600,
      "outputTokens": 3050,
      "requestCount": 8,
      "durationMs": 22750
    }
  ],
  "byAgent": [
    {
      "day": null,
      "agentId": "ag_4kP9sT2vXq7LmN3a",
      "sessionId": null,
      "userId": null,
      "provider": null,
      "model": null,
      "inputTokens": 27840,
      "outputTokens": 9170,
      "requestCount": 22,
      "durationMs": 64050
    }
  ],
  "byUser": [
    {
      "day": null,
      "agentId": null,
      "sessionId": null,
      "userId": "app:user-42",
      "provider": null,
      "model": null,
      "inputTokens": 20100,
      "outputTokens": 6800,
      "requestCount": 15,
      "durationMs": 45200
    },
    {
      "day": null,
      "agentId": null,
      "sessionId": null,
      "userId": "",
      "provider": null,
      "model": null,
      "inputTokens": 7740,
      "outputTokens": 2370,
      "requestCount": 7,
      "durationMs": 18850
    }
  ],
  "byModel": [
    {
      "day": null,
      "agentId": null,
      "sessionId": null,
      "userId": null,
      "provider": "openrouter",
      "model": "openai/gpt-6-luna",
      "inputTokens": 27840,
      "outputTokens": 9170,
      "requestCount": 22,
      "durationMs": 64050
    }
  ],
  "activeAgentCount": 1
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/usage/overview" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/agents/:agentId/usage [#get-agent-usage]

Get agent usage.

Returns usage for one agent, with the same range rules, filters, and grouping as `GET /v1/usage`. An `agentId` in the query string is ignored. An agent with no usage, including one that does not exist, returns zero totals and no buckets.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `from` | string | query |  | First UTC day to include, as `YYYY-MM-DD`. Send it with `to`, or leave both out for the last 30 days ending today. |
| `to` | string | query |  | Last UTC day to include, as `YYYY-MM-DD`. It must not be before `from` and can be at most 31 days after it. |
| `sessionId` | string | query |  | Return only usage in this session. Send an empty string for calls made without a session. |
| `userId` | string | query |  | Return only usage for this end user. Send an empty string for tenant-level usage. |
| `groupBy` | string | query |  | How to group the buckets: `day`, `agent`, `model`, `session`, or `user`. `session` returns the top sessions by total tokens; the others return every group. One of `day`, `agent`, `model`, `session`, `user`. Defaults to `day`. |
| `limit` | integer | query |  | Number of sessions to return with `groupBy=session`, from 1 to 200. Other groupings ignore it. 1–200. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. Usage buckets and totals for the agent.

Response schema: `Usage`.

```json
{
  "buckets": [
    {
      "day": null,
      "agentId": "ag_4kP9sT2vXq7LmN3a",
      "sessionId": null,
      "userId": null,
      "provider": "openrouter",
      "model": "openai/gpt-6-luna",
      "inputTokens": 27840,
      "outputTokens": 9170,
      "requestCount": 22,
      "durationMs": 64050
    }
  ],
  "totals": {
    "inputTokens": 27840,
    "outputTokens": 9170,
    "requestCount": 22,
    "durationMs": 64050
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/usage" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/usage/sessions [#get-session-usage]

Get exact usage for sessions.

Returns exact usage totals for 1 to 100 visible sessions in request order. Sessions without usage in the requested UTC date range have zero totals. Send both from and to or neither; the default is the last 30 days ending today.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `sessionIds` | string[] | body | required | One to 100 distinct session IDs. Every session must be visible to the caller. |
| `from` | string | body |  | First UTC day to include, as `YYYY-MM-DD`. Send it with `to`, or leave both out for the last 30 days ending today. |
| `to` | string | body |  | Last UTC day to include, as `YYYY-MM-DD`. It must not be before `from` and can be at most 31 days after it. |

#### Response

Returns `200 OK` as `application/json`. Usage totals per session.

Response schema: `SessionUsage`.

```json
{
  "data": [
    {
      "sessionId": "ss_0123456789abcdef",
      "totals": {
        "inputTokens": 12,
        "outputTokens": 6,
        "requestCount": 1,
        "durationMs": 450
      }
    }
  ]
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/usage/sessions" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"sessionIds":["ss_0123456789abcdef"]}'
```

## Next [#next]

- [Usage and quotas](/platform/usage-and-quotas) to track spend and set a quota.
- [Tenant API](/api-reference/rest-api/tenant#update-tenant-settings) to change your quota.
