---
title: Chat connections
description: Create and manage Slack and Telegram connections and inspect delivery outcomes.
---

# Chat connections

## Overview

All endpoints require a Tenant bearer credential and active subscription. IDs use
`cc_` plus 16 base62 characters. One installation belongs to one connection;
an Agent can have several connections. Agent and platform identity are immutable.
See [setup](/platform/chat-integrations) for callbacks and permissions.

A connection response contains `id`, `tenantId`, `agentId`, `name`, `platform`,
`enabled`, `configuration` (including `platform`), verified `identity`, `health`,
`credentialFragment` (last four token characters), `credentialVersion`,
`createdAt`, and `updatedAt`. Full credentials are write-only.
Health includes `checkedAt`, `tokenValid`, `identityVerified`, and `checks` with
`code`, `status` (`pass`, `fail`, `unknown`), and optional `subject`.

## Endpoints

### POST /v1/chat-connections [#create-chat-connection]

Create a connection.

#### Request

Create requires `name` (1–80 characters), `agentId`, `platform`, `configuration`,
and `credentials`; `enabled` defaults to `true`.

| Platform | Configuration | Credentials |
| --- | --- | --- |
| `slack` | `teamId`, `appId`, `webhookUrl`, optional `channelIds` | `botToken`, `signingSecret` |
| `telegram` | `botId`, `webhookUrl`, optional `chatIds` | `botToken`, `webhookSecret` |

Use strings for Telegram IDs. Callback URLs must be HTTPS without credentials,
query or fragment. Destination lists accept at most 20 IDs and select health
probes, not access restrictions. Create does not register platform webhooks.
The [TypeScript](/sdk/typescript/chat-integrations) and
[Python](/sdk/python/chat-integrations) examples show a complete create request.

Identity is verified before saving.

#### Response

`201 Created` — A connection object.

