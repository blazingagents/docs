---
title: Streaming protocol
description: Consume Session, text, object, and Tool approval streams with the correct headers and failure semantics.
---

# Streaming protocol

Agent output streams to you as it is generated. Session turns stream AI SDK UI
message events over SSE, and stateless generation streams plain text. Use this
page when you relay a stream to a browser, read one in the SDK, or handle
cancellation and failures.

## Contract [#contract]

| Surface                           | HTTP response                                                                                           | Body                          | SDK result                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------- |
| New Session Turn                  | `201`; `Location` contains the new Session ID; `text/event-stream`; `x-vercel-ai-ui-message-stream: v1` | AI SDK `UIMessageChunk` SSE   | `sessionId`, `toResponse()`                             |
| Resumed Session Turn              | `200`; no `Location`; same stream headers                                                               | AI SDK `UIMessageChunk` SSE   | same, using the supplied Session ID                     |
| Text generation                   | `200`; `text/plain; charset=utf-8`                                                                      | chunked text                  | `textStream`, awaited `text`, `toResponse()`            |
| Object generation                 | `200`; `text/plain; charset=utf-8`                                                                      | chunked partial JSON text     | `partialObjectStream`, awaited `object`, `toResponse()` |
| Tool approval continuation        | `200`; UI-message SSE headers                                                                           | persisted continuation chunks | `joinToolApprovalContinuation()` terminal result        |


UI-message streams are `data:` records, each holding an AI SDK
`UIMessageChunk`, and end with `data: [DONE]`. They are not OpenAI-style delta
streams. Object generation uses the same plain-text format as text generation;
the SDK parses the partial and final JSON for you.

Starting a new session returns its `ss_...` ID in the `Location` header, so
`result.sessionId` is available before you read the body. When you continue a
session, it returns the ID you sent. Once the turn is accepted, the session and
your message are saved before the model runs. If the turn fails later, the
session keeps your message without an assistant reply. If you cancel, the saved
session stays as it is. A request rejected before the turn starts creates no
session.

You can claim the body of a chat or tool-approval continuation result once,
through `toResponse()`; a second claim throws `stream_error`. Completion and
object results let you read the iterator, await the final value, and relay the
response from the same result. `toResponse()` builds a relay response that
keeps the original success status, `X-Request-Id`, `Location`, and streaming
headers.

Failures depend on when they happen:

- An abort before any HTTP exchange is `request_aborted`; any other network
  failure is `network_error`.
- A non-2xx response before the stream starts uses the normal
  [error envelope](/api-reference/protocols/errors#contract).
- After a session stream starts, a failure arrives as a
  `{ "type": "error", "errorText": "safe prose" }` chunk and the HTTP status
  stays successful.
- A broken text or object stream, invalid final JSON, malformed SSE, or an
  invalid `Location` becomes `stream_error`, with the request ID when
  available. Await `text` or `object` when you need the final outcome.

To cancel a chat turn, abort its `AbortSignal` or cancel the stream you are
reading or relaying. Completion and object calls also accept `abortSignal`;
use it rather than canceling one reader. Canceling a tool-approval join only
stops your polling; the continuation keeps running.

A failed or canceled chat turn leaves the transcript as it was, including the
previous answer when you regenerate. Both still count toward usage, and tool
side effects already performed are not undone. Tasks behave differently: each
run starts a fresh session and saves the user message before generation, then
saves the final assistant message, including any failure, when the run ends.
Failed or canceled task runs therefore keep their transcript and failure
details.

Deciding a tool approval returns `202` with a continuation ID. Joining that
continuation returns its final SSE stream; it does not reopen the original
response.

## Examples [#examples]

A minimal UI-message stream looks like this. Real finish chunks also carry
usage metadata for the message.

```text
data: {"type":"start","messageId":"msg_1"}

data: {"type":"text-start","id":"text_1"}

data: {"type":"text-delta","id":"text_1","delta":"Hello"}

data: {"type":"text-end","id":"text_1"}

data: {"type":"finish","finishReason":"stop"}

data: [DONE]
```

Print text as it arrives, then keep the full answer:

```typescript tab="TypeScript"
const result = await client.completion({
  agentId,
  prompt: "Write a two-sentence release note.",
});

for await (const delta of result.textStream) {
  process.stdout.write(delta);
}

const finalText = await result.text;
```

```python tab="Python"
with client.completion_stream(
    agent_id=agent_id,
    prompt="Write a two-sentence release note.",
) as stream:
    for delta in stream:
        print(delta, end="", flush=True)
    final_text = stream.get_final_text()
```

Cancel a turn from the caller in TypeScript:

```typescript
const controller = new AbortController();
const result = await client.completion({
  agentId,
  prompt: "Analyze the report.",
  abortSignal: controller.signal,
});

controller.abort();
await result.text;
```

## Next [#next]

- [Generation and streaming](/agents/output/generation-and-streaming) to relay streams into a frontend.
- [Sessions and turns](/platform/sessions-and-turns) to continue and stop conversations.
- [Tool approvals](/agents/tools/tool-approvals) to pause for human review.
