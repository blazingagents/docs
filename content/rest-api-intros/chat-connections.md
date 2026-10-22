---
title: Chat connections
description: Create and manage Slack and Telegram connections.
---

## Overview [#overview]

A chat connection puts one of your agents in a Slack workspace or a Telegram
bot, so people can talk to it where they already chat. Each bot installation
belongs to exactly one connection, and one agent can have several connections.
The admin agent cannot be connected. Creating a connection for it returns `409`
with [`admin_agent_managed`](/api-reference/protocols/errors#admin_agent_managed).
You cannot change a connection's agent or platform identity after you create
it. Every endpoint needs a bearer credential and an active subscription. See
[setup](/platform/chat-integrations) for callbacks and permissions, and for how
the bot orders messages and handles interruptions.

Full credentials are never returned. A connection shows only
`credentialFragment`, the last four characters of its token. Health includes
`checkedAt`, `tokenValid`, `identityVerified`, and `checks` with `code`,
`status` (`pass`, `fail`, `unknown`), and optional `subject`.

## Replies [#replies]

The turn that answers a chat message posts its reply and any approval card
itself. It retries a failed post a few times, so a post that landed but whose
answer was lost can appear twice. A reply that still fails stays in the
session, where you can read it with
[list session messages](/api-reference/rest-api/sessions#list-session-messages).
A turn you start through the API on a chat session does not post to the chat.

## Next [#next]

- [Chat integrations](/platform/chat-integrations) to set up Slack or Telegram.
- [TypeScript](/sdk/typescript/chat-integrations), [Python](/sdk/python/chat-integrations), [Rust](/sdk/rust/chat-integrations), or [Go](/sdk/go/chat-integrations) chat integration methods.
