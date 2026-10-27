---
title: Slack and Telegram
description: Put your agent in Slack or Telegram with your own bot, with history and approval buttons handled for you.
---

# Slack and Telegram

Let people talk to your agent in Slack or Telegram through your own bot. Blazing Agents receives the messages, keeps each conversation's history, posts the replies, and shows tool approval buttons in the chat. You need one of your own agents with a provider and model, an active subscription, and your bot's credentials. The [admin agent](/agents/agents#the-admin-agent) cannot join a chat, because everyone who can reach the bot would get the tools that manage your tenant. Keep every credential on your backend.

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

```rust tab="Rust"
use blazing_agents::chat_connections::{NewChatConnection, TelegramCredentials};
use blazing_agents::Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::from_env()?;

    let connection = client
        .chat_connections()
        .create(NewChatConnection::telegram(
            std::env::var("AGENT_ID")?,
            "Support bot",
            TelegramCredentials::new(std::env::var("TELEGRAM_BOT_TOKEN")?),
        ))
        .await?;
    println!("{} {}", connection.id, connection.webhook_url);
    Ok(())
}
```

```go tab="Go"
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	ba "github.com/blazingagents/golang-sdk"
)

func main() {
	ctx := context.Background()
	client, err := ba.NewClient()
	if err != nil {
		log.Fatal(err)
	}

	connection, err := client.ChatConnections.Create(ctx, ba.TelegramConnection{
		AgentID:     ba.AgentID(os.Getenv("AGENT_ID")),
		Name:        "Support bot",
		Credentials: ba.TelegramCredentials{BotToken: ba.NewSecret(os.Getenv("TELEGRAM_BOT_TOKEN"))},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(connection.ID, connection.WebhookURL)
}
```

The connection is enabled by default, and Blazing Agents registers its `webhookUrl` with Telegram for you. Message the bot and the agent replies. For Slack, pass `platform: "slack"` with a `botToken` and `signingSecret`, then paste the returned `webhookUrl` into your Slack app as described below.

If Blazing Agents cannot register the Telegram webhook, for example because the bot already points at another webhook, it still creates the connection, but disabled and with a failing `webhook_url` health check. Check `enabled` and the `webhook_url` check in the response. If registration failed, fix the cause and then enable the connection.

Creating a connection for the admin agent fails with [`admin_agent_managed`](/api-reference/protocols/errors#admin_agent_managed) (HTTP `409`). The dashboard also leaves the admin agent out of the agent list when you add a bot.

## Connect Slack [#connect-slack]

1. Create a Slack app and install it in your workspace. Copy its bot token and signing secret.
2. Add the bot scopes `chat:write`, `channels:history`, `groups:history`, `im:history`, `mpim:history`, `users:read`, `channels:read`, `groups:read`, `im:read`, and `mpim:read`. Reinstall the app after you change scopes.
3. Create a connection with `platform: "slack"` and copy the returned `webhookUrl`.
4. In the Slack app, set **both** the Event Subscriptions and the Interactivity Request URLs to that URL, and turn both features on. Subscribe to `message.channels`, `message.groups`, `message.im`, and `message.mpim`. A mention reaches the bot as a message event, so you do not need `app_mention` or its `app_mentions:read` scope; if you subscribe to it anyway, those events are ignored. Slack's URL check succeeds even while the connection is disabled, so you can save the URLs before you enable it.
5. Invite the bot to each channel it should serve. Mention it in a thread, send a follow-up, and try a direct message. If your agent uses tool approvals, test an approval button too.

## Connect Telegram [#connect-telegram]

1. Create a bot with BotFather and copy its token.
2. Create a connection with `platform: "telegram"`. Set `businessMode: true` only for a Telegram Business bot.
3. Enable the connection if it is disabled, because you created it that way or because registration failed. Blazing Agents registers the webhook with Telegram. If the bot already points at another webhook, enabling returns [`chat_webhook_conflict`](/api-reference/protocols/errors#chat_webhook_conflict) (HTTP `409`). Other registration failures return [`chat_webhook_registration_failed`](/api-reference/protocols/errors#chat_webhook_registration_failed) (HTTP `502`).
4. Start a direct message with the bot or add it to a group. To answer group messages that do not mention the bot, turn off privacy mode in BotFather. Topic threads need a forum-enabled supergroup. In a group without topics, privacy mode off makes every message run a turn once the bot is mentioned. See [conversations](#conversations-and-approvals).
5. Send a message and a follow-up, then test an approval button if your agent uses them.

You never build the webhook URL yourself. Blazing Agents re-registers it with Telegram when you enable the connection, rotate its token, or change Business mode. A valid token alone does not prove messages arrive, so check that the `webhook_url` health check passes.

## Conversations and approvals [#conversations-and-approvals]

Each direct message keeps its own history. Each shared thread and each Telegram forum topic keeps its own session too. Mention the bot to start a shared conversation, then keep replying in that thread. A channel or group message that does not mention the bot gets an answer only in a thread the bot is already part of. A message with no text, such as a photo without a caption, is ignored. So is every message a bot sends, including your own bot's, even when it mentions your bot, so two bots in one thread cannot answer each other forever. Telegram shows anonymous group admins, and members who post as a channel, as bot accounts, so the bot ignores their messages too.

In a Telegram group without forum topics, every top-level message belongs to the same conversation. If privacy mode is off, the first mention starts that conversation, and from then on every top-level message in the group runs a turn that counts toward your usage. `/new` does not end this, because it starts the next conversation in the same group. Deleting the session ends it until someone mentions the bot again. For a busy group, use a forum-enabled supergroup, where each topic is its own conversation, or keep privacy mode on so the bot receives only messages meant for it.

The bot posts the agent's replies exactly as the agent writes them. In Slack, a mention, a link, or Slack formatting in a reply takes effect, including a mention such as `<!channel>` that notifies everyone in the channel. Tell your agent how to format replies, and keep in mind that text the agent reads, such as a web page or a file, can steer what it writes. Approval cards always show a tool's input as plain text, so it cannot disguise what you approve.

Anyone who can reach the bot can talk to it, and anyone who can see an approval card can approve or deny it. Choose where you add the bot, and which tools the agent has, with that in mind. `channelIds` and `chatIds` only choose where health checks look. They are not allowlists. Every conversation runs on the connected agent, so all of them share its [workspace](/agents/workspaces) files.

Send `/new` to start a fresh conversation on purpose, even while the agent is still answering. In a Telegram private chat, send `/new`. In a Telegram group, send `/new@YourBotName`. In Slack, mention the bot, as in `@bot /new`. Slack treats a bare `/new` as its own slash command and never passes it to the bot.

The bot replies "Started a new conversation." and your next message begins a new session without waiting for the old one. The old session stays in your history, and a reply it was still writing is posted when it is ready. A tool approval still waiting in the old session can no longer be decided from the chat. If the old session asks for one after `/new`, the bot says the request was cancelled. `/new` on its own never reaches the agent. `/new` followed by other text, and any other slash command such as Telegram's `/start`, reaches the agent as an ordinary message.

If you delete a conversation's session, you do not need `/new`. The next direct message, or the next message that mentions the bot, starts a new conversation. A channel or group message that does not mention the bot starts nothing. If a message was still waiting when you deleted its session, the agent does not run it. The bot says the conversation was deleted and asks the person to send the message again.

## Sessions and user IDs [#chat-sessions]

Each conversation is a session of the connected agent. You can read it, list it, delete it, and report its usage like any other session. Blazing Agents sets the session's `userId` to a JSON array of three strings: the platform, the connection ID, and who the conversation belongs to.

- In a direct message, the third string is the person's Slack or Telegram user ID, as in `["slack","cc_0123456789abcdef","U0123ABCD"]`.
- In a shared thread, group, or forum topic, the third string identifies the thread, so everyone in that conversation shares one `userId`. Treat this value as opaque.

Pass the whole string wherever the API takes a `userId`, such as to [filter sessions and usage](/platform/tenancy-and-attribution#filter-and-report) or to link the person to a customer for [monetization](/platform/monetization#set-up-monetization). With the monetization [guard](/platform/monetization#guard-rules) on, a `userId` with no link gets `merchant_customer_unmapped`. Usage in a shared conversation belongs to the thread, not to each person in it.

Each user message the session stores starts with a line that names the speaker, then the message text on the next line. The line looks like `[Chat speaker ["slack","cc_0123456789abcdef","U0123ABCD"]]`. The agent reads it too, so it can tell the people in a group apart. Remove the line when you show the history in your own UI.

## Message order and interruptions [#message-order]

A message sent while the agent is still answering is steered into that answer, the same way [steering](/platform/sessions-and-turns#steer-a-running-turn) works through the API. The agent reads it at its next step, after a tool call ends or once it has written its answer, and one reply covers both messages. The person never sends it again. If the agent cannot take the message into the current answer, for example because the answer is ending or being stopped, the message waits and the agent answers it next. The same happens when the agent took the message in but the answer ended before it was saved. The message then runs as the next turn, so tool calls the agent already made for it may run again.

While a tool approval waits for its decision, the agent does not run new messages or take them into its answer, just as the API refuses to steer a turn that waits for a decision. The bot says the request must be approved or rejected first, and the person sends the message again after deciding. If an approval card failed to post, the bot sends it again with that notice when the person sends their next message. A card that did post may then appear twice, and both copies work. The person can also send `/new` to leave the request behind. A message the agent already took in before it asked for the approval is answered after the decision.

If something else keeps the conversation busy for longer than the [turn deadline](/api-reference/protocols/service-limits#turn-deadline), such as back-to-back turns your backend started through the API, the bot says "This conversation stayed busy with other work, so your message was not processed. Please send it again." Conversations do not wait for each other, including separate topics in one Telegram forum. If Slack or Telegram delivers the same event twice, the agent answers once and takes the message in only once.

While the agent works, Telegram shows that the bot is typing. In a Telegram private chat, the reply also appears as a draft that grows while the agent writes, then becomes the final message. Slack and Telegram groups show only the final message.

If Blazing Agents refuses a turn before it starts, nothing runs and the bot tells the person why in plain words. The reason follows the turn's [error code](/api-reference/protocols/errors):

| Error code | What the bot says |
| --- | --- |
| `agent_disabled` | The agent has been turned off. |
| `tenant_deleting` | The agent is being shut down. |
| `provider_required`, `provider_not_found` | No AI model is set up for the agent. |
| `mcp_connection_discovery_failed` | One of the agent's connected tools is unavailable. |
| `workspace_not_found` | The agent's workspace is missing. |
| `subscription_required` | Your account has no active subscription. |
| `usage_credit_required` | Your account is out of usage credit. |
| `model_spending_limit_exceeded` | The agent reached its spending limit; try again once it resets. |
| `rate_limited` | The agent is handling too many conversations; try again in a few minutes. |
| `merchant_subscription_required` | The person needs an active subscription to talk to the agent. |
| `merchant_balance_required` | The person's balance has run out. |
| `merchant_customer_unmapped` | The person's chat account is not linked to a subscription. |
| `service_unavailable`, `merchant_eligibility_unavailable` | A service the agent depends on is unavailable; try again in a few minutes. |
| `validation_failed`, `invalid_request`, `unauthorized`, `forbidden` | Something went wrong on the agent's side; try again later. |

Messages about your account or setup ask the person to contact the team that runs the agent, or to try again if the problem may pass, and none of them show internal details. An approval round that is refused this way is cancelled, so the conversation takes new messages.

The bot posts each reply and approval card itself and retries a post that fails, so a message can, rarely, appear twice. Only turns that a chat message or an approval click started post to the chat. A turn your backend starts through the API on a chat session stays in the session and is not posted.

A turn can also fail or stop after it starts, before Blazing Agents saves its reply. Causes include a model error and an interruption in Blazing Agents such as a platform update. The bot then posts "Your message was received, but the reply was interrupted before it was saved. Please send it again." Blazing Agents does not run the turn again, because tools may already have run. If an approval round is interrupted, the bot says the action was interrupted and asks the person to ask again.

## Manage and troubleshoot [#manage-and-troubleshoot]

- **No reply:** check that the connection and the agent are enabled, your subscription is active, the bot is in the channel, and the platform's webhook settings are right. Run a fresh health check. A result of `unknown` means the check could not tell, so verify that setting by hand.
- **No reply to Slack channel mentions:** some Enterprise Grid workspaces write a mention under a user ID other than the bot's, and Blazing Agents does not recognize it. The bot still answers direct messages and threads where it already has a conversation.
- **Rotate credentials:** send the full set of credentials for the same bot or Slack installation. Conversations stay attached. For Telegram, send only the new bot token.
- **Disable:** stops new messages and approval clicks. Enabling again accepts new messages but does not replay missed ones.
- **Delete:** disconnects the bot and keeps its sessions. Blazing Agents removes the Telegram webhook it set. Uninstall the Slack app yourself.
- **Reply missing after the agent finished:** read the session's messages in the dashboard or with [list session messages](/api-reference/rest-api/sessions#list-session-messages). The session keeps every reply, even one the bot could not post after its retries or after you disabled the connection or rotated its credentials. Blazing Agents does not post that reply again.

Disabling a connection or rotating its credentials does not stop a turn that is already running. That turn finishes and saves its reply in the session, but the bot posts neither the reply nor any approval card from it. Messages waiting behind that turn in the same conversation are dropped without a notice. They run no turn and never reach the session. After a rotation, every waiting message is dropped. After a disable, a waiting message is dropped if it comes up before you enable the connection again. Rotate credentials and disable connections when conversations are quiet.

Slack may split a long reply into several messages, and Telegram may cut it short. The session always keeps the full reply.

## Your own bot [#your-own-bot]

If you already run your own bot, you can call `client.completion()` from its message handler and post the returned text. Your code then owns webhook checks, conversation mapping, history, and delivery. Use a session with `client.chat()` if you need history, and the tool approval APIs if you need approvals.

## Next [#next]

- [TypeScript chat connections](/sdk/typescript/chat-integrations), [Python chat connections](/sdk/python/chat-integrations), [Rust chat connections](/sdk/rust/chat-integrations), or [Go chat connections](/sdk/go/chat-integrations) for every method.
- [Tool approvals](/agents/tools/tool-approvals) to control which tool calls need a person.
