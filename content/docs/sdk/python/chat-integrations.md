---
title: Chat integrations
description: Connect an agent to your own Slack app or Telegram bot with the Python SDK.
---

# Chat integrations

`client.chat_connections` puts an existing agent behind your Slack app or Telegram bot. Blazing Agents receives the messages, keeps a session per conversation, posts the replies, and shows tool approval buttons in the chat. You send the bot credentials once; they are never returned. The agent must be configured with a provider and model, and your tenant needs an active subscription.

Examples assume `client = BlazingAgents()`. Every method also accepts `extra_headers` and `timeout`. On `AsyncBlazingAgents`, await the same method names. For the Slack and Telegram setup steps, see [Slack and Telegram](/platform/chat-integrations).

```python
import os

connection = client.chat_connections.create(
    name="Support on Telegram",
    agent_id="ag_0123456789abcdef",
    platform="telegram",
    credentials={"bot_token": os.environ["TELEGRAM_BOT_TOKEN"]},
    enabled=False,
)
connection = client.chat_connections.enable(connection.id)
connection = client.chat_connections.check_health(connection.id)
print([(check.code, check.status) for check in connection.health.checks])
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`list()`](#list) | List connections | `ChatConnections` |
| [`get()`](#get) | Get one connection | `ChatConnection` |
| [`create()`](#create) | Connect a bot to an agent | `ChatConnection` |
| [`update()`](#update) | Change the name or configuration | `ChatConnection` |
| [`rotate_credentials()`](#rotate-credentials) | Replace the bot credentials | `ChatConnection` |
| [`check_health()`](#check-health) | Re-run the health checks | `ChatConnection` |
| [`enable()`](#enable) | Start accepting messages | `ChatConnection` |
| [`disable()`](#disable) | Stop accepting messages | `ChatConnection` |
| [`delete()`](#delete) | Disconnect the bot | `None` |

`client.chat_deliveries` shows what happened to replies and approval buttons across every connection: [`list()`](#list-deliveries) gets one page and [`iter()`](#iter-deliveries) walks them all.

## Methods [#methods]

### `list()` [#list]

Lists your chat connections.

```python
connections = client.chat_connections.list().chat_connections
```

**Signature:** `list() -> ChatConnections`

Returns `ChatConnections`, whose `chat_connections` field is `list[ChatConnection]`.

### `get()` [#get]

Gets one connection.

```python
connection = client.chat_connections.get("cc_0123456789abcdef")
```

**Signature:** `get(chat_connection_id: str) -> ChatConnection`

Returns [`ChatConnection`](#chatconnection).

### `create()` [#create]

Connects a Slack app or Telegram bot to an agent.

```python
connection = client.chat_connections.create(
    name="Support on Slack",
    agent_id="ag_0123456789abcdef",
    platform="slack",
    credentials={
        "bot_token": os.environ["SLACK_BOT_TOKEN"],
        "signing_secret": os.environ["SLACK_SIGNING_SECRET"],
    },
    configuration={"channel_ids": ["C0123456789"]},
)
print(connection.webhook_url)
```

**Signature:** `create(*, name: str, agent_id: str, platform: Literal["slack", "telegram"], credentials, configuration=..., enabled=...) -> ChatConnection`

| Parameter | Slack | Telegram |
| --- | --- | --- |
| `credentials` | `{"bot_token", "signing_secret"}` | `{"bot_token"}` |
| `configuration` | Optional `{"channel_ids": [...]}` | Optional `{"chat_ids": [...], "business_mode": bool}` |

`credentials` must have exactly the keys for the platform, and `configuration` only the platform's keys, or the SDK raises `ValueError`. `channel_ids` and `chat_ids`, up to 20 each, pick where health checks look; they do not restrict who can use the bot. Set `business_mode` only for a Telegram Business bot.

`enabled` defaults to `True`. Pass `False` to finish setup before messages arrive. For Slack, paste the returned `webhook_url` into your Slack app. For Telegram, Blazing Agents registers the webhook for you when the connection is enabled. To use a different agent or bot, create a new connection. If creation times out, list your connections before retrying, since the first attempt may have succeeded.

### `update()` [#update]

Changes a connection's name or configuration.

```python
connection = client.chat_connections.update(
    connection.id,
    configuration={"channel_ids": ["C0123456789", "C9876543210"]},
)
```

**Signature:** `update(chat_connection_id: str, *, name=..., configuration=...) -> ChatConnection`

Pass at least one parameter; passing neither, or unknown configuration keys, raises `ValueError` before any request.

### `rotate_credentials()` [#rotate-credentials]

Replaces the bot credentials for the same bot or Slack installation. Existing conversations keep their sessions.

```python
connection = client.chat_connections.rotate_credentials(
    connection.id,
    platform="telegram",
    credentials={"bot_token": os.environ["TELEGRAM_BOT_TOKEN"]},
)
```

**Signature:** `rotate_credentials(chat_connection_id: str, *, platform: Literal["slack", "telegram"], credentials) -> ChatConnection`

Send the complete credential set for the platform, as in [`create()`](#create).

### `check_health()` [#check-health]

Re-runs the connection's health checks and returns the refreshed result.

```python
connection = client.chat_connections.check_health(connection.id)
for check in connection.health.checks:
    print(check.code, check.status, check.subject)