```json
{
  "id": "cc_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "Support",
  "platform": "telegram",
  "enabled": true,
  "configuration": {
    "platform": "telegram",
    "botId": "123456789",
    "webhookUrl": "https://example.com/chat",
    "chatIds": []
  },
  "identity": {
    "botId": "123456789",
    "botUserId": "123456789",
    "teamId": null,
    "appId": null
  },
  "health": {
    "checkedAt": "2026-09-12T12:00:00Z",
    "tokenValid": true,
    "identityVerified": true,
    "checks": [
      {
        "code": "webhook_url",
        "status": "fail"
      }
    ]
  },
  "credentialFragment": "OKEN",
  "credentialVersion": 1,
  "createdAt": "2026-09-12T12:00:00Z",
  "updatedAt": "2026-09-12T12:00:00Z"
}
```

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/chat-connections" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"Support","agentId":"ag_1234567890ABCDEF","platform":"telegram","configuration":{"botId":"123456789","webhookUrl":"https://example.com/chat"},"credentials":{"botToken":"123456789:REPLACE_WITH_BOT_TOKEN","webhookSecret":"REPLACE_WITH_WEBHOOK_SECRET"}}'
```

### GET /v1/chat-connections [#list-chat-connections]

List connections.

#### Request

No body.

#### Response

`200 OK` — `{chatConnections: [...]}` in creation order.

```json
{
  "chatConnections": [
    {
      "id": "cc_1234567890ABCDEF",
      "tenantId": "ten_1234567890ABCDEF",
      "agentId": "ag_1234567890ABCDEF",
      "name": "Support",
      "platform": "telegram",
      "enabled": true,
      "configuration": {
        "platform": "telegram",
        "botId": "123456789",
        "webhookUrl": "https://example.com/chat",
        "chatIds": []
      },
      "identity": {
        "botId": "123456789",
        "botUserId": "123456789",
        "teamId": null,
        "appId": null
      },
      "health": {
        "checkedAt": "2026-09-12T12:00:00Z",
        "tokenValid": true,
        "identityVerified": true,
        "checks": [
          {
            "code": "webhook_url",
            "status": "fail"
          }
        ]
      },
      "credentialFragment": "OKEN",
      "credentialVersion": 1,
      "createdAt": "2026-09-12T12:00:00Z",
      "updatedAt": "2026-09-12T12:00:00Z"
    }
  ]
}
```

#### cURL

```bash
curl --request GET "$BLAZING_AGENTS_BASE_URL/v1/chat-connections" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/chat-connections/:id [#get-chat-connection]

Read a connection.

#### Request

No body. Health is the last saved observation.

#### Response

`200 OK` — A connection object.

```json
{
  "id": "cc_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "Support",
  "platform": "telegram",
  "enabled": true,
  "configuration": {
    "platform": "telegram",
    "botId": "123456789",
    "webhookUrl": "https://example.com/chat",
    "chatIds": []
  },
  "identity": {
    "botId": "123456789",
    "botUserId": "123456789",
    "teamId": null,
    "appId": null
  },
  "health": {
    "checkedAt": "2026-09-12T12:00:00Z",
    "tokenValid": true,
    "identityVerified": true,
    "checks": [
      {
        "code": "webhook_url",
        "status": "fail"
      }
    ]
  },
  "credentialFragment": "OKEN",
  "credentialVersion": 1,
  "createdAt": "2026-09-12T12:00:00Z",
  "updatedAt": "2026-09-12T12:00:00Z"
}
```

#### cURL

```bash
curl --request GET "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PATCH /v1/chat-connections/:id [#rename-chat-connection]

Rename a connection.

#### Request

Send `{"name":"Support"}`. Other configuration fields cannot be patched.

#### Response

`200 OK` — A connection object.

```json
{
  "id": "cc_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "Support",
  "platform": "telegram",
  "enabled": true,
  "configuration": {
    "platform": "telegram",
    "botId": "123456789",
    "webhookUrl": "https://example.com/chat",
    "chatIds": []
  },
  "identity": {
    "botId": "123456789",
    "botUserId": "123456789",
    "teamId": null,
    "appId": null
  },
  "health": {
    "checkedAt": "2026-09-12T12:00:00Z",
    "tokenValid": true,
    "identityVerified": true,
    "checks": [
      {
        "code": "webhook_url",
        "status": "fail"
      }
    ]
  },
  "credentialFragment": "OKEN",
  "credentialVersion": 1,
  "createdAt": "2026-09-12T12:00:00Z",
  "updatedAt": "2026-09-12T12:00:00Z"
}
```

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"Support"}'
```

### POST /v1/chat-connections/:id/credentials [#rotate-chat-credentials]

Rotate credentials.

#### Request

Send `platform` and the complete credentials for the same installation: Slack uses
`botToken` and `signingSecret`; Telegram uses `botToken` and `webhookSecret`.
Enabled state and Sessions are preserved.

#### Response

`200 OK` — A connection object.

```json
{
  "id": "cc_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "Support",
  "platform": "telegram",
  "enabled": true,
  "configuration": {
    "platform": "telegram",
    "botId": "123456789",
    "webhookUrl": "https://example.com/chat",
    "chatIds": []
  },
  "identity": {
    "botId": "123456789",
    "botUserId": "123456789",
    "teamId": null,
    "appId": null
  },
  "health": {
    "checkedAt": "2026-09-12T12:00:00Z",
    "tokenValid": true,
    "identityVerified": true,
    "checks": [
      {
        "code": "webhook_url",
        "status": "fail"
      }
    ]
  },
  "credentialFragment": "OKEN",
  "credentialVersion": 1,
  "createdAt": "2026-09-12T12:00:00Z",
  "updatedAt": "2026-09-12T12:00:00Z"
}
```

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF/credentials" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"platform":"telegram","botToken":"123456789:REPLACE_WITH_BOT_TOKEN","webhookSecret":"REPLACE_WITH_WEBHOOK_SECRET"}'
```

### POST /v1/chat-connections/:id/health [#check-chat-health]

Check health.

#### Request

No body. Runs fresh read-only platform probes and saves their results.

#### Response

`200 OK` — A connection object, including refreshed health.

```json
{
  "id": "cc_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "Support",
  "platform": "telegram",
  "enabled": true,
  "configuration": {
    "platform": "telegram",
    "botId": "123456789",
    "webhookUrl": "https://example.com/chat",
    "chatIds": []
  },
  "identity": {
    "botId": "123456789",
    "botUserId": "123456789",
    "teamId": null,
    "appId": null
  },
  "health": {
    "checkedAt": "2026-09-12T12:00:00Z",
    "tokenValid": true,
    "identityVerified": true,
    "checks": [
      {
        "code": "webhook_url",
        "status": "fail"
      }
    ]
  },
  "credentialFragment": "OKEN",
  "credentialVersion": 1,
  "createdAt": "2026-09-12T12:00:00Z",
  "updatedAt": "2026-09-12T12:00:00Z"
}
```

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF/health" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/chat-connections/:id/enable [#enable-chat-connection]

Enable intake.

#### Request

No body. Accepts future events; does not replay missed messages.

#### Response

`200 OK` — A connection object.

```json
{
  "id": "cc_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "Support",
  "platform": "telegram",
  "enabled": true,
  "configuration": {
    "platform": "telegram",
    "botId": "123456789",
    "webhookUrl": "https://example.com/chat",
    "chatIds": []
  },
  "identity": {
    "botId": "123456789",
    "botUserId": "123456789",
    "teamId": null,
    "appId": null
  },
  "health": {
    "checkedAt": "2026-09-12T12:00:00Z",
    "tokenValid": true,
    "identityVerified": true,
    "checks": [
      {
        "code": "webhook_url",
        "status": "fail"
      }
    ]
  },
  "credentialFragment": "OKEN",
  "credentialVersion": 1,
  "createdAt": "2026-09-12T12:00:00Z",
  "updatedAt": "2026-09-12T12:00:00Z"
}
```

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF/enable" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/chat-connections/:id/disable [#disable-chat-connection]

Disable intake.

#### Request

No body. Stops new messages and approval clicks; admitted work may finish.

#### Response

`200 OK` — A connection object.

```json
{
  "id": "cc_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "Support",
  "platform": "telegram",
  "enabled": false,
  "configuration": {
    "platform": "telegram",
    "botId": "123456789",
    "webhookUrl": "https://example.com/chat",
    "chatIds": []
  },
  "identity": {
    "botId": "123456789",
    "botUserId": "123456789",
    "teamId": null,
    "appId": null
  },
  "health": {
    "checkedAt": "2026-09-12T12:00:00Z",
    "tokenValid": true,
    "identityVerified": true,
    "checks": [
      {
        "code": "webhook_url",
        "status": "fail"
      }
    ]
  },
  "credentialFragment": "OKEN",
  "credentialVersion": 1,
  "createdAt": "2026-09-12T12:00:00Z",
  "updatedAt": "2026-09-12T12:00:00Z"
}
```

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF/disable" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### DELETE /v1/chat-connections/:id [#delete-chat-connection]

Delete a connection.

#### Request

No body. Preserves BA Sessions; does not uninstall the bot or clear its platform webhook.

#### Response

`204 No Content` — Empty body.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/chat-connections/:id/deliveries [#list-chat-deliveries]

Inspect deliveries.

#### Request

Optional `limit` (1–100, default 100) and opaque `cursor` query parameters. Newest first; pass `nextCursor` to retrieve older records.

#### Response

`200 OK` — `{data, nextCursor}` with delivery source IDs, status, attempt, diagnostic code, representation and known receipts. Credentials, message bodies and tool arguments are omitted.

```json
{
  "data": [],
  "nextCursor": null
}
```

#### cURL

```bash
curl --request GET "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF/deliveries" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/chat-connections/:id/deliveries/:deliveryId/repair [#repair-chat-delivery]

Repair delivery.

#### Request

Send `{"expectedAttempt":1,"previousSenderStopped":true,"acceptDuplicateRisk":true}` using the observed attempt (0–99). Confirm the old sender has stopped before attesting; ask your operator to drain a crashed sender. Repair can duplicate output. It sends the saved reply or still-pending card without executing a Turn or tool.

#### Response

`200 OK` — The delivery result. Inspect its status: an HTTP success alone does not establish confirmed delivery.

```json
{
  "id": "cd_1234567890ABCDEF",
  "connectionId": "cc_1234567890ABCDEF",
  "sessionId": "ss_1234567890ABCDEF",
  "threadId": "telegram:123456789",
  "attempt": 2,
  "kind": "reply",
  "status": "confirmed"
}
```

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF/deliveries/cd_1234567890ABCDEF/repair" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"expectedAttempt":1,"previousSenderStopped":true,"acceptDuplicateRisk":true}'
```

