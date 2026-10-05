---
title: Sessions
description: Hold conversations with an agent, read their history, and decide tool approvals.
---

## Overview [#overview]

A session is a conversation Blazing Agents keeps for you, so each new turn sees everything said before. Use these endpoints to start a conversation, continue it, read its history, delete it, and handle tool approvals. A session is saved as soon as its first turn is accepted, before the model runs. Continuing a session never creates one that is missing.

## Policy-driven approvals [#policy-driven-approvals]

Sessions follow the agent's `approvalInChat` policy. Whether a tool call waits
for a person or is escalated by automatic review, you handle it the same way:
list the pending approvals, decide one, then join its continuation. See
[review availability](/agents/tools/tool-approvals#review-availability).

Approval records also carry `tool`, `assistantMessageId`, `createdAt`, and
`decidedAt`. Some of these fields are optional, so do not require them; see
[tool approval metadata](/api-reference/protocols/objects-and-schemas#tool-approval-metadata).

## Session inputs [#session-inputs]

The `/inputs` endpoints accept user messages for an existing session while a
turn runs. `POST /inputs` saves the message before it returns `202` with a
receipt. Retry it with the same `requestId` and body; a changed body returns
`input_idempotency_conflict`. `GET /inputs` returns the receipts and the
session's `activity`, so poll it from the first page to follow progress.
Promote and delete work only while a receipt is `accepted`, and return
`input_not_pending` once a turn has taken it.

Waiting inputs never start a turn on their own. After a turn ends, call
`POST /inputs/run` to run every waiting input as one turn. The turn streams
back to that request only, and it cannot be rejoined. Pass `functions` when
the session needs your backend functions. `POST /stop` takes the `turnId` from
`activity` and returns after that turn has stopped. `POST /inputs/resume` lets
a queue that a failed turn paused run again, without starting a turn. See
[send while the agent is working](/platform/sessions-and-turns#send-while-the-agent-is-working).

## Next [#next]

- [Sessions and turns](/platform/sessions-and-turns) to continue, stop, and reload conversations.
- [Streaming protocol](/api-reference/protocols/streaming) to read the SSE stream.
- [Tool approvals](/agents/tools/tool-approvals) to choose which calls need review.
