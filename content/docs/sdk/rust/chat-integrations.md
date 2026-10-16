---
title: Chat integrations
description: Connect an agent to your own Slack app or Telegram bot with the Rust SDK.
---

# Chat integrations

`client.chat_connections()` connects an agent to your own Slack app or Telegram bot so people can talk to it there. `client.chat_deliveries()` lists replies and approval buttons that failed or may not have arrived, across every connection. Both are tenant only: a `UserClient` has neither.

Examples receive a `client: blazing_agents::Client`. Every call also takes the `with_timeout`, `without_timeout`, `with_header`, and `with_client_request_id` transport options.

```rust
use blazing_agents::chat_connections::{NewChatConnection, TelegramCredentials};

let connection = client
    .chat_connections()
    .create(NewChatConnection::telegram(
        "ag_0123456789abcdef",
        "Support bot",
        TelegramCredentials::new(std::env::var("TELEGRAM_BOT_TOKEN")?),
    ))
    .await?;
println!("{}", connection.webhook_url);
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`list()`](#list) | List chat connections | [`ChatConnectionList`](#chatconnection) |
| [`get()`](#get) | Get one connection | [`ChatConnection`](#chatconnection) |
| [`create()`](#create) | Connect an agent to a platform | [`ChatConnection`](#chatconnection) |
| [`update()`](#update) | Change name or configuration | [`ChatConnection`](#chatconnection) |
| [`rotate_credentials()`](#rotate-credentials) | Replace credentials | [`ChatConnection`](#chatconnection) |
| [`check_health()`](#check-health) | Check the connection against its platform | [`ChatConnection`](#chatconnection) |
| [`enable()`](#enable) | Resume deliveries | [`ChatConnection`](#chatconnection) |
| [`disable()`](#disable) | Pause deliveries | [`ChatConnection`](#chatconnection) |
| [`delete()`](#delete) | Delete a connection | `()` |
| [`deliveries()`](#deliveries) | List one connection's deliveries | [`Page<ChatDelivery>`](#tenantchatdelivery) |
| [`repair_delivery()`](#repair-delivery) | Resend a failed or ambiguous delivery | [`ChatDeliveryResult`](#chatdeliveryresult) |
| [`chat_deliveries().list()`](#list-deliveries) | List failed and ambiguous deliveries tenant-wide | [`Page<TenantChatDelivery>`](#tenantchatdelivery) |

## Methods [#methods]

### `list()` [#list]

Lists chat connections.

```rust
let connections = client.chat_connections().list().await?.chat_connections;
```

**Signature:** `list() -> Call<ListChatConnections>`

Awaiting returns [`ChatConnectionList`](#chatconnection) with `chat_connections: Vec<ChatConnection>`.

### `get()` [#get]

Gets one chat connection.

```rust
let connection = client.chat_connections().get("cc_0123456789abcdef").await?;
```

**Signature:** `get(chat_connection_id: impl Into<ChatConnectionId>) -> Call<GetChatConnection>`

Awaiting returns [`ChatConnection`](#chatconnection). Fails with `Error::Api` whose code is [`validation_failed`](/api-reference/protocols/errors#validation_failed) or [`not_found`](/api-reference/protocols/errors#not_found).

### `create()` [#create]

Connects an agent to a chat platform. Credentials are never returned.

```rust
use blazing_agents::chat_connections::{NewChatConnection, SlackCredentials};

let connection = client
    .chat_connections()
    .create(NewChatConnection::slack(
        "ag_0123456789abcdef",
        "Support app",
        SlackCredentials::new(
            std::env::var("SLACK_BOT_TOKEN")?,
            std::env::var("SLACK_SIGNING_SECRET")?,
        ),
    ))
    .await?;
```

**Signature:** `create(connection: impl Into<NewChatConnection>) -> Call<CreateChatConnection>`

`NewChatConnection::slack(agent_id, name, credentials)` and `::telegram(agent_id, name, credentials)` build the input. For the optional settings, build a `NewSlackConnection` or `NewTelegramConnection` directly: `NewSlackConnection::new(agent_id, name, credentials).enabled(false).channel_ids([...])`, and the Telegram one adds `.chat_ids([...])` and `.business_mode(true)`. `enabled` defaults to `true`, and each list takes up to 20 IDs that health checks look at without restricting who can talk to the agent.

Awaiting returns [`ChatConnection`](#chatconnection). If `agent_id` is the admin agent, `create()` fails with [`admin_agent_managed`](/api-reference/protocols/errors#admin_agent_managed) (HTTP `409`) and creates nothing. If creation times out, list your connections before retrying, since the first attempt may have succeeded. Fails with `validation_failed`, `not_found`, [`chat_webhook_conflict`](/api-reference/protocols/errors#chat_webhook_conflict), or [`chat_webhook_registration_failed`](/api-reference/protocols/errors#chat_webhook_registration_failed). If a response ever echoes credential material back, the call fails client-side with `Error::CredentialEcho` and the body is discarded.

### `update()` [#update]

Changes a chat connection's name or configuration. Set at least one field; the server rejects an empty update.

```rust
let connection = client
    .chat_connections()
    .update("cc_0123456789abcdef")
    .name("Support app v2")
    .await?;
