---
title: Browser chat relay
description: Serve useBlazingAgentsChat and BlazingAgentsChatTransport from a Python, Rust, Go, or any other backend.
---

# Browser chat relay

The browser holds no API key, so [`useBlazingAgentsChat`](/sdk/typescript/use-blazing-agents-chat) and `BlazingAgentsChatTransport` reach Blazing Agents through one endpoint on your backend. In TypeScript, [`createChatRelay()`](/sdk/typescript/chat-transport#create-chat-relay) is that endpoint. A backend in Python, Rust, Go, or any other language serves the same browser code when it follows this page. Each SDK page shows the code: [Python](/sdk/python/client#browser-relay), [Rust](/sdk/rust/client#browser-relay), and [Go](/sdk/go/client#browser-relay).

## Requests [#requests]

The browser sends every request as `POST` with `Content-Type: application/json` to the one URL you pass as `api`, `/api/chat` by default. The body's `op` names the operation. The body also carries any extra keys your app sets with the transport's `body` option, so ignore keys you do not know.

Sign the user in your own way, then look up their agent. Send every API request through a client scoped to that user: `client.forUser(userId)` in TypeScript, `client.for_user(user_id)` in Python and Rust, and `client.ForUser(userID)` in Go. Never read the user or the agent from the request body.

| `op` | Request body | What the relay calls | Success response |
| --- | --- | --- | --- |
| `chat` | `{ op, message, messageId?, sessionId?, trigger? }` | A user `message` without `sessionId` starts a session with [`POST /v1/agents/{agentId}/sessions`](/api-reference/rest-api/sessions#create-session-turn). A user `message` with `sessionId` continues it with [`POST /v1/agents/{agentId}/sessions/{sessionId}`](/api-reference/rest-api/sessions#resume-session-turn). An assistant `message` sends its approval decisions with [`POST /v1/agents/{agentId}/sessions/{sessionId}/tool-approvals/continue`](/api-reference/rest-api/sessions#continue-tool-approvals) | The API's status and AI SDK UI message stream (`text/event-stream`), with its `Location`, `X-BA-Turn-Id`, and `X-Request-Id` headers |
| `history` | `{ op, sessionId, cursor? }` | [`GET /v1/agents/{agentId}/sessions/{sessionId}/messages?limit=200`](/api-reference/rest-api/sessions#list-session-messages), with `&cursor={cursor}` when the body has one | `200` with `{ "data": [...], "nextCursor": string \| null }` |
| `steer` | `{ op, sessionId, requestId, message }` | [`POST /v1/agents/{agentId}/sessions/{sessionId}/inputs`](/api-reference/rest-api/sessions#submit-session-input) with `{ "requestId", "message" }` | `202` with `{ "state": "accepted" \| "committed" \| "not_placed" }` |

### Fields [#fields]

| Field | Rule |
| --- | --- |
| `op` | Required. `"chat"`, `"history"`, or `"steer"` |
| `sessionId` | `ss_` and 16 characters from `0-9A-Za-z`. Optional for `chat`, where leaving it out starts a new session. Required for `history` and `steer` |
| `message` | An AI SDK `UIMessage`: `{ id, role, parts, metadata? }`. For `chat`, the last user message, or the last assistant message when it holds a complete round of tool approval answers. For `steer`, a user message |
| `messageId` | `chat` only. A non-empty string that names the message to regenerate |
| `trigger` | `chat` only. `"submit-message"`, the default, or `"regenerate-message"`. A new session always uses `"submit-message"` |
| `cursor` | `history` only. The `nextCursor` of the previous page |
| `requestId` | `steer` only. 1 to 128 characters, and not `.` or `..`. The same `requestId` with the same message returns the same receipt |

### Operation rules [#operation-rules]

- `chat` with a user message forwards `message`, `messageId`, `trigger`, and your own `metadata` for the turn.
- `chat` with an assistant message sends the approval decisions from that message's last step: each tool part in the `approval-responded` state after the last `step-start` part, as `{ approvalId, approved, reason? }`. A message with no decision, or a body without `sessionId`, answers `400`.
- When the browser aborts a `chat` request, cancel the API request too. That cancels the turn.
- `history` returns one API page and passes `data` through unchanged. The browser pages through the history and checks the messages, so the relay does neither. The first page is the newest, and messages are oldest first within a page. The browser does not use the API's `latestCursor`, so passing the whole page on works too.
- `steer` answers with the receipt's `state` only.

## Errors [#errors]

Every error body is `{ "error": { "code": string, "message": string } }`. Copy the API's `X-Request-Id` header when the API sent one.

| Status | `code` | When |
| --- | --- | --- |
| `400` | `invalid_request` | The body is not JSON, has no known `op`, or breaks a field rule above, or `message` is not a valid `UIMessage` of the required role |
| `401` | `unauthorized` | No signed-in user |
| The API's status | The API's code | The API answered with an error, such as `404` [`not_found`](/api-reference/protocols/errors#not_found), `409` [`steer_not_available`](/api-reference/protocols/errors#steer_not_available), or `409` [`input_idempotency_conflict`](/api-reference/protocols/errors#input_idempotency_conflict) |
| `499` | `request_aborted` | The browser aborted the request |
| `502` | The SDK's code | The API request failed another way, such as `network_error` or `stream_error` |
| `500` | `internal_error` | Anything else. The message does not name the cause |

Pass the API's status and code through unchanged. The browser decides what to do from them: a `404` forgets the stored session, and `steer_not_available` sends the message again as the next chat message.

## What the browser does with each answer [#browser-behavior]

| Answer | What the browser does |
| --- | --- |
| `Location` header on the first `chat` reply | Takes the last path segment as the session ID. A relay on another origin must expose `Location` through CORS |
| `chat` stream that ends with a `finish` chunk | Treats the turn as stored |
| `chat` stream that ends without a `finish` chunk, because of Stop, an `abort` chunk, an `error` chunk, or a dropped connection | Reads `history` again. Each message sent for that turn, steers included, stays when the history holds its message ID and rolls back when it does not |
| `chat` error response | Shows it as a `BlazingAgentsError` with your status and `code`, and rolls back without reading `history`. A `404` also forgets the stored session |
| `history` `nextCursor` | Requests the next older page with it as `cursor`. Stops at `null`, at a cursor it already sent, or after 50 pages |
| `history` `404` | Forgets the stored session and starts the next message in a new one |
| `history` other errors | Shows the error. On restore, reads the history again when the request headers change, on the next send, or on `clearError()` |
| `steer` `accepted`, or no answer because the request failed in transit | Waits for the running turn. A steer the turn has not read when its stream ends goes out again as `chat` with a new message ID |
| `steer` `committed` | Treats the message as stored with the turn |
| `steer` `not_placed`, or `409 steer_not_available` | Sends the message as `chat`, with a new message ID, once the running turn ends |

## Known limits [#known-limits]

- A steer sent just before Stop can land in the next turn. Blazing Agents places a steer in the turn that is running when the request arrives, so a turn that starts while the request is on its way stores it, even though the browser already resolved that `send()` as `false`.

## Next [#next]

- [React chat hook](/sdk/typescript/use-blazing-agents-chat)
- [Connect Blazing Agents to your app](/getting-started/connect-your-app)
- [Sessions and turns](/platform/sessions-and-turns#send-while-the-agent-is-working)
