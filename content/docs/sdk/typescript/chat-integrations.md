---
title: Chat integrations
description: Connect an agent to a Slack or Telegram bot and manage the connection with the TypeScript SDK.
---

# Chat integrations

`client.chatConnections` puts an agent behind a Slack or Telegram bot. Blazing Agents receives the bot's messages, keeps a session for each direct message, thread, or forum topic, and posts the agent's replies and tool approval buttons. To set up the bot on each platform, read [Chat integrations](/platform/chat-integrations).

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

`client.chatDeliveries` has one method, [`list()`](#list-deliveries), which lists replies and approval buttons that failed or may not have arrived, across every connection.

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
| `name` | `string` | yes | none | 1 to 80 characters |
| `agentId` | `string` | yes | none | The agent that answers; cannot change later |
| `platform` | `"slack" \| "telegram"` | yes | none | Chat platform |
| `credentials` | `object` | yes | none | Slack: `botToken` and `signingSecret`. Telegram: `botToken` |
| `configuration` | `object` | no | `{}` | Slack: `channelIds`. Telegram: `chatIds` and `businessMode` |
| `enabled` | `boolean` | no | `true` | Start handling messages right away |

`channelIds` and `chatIds` list up to 20 conversations that health checks test against. They do not limit where the bot answers. Set `businessMode: true` for a Telegram Business bot.

For Telegram, Blazing Agents registers the bot's webhook when the connection is enabled. For Slack, paste the returned `webhookUrl` into your Slack app's settings. Pass `enabled: false` to finish setup before messages arrive. To use another agent or bot, create a new connection.

If `create()` times out, list your connections before you retry, so you do not create two. Returns [`ChatConnection`](#chatconnection).

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

Returns [`ChatConnection`](#chatconnection).

### `update()` [#update]

Changes the name, the test destinations, or Telegram Business mode.

**Signature:** `update(input: UpdateChatConnectionBody & { chatConnectionId: string } & ResourceRequestOptions): Promise<ChatConnection>`

```typescript
const connection = await client.chatConnections.update({
  chatConnectionId,
  configuration: { chatIds: ["-1001234567890"] },
});
```

Pass `name`, `configuration`, or both. `configuration` takes any of `channelIds`, `chatIds`, and `businessMode`, and changes only the keys you send. Returns [`ChatConnection`](#chatconnection).

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

Send the full set for the platform: `botToken` and `signingSecret` for Slack, `botToken` for Telegram. Returns [`ChatConnection`](#chatconnection).

### `checkHealth()` [#check-health]

Checks the token, bot identity, and webhook now, and returns the connection with fresh results.

**Signature:** `checkHealth(input: { chatConnectionId: string } & ResourceRequestOptions): Promise<ChatConnection>`

```typescript
const { health } = await client.chatConnections.checkHealth({ chatConnectionId });
const webhook = health.checks.find(({ code }) => code === "webhook_url");
if (webhook?.status !== "pass") console.warn("Webhook not confirmed", webhook);
```

Each check is `pass`, `fail`, or `unknown`; confirm `unknown` ones by hand. A valid token alone does not prove messages arrive, so require the `webhook_url` check to pass and send the bot a test message. Returns [`ChatConnection`](#chatconnection).

### `enable()` [#enable]

Starts handling the bot's messages.

**Signature:** `enable(input: { chatConnectionId: string } & ResourceRequestOptions): Promise<ChatConnection>`

```typescript
await client.chatConnections.enable({ chatConnectionId });
```

Messages sent while the connection was disabled are not replayed. Returns [`ChatConnection`](#chatconnection) with `enabled: true`.

### `disable()` [#disable]

Stops handling new messages and approval clicks. Work already running may finish, and the connection keeps its settings.

**Signature:** `disable(input: { chatConnectionId: string } & ResourceRequestOptions): Promise<ChatConnection>`

```typescript
await client.chatConnections.disable({ chatConnectionId });
```

Returns [`ChatConnection`](#chatconnection) with `enabled: false`.

### `delete()` [#delete]

Disconnects the bot from Blazing Agents. Its sessions stay readable.

**Signature:** `delete(input: { chatConnectionId: string } & ResourceRequestOptions): Promise<void>`

```typescript
await client.chatConnections.delete({ chatConnectionId });
```

A Telegram bot's webhook is cleared for you. Uninstall a Slack app yourself.

### `chatDeliveries.list()` [#list-deliveries]

Lists the replies and approval buttons that failed or may not have arrived, across every connection, newest first. Use it for a status view that shows which messages need attention.

**Signature:** `list(input?: ChatDeliveriesListOptions): Promise<ChatDeliveriesResponse>`

```typescript
const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const page = await client.chatDeliveries.list({ since });
for (const delivery of page.data) {
  console.log(delivery.platform, delivery.connectionId, delivery.status, delivery.diagnostic);
}
```

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `status` | `ChatDeliveryListStatus[]` | no | both | `"failed"`, `"ambiguous"`, or both |
| `since` | `string` | no | none | ISO 8601 date-time with an offset. Only deliveries created at or after it |
| `cursor` | `string` | no | none | `nextCursor` from the previous page |
| `limit` | `number` | no | `50` | 1 to 100 deliveries per page |

`failed` means the platform did not accept the message, and `ambiguous` means it may have been sent. The feed never lists `pending` or `confirmed` deliveries; [list one connection's deliveries](/api-reference/rest-api/chat-connections#list-chat-deliveries) for those, and passing any other `status` fails with `validation_failed`. Keep the same filters when you pass `nextCursor` back as `cursor`.

Returns [`ChatDeliveriesResponse`](#chatdeliveriesresponse). Errors: [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor).

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

### `ChatDeliveriesResponse` [#chatdeliveriesresponse]

`{ data: TenantChatDelivery[]; nextCursor: string | null }`. `nextCursor` is `null` on the last page. Each `TenantChatDelivery` has:

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Delivery ID (`cd_…`) |
| `connectionId` | `string` | The connection that posted it (`cc_…`) |
| `agentId` | `string` | The connection's agent |
| `platform` | `"slack" \| "telegram"` | Chat platform |
| `kind` | `"reply" \| "card"` | An agent reply or a tool approval card |
| `status` | `ChatDeliveryStatus` | `"failed"` or `"ambiguous"` |
| `attempt` | `number` | The current send attempt |
| `diagnostic` | `string \| null` | Why the last send failed, when known |
| `sessionId` | `string` | The session behind the conversation |
| `threadId` | `string` | The chat thread it belongs to |
| `messageId`, `approvalId` | `string \| null` | The reply message or the approval it carries |
| `createdAt`, `updatedAt` | `string` | ISO 8601 timestamps |

It also has `credentialVersion`, `representation`, and `receipts`. The package exports `ChatDelivery`, `TenantChatDelivery`, `ChatDeliveryStatus`, and `ChatDeliveryListStatus`.

## Next [#next]

- [Chat integrations](/platform/chat-integrations)
- [Client generation methods](/sdk/typescript/client#generation-methods)
