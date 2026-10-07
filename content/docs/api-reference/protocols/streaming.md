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
| Tool approval continuation        | `200`; UI-message SSE headers                                                                           | AI SDK `UIMessageChunk` SSE   | `continueChat()` result                                 |
| Session steer submission          | `202`; `application/json`                                                                               | steer receipt and activity    | `submitInput()` resolved value                          |
| Session turn stop                 | `200`; `application/json`                                                                               | stopped turn ID and activity  | `sessions.stop()` resolved value                        |


UI-message streams are `data:` records, each holding an AI SDK
`UIMessageChunk`, and end with `data: [DONE]`. They are not OpenAI-style delta
streams. Object generation uses the same plain-text format as text generation;
the SDK parses the partial and final JSON for you.

Starting a new session returns its `ss_...` ID in the `Location` header, so
`result.sessionId` is available before you read the body. When you continue a
session, it returns the ID you sent. A session is created once its first turn
is accepted, before the model runs. If that turn fails or you cancel it,
nothing is added to the history, so the session can be empty. You can still
use it. A request rejected before the turn starts creates no session.

You can claim the body of a chat or approval continuation result once,
through `toResponse()` or `toStream()`; a second claim throws `stream_error`.
Completion and object results let you read the iterator, await the final value, and relay the
response from the same result. `toResponse()` builds a relay response that
keeps the original success status, `X-Request-Id`, `Location`, and streaming
headers.

Failures depend on when they happen:

- An abort before any HTTP exchange is `request_aborted`; any other network
  failure is `network_error`.
- A non-2xx response before the stream starts uses the normal
  [error envelope](/api-reference/protocols/errors#error-response).
- After a session stream starts, a failure arrives as a
  `{ "type": "error", "errorText": "safe prose" }` chunk and the HTTP status
  stays successful.
- A broken text or object stream, invalid final JSON, malformed SSE, or an
  invalid `Location` becomes `stream_error`, with the request ID when
  available. Await `text` or `object` when you need the final outcome.

To cancel a chat turn or an approval continuation, abort its `AbortSignal` or
cancel the stream you are reading or relaying. Completion and object calls also
accept `abortSignal`.

A failed or canceled chat turn leaves the transcript as it was, including the
previous answer when you regenerate. Both still count toward usage, and tool
side effects already performed are not undone. Tasks behave differently: each
run starts a fresh session and saves the user message before generation, then
saves the final assistant message, including any failure, when the run ends.
Failed or canceled task runs therefore keep their transcript and failure
details.

Deciding a tool approval round and continuing the turn are one call:
`POST /tool-approvals/continue` records the round's decisions, then streams
the rest of the turn as an ordinary UI message stream in the same request.
Nothing is saved for replay, so a dropped chat or continuation stream cannot
be rejoined; read its answer from the history with the `after` cursor once
the turn ends.

[Steering a running turn](/platform/sessions-and-turns#steer-a-running-turn)
returns `202` with a JSON receipt, not a stream. Stopping a turn returns
`200` as soon as the stop is recorded; the turn's own stream still runs until
it settles, so keep reading the stream you already have.

## Steer events [#steer-events]

When a steering message is picked up, the running turn's stream carries one
transient event for it:

```text
data: {"type":"data-ba-steer-consumed","transient":true,"data":{"requestId":"req_1","turnId":"turn_...","sequence":3,"message":{"id":"m2","role":"user","parts":[{"type":"text","text":"Compare costs too"}]}}}
```

The event is provisional, not proof the message is saved. Render it and
deduplicate by `message.id`, then confirm from the history after the turn
ends; the receipt in `GET /inputs` turns `committed` once the message is
durable.

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
