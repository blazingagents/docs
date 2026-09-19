---
title: Chat integrations
description: Configure Slack and Telegram connections with the TypeScript SDK.
---

# Chat integrations

Use `client.chatConnections` (SDK 0.9.0+) to connect an existing Agent to Slack or
Telegram. BA receives messages, maintains Sessions, and sends replies and approval
buttons. Credentials are write-only.

## Create a Telegram connection

Run this in a trusted environment with the environment variables below.

```typescript
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});
const connection = await client.chatConnections.create({
  name: "Support on Telegram",
  agentId: process.env.BA_AGENT_ID!,
  platform: "telegram",
  enabled: false,
  configuration: { businessMode: false },
  credentials: {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
  },
});
console.log(connection.webhookUrl);
await client.chatConnections.enable({
  chatConnectionId: connection.id,
});
```

BA generates the Telegram webhook secret and registers the returned URL when
enabled. Call `checkHealth({ chatConnectionId: connection.id })`, require the
`webhook_url` check to pass, and send the bot a test message.

For Slack, use `platform: "slack"`, credentials `botToken` and `signingSecret`,
and paste the returned `webhookUrl` into Slack. Optional `channelIds` (Slack),
`chatIds` (Telegram), and Telegram `businessMode` configure health probes and
registration; destination IDs are not access restrictions.

## Manage connections

All methods accept one input object with optional `abortSignal`.

| Method | Input | Result |
| --- | --- | --- |
| `list()` | Optional request options | `{ chatConnections: ChatConnection[] }` |
| `get()` | `chatConnectionId` | `ChatConnection` |
| `create()` | `name`, `agentId`, `platform`, `configuration`, `credentials`, optional `enabled` | `ChatConnection` |
| `update()` | `chatConnectionId`, at least one of `name` or `configuration` | `ChatConnection` |
| `rotateCredentials()` | `chatConnectionId`, `platform`, `botToken`, and Slack `signingSecret` | `ChatConnection` |
| `checkHealth()` | `chatConnectionId` | `ChatConnection` with refreshed health |
| `enable()` | `chatConnectionId` | `ChatConnection` |
| `disable()` | `chatConnectionId` | `ChatConnection` |
| `delete()` | `chatConnectionId` | `void` |

Responses include configuration, verified identity, health, and a credential
fragment, never the credentials. Health checks report `pass`, `fail`, or `unknown`;
verify unknown settings manually. A valid token alone does not prove delivery.

Creation defaults to enabled; the example keeps intake disabled during setup.
The returned `webhookUrl` is read-only. Update changes the name, destinations, or
Telegram Business mode. Credential rotation requires the complete platform
bundle. Changing the Agent or bot requires a new connection. BA owns Telegram
registration; Slack setup remains manual.

If creation times out, list connections before retrying. See the
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
