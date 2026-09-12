---
title: Slack and Telegram
description: Connect your own Slack app or Telegram bot to a hosted Agent.
---

# Slack and Telegram

Connect your Slack app or Telegram bot to an existing Agent. BA receives messages,
keeps Session history, posts replies, and presents tool approval buttons in chat.
You need a configured Agent, an active subscription, a Tenant API key, and bot
credentials. Keep all credentials on your backend.

BA runs Vercel Chat SDK for these connections. Your application can keep using the
existing TypeScript or Python SDK; connection management uses the
[Chat Connections REST API](/api-reference/rest-api/chat-connections).

## Connect Slack

1. Create and install a Slack app in your workspace. Collect its workspace ID,
   app ID, bot token, and signing secret.
2. Add bot scopes `app_mentions:read`, `chat:write`, `channels:history`,
   `groups:history`, `im:history`, `mpim:history`, `users:read`, `channels:read`,
   `groups:read`, `im:read`, and `mpim:read`. Reinstall after changing scopes.
3. Create a connection with `platform: "slack"`, then save its final callback
   URL as described below.
4. Set **both** Event Subscriptions and Interactivity Request URLs to
   `https://<BA API host>/v1/chat/webhooks/slack/<connectionId>`.
   Enable both features. Subscribe to `app_mention`, `message.channels`,
   `message.groups`, `message.im`, and `message.mpim`.
5. Invite the bot to each intended public or private channel. Mention it in a
   thread, then send a follow-up; also test a DM and an approval button if your
   Agent uses human tool approvals.

## Connect Telegram

1. Create a bot through BotFather. Collect its token and numeric bot ID, and
   choose a webhook secret containing letters, digits, underscores or hyphens.
2. Create a connection with `platform: "telegram"`, then save its final callback
   URL as described below.
3. Register `https://<BA API host>/v1/chat/webhooks/telegram/<connectionId>` with
   Telegram's `setWebhook`, passing the same secret as `secret_token` and allowing
   `message` and `callback_query` updates. Creating a BA connection does not
   register this webhook for you.
4. Start a DM with the bot or add it to your group. If you need unmentioned group
   follow-ups, disable privacy through BotFather and verify the bot's membership.
   Topic conversations require a forum-enabled supergroup.
5. Send a message and a follow-up, then test an approval button if applicable.

### Save the final callback URL

Creation returns the connection ID used in the callback path. Create with an
initial HTTPS URL, then PATCH `/v1/chat-connections/<connectionId>` with a top-level
`webhookUrl` containing the final path. Register that same URL with Slack or
Telegram and run the connection's `/health` operation.

Changing the saved URL does not register a platform webhook or refresh health.
Repeat these steps if your API hostname changes. A passing token check alone
does not prove that callbacks work.

## Conversations and approvals

DMs retain personal conversation history; shared threads and Telegram forum topics
retain their own Sessions. Mention the bot to begin a shared conversation, then
continue in that conversation. Overlapping messages may be dropped while work is
in progress; Telegram topics in the same forum also share this concurrency limit.

Sender and approver access is currently unrestricted: participants who can reach
the bot can invoke it, and anyone with access to a bound approval card can decide.
Choose the bot's destinations and Agent tools accordingly. `channelIds` and
`chatIds` select health probes; they are not allowlists.

If you delete the BA Session, send `/reset` in that native conversation to start
fresh. `/reset` does not replace an active Session.

## Manage and troubleshoot

- **No reply:** check connection and Agent enabled state, subscription, bot
  membership, platform callback settings, and fresh connection health. `unknown`
  means a check could not establish the result; verify that setting manually.
- **Rotate credentials:** submit the full credential bundle for the same bot or
  installation. Sessions remain attached. Update the platform webhook secret too
  when rotating Telegram's secret.
- **Disable:** stops new messages and approval clicks; admitted work may finish.
  Enabling accepts future events without replaying missed messages.
- **Delete:** disconnects the bot from BA and preserves BA Sessions. Uninstalling
  the Slack app or clearing Telegram's webhook is a separate platform action.
- **Missing output after a completed Turn:** inspect deliveries. `confirmed` means
  the adapter returned and its receipt was saved; `failed` means a known failure;
  `ambiguous` means a send may have succeeded. `pending` has not been claimed.
  Repair is explicit and may duplicate a previous send. It sends saved output,
  without running the Agent or its tools again.

Slack may split long output and retain only the final receipt. Telegram may
truncate long output. The BA Session retains the complete canonical reply.

## SDK examples and custom bots

Use the [TypeScript example](/sdk/typescript/chat-integrations) or
[Python example](/sdk/python/chat-integrations) to create a managed connection.
Neither SDK currently has a Chat Connections resource.

If you already host a Vercel Chat SDK bot, you can call BA's existing `completion`
method from its message handler and post the returned text. That is a custom
integration: your application owns webhook verification, conversation mapping,
state, and delivery. Use BA's stateful chat and approval APIs if you need those
behaviors. A stateless completion alone does not provide the managed connection's
Session continuity or approval cards.
