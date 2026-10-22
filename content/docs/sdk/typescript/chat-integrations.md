---
title: Chat integrations
description: Connect an agent to a Slack or Telegram bot and manage the connection with the TypeScript SDK.
---

# Chat integrations

`client.chatConnections` puts an agent behind a Slack or Telegram bot. Blazing Agents receives the bot's messages, keeps a session for each direct message, thread, or forum topic, and posts the agent's replies and tool approval buttons. A message sent while the agent is answering waits and is answered in order, and a redelivered event is answered once. To set up the bot on each platform and see how interrupted turns are reported in the chat, read [Chat integrations](/platform/chat-integrations).

```typescript
const connection = await client.chatConnections.create({
  name: "Support on Telegram",
  agentId,
  platform: "telegram",
  enabled: false,
  credentials: { botToken: process.env.TELEGRAM_BOT_TOKEN! },
});

await client.chatConnections.enable({ chatConnectionId: connection.id });
const { health } = await client.chatConnections.checkHealth({ chatConnectionId: connection.id });
console.log(health.checks);
```

Every method takes one input object and accepts an optional `abortSignal`. Bot credentials are never returned; responses show at most four characters in `credentialFragment`.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Connect an agent to a bot | `ChatConnection` |
| [`list()`](#list) | List connections | `ChatConnectionsResponse` |
| [`get()`](#get) | Read one connection | `ChatConnection` |
| [`update()`](#update) | Change the name or test destinations | `ChatConnection` |
| [`rotateCredentials()`](#rotate-credentials) | Replace the bot credentials | `ChatConnection` |
| [`checkHealth()`](#check-health) | Check the bot setup now | `ChatConnection` |
| [`enable()`](#enable) | Start handling messages | `ChatConnection` |
| [`disable()`](#disable) | Stop handling messages | `ChatConnection` |
| [`delete()`](#delete) | Delete a connection | `void` |

Blazing Agents posts each reply and approval card for you and retries a failed post a limited number of times. A reply that still fails to post stays in the session, so you can read it with [`sessions.messages()`](/sdk/typescript/sessions#messages).

## Methods [#methods]

### `create()` [#create]

Connects an agent to a Slack or Telegram bot.

**Signature:** `create(input: CreateChatConnectionBody & ResourceRequestOptions): Promise<ChatConnection>`

```typescript
const connection = await client.chatConnections.create({
  name: "Support on Slack",
  agentId,
  platform: "slack",
  credentials: {
    botToken: process.env.SLACK_BOT_TOKEN!,
    signingSecret: process.env.SLACK_SIGNING_SECRET!,
  },
  configuration: { channelIds: ["C0123456789"] },
});
console.log(connection.webhookUrl);
```

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `name` | `string` | yes | none | Display name within the [chat connection limits](/api-reference/protocols/service-limits#chat-connection-fields) |
| `agentId` | `string` | yes | none | One of your own agents, not the admin agent; cannot change later |
| `platform` | `"slack" \| "telegram"` | yes | none | Chat platform |
| `credentials` | `object` | yes | none | Slack: `botToken` and `signingSecret`. Telegram: `botToken` |
| `configuration` | `object` | no | `{}` | Slack: `channelIds`. Telegram: `chatIds` and `businessMode` |
| `enabled` | `boolean` | no | `true` | Start handling messages right away |

`channelIds` and `chatIds` list conversations, within the [chat connection limits](/api-reference/protocols/service-limits#chat-connection-fields), that health checks test against. They do not limit where the bot answers. Set `businessMode: true` for a Telegram Business bot.

For Telegram, Blazing Agents registers the bot's webhook when the connection is enabled. For Slack, paste the returned `webhookUrl` into your Slack app's settings. Pass `enabled: false` to finish setup before messages arrive. To use another agent or bot, create a new connection. If `agentId` is the admin agent, `create()` fails with [`admin_agent_managed`](/api-reference/protocols/errors#admin_agent_managed) (HTTP `409`) and creates nothing.

If `create()` times out, list your connections before you retry, so you do not create two. Returns [`ChatConnection`](#chatconnection). Errors: [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`not_found`](/api-reference/protocols/errors#not_found) when the agent does not exist, `admin_agent_managed`.

### `list()` [#list]

Lists your connections.

**Signature:** `list(input?: ResourceRequestOptions): Promise<ChatConnectionsResponse>`

```typescript
const { chatConnections } = await client.chatConnections.list();
```

Returns `{ chatConnections: ChatConnection[] }`.

### `get()` [#get]

Reads one connection.

**Signature:** `get(input: { chatConnectionId: string } & ResourceRequestOptions): Promise<ChatConnection>`

```typescript
const connection = await client.chatConnections.get({ chatConnectionId });
```

Returns [`ChatConnection`](#chatconnection). Errors: `validation_failed`, `not_found`.

### `update()` [#update]

Changes the name, the test destinations, or Telegram Business mode.

**Signature:** `update(input: UpdateChatConnectionBody & { chatConnectionId: string } & ResourceRequestOptions): Promise<ChatConnection>`

```typescript
const connection = await client.chatConnections.update({
  chatConnectionId,
  configuration: { chatIds: ["-1001234567890"] },
});
```

Pass `name`, `configuration`, or both. `configuration` takes any of `channelIds`, `chatIds`, and `businessMode`, and changes only the keys you send. Returns [`ChatConnection`](#chatconnection). Errors: `validation_failed`, `not_found`, [`chat_webhook_conflict`](/api-reference/protocols/errors#chat_webhook_conflict), [`chat_webhook_registration_failed`](/api-reference/protocols/errors#chat_webhook_registration_failed).

### `rotateCredentials()` [#rotate-credentials]

Replaces the credentials for the same bot. Its sessions stay attached.

**Signature:** `rotateCredentials(input: RotateChatConnectionBody & { chatConnectionId: string } & ResourceRequestOptions): Promise<ChatConnection>`

```typescript
const connection = await client.chatConnections.rotateCredentials({
  chatConnectionId,
  platform: "slack",
  botToken: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});
```

Send the full set for the platform: `botToken` and `signingSecret` for Slack, `botToken` for Telegram. Returns [`ChatConnection`](#chatconnection). Errors: `validation_failed`, `not_found`, `chat_webhook_conflict`, `chat_webhook_registration_failed`.

### `checkHealth()` [#check-health]

Checks the token, bot identity, and webhook now, and returns the connection with fresh results.

**Signature:** `checkHealth(input: { chatConnectionId: string } & ResourceRequestOptions): Promise<ChatConnection>`

```typescript
const { health } = await client.chatConnections.checkHealth({ chatConnectionId });
const webhook = health.checks.find(({ code }) => code === "webhook_url");
if (webhook?.status !== "pass") console.warn("Webhook not confirmed", webhook);
```

Each check is `pass`, `fail`, or `unknown`; confirm `unknown` ones by hand. A valid token alone does not prove messages arrive, so require the `webhook_url` check to pass and send the bot a test message. Returns [`ChatConnection`](#chatconnection). Errors: `validation_failed`, `not_found`.

### `enable()` [#enable]

Starts handling the bot's messages.

**Signature:** `enable(input: { chatConnectionId: string } & ResourceRequestOptions): Promise<ChatConnection>`

```typescript
await client.chatConnections.enable({ chatConnectionId });
```

Messages sent while the connection was disabled are not replayed. Returns [`ChatConnection`](#chatconnection) with `enabled: true`. Errors: `validation_failed`, `not_found`, `chat_webhook_conflict`, `chat_webhook_registration_failed`.

### `disable()` [#disable]

Stops handling new messages and approval clicks. Work already running may finish, and the connection keeps its settings.

**Signature:** `disable(input: { chatConnectionId: string } & ResourceRequestOptions): Promise<ChatConnection>`

```typescript
await client.chatConnections.disable({ chatConnectionId });
```

Returns [`ChatConnection`](#chatconnection) with `enabled: false`. Errors: `validation_failed`, `not_found`.

### `delete()` [#delete]

Disconnects the bot from Blazing Agents. Its sessions stay readable.

**Signature:** `delete(input: { chatConnectionId: string } & ResourceRequestOptions): Promise<void>`

```typescript
await client.chatConnections.delete({ chatConnectionId });
```

A Telegram bot's webhook is cleared for you. Uninstall a Slack app yourself. Errors: `validation_failed`, `not_found`.

## Response types [#response-types]

### `ChatConnection` [#chatconnection]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Connection ID (`cc_…`) |
| `tenantId` | `string` | Your tenant ID |
| `agentId` | `string` | The agent that answers |
| `name` | `string` | Connection name |
| `platform` | `"slack" \| "telegram"` | Chat platform |
| `enabled` | `boolean` | Whether messages are handled |
| `configuration` | `ChatConfiguration` | `platform` plus its `channelIds`, or `chatIds` and `businessMode` |
| `webhookUrl` | `string` | The URL the platform sends messages to |
| `identity` | `ChatIdentity` | The bot's `botId`, `botUserId`, `teamId`, and `appId` |
| `health` | `ChatHealth` | `checkedAt`, `tokenValid`, `identityVerified`, and `checks` |
| `credentialFragment` | `string` | Up to four characters of the credential |
| `credentialVersion` | `number` | Goes up each time you rotate credentials |
| `createdAt`, `updatedAt` | `string` | ISO 8601 timestamps |

Each entry in `health.checks` is `{ code: string; status: "pass" | "fail" | "unknown"; subject?: string }`.

## Next [#next]

- [Chat integrations](/platform/chat-integrations)
- [Client generation methods](/sdk/typescript/client#generation-methods)
