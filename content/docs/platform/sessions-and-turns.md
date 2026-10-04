---
title: Sessions and turns
description: Keep a conversation going across requests, read its history, and handle stops and retries.
---

# Sessions and turns

A session is a conversation that Blazing Agents stores for you. Pass its ID on the next call and the agent sees everything said so far, so your backend never has to save or replay message history. Each call that runs the agent is a turn. Every turn is metered, whether or not it belongs to a session.

## Continue a conversation [#continue-a-conversation]

This example starts a session, asks a follow-up in the same session, and prints the saved history. Set `AGENT_ID` to an agent with a provider and model, such as the one from the [quickstart](/getting-started/quickstart).

```typescript tab="TypeScript"
import { BlazingAgents, type UIMessage } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});
const agentId = process.env.AGENT_ID!;

function userMessage(text: string): UIMessage {
  return { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text }] };
}

const first = await client.chat({
  agentId,
  message: userMessage("Plan a weekend in Lisbon."),
});
const sessionId = await first.sessionId;
await first.toResponse().text();

const followUp = userMessage("Make it suitable for children.");
const second = await client.chat({ agentId, sessionId, message: followUp });
await second.toResponse().text();

const history = await client.sessions.messages({ agentId, sessionId });
for (const message of history.data) console.log(message.role, message.id);
```

```python tab="Python"
import os
import uuid

from blazing_agents import BlazingAgents

client = BlazingAgents()
agent_id = os.environ["AGENT_ID"]


def user_message(text: str) -> dict:
    return {"id": str(uuid.uuid4()), "role": "user", "parts": [{"type": "text", "text": text}]}


with client.chat(agent_id=agent_id, message=user_message("Plan a weekend in Lisbon.")) as stream:
    session_id = stream.session_id
    for _ in stream:
        pass

follow_up = user_message("Make it suitable for children.")
with client.chat(agent_id=agent_id, session_id=session_id, message=follow_up) as stream:
    for _ in stream:
        pass

history = client.sessions.messages(agent_id=agent_id, session_id=session_id)
for message in history.data:
    print(message.role, message.id)
```

You see four lines: `user`, `assistant`, `user`, `assistant`. Reading the stream to the end lets each turn finish before the next one starts. In a real app you return the stream to your frontend instead of reading it yourself.

## How sessions behave [#how-sessions-behave]

Calling `client.chat()` without a session ID starts a new session. You get the `ss_...` ID before the answer finishes streaming, so save it right away. Pass it back as `sessionId` (`session_id` in Python) to continue.

