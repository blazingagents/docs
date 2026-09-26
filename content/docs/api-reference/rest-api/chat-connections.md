---
title: Chat connections
description: Create and manage Slack and Telegram connections and inspect delivery outcomes.
---

# Chat connections

## Overview [#overview]

A chat connection puts one of your agents in a Slack workspace or a Telegram
bot, so people can talk to it where they already chat. Each bot installation
belongs to exactly one connection, and one agent can have several connections.
You cannot change a connection's agent or platform identity after you create
it. Every endpoint needs a bearer credential and an active subscription. See
[setup](/platform/chat-integrations) for callbacks and permissions.

Full credentials are never returned. A connection shows only
`credentialFragment`, the last four characters of its token. Health includes
`checkedAt`, `tokenValid`, `identityVerified`, and `checks` with `code`,
`status` (`pass`, `fail`, `unknown`), and optional `subject`.

## Endpoints [#endpoints]

### GET /v1/chat-connections [#list-chat-connections]

List chat connections.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

There are no parameters and no request body.

#### Response

Returns `200 OK` as `application/json`. The tenant's chat connections.

Response schema: `ChatConnectionList`.

```json
{
  "chatConnections": [
    {
      "id": "cc_1234567890ABCDEF",
      "tenantId": "ten_1234567890ABCDEF",
      "agentId": "ag_1234567890ABCDEF",
      "name": "string",
      "platform": "slack",
      "enabled": true,
      "configuration": {
        "channelIds": [],
        "platform": "slack"
      },
      "identity": {
        "botId": "string",
        "botUserId": "string",
        "teamId": "string",
        "appId": "string"
      },
      "health": {
        "checkedAt": "string",
        "tokenValid": true,
        "identityVerified": true,
        "checks": [
          {
            "code": "string",
            "status": "pass",
            "subject": "string"
          }
        ]
      },
      "credentialFragment": "string",
      "credentialVersion": 0,
      "createdAt": "string",
      "updatedAt": "string",
      "webhookUrl": "https://example.com"
    }
  ]
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/chat-connections" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/chat-connections [#create-chat-connection]

Create a chat connection.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `(body)` | object | body | required | Raw `application/json` request body. |

#### Response

Returns `201 Created` as `application/json`. The created chat connection.

Response schema: `ChatConnection`.

```json
{
  "id": "cc_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "string",
  "platform": "slack",
  "enabled": true,
  "configuration": {
    "channelIds": [],
    "platform": "slack"
  },
  "identity": {
    "botId": "string",
    "botUserId": "string",
    "teamId": "string",
    "appId": "string"
  },
  "health": {
    "checkedAt": "string",
    "tokenValid": true,
    "identityVerified": true,
    "checks": [
      {
        "code": "string",
        "status": "pass",
        "subject": "string"
      }
    ]
  },
  "credentialFragment": "string",
  "credentialVersion": 0,
  "createdAt": "string",
  "updatedAt": "string",
  "webhookUrl": "https://example.com"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/chat-connections" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"agentId":"ag_1234567890ABCDEF","name":"string","platform":"slack","credentials":{"botToken":"string","signingSecret":"string"}}'
```

### GET /v1/chat-connections/:id/deliveries [#list-chat-deliveries]

List chat deliveries.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | `cc_…` ID. |
| `cursor` | string | query |  |  |
| `limit` | integer | query |  | 1–100. Defaults to `100`. |

#### Response

Returns `200 OK` as `application/json`. A page of chat deliveries.

Response schema: `ChatDeliveryList`.

```json
{
  "data": [
    {
      "id": "cd_1234567890ABCDEF",
      "kind": "reply",
      "status": "pending",
      "attempt": 0,
      "credentialVersion": 0,
      "representation": "string",
      "diagnostic": "string",
      "receipts": {},
      "sessionId": "string",
      "messageId": "string",
      "approvalId": "string",
      "threadId": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "nextCursor": "string"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF/deliveries" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/chat-connections/:id/deliveries/:deliveryId/repair [#repair-chat-delivery]

Repair a chat delivery.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | `cc_…` ID. |
| `deliveryId` | string | path | required | `cd_…` ID. |
| `expectedAttempt` | integer | body | required | 0–99. |
| `previousSenderStopped` | boolean | body | required |  |
| `acceptDuplicateRisk` | boolean | body | required |  |

#### Response

Returns `200 OK` as `application/json`. The settled delivery outcome.

Response schema: `ChatDeliveryResult`.

```json
{
  "id": "cd_1234567890ABCDEF",
  "sessionId": "string",
  "threadId": "string",
  "connectionId": "cc_1234567890ABCDEF",
  "kind": "reply",
  "status": "confirmed",
  "attempt": 0
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF/deliveries/cd_1234567890ABCDEF/repair" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"expectedAttempt":0,"previousSenderStopped":true,"acceptDuplicateRisk":true}'
```

### GET /v1/chat-connections/:id [#get-chat-connection]

Get a chat connection.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | `cc_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The chat connection.

Response schema: `ChatConnection`.

```json
{
  "id": "cc_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "string",
  "platform": "slack",
  "enabled": true,
  "configuration": {
    "channelIds": [],
    "platform": "slack"
  },
  "identity": {
    "botId": "string",
    "botUserId": "string",
    "teamId": "string",
    "appId": "string"
  },
  "health": {
    "checkedAt": "string",
    "tokenValid": true,
    "identityVerified": true,
    "checks": [
      {
        "code": "string",
        "status": "pass",
        "subject": "string"
      }
    ]
  },
  "credentialFragment": "string",
  "credentialVersion": 0,
  "createdAt": "string",
  "updatedAt": "string",
  "webhookUrl": "https://example.com"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PATCH /v1/chat-connections/:id [#rename-chat-connection]

Update a chat connection.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | `cc_…` ID. |
| `name` | string | body |  | 1–80 characters. |
| `configuration` | object | body |  |  |

#### Response

Returns `200 OK` as `application/json`. The updated chat connection.

Response schema: `ChatConnection`.

```json
{
  "id": "cc_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "string",
  "platform": "slack",
  "enabled": true,
  "configuration": {
    "channelIds": [],
    "platform": "slack"
  },
  "identity": {
    "botId": "string",
    "botUserId": "string",
    "teamId": "string",
    "appId": "string"
  },
  "health": {
    "checkedAt": "string",
    "tokenValid": true,
    "identityVerified": true,
    "checks": [
      {
        "code": "string",
        "status": "pass",
        "subject": "string"
      }
    ]
  },
  "credentialFragment": "string",
  "credentialVersion": 0,
  "createdAt": "string",
  "updatedAt": "string",
  "webhookUrl": "https://example.com"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |
| `409` | The Telegram bot already delivers to a webhook outside this deployment |
| `502` | Telegram webhook registration failed after the update was saved |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"string"}'
```

### DELETE /v1/chat-connections/:id [#delete-chat-connection]

Delete a chat connection.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | `cc_…` ID. |

#### Response

Returns `204 No Content`. The chat connection was deleted.

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/chat-connections/:id/credentials [#rotate-chat-credentials]

Rotate chat connection credentials.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | `cc_…` ID. |
| `(body)` | object | body | required | Raw `application/json` request body. |

#### Response

Returns `200 OK` as `application/json`. The chat connection with rotated credentials.

Response schema: `ChatConnection`.

```json
{
  "id": "cc_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "string",
  "platform": "slack",
  "enabled": true,
  "configuration": {
    "channelIds": [],
    "platform": "slack"
  },
  "identity": {
    "botId": "string",
    "botUserId": "string",
    "teamId": "string",
    "appId": "string"
  },
  "health": {
    "checkedAt": "string",
    "tokenValid": true,
    "identityVerified": true,
    "checks": [
      {
        "code": "string",
        "status": "pass",
        "subject": "string"
      }
    ]
  },
  "credentialFragment": "string",
  "credentialVersion": 0,
  "createdAt": "string",
  "updatedAt": "string",
  "webhookUrl": "https://example.com"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |
| `409` | The Telegram bot already delivers to a webhook outside this deployment |
| `502` | Telegram webhook registration failed after the credentials were saved |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF/credentials" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"platform":"slack","botToken":"string","signingSecret":"string"}'
```

### POST /v1/chat-connections/:id/health [#check-chat-health]

Refresh chat connection health.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | `cc_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The chat connection with refreshed health.

Response schema: `ChatConnection`.

```json
{
  "id": "cc_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "string",
  "platform": "slack",
  "enabled": true,
  "configuration": {
    "channelIds": [],
    "platform": "slack"
  },
  "identity": {
    "botId": "string",
    "botUserId": "string",
    "teamId": "string",
    "appId": "string"
  },
  "health": {
    "checkedAt": "string",
    "tokenValid": true,
    "identityVerified": true,
    "checks": [
      {
        "code": "string",
        "status": "pass",
        "subject": "string"
      }
    ]
  },
  "credentialFragment": "string",
  "credentialVersion": 0,
  "createdAt": "string",
  "updatedAt": "string",
  "webhookUrl": "https://example.com"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF/health" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/chat-connections/:id/disable [#disable-chat-connection]

Disable a chat connection.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | `cc_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The updated chat connection.

Response schema: `ChatConnection`.

```json
{
  "id": "cc_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "string",
  "platform": "slack",
  "enabled": true,
  "configuration": {
    "channelIds": [],
    "platform": "slack"
  },
  "identity": {
    "botId": "string",
    "botUserId": "string",
    "teamId": "string",
    "appId": "string"
  },
  "health": {
    "checkedAt": "string",
    "tokenValid": true,
    "identityVerified": true,
    "checks": [
      {
        "code": "string",
        "status": "pass",
        "subject": "string"
      }
    ]
  },
  "credentialFragment": "string",
  "credentialVersion": 0,
  "createdAt": "string",
  "updatedAt": "string",
  "webhookUrl": "https://example.com"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF/disable" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/chat-connections/:id/enable [#enable-chat-connection]

Enable a chat connection.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | `cc_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The updated chat connection.

Response schema: `ChatConnection`.

```json
{
  "id": "cc_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "string",
  "platform": "slack",
  "enabled": true,
  "configuration": {
    "channelIds": [],
    "platform": "slack"
  },
  "identity": {
    "botId": "string",
    "botUserId": "string",
    "teamId": "string",
    "appId": "string"
  },
  "health": {
    "checkedAt": "string",
    "tokenValid": true,
    "identityVerified": true,
    "checks": [
      {
        "code": "string",
        "status": "pass",
        "subject": "string"
      }
    ]
  },
  "credentialFragment": "string",
  "credentialVersion": 0,
  "createdAt": "string",
  "updatedAt": "string",
  "webhookUrl": "https://example.com"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |
| `409` | The Telegram bot already delivers to a webhook outside this deployment |
| `502` | Telegram webhook registration failed |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF/enable" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Chat integrations](/platform/chat-integrations) to set up Slack or Telegram.
- [TypeScript](/sdk/typescript/chat-integrations) or [Python](/sdk/python/chat-integrations) chat integration methods.
