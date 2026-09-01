---
title: Streaming protocol
description: Consume Session, text, object, and Tool approval streams with the correct headers and failure semantics.
---

# Streaming protocol

Blazing Agents uses AI SDK UI-message SSE for Session activity and chunked
plain text for stateless generation. Use this page when relaying a response,
reading it in the SDK, or handling cancellation and failures.

## Contract [#contract]

| Surface                           | HTTP response                                                                                           | Body                          | SDK result                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------- |
| New Session Turn                  | `201`; `Location` contains the new Session ID; `text/event-stream`; `x-vercel-ai-ui-message-stream: v1` | AI SDK `UIMessageChunk` SSE   | `sessionId`, `toResponse()`                             |
| Resumed Session Turn              | `200`; no `Location`; same stream headers                                                               | AI SDK `UIMessageChunk` SSE   | same, using the supplied Session ID                     |
| Text generation                   | `200`; `text/plain; charset=utf-8`                                                                      | chunked text                  | `textStream`, awaited `text`, `toResponse()`            |
| Object generation                 | `200`; `text/plain; charset=utf-8`                                                                      | chunked partial JSON text     | `partialObjectStream`, awaited `object`, `toResponse()` |
| Tool approval continuation        | `200`; UI-message SSE headers                                                                           | persisted continuation chunks | `joinToolApprovalContinuation()` terminal result        |

UI-message streams contain `data:` records whose values are AI SDK
`UIMessageChunk` objects, followed by `data: [DONE]`. They are not
OpenAI-compatible delta streams. Stateless object mode uses the same text wire
format as text mode; the SDK parses partial and final JSON.

The create Session route mints an `ss_...` ID. `result.sessionId` reads it from
the `Location` header before the body is consumed. On resume it resolves to the
ID supplied by the caller. After admission, interactive creation materializes
before model execution. A later failure keeps the Session and submitted user
message without an assistant response. Cancellation leaves the materialized
Session unchanged; earlier validation or admission failures leave no Session.

Chat and Tool approval continuation results allow one body claim through
`toResponse()`. A second claim throws SDK `stream_error`. Completion and object results tee the successful body
internally, so their iterator, awaited final value, and relay are all available
from one result. `toResponse()` constructs a relay response that preserves the
originating success status, `X-Request-Id`, `Location`, and required streaming
headers.

Failures have two phases:

- A caller abort before an HTTP exchange is SDK `request_aborted`; another
  fetch failure is `network_error`.
- A non-2xx response before streaming starts uses the normal
  [error envelope](/api-reference/protocols/errors#contract).
- After a Session stream starts, failure is a native
  `{ "type": "error", "errorText": "safe prose" }` chunk and the HTTP status
  remains successful.
- A failed text/object transport, invalid final JSON, malformed SSE, or invalid
  create `Location` becomes SDK `stream_error` with the originating request ID
  when available. Await `text` or `object` when the terminal outcome matters.

Cancellation depends on the surface. For chat, an input `AbortSignal` aborts
the request and canceling the selected decoded or relay stream propagates to
the active Turn. Completion and object inputs also forward `AbortSignal`; use
it to cancel the Turn rather than relying on cancellation of one tee branch.
Canceling a Tool approval join only detaches that polling response: it does not
cancel the durable continuation. Failed interactive Turns commit only their
submitted user message; failed regeneration also applies its selected
truncation. Canceled interactive Turns leave the transcript unchanged. Both are
metered, and external Tool side effects are not rolled back. Durable Tasks
differ: the worker attaches a fresh Session
before execution and incrementally commits user, assistant, and failure events,
so failed or canceled Task runs can leave transcript and failure history.

A Tool approval decision returns `202` and a continuation identifier. Joining
that continuation returns its terminal SSE stream; it does not reopen the
original HTTP response.

## Examples [#examples]

This is a minimal valid UI-message stream. Production finish chunks also carry
the platform's message usage metadata.

```text
data: {"type":"start","messageId":"msg_1"}

data: {"type":"text-start","id":"text_1"}

data: {"type":"text-delta","id":"text_1","delta":"Hello"}

data: {"type":"text-end","id":"text_1"}

data: {"type":"finish","finishReason":"stop"}

data: [DONE]
```

Iterate deltas and await the assembled final text:

```typescript
const result = await client.completion({
  agentId,
  prompt: "Write a two-sentence release note.",
});

for await (const delta of result.textStream) {
  process.stdout.write(delta);
}

const finalText = await result.text;
```

Forward cancellation from the caller:

```typescript
const controller = new AbortController();
const result = await client.completion({
  agentId,
  prompt: "Analyze the report.",
  signal: controller.signal,
});

controller.abort();
await result.text;
```

## Used by [#used-by]

- [SDK generation](/sdk/typescript/client#chat)
- [SDK Session continuations](/sdk/typescript/sessions#join-tool-approval-continuation)
- [REST generation](/api-reference/rest-api/generation#generate)
- [REST Session Turns](/api-reference/rest-api/sessions#create-session-turn)
- [REST approval continuation](/api-reference/rest-api/sessions#join-tool-approval-continuation)
- [Generation and streaming](/agents/output/generation-and-streaming)
- [Sessions and Turns](/platform/sessions-and-turns)
- [Tool approvals](/agents/tools/tool-approvals)
- [Build a chat endpoint](/platform/sessions-and-turns)
- [Stream responses into a frontend](/agents/output/generation-and-streaming)

## Source of truth [#source-of-truth]

- `packages/core/src/entities/chat.ts`
- `../typescript-sdk/src/generation.ts`
- `../typescript-sdk/src/generation.chat-results.test.ts`
- `../typescript-sdk/src/generation.chat-requests.test.ts`
- `../typescript-sdk/src/generation.chat-errors.test.ts`
- `../typescript-sdk/src/generation.transport-errors.test.ts`
- `../typescript-sdk/src/generation.completion.test.ts`
- `../typescript-sdk/src/generation.object.test.ts`
- `servers/api/src/routes/agents/generation.ts`
- `servers/api/src/routes/agents/generation.test.ts`
- `servers/api/src/routes/sessions/turns.ts`
- `servers/api/src/routes/sessions/create-responses.test.ts`
- `servers/api/src/routes/sessions/create-errors.test.ts`
- `servers/api/src/routes/sessions/resume.test.ts`
- `servers/api/src/routes/sessions/tool-approvals.ts`
- `servers/api/src/routes/sessions/tool-approvals.test.ts`
- `servers/task-worker/src/task-run-execution.ts`
- `servers/task-worker/src/run-workflow-lifecycle.test.ts`
- `servers/task-worker/src/run-workflow-persistence.test.ts`

## Related guides [#related-guides]

See the capability and guide links under [Used by](#used-by).

## Reference [#reference]

See the implementation inventory under [Source of truth](#source-of-truth).

Python equivalents use [`chat()`](/sdk/python/client#chat) and
[`join_tool_approval_continuation()`](/sdk/python/sessions#join-tool-approval-continuation).
