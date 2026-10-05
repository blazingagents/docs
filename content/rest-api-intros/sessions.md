---
title: Sessions
description: Hold conversations with an agent, read their history, and decide tool approvals.
---

## Overview [#overview]

A session is a conversation Blazing Agents keeps for you, so each new turn sees everything said before. Use these endpoints to start a conversation, continue it, read its history, delete it, and handle tool approvals. A session is saved as soon as its first turn is accepted, before the model runs. Continuing a session never creates one that is missing.

## Policy-driven approvals [#policy-driven-approvals]

Sessions follow the agent's `approvalInChat` policy. Whether a tool call waits
for a person or is escalated by automatic review, you handle it the same way:
list the pending approvals, then send every decision of the round to
`POST /tool-approvals/continue`, which streams the rest of the turn back to
that request. See
[review availability](/agents/tools/tool-approvals#review-availability).

Approval records also carry `tool`, `assistantMessageId`, `createdAt`, and
`decidedAt`. Some of these fields are optional, so do not require them; see
[tool approval metadata](/api-reference/protocols/objects-and-schemas#tool-approval-metadata).

## Session inputs [#session-inputs]

`POST /inputs` steers one user message into the running turn and returns `202`
with a receipt. Retry it with the same `requestId` and body to recover the
receipt; a changed body returns `input_idempotency_conflict`. When no turn can
take a steer, the call returns `steer_not_available` and nothing is saved, so
keep the message in your app and send it as an ordinary chat message after the
turn ends.

`GET /inputs` lists the receipts and the session's `activity`, so poll it from
the first page to follow progress. `POST /stop` takes the `turnId` from
`activity`, records the stop, and returns immediately; keep reading your
existing stream until it ends. See
[send while the agent is working](/platform/sessions-and-turns#send-while-the-agent-is-working).

## Next [#next]

- [Sessions and turns](/platform/sessions-and-turns) to continue, stop, and reload conversations.
- [Streaming protocol](/api-reference/protocols/streaming) to read the SSE stream.
- [Tool approvals](/agents/tools/tool-approvals) to choose which calls need review.
