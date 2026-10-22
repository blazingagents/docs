---
title: Chat connections
description: Create and manage Slack and Telegram connections.
---

# Chat connections

## Overview [#overview]

A chat connection puts one of your agents in a Slack workspace or a Telegram
bot, so people can talk to it where they already chat. Each bot installation
belongs to exactly one connection, and one agent can have several connections.
The admin agent cannot be connected. Creating a connection for it returns `409`
with [`admin_agent_managed`](/api-reference/protocols/errors#admin_agent_managed).
You cannot change a connection's agent or platform identity after you create
it. Every endpoint needs a bearer credential and an active subscription. See
[setup](/platform/chat-integrations) for callbacks and permissions, and for how
the bot orders messages and handles interruptions.

Full credentials are never returned. A connection shows only
`credentialFragment`, the last four characters of its token. Health includes
`checkedAt`, `tokenValid`, `identityVerified`, and `checks` with `code`,
`status` (`pass`, `fail`, `unknown`), and optional `subject`.

## Replies [#replies]

The turn that answers a chat message posts its reply and any approval card
itself. It retries a failed post a few times, so a post that landed but whose
answer was lost can appear twice. A reply that still fails stays in the
session, where you can read it with
[list session messages](/api-reference/rest-api/sessions#list-session-messages).
A turn you start through the API on a chat session does not post to the chat.

## Endpoints [#endpoints]

### GET /v1/chat-connections [#list-chat-connections]

List chat connections.

Lists every chat connection in your tenant, oldest first. Full credentials are never returned.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). A read-only or full [API key](/api-reference/rest-api/authentication#access-levels) can call it. A tenant operation: it refuses an [end-user scope](/api-reference/rest-api/authentication#end-user-scope) with `403 forbidden`.

There are no parameters and no request body.

#### Response

Returns `200 OK` as `application/json`. Your tenant's chat connections.

Response schema: `ChatConnectionList`.

```json
{
  "chatConnections": [
    {
      "id": "cc_6Wd3Hs8KqP1vRt5N",
      "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
      "agentId": "ag_4kP9sT2vXq7LmN3a",
      "name": "Support bot",
      "platform": "telegram",
      "enabled": true,
      "configuration": {
        "platform": "telegram",
        "businessMode": false,
        "chatIds": []
      },
      "webhookUrl": "https://api.blazingagents.com/v1/chat/webhooks/telegram/cc_6Wd3Hs8KqP1vRt5N",
      "identity": {
        "botId": "7123456789",
        "botUserId": "7123456789",
        "teamId": null,
        "appId": null
      },
      "health": {
        "checkedAt": "2026-07-10T10:00:00.000Z",
        "tokenValid": true,
        "identityVerified": true,
        "checks": [
          {
            "code": "bot_identity",
            "status": "pass"
          },
          {
            "code": "channel_membership",
            "status": "unknown"
          },
          {
            "code": "webhook_url",
            "status": "pass"
          }
        ]
      },
      "credentialFragment": "x9Qa",
      "credentialVersion": 1,
      "createdAt": "2026-07-10T10:00:00.000Z",
      "updatedAt": "2026-07-10T10:00:00.000Z"
    }
  ]
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The caller is not allowed to make this request |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/chat-connections" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/chat-connections [#create-chat-connection]

Create a chat connection.

Connects one of your agents to a Slack app or Telegram bot. Blazing Agents checks the credentials with the chat platform and reads the bot identity from the token before saving, and returns the `webhookUrl` to configure on the platform. Each bot installation belongs to one connection. Slack needs `botToken` and `signingSecret`; Telegram needs only `botToken`. Creating an enabled Telegram connection registers its webhook for you. If that registration fails, the connection is saved disabled and its `webhook_url` health check fails; fix the bot and call enable. The platform-managed agent cannot be connected.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body. Needs a full [API key](/api-reference/rest-api/authentication#access-levels); a read-only key gets `403 insufficient_scope`. A tenant operation: it refuses an [end-user scope](/api-reference/rest-api/authentication#end-user-scope) with `403 forbidden`.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | body | required | ID of the agent that answers messages on this connection. You cannot change it later. |
| `name` | string | body | required | Display name, 1 to 80 characters. |
| `enabled` | boolean | body |  | Whether the connection accepts messages. Defaults to `true`. |
| `platform` | string | body | required | Chat platform: `slack` or `telegram`. |
| `configuration` | object | body |  | Optional platform settings. Destination IDs choose where health checks look; they do not restrict who can talk to the agent. Defaults to `{}`. |
| `configuration.channelIds` | string[] | body |  | Only when `platform` is `slack`. Up to 20 items. Defaults to `[]`. |
| `credentials` | object | body | required | Only when `platform` is `slack`. The Slack app's bot token and signing secret. |
| `credentials` | object | body | required | Only when `platform` is `telegram`. The Telegram bot token from BotFather. |
| `credentials.botToken` | string | body | required | Only when `platform` is `slack`. 8–8192 characters. |
| `credentials.botToken` | string | body | required | Only when `platform` is `telegram`. |
| `credentials.signingSecret` | string | body | required | Only when `platform` is `slack`. |
| `configuration.businessMode` | boolean | body |  | Only when `platform` is `telegram`. Defaults to `false`. |
| `configuration.chatIds` | string[] | body |  | Only when `platform` is `telegram`. Up to 20 items. Defaults to `[]`. |

#### Response

Returns `201 Created` as `application/json`. The created chat connection.

Response schema: `ChatConnection`.

```json
{
  "id": "cc_6Wd3Hs8KqP1vRt5N",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "agentId": "ag_4kP9sT2vXq7LmN3a",
  "name": "Support bot",
  "platform": "telegram",
  "enabled": true,
  "configuration": {
    "platform": "telegram",
    "businessMode": false,
    "chatIds": []
  },
  "webhookUrl": "https://api.blazingagents.com/v1/chat/webhooks/telegram/cc_6Wd3Hs8KqP1vRt5N",
  "identity": {
    "botId": "7123456789",
    "botUserId": "7123456789",
    "teamId": null,
    "appId": null
  },
  "health": {
    "checkedAt": "2026-07-10T10:00:00.000Z",
    "tokenValid": true,
    "identityVerified": true,
    "checks": [
      {
        "code": "bot_identity",
        "status": "pass"
      },
      {
        "code": "channel_membership",
        "status": "unknown"
      },
      {
        "code": "webhook_url",
        "status": "pass"
      }
    ]
  },
  "credentialFragment": "x9Qa",
  "credentialVersion": 1,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden), [`insufficient_scope`](/api-reference/protocols/errors#insufficient_scope) | The caller is not allowed to make this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`admin_agent_managed`](/api-reference/protocols/errors#admin_agent_managed) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/chat-connections" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"Support bot","agentId":"ag_4kP9sT2vXq7LmN3a","platform":"telegram","credentials":{"botToken":"7123456789:AAFexampleTokenReplaceMe_x9Qa"}}'
```

### GET /v1/chat-connections/:id [#get-chat-connection]

Get a chat connection.

Returns a connection. `health` shows the result of the last check; call check health to run a new one. Full credentials are never returned.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). A read-only or full [API key](/api-reference/rest-api/authentication#access-levels) can call it. A tenant operation: it refuses an [end-user scope](/api-reference/rest-api/authentication#end-user-scope) with `403 forbidden`.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the chat connection. |

#### Response

Returns `200 OK` as `application/json`. The chat connection.

Response schema: `ChatConnection`.

```json
{
  "id": "cc_6Wd3Hs8KqP1vRt5N",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "agentId": "ag_4kP9sT2vXq7LmN3a",
  "name": "Support bot",
  "platform": "telegram",
  "enabled": true,
  "configuration": {
    "platform": "telegram",
    "businessMode": false,
    "chatIds": []
  },
  "webhookUrl": "https://api.blazingagents.com/v1/chat/webhooks/telegram/cc_6Wd3Hs8KqP1vRt5N",
  "identity": {
    "botId": "7123456789",
    "botUserId": "7123456789",
    "teamId": null,
    "appId": null
  },
  "health": {
    "checkedAt": "2026-07-10T10:00:00.000Z",
    "tokenValid": true,
    "identityVerified": true,
    "checks": [
      {
        "code": "bot_identity",
        "status": "pass"
      },
      {
        "code": "channel_membership",
        "status": "unknown"
      },
      {
        "code": "webhook_url",
        "status": "pass"
      }
    ]
  },
  "credentialFragment": "x9Qa",
  "credentialVersion": 1,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The caller is not allowed to make this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PATCH /v1/chat-connections/:id [#rename-chat-connection]

Update a chat connection.

Changes a connection's name or configuration. Send `name`, `configuration`, or both, with at least one field to change. Configuration fields must match the connection's platform: Slack accepts `channelIds`, and Telegram accepts `chatIds` and `businessMode`. Changing `businessMode` on an enabled Telegram connection re-registers its webhook. If that fails, your change is still saved and the request returns an error; call enable to retry. You cannot change the agent, platform, or `webhookUrl`.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body. Needs a full [API key](/api-reference/rest-api/authentication#access-levels); a read-only key gets `403 insufficient_scope`. A tenant operation: it refuses an [end-user scope](/api-reference/rest-api/authentication#end-user-scope) with `403 forbidden`.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the chat connection. |
| `name` | string | body |  | New display name. 1–80 characters. |
| `configuration` | object | body |  | Fields to change. Slack connections accept `channelIds`; Telegram connections accept `chatIds` and `businessMode`. Fields you leave out keep their values. |
| `configuration.businessMode` | boolean | body |  |  |
| `configuration.chatIds` | string[] | body |  | Up to 20 items. |
| `configuration.channelIds` | string[] | body |  | Up to 20 items. |

#### Response

Returns `200 OK` as `application/json`. The updated chat connection.

Response schema: `ChatConnection`.

```json
{
  "id": "cc_6Wd3Hs8KqP1vRt5N",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "agentId": "ag_4kP9sT2vXq7LmN3a",
  "name": "Customer support bot",
  "platform": "telegram",
  "enabled": true,
  "configuration": {
    "platform": "telegram",
    "businessMode": false,
    "chatIds": []
  },
  "webhookUrl": "https://api.blazingagents.com/v1/chat/webhooks/telegram/cc_6Wd3Hs8KqP1vRt5N",
  "identity": {
    "botId": "7123456789",
    "botUserId": "7123456789",
    "teamId": null,
    "appId": null
  },
  "health": {
    "checkedAt": "2026-07-10T10:00:00.000Z",
    "tokenValid": true,
    "identityVerified": true,
    "checks": [
      {
        "code": "bot_identity",
        "status": "pass"
      },
      {
        "code": "channel_membership",
        "status": "unknown"
      },
      {
        "code": "webhook_url",
        "status": "pass"
      }
    ]
  },
  "credentialFragment": "x9Qa",
  "credentialVersion": 1,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:15:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden), [`insufficient_scope`](/api-reference/protocols/errors#insufficient_scope) | The caller is not allowed to make this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`chat_webhook_conflict`](/api-reference/protocols/errors#chat_webhook_conflict) | The request conflicts with the resource's current state |
| `502` | [`chat_webhook_registration_failed`](/api-reference/protocols/errors#chat_webhook_registration_failed) | An upstream service failed |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"Customer support bot"}'
```

### DELETE /v1/chat-connections/:id [#delete-chat-connection]

Delete a chat connection.

Deletes a connection and its stored credentials. Sessions it created are kept. For Telegram, Blazing Agents tries to remove the bot's webhook, and the delete succeeds even if that fails. Deleting a Slack connection does not uninstall the Slack app.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). Needs a full [API key](/api-reference/rest-api/authentication#access-levels); a read-only key gets `403 insufficient_scope`. A tenant operation: it refuses an [end-user scope](/api-reference/rest-api/authentication#end-user-scope) with `403 forbidden`.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the chat connection. |

#### Response

Returns `204 No Content`. The chat connection was deleted.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden), [`insufficient_scope`](/api-reference/protocols/errors#insufficient_scope) | The caller is not allowed to make this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/chat-connections/:id/credentials [#rotate-chat-credentials]

Rotate chat connection credentials.

Replaces a connection's credentials. Send `platform` matching the connection and the complete credentials for the same bot installation: Slack needs `botToken` and `signingSecret`, and Telegram needs `botToken`. The new credentials are checked with the chat platform and must identify the same bot. The enabled state and sessions are kept. On an enabled Telegram connection, Blazing Agents re-registers the webhook with a new secret. If that fails, the new credentials are still saved and the request returns an error; call enable to retry. [Manage and troubleshoot](https://docs.blazingagents.com/platform/chat-integrations#manage-and-troubleshoot) covers what happens to running turns and waiting messages.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body. Needs a full [API key](/api-reference/rest-api/authentication#access-levels); a read-only key gets `403 insufficient_scope`. A tenant operation: it refuses an [end-user scope](/api-reference/rest-api/authentication#end-user-scope) with `403 forbidden`.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the chat connection. |
| `platform` | string | body | required | Must match the connection's platform. |
| `botToken` | string | body | required | Only when `platform` is `slack`. The new Slack bot token. 8–8192 characters. |
| `botToken` | string | body | required | Only when `platform` is `telegram`. The new Telegram bot token. |
| `signingSecret` | string | body | required | Only when `platform` is `slack`. The Slack app's signing secret. |

#### Response

Returns `200 OK` as `application/json`. The chat connection with rotated credentials.

Response schema: `ChatConnection`.

```json
{
  "id": "cc_6Wd3Hs8KqP1vRt5N",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "agentId": "ag_4kP9sT2vXq7LmN3a",
  "name": "Support bot",
  "platform": "telegram",
  "enabled": true,
  "configuration": {
    "platform": "telegram",
    "businessMode": false,
    "chatIds": []
  },
  "webhookUrl": "https://api.blazingagents.com/v1/chat/webhooks/telegram/cc_6Wd3Hs8KqP1vRt5N",
  "identity": {
    "botId": "7123456789",
    "botUserId": "7123456789",
    "teamId": null,
    "appId": null
  },
  "health": {
    "checkedAt": "2026-07-10T10:00:00.000Z",
    "tokenValid": true,
    "identityVerified": true,
    "checks": [
      {
        "code": "bot_identity",
        "status": "pass"
      },
      {
        "code": "channel_membership",
        "status": "unknown"
      },
      {
        "code": "webhook_url",
        "status": "pass"
      }
    ]
  },
  "credentialFragment": "b7Kw",
  "credentialVersion": 2,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:15:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden), [`insufficient_scope`](/api-reference/protocols/errors#insufficient_scope) | The caller is not allowed to make this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`chat_webhook_conflict`](/api-reference/protocols/errors#chat_webhook_conflict) | The request conflicts with the resource's current state |
| `502` | [`chat_webhook_registration_failed`](/api-reference/protocols/errors#chat_webhook_registration_failed) | An upstream service failed |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF/credentials" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"platform":"telegram","botToken":"7123456789:AAFrotatedTokenReplaceMe_b7Kw"}'
```

### POST /v1/chat-connections/:id/health [#check-chat-health]

Check chat connection health.

Runs new read-only checks against the chat platform, saves the results, and returns the connection with its refreshed `health`. Failing checks are reported in `health.checks`, not as an error.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). Needs a full [API key](/api-reference/rest-api/authentication#access-levels); a read-only key gets `403 insufficient_scope`. A tenant operation: it refuses an [end-user scope](/api-reference/rest-api/authentication#end-user-scope) with `403 forbidden`.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the chat connection. |

#### Response

Returns `200 OK` as `application/json`. The chat connection with refreshed health.

Response schema: `ChatConnection`.

```json
{
  "id": "cc_6Wd3Hs8KqP1vRt5N",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "agentId": "ag_4kP9sT2vXq7LmN3a",
  "name": "Support bot",
  "platform": "telegram",
  "enabled": true,
  "configuration": {
    "platform": "telegram",
    "businessMode": false,
    "chatIds": []
  },
  "webhookUrl": "https://api.blazingagents.com/v1/chat/webhooks/telegram/cc_6Wd3Hs8KqP1vRt5N",
  "identity": {
    "botId": "7123456789",
    "botUserId": "7123456789",
    "teamId": null,
    "appId": null
  },
  "health": {
    "checkedAt": "2026-07-10T10:00:00.000Z",
    "tokenValid": true,
    "identityVerified": true,
    "checks": [
      {
        "code": "bot_identity",
        "status": "pass"
      },
      {
        "code": "channel_membership",
        "status": "unknown"
      },
      {
        "code": "webhook_url",
        "status": "pass"
      }
    ]
  },
  "credentialFragment": "x9Qa",
  "credentialVersion": 1,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden), [`insufficient_scope`](/api-reference/protocols/errors#insufficient_scope) | The caller is not allowed to make this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF/health" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/chat-connections/:id/disable [#disable-chat-connection]

Disable a chat connection.

Stops the connection from accepting new messages and approval clicks. [Manage and troubleshoot](https://docs.blazingagents.com/platform/chat-integrations#manage-and-troubleshoot) covers what happens to running turns and waiting messages.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). Needs a full [API key](/api-reference/rest-api/authentication#access-levels); a read-only key gets `403 insufficient_scope`. A tenant operation: it refuses an [end-user scope](/api-reference/rest-api/authentication#end-user-scope) with `403 forbidden`.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the chat connection. |

#### Response

Returns `200 OK` as `application/json`. The updated chat connection.

Response schema: `ChatConnection`.

```json
{
  "id": "cc_6Wd3Hs8KqP1vRt5N",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "agentId": "ag_4kP9sT2vXq7LmN3a",
  "name": "Support bot",
  "platform": "telegram",
  "enabled": false,
  "configuration": {
    "platform": "telegram",
    "businessMode": false,
    "chatIds": []
  },
  "webhookUrl": "https://api.blazingagents.com/v1/chat/webhooks/telegram/cc_6Wd3Hs8KqP1vRt5N",
  "identity": {
    "botId": "7123456789",
    "botUserId": "7123456789",
    "teamId": null,
    "appId": null
  },
  "health": {
    "checkedAt": "2026-07-10T10:00:00.000Z",
    "tokenValid": true,
    "identityVerified": true,
    "checks": [
      {
        "code": "bot_identity",
        "status": "pass"
      },
      {
        "code": "channel_membership",
        "status": "unknown"
      },
      {
        "code": "webhook_url",
        "status": "pass"
      }
    ]
  },
  "credentialFragment": "x9Qa",
  "credentialVersion": 1,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:15:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden), [`insufficient_scope`](/api-reference/protocols/errors#insufficient_scope) | The caller is not allowed to make this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF/disable" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/chat-connections/:id/enable [#enable-chat-connection]

Enable a chat connection.

Starts accepting new messages. Messages sent while the connection was disabled are not replayed. For Telegram, Blazing Agents registers the webhook first. If the bot already sends updates to a webhook outside Blazing Agents, the request returns `chat_webhook_conflict`; remove that webhook and try again. If registration fails for another reason, the request returns `chat_webhook_registration_failed` and the connection stays disabled.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). Needs a full [API key](/api-reference/rest-api/authentication#access-levels); a read-only key gets `403 insufficient_scope`. A tenant operation: it refuses an [end-user scope](/api-reference/rest-api/authentication#end-user-scope) with `403 forbidden`.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the chat connection. |

#### Response

Returns `200 OK` as `application/json`. The updated chat connection.

Response schema: `ChatConnection`.

```json
{
  "id": "cc_6Wd3Hs8KqP1vRt5N",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "agentId": "ag_4kP9sT2vXq7LmN3a",
  "name": "Support bot",
  "platform": "telegram",
  "enabled": true,
  "configuration": {
    "platform": "telegram",
    "businessMode": false,
    "chatIds": []
  },
  "webhookUrl": "https://api.blazingagents.com/v1/chat/webhooks/telegram/cc_6Wd3Hs8KqP1vRt5N",
  "identity": {
    "botId": "7123456789",
    "botUserId": "7123456789",
    "teamId": null,
    "appId": null
  },
  "health": {
    "checkedAt": "2026-07-10T10:00:00.000Z",
    "tokenValid": true,
    "identityVerified": true,
    "checks": [
      {
        "code": "bot_identity",
        "status": "pass"
      },
      {
        "code": "channel_membership",
        "status": "unknown"
      },
      {
        "code": "webhook_url",
        "status": "pass"
      }
    ]
  },
  "credentialFragment": "x9Qa",
  "credentialVersion": 1,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:15:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden), [`insufficient_scope`](/api-reference/protocols/errors#insufficient_scope) | The caller is not allowed to make this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`chat_webhook_conflict`](/api-reference/protocols/errors#chat_webhook_conflict) | The request conflicts with the resource's current state |
| `502` | [`chat_webhook_registration_failed`](/api-reference/protocols/errors#chat_webhook_registration_failed) | An upstream service failed |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF/enable" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Chat integrations](/platform/chat-integrations) to set up Slack or Telegram.
- [TypeScript](/sdk/typescript/chat-integrations), [Python](/sdk/python/chat-integrations), [Rust](/sdk/rust/chat-integrations), or [Go](/sdk/go/chat-integrations) chat integration methods.
