---
title: Chat integrations
description: Connect an agent to your own Slack app or Telegram bot with the Python SDK.
---

# Chat integrations

`client.chat_connections` puts an existing agent behind your Slack app or Telegram bot. Blazing Agents receives the messages, keeps a session per conversation, posts the replies, and shows tool approval buttons in the chat. A message sent while the agent is answering waits and is answered in order, and a redelivered event is answered once. You send the bot credentials once; they are never returned. The agent must have a provider and model, and it cannot be the admin agent. Your tenant needs an active subscription.

Run connection setup from your backend or a one-off script, never from code you ship to users, since it needs your API key and the bot credentials. Examples assume `client = BlazingAgents()`. Every method also accepts `extra_headers` and `timeout`. On `AsyncBlazingAgents`, await the same method names. For the Slack and Telegram setup steps, and for how the bot reports interrupted turns, see [Slack and Telegram](/platform/chat-integrations).

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
| [`list_deliveries()`](#list-connection-deliveries) | List one connection's deliveries | `ChatConnectionDeliveriesPage` |
| [`iter_deliveries()`](#iter-connection-deliveries) | Iterate one connection's deliveries | `Iterator[ChatDelivery]` |
| [`repair_delivery()`](#repair-delivery) | Send a stuck reply or approval card again | `ChatDeliveryResult` |

`client.chat_deliveries` lists replies and approval buttons that failed or may not have arrived, across every connection: [`list()`](#list-deliveries) gets one page and [`iter()`](#iter-deliveries) walks them all. To see one connection's deliveries in every status, use [`list_deliveries()`](#list-connection-deliveries), and to send one again, use [`repair_delivery()`](#repair-delivery).

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

Returns [`ChatConnection`](#chatconnection). Raises [`validation_failed`](/api-reference/protocols/errors#validation_failed) or [`not_found`](/api-reference/protocols/errors#not_found).

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

`enabled` defaults to `True`. Pass `False` to finish setup before messages arrive. For Slack, set the returned `webhook_url` as both the Event Subscriptions and the Interactivity Request URL of your Slack app ([Connect Slack](/platform/chat-integrations#connect-slack)). For Telegram, Blazing Agents registers the webhook and generates its secret when the connection is enabled, so you never supply one. To use a different agent or bot, create a new connection. If `agent_id` is the admin agent, `create()` raises [`admin_agent_managed`](/api-reference/protocols/errors#admin_agent_managed) (HTTP `409`) and creates nothing. If creation times out, list your connections before retrying, since the first attempt may have succeeded. Raises `validation_failed`, `not_found` when the agent does not exist, or `admin_agent_managed`.

### `update()` [#update]

Changes a connection's name or configuration.

```python
connection = client.chat_connections.update(
    connection.id,
    configuration={"channel_ids": ["C0123456789", "C9876543210"]},
)
```

**Signature:** `update(chat_connection_id: str, *, name=..., configuration=...) -> ChatConnection`

Pass at least one parameter; passing neither, or unknown configuration keys, raises `ValueError` before any request. Raises `validation_failed`, `not_found`, [`chat_webhook_conflict`](/api-reference/protocols/errors#chat_webhook_conflict), or [`chat_webhook_registration_failed`](/api-reference/protocols/errors#chat_webhook_registration_failed).

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

Send the complete credential set for the platform, as in [`create()`](#create). Raises `validation_failed`, `not_found`, `chat_webhook_conflict`, or `chat_webhook_registration_failed`.

### `check_health()` [#check-health]

Re-runs the connection's health checks and returns the refreshed result.

```python
connection = client.chat_connections.check_health(connection.id)
for check in connection.health.checks:
    print(check.code, check.status, check.subject)
```

**Signature:** `check_health(chat_connection_id: str) -> ChatConnection`

Each check is `"pass"`, `"fail"`, or `"unknown"`. `"unknown"` means the check could not tell; verify that setting yourself. A valid token alone does not prove messages arrive: require the `webhook_url` check to pass. Raises `validation_failed` or `not_found`.

### `enable()` [#enable]

Starts accepting messages and approval clicks.

```python
connection = client.chat_connections.enable(connection.id)
```

**Signature:** `enable(chat_connection_id: str) -> ChatConnection`

Messages sent while the connection was disabled are not replayed. For Telegram, enabling registers the webhook: it raises `chat_webhook_conflict` when the bot already points to another webhook and `chat_webhook_registration_failed` for other registration failures. Also raises `validation_failed` or `not_found`.

### `disable()` [#disable]

Stops accepting new messages and approval clicks. Work already started can finish.

```python
connection = client.chat_connections.disable(connection.id)
```

**Signature:** `disable(chat_connection_id: str) -> ChatConnection`

Raises `validation_failed` or `not_found`.

### `delete()` [#delete]

Disconnects the bot. Sessions from its conversations are kept.

```python
client.chat_connections.delete(connection.id)
```

**Signature:** `delete(chat_connection_id: str) -> None`

Blazing Agents clears the bot's Telegram webhook if it still points to this connection. Uninstalling a Slack app is up to you. Raises `validation_failed` or `not_found`.

### `list_deliveries()` [#list-connection-deliveries]

Lists the replies and approval buttons one connection sent or tried to send, newest first, in every status. Records carry no message text, tool arguments, or credentials.

```python
page = client.chat_connections.list_deliveries(connection.id, limit=20)
for delivery in page.data:
    print(delivery.kind, delivery.status, delivery.attempt, delivery.diagnostic)
```

**Signature:** `list_deliveries(chat_connection_id: str, *, cursor=..., limit=...) -> ChatConnectionDeliveriesPage`

| Parameter | Type | Description |
| --- | --- | --- |
| `chat_connection_id` | `str` | Connection ID (`cc_...`) |
| `cursor` | `str` | `next_cursor` from the previous page, to fetch older records |
| `limit` | `int` | 1 to 100, default 100 |

Returns `ChatConnectionDeliveriesPage` with `data: list[ChatDelivery]` and `next_cursor: str | None`. Raises `validation_failed`, [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor), or `not_found`.

### `iter_deliveries()` [#iter-connection-deliveries]

Iterates every delivery of one connection, fetching pages as you go.

```python
for delivery in client.chat_connections.iter_deliveries(connection.id):
    if delivery.status == "pending":
        print(delivery.id, delivery.attempt)
```

**Signature:** `iter_deliveries(chat_connection_id: str, *, cursor=..., limit=...) -> Iterator[ChatDelivery]`

Takes the same parameters as [`list_deliveries()`](#list-connection-deliveries); `limit` sets the page size, not the total. No request is sent until you start iterating. On the async client, use `async for` directly on `iter_deliveries(...)`; do not await it.

### `repair_delivery()` [#repair-delivery]

Sends a stuck reply or approval card again with the connection's current credentials. It does not run a turn or a tool. Use it when the previous send stopped before its outcome was known, such as an `ambiguous` delivery.

```python
for delivery in client.chat_deliveries.iter(status=["ambiguous"]):
    result = client.chat_connections.repair_delivery(
        delivery.connection_id,
        delivery.id,
        expected_attempt=delivery.attempt,
    )
    print(delivery.id, result.status, result.attempt)
```

**Signature:** `repair_delivery(chat_connection_id: str, delivery_id: str, *, expected_attempt: int) -> ChatDeliveryResult`

| Parameter | Type | Description |
| --- | --- | --- |
| `chat_connection_id` | `str` | Connection ID (`cc_...`) |
| `delivery_id` | `str` | Delivery ID (`cd_...`) |
| `expected_attempt` | `int` | The delivery's current `attempt`, 0 to 99. The repair is refused if it has changed |

Calling `repair_delivery()` confirms two things for you: the sender of the previous attempt has stopped, and you accept that the message may appear twice because the platform may already have it. The SDK sends `previousSenderStopped` and `acceptDuplicateRisk` as `true` on every call. The connection must be enabled, and the API key needs write access.

A successful call does not mean the message arrived. Check `result.status`: `"confirmed"`, `"failed"`, or `"ambiguous"`. Raises `invalid_request` when the connection is disabled, the attempt changed, another sender holds the delivery, or the approval or session it belongs to is no longer active. Also raises `validation_failed`, `insufficient_scope`, or `not_found`. The SDK raises `ValueError` before sending when `delivery_id` is empty, `"."`, or `".."`.

### `chat_deliveries.list()` [#list-deliveries]

Lists the replies and approval buttons that failed or may not have arrived, across every connection, newest first. Use it for a status view that shows which messages need attention.

```python
from datetime import datetime, timedelta, timezone

since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
page = client.chat_deliveries.list(since=since)
for delivery in page.data:
    print(delivery.platform, delivery.connection_id, delivery.status, delivery.diagnostic)
```

**Signature:** `list(*, status=..., since=..., cursor=..., limit=...) -> ChatDeliveriesPage`

| Parameter | Type | Description |
| --- | --- | --- |
| `status` | `Sequence[ChatDeliveryListStatus]` | `"failed"`, `"ambiguous"`, or both; default both |
| `since` | `str` | ISO 8601 date-time with an offset. Only deliveries created at or after it |
| `cursor` | `str` | `next_cursor` from the previous page |
| `limit` | `int` | 1 to 100, default 50 |

`failed` means the platform did not accept the message, and `ambiguous` means it may have been sent. The feed never lists `pending` or `confirmed` deliveries; use [`list_deliveries()`](#list-connection-deliveries) on one connection for those, and passing any other `status` fails with `validation_failed`. To send a `failed` or `ambiguous` delivery again, use [`repair_delivery()`](#repair-delivery). Keep the same filters when you pass `next_cursor` back as `cursor`.

Returns `ChatDeliveriesPage` with `data: list[TenantChatDelivery]` and `next_cursor: str | None`. Raises `validation_failed` or [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor).

### `chat_deliveries.iter()` [#iter-deliveries]

Iterates every matching delivery, fetching pages as you go.

```python
for delivery in client.chat_deliveries.iter(since=since):
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
| `status` | `ChatDeliveryStatus` | `"failed"` or `"ambiguous"` |
| `attempt` | `int` | The current send attempt |
| `diagnostic` | `str \| None` | Why the last send failed, when known |
| `session_id` | `str` | The session behind the conversation |
| `thread_id` | `str` | The chat thread it belongs to |
| `message_id`, `approval_id` | `str \| None` | The reply message or the approval it carries |
| `created_at`, `updated_at` | `str` | Timestamps |

It also has `credential_version`, `representation`, and `receipts`. The package exports `ChatDelivery`, `TenantChatDelivery`, `ChatDeliveryStatus`, and `ChatDeliveryListStatus`.

### `ChatDelivery` [#chatdelivery]

One item of [`list_deliveries()`](#list-connection-deliveries). It has the fields of [`TenantChatDelivery`](#tenantchatdelivery) except `connection_id`, `agent_id`, and `platform`, and its `status` can be any `ChatDeliveryStatus`: `"pending"`, `"confirmed"`, `"failed"`, or `"ambiguous"`.

### `ChatDeliveryResult` [#chatdeliveryresult]

Returned by [`repair_delivery()`](#repair-delivery).

| Field | Type | Description |
| --- | --- | --- |
| `id` | `str` | Delivery ID (`cd_...`) |
| `connection_id` | `str` | The connection that sent it (`cc_...`) |
| `session_id` | `str` | The session behind the conversation |
| `thread_id` | `str` | The chat thread it belongs to |
| `kind` | `str` | `"reply"` or `"card"` |
| `status` | `str` | `"confirmed"`, `"failed"`, or `"ambiguous"` after this attempt |
| `attempt` | `int` | The attempt this repair made |

## Next [#next]

- [Slack and Telegram setup](/platform/chat-integrations)
- [Tool approvals](/agents/tools/tool-approvals)
- [Sessions](/sdk/python/sessions)