```

**Signature:** `update(chat_connection_id: impl Into<ChatConnectionId>) -> Call<RenameChatConnection>`

| Setter | Description |
| --- | --- |
| `name(name)` | A new display name, 1 to 80 characters |
| `channel_ids(channel_ids)` | Slack channel IDs health checks look at, up to 20 |
| `chat_ids(chat_ids)` | Telegram chat IDs health checks look at, up to 20 |
| `business_mode(business_mode)` | Whether a Telegram bot runs in Business mode |

Awaiting returns [`ChatConnection`](#chatconnection). Fails with `validation_failed` or `not_found`.

### `rotate_credentials()` [#rotate-credentials]

Replaces a chat connection's credentials. The platform must match the connection's.

```rust
use blazing_agents::chat_connections::ChatCredentials;

let connection = client
    .chat_connections()
    .rotate_credentials(
        "cc_0123456789abcdef",
        ChatCredentials::telegram(std::env::var("TELEGRAM_BOT_TOKEN")?),
    )
    .await?;
```

**Signature:** `rotate_credentials(chat_connection_id: impl Into<ChatConnectionId>, credentials: ChatCredentials) -> Call<RotateChatCredentials>`

`ChatCredentials::slack(bot_token, signing_secret)` or `ChatCredentials::telegram(bot_token)`. Awaiting returns [`ChatConnection`](#chatconnection) with an incremented `credential_version`. Fails with `validation_failed` or `not_found`.

### `check_health()` [#check-health]

Checks a chat connection against its platform.

```rust
let connection = client
    .chat_connections()
    .check_health("cc_0123456789abcdef")
    .await?;
println!("{}", connection.health.token_valid);
```

**Signature:** `check_health(chat_connection_id: impl Into<ChatConnectionId>) -> Call<CheckChatHealth>`

Awaiting returns [`ChatConnection`](#chatconnection) whose `health` holds the last check. Fails with `validation_failed` or `not_found`.

### `enable()` [#enable]

Resumes deliveries on a chat connection.

```rust
let connection = client.chat_connections().enable("cc_0123456789abcdef").await?;
```

**Signature:** `enable(chat_connection_id: impl Into<ChatConnectionId>) -> Call<EnableChatConnection>`

Awaiting returns [`ChatConnection`](#chatconnection) with `enabled` `true`. Fails with `validation_failed` or `not_found`.

### `disable()` [#disable]

Pauses deliveries on a chat connection.

```rust
let connection = client.chat_connections().disable("cc_0123456789abcdef").await?;
```

**Signature:** `disable(chat_connection_id: impl Into<ChatConnectionId>) -> Call<DisableChatConnection>`

Awaiting returns [`ChatConnection`](#chatconnection) with `enabled` `false`. Fails with `validation_failed` or `not_found`.

### `delete()` [#delete]

Deletes a chat connection.

```rust
client.chat_connections().delete("cc_0123456789abcdef").await?;
```

**Signature:** `delete(chat_connection_id: impl Into<ChatConnectionId>) -> Call<DeleteChatConnection>`

Fails with `validation_failed` or `not_found`.

### `deliveries()` [#deliveries]

Lists one chat connection's deliveries, newest first.

```rust
let page = client
    .chat_connections()
    .deliveries("cc_0123456789abcdef")
    .await?;
```

**Signature:** `deliveries(chat_connection_id: impl Into<ChatConnectionId>) -> Call<ListChatDeliveries>`

The `limit` setter takes 1 to 100 deliveries per page, defaulting to 100. Awaiting returns [`Page<ChatDelivery>`](#tenantchatdelivery); `.items()` and `.pages()` walk every page lazily. Fails with `validation_failed`, `invalid_cursor`, or `not_found`.

### `repair_delivery()` [#repair-delivery]

Resends a failed or ambiguous delivery. `expected_attempt` is the delivery's current `attempt`, 0 to 99, and the repair is refused if it has changed. Calling it confirms the sender of the previous attempt has stopped, and that you accept the message may appear twice because the platform may already have it.

```rust
let result = client
    .chat_connections()
    .repair_delivery("cc_0123456789abcdef", "cd_0123456789abcdef", 1)
    .await?;
