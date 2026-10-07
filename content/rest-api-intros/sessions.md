---
title: Sessions
description: Hold conversations with an agent, read their history, and decide tool approvals.
---

## Overview [#overview]

A session is a conversation Blazing Agents keeps for you, so each new turn continues its saved context. Use these endpoints to start a conversation, continue it, read its history, delete it, and handle tool approvals. A session is saved as soon as its first turn is accepted, before the model runs. Continuing a session never creates one that is missing.

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

## Fork a session [#fork-a-session]

`POST /v1/agents/{agentId}/sessions/{sessionId}/fork` takes exactly `{ "messageId": "..." }` and a required nonblank `Idempotency-Key` header of at most 200 characters. Select an accepted assistant message with top-level `branchable: true` from the transcript. The new idle session includes that reply and earlier history. An earlier eligible reply can be selected while the source runs; streaming replies and pending approvals are ineligible. Pick the reply from the session's messages, not from the live stream. Stream chunks don't include `branchable`, and a reply that is not in the history yet is not eligible.

Save the key and reuse it with the same source and message after a lost response. Creation returns `201`; identical replay returns `200` with the same child, even after source deletion. A changed message under that key returns `idempotency_conflict` (`409`), an unavailable selection returns `session_fork_unavailable` (`409`), and a replay of a deleted child returns `session_fork_deleted` (`410`). A missing or inaccessible source or agent returns `not_found` (`404`).

Forking runs no model or tool and adds no usage. Continue with the returned child's session ID; later turns incur normal usage. The child inherits saved agent configuration, metadata, and user label. Workspace files and memories remain shared and live. Details returned by get and fork include required nullable `forkedFrom`, with `{ sessionId, messageId }` for children and `null` for ordinary sessions. Session lists omit it.

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
