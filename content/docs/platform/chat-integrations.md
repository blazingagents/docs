---
title: Slack and Telegram
description: Put your agent in Slack or Telegram with your own bot, with history and approval buttons handled for you.
---

# Slack and Telegram

Let people talk to your agent in Slack or Telegram through your own bot. Blazing Agents receives the messages, keeps each conversation's history, posts the replies, and shows tool approval buttons in the chat. You need an agent with a provider and model, an active subscription, and your bot's credentials. Keep every credential on your backend.

## Create a connection [#create-a-connection]

A connection links one bot to one agent. This example connects a Telegram bot. Set `AGENT_ID` and `TELEGRAM_BOT_TOKEN` first.

```typescript tab="TypeScript"
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});

const connection = await client.chatConnections.create({
  name: "Support bot",
  agentId: process.env.AGENT_ID!,
  platform: "telegram",
  credentials: { botToken: process.env.TELEGRAM_BOT_TOKEN! },
});
console.log(connection.id, connection.webhookUrl);
```

```python tab="Python"
import os

from blazing_agents import BlazingAgents

client = BlazingAgents()

connection = client.chat_connections.create(
    name="Support bot",
    agent_id=os.environ["AGENT_ID"],
    platform="telegram",
    credentials={"bot_token": os.environ["TELEGRAM_BOT_TOKEN"]},
)
print(connection.id, connection.webhook_url)
```

The connection is enabled by default, and Blazing Agents registers its `webhookUrl` with Telegram for you. Message the bot and the agent replies. For Slack, pass `platform: "slack"` with a `botToken` and `signingSecret`, then paste the returned `webhookUrl` into your Slack app as described below.

## Connect Slack [#connect-slack]

1. Create a Slack app and install it in your workspace. Copy its bot token and signing secret.
2. Add the bot scopes `app_mentions:read`, `chat:write`, `channels:history`, `groups:history`, `im:history`, `mpim:history`, `users:read`, `channels:read`, `groups:read`, `im:read`, and `mpim:read`. Reinstall the app after you change scopes.
3. Create a connection with `platform: "slack"` and copy the returned `webhookUrl`.
4. In the Slack app, set **both** the Event Subscriptions and the Interactivity Request URLs to that URL, and turn both features on. Subscribe to `app_mention`, `message.channels`, `message.groups`, `message.im`, and `message.mpim`. Slack's URL check succeeds even while the connection is disabled, so you can save the URLs before you enable it.
5. Invite the bot to each channel it should serve. Mention it in a thread, send a follow-up, and try a direct message. If your agent uses tool approvals, test an approval button too.

## Connect Telegram [#connect-telegram]

1. Create a bot with BotFather and copy its token.
2. Create a connection with `platform: "telegram"`. Set `businessMode: true` only for a Telegram Business bot.
3. Enable the connection if you created it disabled. Blazing Agents registers the webhook with Telegram. If the bot already points at another webhook, enabling returns [`chat_webhook_conflict`](/api-reference/protocols/errors#chat_webhook_conflict) (HTTP `409`). Other registration failures return [`chat_webhook_registration_failed`](/api-reference/protocols/errors#chat_webhook_registration_failed) (HTTP `502`).
4. Start a direct message with the bot or add it to a group. To answer group messages that do not mention the bot, turn off privacy mode in BotFather. Topic threads need a forum-enabled supergroup.
5. Send a message and a follow-up, then test an approval button if your agent uses them.

You never build the webhook URL yourself. Blazing Agents re-registers it with Telegram when you enable the connection, rotate its token, or change Business mode. A valid token alone does not prove messages arrive, so check that the `webhook_url` health check passes.

## Conversations and approvals [#conversations-and-approvals]

Each direct message keeps its own history. Each shared thread and each Telegram forum topic keeps its own session too. Mention the bot to start a shared conversation, then keep replying in that thread. Messages sent while the agent is still working on a reply may be dropped, and topics in the same forum share this limit.

Anyone who can reach the bot can talk to it, and anyone who can see an approval card can approve or deny it. Choose where you add the bot, and which tools the agent has, with that in mind. `channelIds` and `chatIds` only choose where health checks look. They are not allowlists.

If you delete a conversation's session, send `/reset` in that chat to start fresh. `/reset` does not replace a session that still exists.

## Manage and troubleshoot [#manage-and-troubleshoot]

- **No reply:** check that the connection and the agent are enabled, your subscription is active, the bot is in the channel, and the platform's webhook settings are right. Run a fresh health check. A result of `unknown` means the check could not tell, so verify that setting by hand.
- **Rotate credentials:** send the full set of credentials for the same bot or Slack installation. Conversations stay attached. For Telegram, send only the new bot token.
- **Disable:** stops new messages and approval clicks. Work already started may finish. Enabling again accepts new messages but does not replay missed ones.
- **Delete:** disconnects the bot and keeps its sessions. Blazing Agents removes the Telegram webhook it set. Uninstall the Slack app yourself.
- **Reply missing after the agent finished:** [list the connection's deliveries](/api-reference/rest-api/chat-connections#list-chat-deliveries). To see failed and ambiguous deliveries from every connection at once, for example in an operator status view, [list your tenant's chat deliveries](/api-reference/rest-api/chat-connections#list-tenant-chat-deliveries) with `client.chatDeliveries.list()` (Python `client.chat_deliveries.list()`), filtered by `since`. `confirmed` means the platform accepted the message, `failed` means it did not, and `ambiguous` means it may have been sent. `pending` has not been attempted yet. [Repairing a delivery](/api-reference/rest-api/chat-connections#repair-chat-delivery) posts the saved reply without running the agent again, and it can post a duplicate.

Slack may split a long reply into several messages, and Telegram may cut it short. The session always keeps the full reply.

## Your own bot [#your-own-bot]

If you already run your own bot, you can call `client.completion()` from its message handler and post the returned text. Your code then owns webhook checks, conversation mapping, history, and delivery. Use a session with `client.chat()` if you need history, and the tool approval APIs if you need approvals.

## Next [#next]

- [TypeScript chat connections](/sdk/typescript/chat-integrations) or [Python chat connections](/sdk/python/chat-integrations) for every method.
- [Tool approvals](/agents/tools/tool-approvals) to control which tool calls need a person.