println!("{}", result.status);
```

**Signature:** `repair_delivery(chat_connection_id: impl Into<ChatConnectionId>, delivery_id: impl Into<ChatDeliveryId>, expected_attempt: u64) -> Call<RepairChatDelivery>`

Awaiting returns [`ChatDeliveryResult`](#chatdeliveryresult). Fails with `validation_failed` or `not_found`.

### `chat_deliveries().list()` [#list-deliveries]

Lists failed and ambiguous deliveries across chat connections.

```rust
use blazing_agents::chat_connections::ChatDeliveryListStatus;

let page = client
    .chat_deliveries()
    .list()
    .status([ChatDeliveryListStatus::Failed])
    .await?;
for delivery in &page.data {
    println!("{} {}", delivery.id, delivery.status);
}
```

**Signature:** `list() -> Call<ListTenantChatDeliveries>`

| Setter | Type | Description |
| --- | --- | --- |
| `status` | `impl IntoIterator<Item = ChatDeliveryListStatus>` | Only these statuses (`Failed`, `Ambiguous`), sent comma-separated; empty leaves the filter out |
| `since` | `Timestamp` | Only deliveries created at or after this instant |
| `limit` | `u8` | Page size, 1 to 100; defaults to 50 |

Awaiting returns [`Page<TenantChatDelivery>`](#tenantchatdelivery); `.items()` and `.pages()` walk every page lazily. Fails with `validation_failed` or `invalid_cursor`.

## Response models [#response-models]

### `ChatConnection` [#chatconnection]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `ChatConnectionId` | Connection ID (`cc_...`) |
| `tenant_id` | `TenantId` | Your tenant ID |
| `agent_id` | `AgentId` | The agent that answers messages |
| `name` | `String` | Display name |
| `platform` | `ChatPlatform` | `Slack` or `Telegram` |
| `enabled` | `bool` | Whether the connection accepts messages |
| `configuration` | `ChatConfiguration` | Platform settings (`Slack` `channel_ids`, or `Telegram` `business_mode` and `chat_ids`) |
| `identity` | `ChatIdentity` | The bot's identity on the platform |
| `health` | `ChatHealth` | The last health check (`checked_at`, `token_valid`, `identity_verified`, `checks`) |
| `credential_fragment` | `String` | Last characters of the credential, for display |
| `credential_version` | `u64` | Incremented on each rotation |
| `webhook_url` | `String` | The webhook URL registered with the platform |
| `created_at`, `updated_at` | `Timestamp` | Timestamps |

### `TenantChatDelivery` [#tenantchatdelivery]

`ChatDelivery` and `TenantChatDelivery` share their fields; the tenant-wide entry adds `connection_id`, `agent_id`, and `platform`.

| Field | Type | Description |
| --- | --- | --- |
| `id` | `ChatDeliveryId` | Delivery ID (`cd_...`) |
| `kind` | `ChatDeliveryKind` | `Reply` or `Card` |
| `status` | `ChatDeliveryStatus` | `Pending`, `Confirmed`, `Failed`, or `Ambiguous` |
| `attempt` | `u64` | How many sends have been tried |
| `credential_version` | `u64` | The credential version used |
| `representation` | `String` | What the delivery sent, as text |
| `diagnostic` | `Option<String>` | Why it failed |
| `receipts` | `Option<serde_json::Value>` | The platform's receipts, in its own shape |
| `session_id` | `SessionId` | The session the message belongs to |
| `message_id` | `Option<String>` | The message's ID, when one exists |
| `approval_id` | `Option<ApprovalId>` | The approval it answers, when it is one |
| `thread_id` | `String` | The platform thread |
| `created_at`, `updated_at` | `Timestamp` | Timestamps |

### `ChatDeliveryResult` [#chatdeliveryresult]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `ChatDeliveryId` | The delivery's ID |
| `session_id` | `SessionId` | The session the message belongs to |
| `thread_id` | `String` | The platform thread the delivery belongs to |
| `connection_id` | `ChatConnectionId` | The connection the delivery went through |
| `kind` | `ChatDeliveryKind` | What the delivery carries |
| `status` | `ChatDeliveryStatus` | Where the delivery stands after the repair |
| `attempt` | `u64` | How many sends have been tried |

## Next [#next]

- [Chat integrations](/platform/chat-integrations)
- [Agents](/sdk/rust/agents)
