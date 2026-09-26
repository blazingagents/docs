---
title: Chat connections
description: Create and manage Slack and Telegram connections and inspect delivery outcomes.
---

# Chat connections

## Overview

A chat connection puts one of your agents in a Slack workspace or a Telegram
bot, so people can talk to it where they already chat. Each bot installation
belongs to exactly one connection, and one agent can have several connections.
You cannot change a connection's agent or platform identity after you create
it. Every endpoint needs a bearer credential and an active subscription. See
[setup](/platform/chat-integrations) for callbacks and permissions.

A connection response contains `id`, `tenantId`, `agentId`, `name`, `platform`,
`enabled`, `configuration` (including `platform`), read-only `webhookUrl`,
verified `identity`, `health`,
`credentialFragment` (last four token characters), `credentialVersion`,
`createdAt`, and `updatedAt`. Full credentials are never returned.
Health includes `checkedAt`, `tokenValid`, `identityVerified`, and `checks` with
`code`, `status` (`pass`, `fail`, `unknown`), and optional `subject`.

## Endpoints

### POST /v1/chat-connections [#create-chat-connection]

Creates a connection.

#### Request

Create requires `name` (1–80 characters), `agentId`, `platform`, and
`credentials`; `configuration` is optional and `enabled` defaults to `true`.

| Platform | Configuration | Credentials |
| --- | --- | --- |
| `slack` | optional `channelIds` | `botToken`, `signingSecret` |
| `telegram` | optional `businessMode` and `chatIds` | `botToken` |

Send Telegram IDs as strings. Destination lists hold at most 20 IDs and only
choose where health checks look; they do not restrict access. Blazing Agents
reads the bot identity from the token and sets `webhookUrl` for you. Creating
an enabled Telegram connection registers that URL and a generated secret with
Telegram.
The [TypeScript](/sdk/typescript/chat-integrations) and
[Python](/sdk/python/chat-integrations) examples show a complete create request.

The bot identity is verified before the connection is saved.

#### Response

Returns `201 Created`: a connection object.

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
    "businessMode": false,
    "chatIds": []
  },
  "webhookUrl": "https://api.blazingagents.com/v1/chat/webhooks/telegram/cc_1234567890ABCDEF",
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
  --data '{"name":"Support","agentId":"ag_1234567890ABCDEF","platform":"telegram","configuration":{"businessMode":false},"credentials":{"botToken":"123456789:REPLACE_WITH_BOT_TOKEN"}}'
```

### GET /v1/chat-connections [#list-chat-connections]

Lists connections.

#### Request

No body.

#### Response

Returns `200 OK`: `{chatConnections: [...]}` in creation order.

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
        "businessMode": false,
        "chatIds": []
      },
      "webhookUrl": "https://api.blazingagents.com/v1/chat/webhooks/telegram/cc_1234567890ABCDEF",
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

Reads a connection.

#### Request

No body. `health` shows the result of the last check.

#### Response

Returns `200 OK`: a connection object.

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
    "businessMode": false,
    "chatIds": []
  },
  "webhookUrl": "https://api.blazingagents.com/v1/chat/webhooks/telegram/cc_1234567890ABCDEF",
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

Updates a connection.

#### Request

Send `name`, `configuration`, or both; empty updates are rejected. Configuration
may contain Slack `channelIds`, Telegram `chatIds`, or Telegram `businessMode`.
Changing Business mode on an enabled Telegram connection re-registers its
webhook. `webhookUrl` is read-only.

#### Response

Returns `200 OK`: a connection object.

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
    "businessMode": false,
    "chatIds": []
  },
  "webhookUrl": "https://api.blazingagents.com/v1/chat/webhooks/telegram/cc_1234567890ABCDEF",
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

Rotates credentials.

#### Request

Send `platform` and the complete credentials for the same installation: Slack
uses `botToken` and `signingSecret`; Telegram uses `botToken`. The enabled state
and sessions are kept. Enabled Telegram rotation generates a new secret and
re-registers the webhook.

#### Response

Returns `200 OK`: a connection object.

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
    "businessMode": false,
    "chatIds": []
  },
  "webhookUrl": "https://api.blazingagents.com/v1/chat/webhooks/telegram/cc_1234567890ABCDEF",
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
  --data '{"platform":"telegram","botToken":"123456789:REPLACE_WITH_BOT_TOKEN"}'
```

### POST /v1/chat-connections/:id/health [#check-chat-health]

Checks health.

#### Request

No body. Runs new read-only checks against the platform and saves the results.

#### Response

Returns `200 OK`: a connection object, including refreshed health.

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
    "businessMode": false,
    "chatIds": []
  },
  "webhookUrl": "https://api.blazingagents.com/v1/chat/webhooks/telegram/cc_1234567890ABCDEF",
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

Starts accepting messages.

#### Request

No body. Accepts new events; messages sent while disabled are not replayed. For
Telegram, Blazing Agents registers the webhook first. A webhook registered elsewhere returns
`409 chat_webhook_conflict`; other registration failures return
`502 chat_webhook_registration_failed` and leave the connection disabled.

#### Response

Returns `200 OK`: a connection object.

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
    "businessMode": false,
    "chatIds": []
  },
  "webhookUrl": "https://api.blazingagents.com/v1/chat/webhooks/telegram/cc_1234567890ABCDEF",
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

Stops accepting messages.

#### Request

No body. Stops new messages and approval clicks; work already accepted can finish.
Signed Slack URL verification still returns its challenge while disabled;
other verified events are acknowledged and dropped.

#### Response

Returns `200 OK`: a connection object.

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
    "businessMode": false,
    "chatIds": []
  },
  "webhookUrl": "https://api.blazingagents.com/v1/chat/webhooks/telegram/cc_1234567890ABCDEF",
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

Deletes a connection.

#### Request

No body. Sessions are kept. Blazing Agents tries to clear a matching Telegram
webhook; it does not uninstall a Slack app.

#### Response

Returns `204 No Content`: empty body.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/chat-connections/:id/deliveries [#list-chat-deliveries]

Lists delivery records.

#### Request

Optional `limit` (1–100, default 100) and opaque `cursor` query parameters. Newest first; pass `nextCursor` to retrieve older records.

#### Response

Returns `200 OK`: `{data, nextCursor}` with delivery source IDs, status, attempt, diagnostic code, representation and known receipts. Credentials, message bodies and tool arguments are omitted.

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

Repairs a stuck delivery.

#### Request

Send `{"expectedAttempt":1,"previousSenderStopped":true,"acceptDuplicateRisk":true}` using the observed attempt (0–99). Confirm the old sender has stopped before attesting; ask your operator to drain a crashed sender. Repair can duplicate output. It sends the saved reply or pending card without running a turn or tool.

#### Response

Returns `200 OK`: the delivery result. Inspect its status: a successful HTTP response alone does not mean the message was delivered.

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

## Next

- [Chat integrations](/platform/chat-integrations) to set up Slack or Telegram.
- [TypeScript](/sdk/typescript/chat-integrations) or [Python](/sdk/python/chat-integrations) chat integration methods.
