---
title: Chat integrations
description: Configure Slack and Telegram connections with the TypeScript SDK.
---

# Chat integrations

Use `client.chatConnections` (SDK 0.9.0+) to connect an existing Agent to Slack or
Telegram. BA receives messages, maintains Sessions, and sends replies and approval
buttons. Credentials are write-only.

## Create a Telegram connection

Run this in a trusted environment with the environment variables below. Set the
base URL to your BA API origin without `/v1`.

```typescript
import { BlazingAgents } from "@blazingagents/sdk";

const baseUrl = process.env.BLAZING_AGENTS_BASE_URL!;
const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
  baseUrl,
});
const connection = await client.chatConnections.create({
  name: "Support on Telegram",
  agentId: process.env.BA_AGENT_ID!,
  platform: "telegram",
  enabled: false,
  configuration: {
    botId: process.env.TELEGRAM_BOT_ID!,
    webhookUrl: `${baseUrl}/v1/chat/webhooks/telegram/pending`,
  },
  credentials: {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET!,
  },
});
const webhookUrl = `${baseUrl}/v1/chat/webhooks/telegram/${connection.id}`;
await client.chatConnections.update({
  chatConnectionId: connection.id,
  webhookUrl,
});
console.log(webhookUrl);
```

Register the printed URL with Telegram using the same webhook secret. Then call
`checkHealth({ chatConnectionId: connection.id })` and
`enable({ chatConnectionId: connection.id })` on `client.chatConnections`, and
send the bot a test message. See [Slack and Telegram setup](/platform/chat-integrations)
for platform registration and permissions.

For Slack, use `platform: "slack"`, configuration fields `teamId`, `appId`, and
`webhookUrl`, and credentials `botToken` and `signingSecret`. Use `slack` in the
callback path. Optional `channelIds` (Slack) and `chatIds` (Telegram) select health
checks; they do not restrict who can message the bot.

## Manage connections

All methods accept one input object with optional `abortSignal`.

| Method | Input | Result |
| --- | --- | --- |
| `list()` | Optional request options | `{ chatConnections: ChatConnection[] }` |
| `get()` | `chatConnectionId` | `ChatConnection` |
| `create()` | `name`, `agentId`, `platform`, `configuration`, `credentials`, optional `enabled` | `ChatConnection` |
| `update()` | `chatConnectionId`, at least one of `name` or `webhookUrl` | `ChatConnection` |
| `rotateCredentials()` | `chatConnectionId`, `platform`, `botToken`, and `signingSecret` or `webhookSecret` | `ChatConnection` |
| `checkHealth()` | `chatConnectionId` | `ChatConnection` with refreshed health |
| `enable()` | `chatConnectionId` | `ChatConnection` |
| `disable()` | `chatConnectionId` | `ChatConnection` |
| `delete()` | `chatConnectionId` | `void` |

Responses include configuration, verified identity, health, and a credential
fragment, never the credentials. Health checks report `pass`, `fail`, or `unknown`;
verify unknown settings manually. A valid token alone does not prove delivery.

Creation defaults to enabled; the example keeps intake disabled during setup.
Update changes only the name or saved callback URL. Credential rotation requires
the complete credential bundle for the same installation. Changing the Agent or
bot requires a new connection. Registration with Slack or Telegram remains a
separate action, including updating Telegram's registered secret after rotation.

If creation times out, list connections before retrying. If saving the callback
fails, update the existing connection. See the
[REST reference](/api-reference/rest-api/chat-connections) for API errors.

## Use BA inside an existing Vercel Chat SDK bot

Add this handler where your application's configured `bot` instance is available.
Keep its existing adapters, state store and webhook routes. Install
`@blazingagents/sdk` and its `ai` peer dependency, then set the BA API key and
`BA_AGENT_ID` on the server.

```typescript
import { BlazingAgents } from "@blazingagents/sdk";

const apiKey = process.env.BLAZING_AGENTS_API_KEY;
if (!apiKey) throw new Error("Set BLAZING_AGENTS_API_KEY");
const ba = new BlazingAgents({ apiKey });
const agentId = process.env.BA_AGENT_ID;
if (!agentId) throw new Error("Set BA_AGENT_ID");

bot.onNewMention(async (thread, message) => {
  const result = await ba.completion({ agentId, prompt: message.text });
  await thread.post(await result.text);
});
```

This answers each new mention independently. It does not subscribe to follow-ups,
create a BA Session, or render approval cards. Your bot owns delivery and error
handling. For managed persistent conversations, use the connection setup above.
See [Chat SDK event handlers](https://chat-sdk.dev/docs/handling-events) for
registration in an existing bot. Use a separate bot installation when comparing
this custom handler with a BA-managed connection.
