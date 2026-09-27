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

## Delivery outcomes [#delivery-outcomes]

A delivery is one reply or approval card a connection tried to post to the
chat. Its `status` is `pending` (not sent yet), `confirmed` (the platform
accepted it), `failed` (it did not go through), or `ambiguous` (it may have
been sent).

`GET /v1/chat-deliveries` lists deliveries across every connection, newest
first. Use it for a status view over all your bots, and the per-connection
list when you investigate one bot. Pass several statuses as a comma-separated
list in one `status` parameter, such as `status=failed,ambiguous`; repeated
`status` parameters are not supported. `since` is an inclusive ISO 8601
date-time with an offset. Keep the same filters when you pass `nextCursor`
back as `cursor`.

## Endpoints [#endpoints]

### GET /v1/chat-connections [#list-chat-connections]

List chat connections.

Lists every chat connection in your tenant, oldest first. Full credentials are never returned.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

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
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/chat-connections" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/chat-connections [#create-chat-connection]

Create a chat connection.

Connects one of your agents to a Slack app or Telegram bot. Blazing Agents checks the credentials with the chat platform and reads the bot identity from the token before saving, and returns the `webhookUrl` to configure on the platform. Each bot installation belongs to one connection. Slack needs `botToken` and `signingSecret`; Telegram needs only `botToken`. Creating an enabled Telegram connection registers its webhook for you. If that registration fails, the connection is saved disabled and its `webhook_url` health check fails; fix the bot and call enable.

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
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`invalid_request`](/api-reference/protocols/errors#invalid_request) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/chat-connections" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"Support bot","agentId":"ag_4kP9sT2vXq7LmN3a","platform":"telegram","credentials":{"botToken":"7123456789:AAFexampleTokenReplaceMe_x9Qa"}}'
```

### GET /v1/chat-connections/:id/deliveries [#list-chat-deliveries]

List chat deliveries.

Lists the replies and approval cards the connection has sent or tried to send, newest first. Each record shows its status, attempt number, diagnostic code, and any message receipts the platform returned. Message bodies, tool arguments, and credentials are not included. Pass `nextCursor` as `cursor` to fetch older records.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the chat connection. |
| `cursor` | string | query |  | `nextCursor` from the previous page, to fetch older records. |
| `limit` | integer | query |  | Maximum number of records to return, 1 to 100. Defaults to 100. 1–100. Defaults to `100`. |

#### Response

Returns `200 OK` as `application/json`. A page of chat deliveries.

Response schema: `ChatDeliveryList`.

```json
{
  "data": [
    {
      "id": "cd_2Nf7Lp4WxB9kTc3M",
      "kind": "reply",
      "status": "confirmed",
      "attempt": 1,
      "credentialVersion": 1,
      "representation": "native",
      "diagnostic": null,
      "receipts": [
        {
          "attempt": 1,
          "messageId": "412"
        }
      ],
      "sessionId": "ss_5Jm1Qe8RvC3yHd6X",
      "messageId": "412",
      "approvalId": null,
      "threadId": "telegram:5012345678",
      "createdAt": "2026-07-10T10:05:00.000Z",
      "updatedAt": "2026-07-10T10:05:02.000Z"
    }
  ],
  "nextCursor": null
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF/deliveries" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/chat-deliveries [#list-tenant-chat-deliveries]

List your tenant's chat deliveries.

Lists the replies and approval cards your tenant's Chat Connections have sent or tried to send, across all connections, newest first. Filter with `status` (comma-separated, for example `failed,ambiguous`) and `since` (an inclusive `createdAt` lower bound). Pass `nextCursor` as `cursor` to fetch older records.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `status` | string | query |  | Comma-separated delivery statuses to include: `pending`, `confirmed`, `failed`, or `ambiguous`. Leave out for all statuses. |
| `since` | string | query |  | Only deliveries created at or after this ISO 8601 date-time. |
| `cursor` | string | query |  | `nextCursor` from the previous page, to fetch older records. |
| `limit` | integer | query |  | Maximum number of records to return, 1 to 100. Defaults to 50. 1–100. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. A page of your tenant's chat deliveries.

Response schema: `TenantChatDeliveryList`.

```json
{
  "data": [
    {
      "id": "cd_2Nf7Lp4WxB9kTc3M",
      "kind": "reply",
      "status": "confirmed",
      "attempt": 1,
      "credentialVersion": 1,
      "representation": "native",
      "diagnostic": null,
      "receipts": [
        {
          "attempt": 1,
          "messageId": "412"
        }
      ],
      "sessionId": "ss_5Jm1Qe8RvC3yHd6X",
      "messageId": "412",
      "approvalId": null,
      "threadId": "telegram:5012345678",
      "createdAt": "2026-07-10T10:05:00.000Z",
      "updatedAt": "2026-07-10T10:05:02.000Z",
      "connectionId": "cc_6Wd3Hs8KqP1vRt5N",
      "agentId": "ag_4kP9sT2vXq7LmN3a",
      "platform": "telegram"
    }
  ],
  "nextCursor": null
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/chat-deliveries" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/chat-connections/:id/deliveries/:deliveryId/repair [#repair-chat-delivery]

Repair a chat delivery.

Sends a stuck reply or approval card again, without running a turn or tool. Use it when the previous send stopped before its outcome was known. Send `expectedAttempt` equal to the delivery's current `attempt`, and set both `previousSenderStopped` and `acceptDuplicateRisk` to `true`. The connection must be enabled. Repair can make a message appear twice. Check `status` in the response: a successful request does not by itself mean the message was delivered.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the chat connection. |
| `deliveryId` | string | path | required | ID of the delivery. |
| `expectedAttempt` | integer | body | required | The delivery's current `attempt`, from list chat deliveries. The repair is refused if it has changed. 0–99. |
| `previousSenderStopped` | boolean | body | required | Confirms that the sender of the previous attempt has stopped. |
| `acceptDuplicateRisk` | boolean | body | required | Confirms you accept that the message may appear twice, because the platform may already have it. |

#### Response

Returns `200 OK` as `application/json`. The delivery outcome.

Response schema: `ChatDeliveryResult`.

```json
{
  "id": "cd_2Nf7Lp4WxB9kTc3M",
  "sessionId": "ss_5Jm1Qe8RvC3yHd6X",
  "threadId": "telegram:5012345678",
  "connectionId": "cc_6Wd3Hs8KqP1vRt5N",
  "kind": "reply",
  "status": "confirmed",
  "attempt": 2
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`invalid_request`](/api-reference/protocols/errors#invalid_request) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF/deliveries/cd_1234567890ABCDEF/repair" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"expectedAttempt":1,"previousSenderStopped":true,"acceptDuplicateRisk":true}'
```

### GET /v1/chat-connections/:id [#get-chat-connection]

Get a chat connection.

Returns a connection. `health` shows the result of the last check; call check health to run a new one. Full credentials are never returned.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

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
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
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

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the chat connection. |
| `name` | string | body |  | New display name. 1–80 characters. |
| `configuration` | object | body |  | Fields to change. Slack connections accept `channelIds`; Telegram connections accept `chatIds` and `businessMode`. Fields you leave out keep their values. |

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
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`invalid_request`](/api-reference/protocols/errors#invalid_request) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
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

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the chat connection. |

#### Response

Returns `204 No Content`. The chat connection was deleted.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/chat-connections/:id/credentials [#rotate-chat-credentials]

Rotate chat connection credentials.

Replaces a connection's credentials. Send `platform` matching the connection and the complete credentials for the same bot installation: Slack needs `botToken` and `signingSecret`, and Telegram needs `botToken`. The new credentials are checked with the chat platform and must identify the same bot. The enabled state and sessions are kept. On an enabled Telegram connection, Blazing Agents re-registers the webhook with a new secret. If that fails, the new credentials are still saved and the request returns an error; call enable to retry.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the chat connection. |
| `(body)` | object | body | required | Raw `application/json` request body. |

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
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`invalid_request`](/api-reference/protocols/errors#invalid_request) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
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

Requires [bearer authentication](/api-reference/rest-api/authentication).

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
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/chat-connections/cc_1234567890ABCDEF/health" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/chat-connections/:id/disable [#disable-chat-connection]

Disable a chat connection.

Stops the connection from accepting new messages and approval clicks. Work already accepted can finish. While disabled, Slack URL verification still succeeds, other messages are acknowledged and dropped, and deliveries cannot be repaired.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

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
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
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

Requires [bearer authentication](/api-reference/rest-api/authentication).

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
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
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
- [TypeScript](/sdk/typescript/chat-integrations) or [Python](/sdk/python/chat-integrations) chat integration methods.