```

**Signature:** `check_health(chat_connection_id: str) -> ChatConnection`

Each check is `"pass"`, `"fail"`, or `"unknown"`. `"unknown"` means the check could not tell; verify that setting yourself. A valid token alone does not prove messages arrive: require the `webhook_url` check to pass.

### `enable()` [#enable]

Starts accepting messages and approval clicks.

```python
connection = client.chat_connections.enable(connection.id)
```

**Signature:** `enable(chat_connection_id: str) -> ChatConnection`

Messages sent while the connection was disabled are not replayed. For Telegram, enabling registers the webhook: it raises [`chat_webhook_conflict`](/api-reference/protocols/errors#chat_webhook_conflict) when the bot already points to another webhook and [`chat_webhook_registration_failed`](/api-reference/protocols/errors#chat_webhook_registration_failed) for other registration failures.

### `disable()` [#disable]

Stops accepting new messages and approval clicks. Work already started can finish.

```python
connection = client.chat_connections.disable(connection.id)
```

**Signature:** `disable(chat_connection_id: str) -> ChatConnection`

### `delete()` [#delete]

Disconnects the bot. Sessions from its conversations are kept.

```python
client.chat_connections.delete(connection.id)
```

**Signature:** `delete(chat_connection_id: str) -> None`

Blazing Agents clears the bot's Telegram webhook if it still points to this connection. Uninstalling a Slack app is up to you.

### `chat_deliveries.list()` [#list-deliveries]

Lists the replies and approval buttons your bots tried to post, across every connection, newest first. Use it for a status view that shows which messages never reached the chat.

```python
from datetime import datetime, timedelta, timezone

since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
page = client.chat_deliveries.list(status=["failed", "ambiguous"], since=since)
for delivery in page.data:
    print(delivery.platform, delivery.connection_id, delivery.status, delivery.diagnostic)
```

**Signature:** `list(*, status=..., since=..., cursor=..., limit=...) -> ChatDeliveriesPage`

| Parameter | Type | Description |
| --- | --- | --- |
| `status` | `Sequence[ChatDeliveryStatus]` | Any of `"pending"`, `"confirmed"`, `"failed"`, `"ambiguous"`; omit for all |
| `since` | `str` | ISO 8601 date-time with an offset. Only deliveries created at or after it |
| `cursor` | `str` | `next_cursor` from the previous page |
| `limit` | `int` | 1 to 100, default 50 |

`confirmed` means the platform accepted the message, `failed` means it did not, and `ambiguous` means it may have been sent. `pending` has not been attempted yet. To find messages that need attention, pass `status=["failed", "ambiguous"]` with a recent `since`. Keep the same filters when you pass `next_cursor` back as `cursor`.

Returns `ChatDeliveriesPage` with `data: list[TenantChatDelivery]` and `next_cursor: str | None`. Raises `validation_failed` or [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor).

### `chat_deliveries.iter()` [#iter-deliveries]

Iterates every matching delivery, fetching pages as you go.

```python
for delivery in client.chat_deliveries.iter(status=["failed", "ambiguous"], since=since):
    print(delivery.platform, delivery.connection_id, delivery.status, delivery.diagnostic)
```

**Signature:** `iter(*, status=..., since=..., cursor=..., limit=...) -> Iterator[TenantChatDelivery]`

Takes the same parameters as [`chat_deliveries.list()`](#list-deliveries). No request is sent until you start iterating. On the async client, use `async for` directly on `iter(...)`; do not await it.

## Response models [#response-models]

### `ChatConnection` [#chatconnection]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `str` | Connection ID (`cc_...`) |
| `tenant_id`, `agent_id` | `str` | Owner and agent |
| `name` | `str` | Display name |
| `platform` | `str` | `"slack"` or `"telegram"` |
| `enabled` | `bool` | Whether messages are accepted |
| `configuration` | `SlackChatConfiguration \| TelegramChatConfiguration` | Destinations and Telegram Business mode |
| `webhook_url` | `str` | Callback URL for the platform. Read-only |
| `identity` | `ChatIdentity` | Verified bot identity: `bot_id`, `bot_user_id`, `team_id`, `app_id` |
| `health` | `ChatHealth` | `checked_at`, `token_valid`, `identity_verified`, and `checks` |
| `credential_fragment` | `str` | Short, non-secret fragment of the credential |
| `credential_version` | `int` | Version of the stored credentials |
| `created_at`, `updated_at` | `str` | Timestamps |

### `TenantChatDelivery` [#tenantchatdelivery]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `str` | Delivery ID (`cd_...`) |
| `connection_id` | `str` | The connection that posted it (`cc_...`) |
| `agent_id` | `str` | The connection's agent |
| `platform` | `str` | `"slack"` or `"telegram"` |
| `kind` | `str` | `"reply"` or `"card"`: an agent reply or a tool approval card |
| `status` | `ChatDeliveryStatus` | `"pending"`, `"confirmed"`, `"failed"`, or `"ambiguous"` |
| `attempt` | `int` | The current send attempt |
| `diagnostic` | `str \| None` | Why the last send failed, when known |
| `session_id` | `str` | The session behind the conversation |
| `thread_id` | `str` | The chat thread it belongs to |
| `message_id`, `approval_id` | `str \| None` | The reply message or the approval it carries |
| `created_at`, `updated_at` | `str` | Timestamps |

It also has `credential_version`, `representation`, and `receipts`. The package exports `ChatDelivery`, `TenantChatDelivery`, and `ChatDeliveryStatus`.

## Next [#next]

- [Slack and Telegram setup](/platform/chat-integrations)
- [Tool approvals](/agents/tools/tool-approvals)
- [Sessions](/sdk/python/sessions)
