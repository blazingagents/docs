---
title: Usage
description: See how many tokens, requests, and minutes your agents use, by day, agent, model, session, or user.
---

# Usage

## Overview [#overview]

See how much your agents use: tokens, requests, and run time, added up over UTC date ranges of up to 31 days. Look at your whole tenant or narrow it to one agent, session, or end user.

## Endpoints [#endpoints]

### GET /v1/usage [#get-usage]

Query tenant usage.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `from` | string | query |  |  |
| `to` | string | query |  |  |
| `agentId` | string | query |  | `ag_…` ID. |
| `sessionId` | string | query |  |  |
| `userId` | string | query |  |  |
| `groupBy` | string | query |  | One of `day`, `agent`, `model`, `session`, `user`. Defaults to `day`. |
| `limit` | integer | query |  | 1–200. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. Usage buckets and totals.

Response schema: `Usage`.

```json
{
  "buckets": [
    {
      "day": "string",
      "agentId": "ag_1234567890ABCDEF",
      "sessionId": "ss_1234567890ABCDEF",
      "userId": "string",
      "provider": "string",
      "model": "openai/gpt-6-luna",
      "inputTokens": 0,
      "outputTokens": 0,
      "requestCount": 0,
      "durationMs": 0
    }
  ],
  "totals": {
    "inputTokens": 0,
    "outputTokens": 0,
    "requestCount": 0,
    "durationMs": 0
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/usage" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/usage/overview [#get-usage-overview]

Get a usage overview.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `from` | string | query |  |  |
| `to` | string | query |  |  |
| `limit` | integer | query |  | 1–20. Defaults to `5`. |

#### Response

Returns `200 OK` as `application/json`. The usage overview.

Response schema: `UsageOverview`.

```json
{
  "totals": {
    "inputTokens": 0,
    "outputTokens": 0,
    "requestCount": 0,
    "durationMs": 0
  },
  "daily": [
    {
      "day": "string",
      "agentId": "ag_1234567890ABCDEF",
      "sessionId": "ss_1234567890ABCDEF",
      "userId": "string",
      "provider": "string",
      "model": "openai/gpt-6-luna",
      "inputTokens": 0,
      "outputTokens": 0,
      "requestCount": 0,
      "durationMs": 0
    }
  ],
  "byAgent": [
    {
      "day": "string",
      "agentId": "ag_1234567890ABCDEF",
      "sessionId": "ss_1234567890ABCDEF",
      "userId": "string",
      "provider": "string",
      "model": "openai/gpt-6-luna",
      "inputTokens": 0,
      "outputTokens": 0,
      "requestCount": 0,
      "durationMs": 0
    }
  ],
  "byUser": [
    {
      "day": "string",
      "agentId": "ag_1234567890ABCDEF",
      "sessionId": "ss_1234567890ABCDEF",
      "userId": "string",
      "provider": "string",
      "model": "openai/gpt-6-luna",
      "inputTokens": 0,
      "outputTokens": 0,
      "requestCount": 0,
      "durationMs": 0
    }
  ],
  "byModel": [
    {
      "day": "string",
      "agentId": "ag_1234567890ABCDEF",
      "sessionId": "ss_1234567890ABCDEF",
      "userId": "string",
      "provider": "string",
      "model": "openai/gpt-6-luna",
      "inputTokens": 0,
      "outputTokens": 0,
      "requestCount": 0,
      "durationMs": 0
    }
  ],
  "activeAgentCount": 0
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/usage/overview" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/agents/:agentId/usage [#get-agent-usage]

Query an agent's usage.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `from` | string | query |  |  |
| `to` | string | query |  |  |
| `agentId` | string | query |  | `ag_…` ID. |
| `sessionId` | string | query |  |  |
| `userId` | string | query |  |  |
| `groupBy` | string | query |  | One of `day`, `agent`, `model`, `session`, `user`. Defaults to `day`. |
| `limit` | integer | query |  | 1–200. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. Usage buckets and totals for the agent.

Response schema: `Usage`.

```json
{
  "buckets": [
    {
      "day": "string",
      "agentId": "ag_1234567890ABCDEF",
      "sessionId": "ss_1234567890ABCDEF",
      "userId": "string",
      "provider": "string",
      "model": "openai/gpt-6-luna",
      "inputTokens": 0,
      "outputTokens": 0,
      "requestCount": 0,
      "durationMs": 0
    }
  ],
  "totals": {
    "inputTokens": 0,
    "outputTokens": 0,
    "requestCount": 0,
    "durationMs": 0
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/usage" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Usage and quotas](/platform/usage-and-quotas) to track spend and set a quota.
- [Tenant API](/api-reference/rest-api/tenant#update-tenant-settings) to change your quota.
