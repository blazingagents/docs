---
title: Chat connections
description: Create and manage Slack and Telegram connections and inspect delivery outcomes.
---

## Overview [#overview]

A chat connection puts one of your agents in a Slack workspace or a Telegram
bot, so people can talk to it where they already chat. Each bot installation
belongs to exactly one connection, and one agent can have several connections.
You cannot change a connection's agent or platform identity after you create
it. Every endpoint needs a bearer credential and an active subscription. See
[setup](/platform/chat-integrations) for callbacks and permissions.

Full credentials are never returned. A connection shows only
`credentialFragment`, the last four characters of its token. Health includes
`checkedAt`, `tokenValid`, `identityVerified`, and `checks` with `code`,
`status` (`pass`, `fail`, `unknown`), and optional `subject`.

## Delivery outcomes [#delivery-outcomes]

A delivery is one reply or approval card a connection tried to post to the
chat. Its `status` is `pending` (not sent yet), `confirmed` (the platform
accepted it), `failed` (it did not go through), or `ambiguous` (it may have
been sent).

`GET /v1/chat-deliveries` lists deliveries across every connection, newest
first. Use it for a status view over all your bots, and the per-connection
list when you investigate one bot. Pass several statuses as a comma-separated
list in one `status` parameter, such as `status=failed,ambiguous`; repeated
`status` parameters are not supported. `since` is an inclusive ISO 8601
date-time with an offset. Keep the same filters when you pass `nextCursor`
back as `cursor`.

## Next [#next]

- [Chat integrations](/platform/chat-integrations) to set up Slack or Telegram.
- [TypeScript](/sdk/typescript/chat-integrations) or [Python](/sdk/python/chat-integrations) chat integration methods.