A session belongs to one agent. Resuming it through another agent, or resuming a deleted or unknown session, returns [`not_found`](/api-reference/protocols/errors#not_found). Blazing Agents never quietly creates a replacement.

A successful turn saves the user message, the assistant reply, and its tool activity together. A failed or cancelled turn is still metered, but it adds nothing to the history. If the very first turn fails, you keep an empty session that you can still use.

## Stop and resend [#stop-and-resend]

Treat a turn as done only when its stream finishes normally. A `200` status or a closed connection alone does not prove success. Keep the user's draft until then, so they can edit and send it again after an error or a stop.

- Stopping ends your stream and asks Blazing Agents to cancel the turn. The exchange may already be saved, so reload the history rather than guessing. To stop a turn and wait until it has fully stopped, use [Stop](#stop-a-turn).
- A resend is an ordinary new message with a fresh message ID. You do not need to poll for the outcome of the earlier attempt.
- Keep using the session ID you received, even if that session is still empty.
- Sending again can repeat a tool's side effects, such as a sent email.

The [chatbot guide](/getting-started/chatbot) shows send, stop, edit, and regenerate end to end.

## Read the history [#read-the-history]

`client.sessions.messages()` returns AI SDK `UIMessage` objects, oldest first within each page. With no cursor you get the newest page. Pass `nextCursor` back as `cursor` to load older pages, or pass `latestCursor` back as `after` to fetch only messages added since your last read. See [`sessions.messages()`](/sdk/typescript/sessions#messages) for page sizes and cursor rules.

`after` never returns a message that changed in place. A [tool approval](/agents/tools/tool-approvals) continuation adds its results to the assistant message that asked for approval instead of adding a new one. When a continuation ends, reload the newest page without a cursor and replace messages by ID.

To show an agent's conversations, call `client.sessions.list({ agentId })`. For an inbox across all agents, call `client.sessions.listLatest({ byAgent: true })` to get each agent's latest session in one request.

Files the agent deliberately published during a conversation are [artifacts](/agents/artifacts). List them with `client.artifacts.list({ sessionId })`.

## Saved configuration and user labels [#saved-configuration-and-user-labels]

The first turn saves the agent's current configuration. Later turns in the same session use those saved settings, even after you edit the agent. Call `sessions.get()` to read `agentConfig`; message pages contain only the transcript. See [configuration snapshots](/agents/configuration-snapshots).

Pass `userId` and `metadata` on the first turn to label the session with your end user. The `userId` is fixed once the session starts, and it labels usage for reporting. It does not control access, so your backend still decides who may open which session. See [tenancy and attribution](/platform/tenancy-and-attribution).

## Busy and concurrent sessions [#busy-and-concurrent-sessions]

`client.chat()` on an existing session returns [`session_busy`](/api-reference/protocols/errors#session_busy) (HTTP `409`) while a turn is running, a [tool approval](/agents/tools/tool-approvals) is waiting for a decision, or an approved call is still running. Deleting a session also returns `session_busy` while a turn runs, including one started from the queue, or while an approved call is running.

To let users keep typing while the agent works, send their messages as session inputs instead. See [send while the agent is working](#send-while-the-agent-is-working).

## Send while the agent is working [#send-while-the-agent-is-working]

A session input is a user message you hand to Blazing Agents for a session that already exists. It is saved before the call returns, so a reload or a dropped connection never loses it. Each input has a mode:

- **Queue** (the default). The message waits until the current turn ends, then runs in the next turn.
- **Steer**. The message joins the turn that is running now. The agent reads it at its next step, between tool calls or after the current model response, and answers in the same turn.

When the session is idle, an input starts a new turn right away, whichever mode you choose.

Continuing the first example, this sends a message as a session input and waits until the agent has answered it:

```typescript tab="TypeScript"
import { setTimeout } from "node:timers/promises";

const requestId = crypto.randomUUID();
await client.sessions.submitInput({
  agentId,
  sessionId,
  requestId,
  message: userMessage("Add a rainy-day option."),
});

for (;;) {
  const page = await client.sessions.inputs({ agentId, sessionId, includeCompleted: true });
  const input = page.data.find((item) => item.requestId === requestId);
  console.log(page.activity.state, input?.state);
  if (input?.state === "committed" || input?.state === "cancelled") break;
  if (input?.state === "uncertain" || page.activity.state === "paused") break;
  await setTimeout(1000);
}
```

```python tab="Python"
import time

request_id = str(uuid.uuid4())
client.sessions.submit_input(
    agent_id=agent_id,
    session_id=session_id,
    request_id=request_id,
    message=user_message("Add a rainy-day option."),
)

while True:
    page = client.sessions.inputs(
        agent_id=agent_id, session_id=session_id, include_completed=True
    )
    item = next((i for i in page.data if i.request_id == request_id), None)
    print(page.activity.state, item and item.state)
    if item and item.state in ("committed", "cancelled", "uncertain"):
        break
    if page.activity.state == "paused":
        break
    time.sleep(1)
```

Pass `whenBusy: "steer"` (`when_busy="steer"` in Python) to steer instead of queueing. Once the input is `committed`, the agent's answer is in the [history](#read-the-history).

### Queue, steer, and withdraw [#queue-steer-and-withdraw]

You choose a `requestId` for each input, such as a UUID made when the user starts typing. It can be 1 to 128 characters, other than `.` or `..`. Blazing Agents treats a resend with the same `requestId` and the same message as the same input, so you can retry a lost response safely. Reusing a `requestId` with a different message, or sending the same `message.id` under a new `requestId`, returns [`input_idempotency_conflict`](/api-reference/protocols/errors#input_idempotency_conflict). After a timeout, retry with the original `requestId`; never make a new one for a message whose outcome you do not know.

Inputs keep the order they arrived in. Promoting a queued input to steer, or deleting it, works only while it is still waiting. Once the agent has picked it up, both return [`input_not_pending`](/api-reference/protocols/errors#input_not_pending). Promoting does not move the input in the order. If no turn can take it right now, it stays queued for the next one.

A steer that arrives as a turn is finishing may be too late to join it. It then waits as a queued input in the same place in the order.

```typescript tab="TypeScript"
await client.sessions.promoteInput({ agentId, sessionId, requestId });
await client.sessions.deleteInput({ agentId, sessionId, requestId });
```

```python tab="Python"
client.sessions.promote_input(agent_id=agent_id, session_id=session_id, request_id=request_id)
client.sessions.delete_input(agent_id=agent_id, session_id=session_id, request_id=request_id)
```

### When queued messages run [#when-queued-messages-run]

When a turn finishes, or the user stops it, every waiting queued input runs together in one new turn. Each stays a separate user message, in order. Messages that arrive after that turn starts wait for the next one. When nothing is waiting, the session goes idle.

Queued turns use the session's saved configuration. You cannot attach a saved prompt, regeneration, or [backend functions](/agents/tools/backend-functions) to an input. Every turn, including a queued one, is metered on its own.

Some events pause the queue instead of running it:

- **A tool approval.** Waiting inputs stay where they are until every pending call is decided. Neither queue nor steer skips an approval, and Stop does not decide one. Once the decisions are in, the agent finishes the approved work without taking steering. A steer sent before or during that work waits as a queued input, keeps its place in the order, and runs in the next turn. You can still stop that work.
- **An error.** If a turn fails, waiting inputs stay and the session reports `paused`. New inputs wait too, so sending alone does not restart it. Show the error, and resume the queue when the user asks, for example from a resume button or right after they send.
- **Backend functions.** Queued work never runs your [backend functions](/agents/tools/backend-functions) unattended. After a turn that used them, the queue pauses with the reason `function_executor_required`. Call [`runInputs()`](/sdk/typescript/sessions#run-inputs) from your backend with the same functions to run the waiting inputs and stream that turn. Resuming does not clear this pause.

```typescript tab="TypeScript"
const { activity } = await client.sessions.inputs({ agentId, sessionId });
if (activity.state === "paused" && activity.reason !== "function_executor_required") {
  await client.sessions.resumeInputs({ agentId, sessionId });
}
```

```python tab="Python"
activity = client.sessions.inputs(agent_id=agent_id, session_id=session_id).activity
if activity.state == "paused" and activity.reason != "function_executor_required":
    client.sessions.resume_inputs(agent_id=agent_id, session_id=session_id)
```

Resuming never repeats a turn that already ran, never reruns `uncertain` inputs, and calling it twice starts only one turn.

Deleting an idle session that still has queued inputs is allowed. They never run, and they are not moved to another session.

### Stop a turn [#stop-a-turn]

Stopping needs the ID of the turn you mean, which you read from the session's activity. Blazing Agents waits until that turn has fully stopped and its usage is recorded before it answers, so the queued turn never overlaps it. Stopping the same turn again succeeds without stopping anything new, even if a queued turn has started since. The answer can already show that next turn running.

```typescript tab="TypeScript"
const { activity } = await client.sessions.inputs({ agentId, sessionId });
if (activity.turnId && activity.state === "running") {
  const stopped = await client.sessions.stop({ agentId, sessionId, turnId: activity.turnId });
  console.log(stopped.stoppedTurnId, stopped.activity.state);
}
```

```python tab="Python"
activity = client.sessions.inputs(agent_id=agent_id, session_id=session_id).activity
if activity.turn_id is not None and activity.state == "running":
    stopped = client.sessions.stop(
        agent_id=agent_id, session_id=session_id, turn_id=activity.turn_id
    )
    print(stopped.stopped_turn_id, stopped.activity.state)
```

A stopped turn leaves the history as it was before the turn. Steering messages the agent already read may still have had effects, such as a tool call, even though they are not saved.

### Show progress and recover after a reload [#show-progress-and-recover-after-a-reload]

Listing a session's inputs returns the waiting inputs plus the session's activity: `idle`, `running`, `stopping`, `approval`, or `paused`. Poll it while the session is not idle or inputs are waiting. Each poll returns the current state, so start from the first page every time.

Each input reports a `state`:

| State | What it means for your UI |
| --- | --- |
| `accepted` | Saved and waiting. Show it in your queue; promote and delete still work |
| `delivered` | Handed to a turn. Keep showing it, but promote and delete no longer work |
| `consumed` | The agent has read it. Remove it from the queue; it appears in the history once the turn succeeds |
| `committed` | Saved in the history |
| `cancelled` | Deleted, or its turn stopped or failed. `reason` says which |
| `uncertain` | The agent may have read it before work was interrupted. It is not run again, so let the user decide whether to resend |

When activity shows a running turn that started from queued inputs, stream its answer live with its `turnId`. Open one stream per turn. The stream uses the same format as chat and always starts from the beginning of the turn, so a reconnect replays it. Show the streamed assistant message by its ID, and when you later load the history, replace that message with the saved one of the same ID rather than adding a second copy. Closing this stream does not stop the turn; use [Stop](#stop-a-turn) for that.

```typescript tab="TypeScript"
const { activity } = await client.sessions.inputs({ agentId, sessionId });
if (activity.turnId && activity.state === "running") {
  const turn = await client.sessions.joinInputTurn({ agentId, sessionId, turnId: activity.turnId });
  await turn.toResponse().text();
}
```

```python tab="Python"
activity = client.sessions.inputs(agent_id=agent_id, session_id=session_id).activity
if activity.turn_id is not None and activity.state == "running":
    with client.sessions.join_input_turn(
        agent_id=agent_id, session_id=session_id, turn_id=activity.turn_id
    ) as stream:
        for _ in stream:
            pass
```

A turn you started with `client.chat()` is not a queued turn, so joining it returns `not_found`.

A dropped ordinary chat stream cannot be rejoined. Its answer is in the history once the turn succeeds, so fetch new messages with the `after` cursor when activity shows the turn has ended. See [read the history](#read-the-history).

## Concurrent turns [#concurrent-turns]

If two turns run on the same session at once, the first to finish is saved and the other fails instead of merging the histories. Send one turn at a time per session when order matters, or use session inputs.

## Chat endpoint pattern [#chat-endpoint-pattern]

In a real app, your backend maps each of your own chats to one session. The handler authorizes the request, loads the saved session ID, and relays the stream. Here `app` holds your own sign-in and storage code:

```typescript tab="TypeScript"
import { client } from "./client.ts";
import * as app from "./app.ts";

const agentId = app.requireEnv("BLAZING_AGENTS_AGENT_ID");

export async function handleChat(request: Request): Promise<Response> {
  const { chatId, userId, message } = await app.authorize(request);
  const existingSessionId = await app.loadSessionId(userId, chatId);
  const result = await client.chat({
    agentId,
    ...(existingSessionId ? { sessionId: existingSessionId } : {}),
    message,
    abortSignal: request.signal,
    userId,
  });
  if (!existingSessionId) {
    await app.saveSessionId(userId, chatId, await result.sessionId);
  }
  return result.toResponse();
}
```

```python tab="Python"
from collections.abc import Iterator

import app
from client import client

AGENT_ID = app.require_env("BLAZING_AGENTS_AGENT_ID")


def handle_chat(request: app.Request) -> Iterator[bytes]:
    chat_id, user_id, message = app.authorize(request)
    session_id = app.load_session_id(user_id, chat_id)
    if session_id:
        stream = client.chat(
            agent_id=AGENT_ID, session_id=session_id, message=message, user_id=user_id
        )
    else:
        stream = client.chat(agent_id=AGENT_ID, message=message, user_id=user_id)
        app.save_session_id(user_id, chat_id, stream.session_id)
    with stream:
        yield from stream
```

Keep these rules in your handler:

- Take the agent ID, session ID, and `userId` from your own server-side state, never from the request body.
- Accept exactly one new user message per request. The session already holds the rest.
- If your UI queues or steers messages, give each session input call its own backend route, and check that the signed-in user owns the session on every one, including list, stop, and join.
- Save the new session ID before you relay the stream. If two first requests for the same chat can arrive together, hold a lock until the ID is saved so you do not create two sessions.
- Return `result.toResponse()` unchanged so the stream and its headers reach the browser intact, and forward the request's abort signal so a closed tab cancels the turn.

[Connect Blazing Agents to your app](/getting-started/connect-your-app) walks through this endpoint step by step.

## Send images and regenerate answers [#send-images-and-regenerate-answers]

To send an image, add a `file` part with an `image/...` media type and a URL, such as a data URL, to the user message.

To replace the latest answer, resume the session with `trigger: "regenerate-message"` and send the user message again. Continuing the first example:

```typescript tab="TypeScript"
const retry = await client.chat({
  agentId,
  sessionId,
  message: followUp,
  trigger: "regenerate-message",
});
await retry.toResponse().text();
```

```python tab="Python"
with client.chat(
    agent_id=agent_id,
    session_id=session_id,
    message=follow_up,
    trigger="regenerate-message",
) as stream:
    for _ in stream:
        pass
```

The new answer replaces the old one only if the turn succeeds. If it fails or you stop it, the previous answer stays. To replace an earlier answer instead, pass its ID as `messageId` (`message_id` in Python).

## Next [#next]

- [Build a chatbot](/getting-started/chatbot) with send, stop, edit, and regenerate.
- [Stream answers to your frontend](/agents/output/generation-and-streaming).
- [`client.chat()` reference](/sdk/typescript/client#chat) and [Python](/sdk/python/client#chat).
