---
title: Sessions and turns
description: Keep a conversation going across requests, read its history, and handle stops and retries.
---

# Sessions and turns

A session is a conversation that Blazing Agents stores for you. Pass its ID on the next call and the agent continues with its saved conversation context, so your backend never has to save or replay message history. Each call that runs the agent is a turn. Every turn is metered, whether or not it belongs to a session.

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

## Fork a conversation [#fork-a-conversation]

Fork a session to explore another answer from a selected accepted assistant reply. Read `sessions.messages()` and select a message whose top-level `branchable` is `true`. The child includes that reply and the earlier conversation. Stream chunks don't include `branchable`, so don't pick the reply from the live stream. A reply that is not in the history yet, a streaming reply, or a reply waiting for tool approval is not eligible; an earlier accepted reply remains eligible while the source runs.

Continuing the example above, save one key for the user's fork request:

```typescript tab="TypeScript"
const selected = history.data.find((message) => message.branchable);
if (!selected) throw new Error("Choose an accepted assistant reply first.");
const idempotencyKey = crypto.randomUUID();
const child = await client.sessions.fork({
  agentId, sessionId, messageId: selected.id, idempotencyKey,
});
console.log(child.id);
```

```python tab="Python"
selected = next((message for message in history.data if message.branchable), None)
if selected is None:
    raise ValueError("Choose an accepted assistant reply first.")
idempotency_key = str(uuid.uuid4())
child = client.sessions.fork(
    agent_id=agent_id, session_id=session_id,
    message_id=selected.id, idempotency_key=idempotency_key,
)
print(child.id)
```

If the response is lost, retry the same source, message ID, and key. A successful replay returns the same child, even after the source is deleted. Changing the selected message under the same key returns `idempotency_conflict`; retrying a deleted child returns `session_fork_deleted`. Reload history if the selected reply was removed or became ineligible (`session_fork_unavailable`).

The child starts idle. Creating it runs no model or tool and adds no billable usage. Continue with `client.chat()` and the child's ID; later turns incur normal token usage. The source and child can continue independently, and eligible inherited replies can be forked again.

The child inherits the saved agent configuration, `userId`, and metadata. Workspace files and memories remain shared and live, so a fork does not undo their changes. It copies no active turns, approvals, tasks, queued inputs, or usage records. `sessions.get()` and `fork()` return `forkedFrom`, which names the source session and reply as `{ sessionId, messageId }`; ordinary sessions return `null`.

## Stop and resend [#stop-and-resend]

Treat a turn as done only when its stream finishes normally. A `200` status or a closed connection alone does not prove success. Keep the user's draft until then, so they can edit and send it again after an error or a stop.

- Stopping records the cancellation and returns right away, while your stream keeps running until the turn settles. The exchange may already be saved, so reload the history rather than guessing. See [stop a turn](#stop-a-turn).
- A resend is an ordinary new message with a fresh message ID. You do not need to poll for the outcome of the earlier attempt.
- Keep using the session ID you received, even if that session is still empty.
- Sending again can repeat a tool's side effects, such as a sent email.

The [chatbot guide](/getting-started/chatbot) builds the send flow and lists how to add stop, edit, and regenerate.

## Read the history [#read-the-history]

`client.sessions.messages()` returns AI SDK `UIMessage` objects, oldest first within each page. With no cursor you get the newest page. Pass `nextCursor` back as `cursor` to load older pages, or pass `latestCursor` back as `after` to fetch only messages added since your last read. See [`sessions.messages()`](/sdk/typescript/sessions#messages) for page sizes and cursor rules.

`after` never returns a message that changed in place. A [tool approval](/agents/tools/tool-approvals) decision, and the continuation after it, update the assistant message that asked for approval instead of adding a new one. While a tool part in your newest page is `approval-requested` or `approval-responded`, reload the newest page without a cursor and replace messages by ID. Go back to `after` once those tool parts have a result or an error.

To show an agent's conversations, call `client.sessions.list({ agentId })`. For an inbox across all agents, call `client.sessions.listLatest({ byAgent: true })` to get each agent's latest session in one request.

Files the agent deliberately published during a conversation are [artifacts](/agents/artifacts). List them with `client.artifacts.list({ sessionId })`.

## Saved configuration and user labels [#saved-configuration-and-user-labels]

A session started through chat saves the agent's current configuration on its first turn. A fork inherits the source session's saved configuration when you create it. Later turns in the same session use those saved settings, even after you edit the agent. Call `sessions.get()` to read `agentConfig`; message pages contain only the transcript. See [configuration snapshots](/agents/configuration-snapshots).

Pass `userId` and `metadata` on the first turn to label the session with your end user. The `userId` is fixed once the session starts, and it labels usage for reporting. It does not control access, so your backend still decides who may open which session. See [tenancy and attribution](/platform/tenancy-and-attribution).

## Busy and concurrent sessions [#busy-and-concurrent-sessions]

`client.chat()` on an existing session returns [`session_busy`](/api-reference/protocols/errors#session_busy) (HTTP `409`) while a turn is running, a [tool approval](/agents/tools/tool-approvals) is waiting for a decision, or an approval continuation is already running. Deleting a session also returns `session_busy` while a turn runs or an approval continuation is still open.

To let users keep typing while the agent works, steer their message into the running turn, or hold it in your app until the turn ends. See [send while the agent is working](#send-while-the-agent-is-working).

## Send while the agent is working [#send-while-the-agent-is-working]

Blazing Agents stores no waiting messages, so your app owns the queue. While a turn runs, each new message has two homes: it can steer the running turn, or it can wait in your app. Once the turn settles, send the waiting messages as ordinary chat turns, one message per call or several in one call through `messages`. Each stays a separate user message in the history, in order.

Continuing the first example, this keeps a `waiting` list per session. While the turn runs, sending calls `submitInput()` (`submit_input()` in Python) to steer; when no turn can take a steer, the message joins `waiting` instead. After the turn's stream ends, `flushWaiting()` (`flush_waiting()` in Python) takes the waiting messages out of the queue and sends them in one turn:

```typescript tab="TypeScript"
import { BlazingAgentsError, type UIMessage } from "@blazingagents/sdk";

const waiting: UIMessage[] = [];

async function sendOrSteer(text: string) {
  const message = userMessage(text);
  try {
    await client.sessions.submitInput({
      agentId,
      sessionId,
      requestId: crypto.randomUUID(),
      message,
    });
  } catch (error) {
    if (BlazingAgentsError.isInstance(error) && error.code === "steer_not_available") {
      waiting.push(message);
    } else {
      throw error;
    }
  }
}

async function flushWaiting() {
  // Take the messages out before sending; see below.
  const messages = waiting.splice(0, waiting.length);
  if (messages.length === 0) return;
  const turn = await client.chat({ agentId, sessionId, messages });
  // Raw AI SDK stream chunks; in a route, return turn.toResponse() instead.
  for await (const chunk of turn.toStream()) {
    process.stdout.write(chunk);
  }
}
```

```python tab="Python"
import sys

from blazing_agents import APIStatusError

waiting: list[dict] = []


def send_or_steer(text: str) -> None:
    message = user_message(text)
    try:
        client.sessions.submit_input(
            agent_id=agent_id,
            session_id=session_id,
            request_id=str(uuid.uuid4()),
            message=message,
        )
    except APIStatusError as error:
        if error.code == "steer_not_available":
            waiting.append(message)
        else:
            raise


def flush_waiting() -> None:
    # Take the messages out before sending; see below.
    messages = waiting[:]
    waiting.clear()
    if not messages:
        return
    with client.chat(
        agent_id=agent_id, session_id=session_id, messages=messages
    ) as stream:
        for chunk in stream:
            # Raw AI SDK stream chunks; relay them to your frontend instead.
            sys.stdout.buffer.write(chunk)
```

Call the flush once the turn's stream ends and the session is `idle` again. Remove the messages from the queue *before* you send so a later flush cannot send the same items again.

If any submitted message ID is already in this session's accepted history, ordinary chat returns HTTP `409` with [`message_id_conflict`](/api-reference/protocols/errors#message_id_conflict). The whole batch is rejected before any model or tool work, even when it mixes known and new IDs or changes the content of a known message. The same ID is allowed in another session. Explicit regeneration can still reference an existing message.

If a send's outcome is unknown, such as after a dropped connection, read the history for the message IDs and let the user decide. Do not retry automatically. This check does not promise exactly-once tool effects for turns whose outcome is uncertain.

### Steer a running turn [#steer-a-running-turn]

`submitInput()` (`submit_input()` in Python) hands one user message to the turn that is running now. The agent reads it at its next step, between tool calls or after the current model response, and answers in the same turn. When no turn can take a steer (the session is idle, the turn is stopping or finishing, or a tool approval waits), the call fails with [`steer_not_available`](/api-reference/protocols/errors#steer_not_available) and nothing is saved, so keep the message in your own queue.

You choose a `requestId` for each steer, such as a UUID made when the user sends. It can be 1 to 128 characters, other than `.` or `..`. Resending the same `requestId` with the same message returns the same receipt, so you can retry a lost response safely. Reusing a `requestId` with a different message, or sending the same `message.id` under a new `requestId`, returns [`input_idempotency_conflict`](/api-reference/protocols/errors#input_idempotency_conflict). After a timeout, retry with the original `requestId`; never make a new one for a message whose outcome you do not know.

A steer the agent accepts also shows up on the running turn's stream as a `data-ba-steer-consumed` chunk carrying the receipt's `requestId`, `turnId`, `sequence`, and `message`. It is provisional: render it and deduplicate by message ID, then confirm from the history after the turn ends. See [streaming protocol](/api-reference/protocols/streaming#steer-events).

### Track a steered message [#steer-receipts]

`submitInput()` returns a receipt plus the session's activity, and `sessions.inputs()` lists the receipts in the order they arrived. A receipt's `state` tells you what the steer became:

| State | What it means for your UI |
| --- | --- |
| `accepted` | Saved for the running turn, not yet delivered. Keep waiting for an outcome |
| `delivered` | Handed to the turn; whether the agent picked it up is not yet proven. Keep waiting |
| `committed` | Saved in the history. Done |
| `not_placed` | Proven never to reach the agent. Safe to send as an ordinary message |
| `uncertain` | May have reached the agent before work was interrupted. Never resend automatically; show it and let the user decide |

A finished receipt also carries a `reason`: `stopped`, `failed`, `owner_lost`, `turn_finished`, or `null`. Poll `inputs()` while the session is not idle or receipts are pending, and pass `includeCompleted: true` (`include_completed=True` in Python) to read terminal receipts again later.

### Stop a turn [#stop-a-turn]

Stopping needs the ID of the turn you mean, which you read from the session's activity. The call records the cancellation and returns as soon as it is saved; it does not wait for the turn to settle. Keep reading your existing stream until it ends, then check the history.

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

A retry with the same `turnId` never stops a later turn, and a turn you cannot see returns [`not_found`](/api-reference/protocols/errors#not_found). A stopped turn leaves the history as it was before the turn. Steering messages the agent already read may still have had effects, such as a tool call, even though they are not saved.

### Show progress and recover after a reload [#show-progress-and-recover-after-a-reload]

`sessions.inputs()` returns the steer receipts plus the session's activity: `idle`, `running`, `stopping`, or `approval`, with the running `turnId` when there is one. Poll it while the session is not idle or receipts are pending. Each poll returns the current state, so start from the first page every time.

A dropped stream cannot be rejoined, whether it came from `client.chat()` or `continueChat()`. Its answer is in the history once the turn succeeds, so fetch new messages with the `after` cursor when activity shows the turn has ended. See [read the history](#read-the-history). Then send any messages still in your app's queue as ordinary chat.

## Chat endpoint pattern [#chat-endpoint-pattern]

In a real app, your backend maps each of your own chats to one session. The handler authorizes the request, loads the saved session ID, and relays the stream. Here `app` holds your own sign-in and storage code:

```typescript tab="TypeScript"
import { client } from "./client.ts";
import * as app from "./app.ts";

const agentId = app.requireEnv("BLAZING_AGENTS_AGENT_ID");

export async function handleChat(request: Request): Promise<Response> {
  const { chatId, userId, messages } = await app.authorize(request);
  const existingSessionId = await app.loadSessionId(userId, chatId);
  const result = await client.chat({
    agentId,
    ...(existingSessionId ? { sessionId: existingSessionId } : {}),
    messages,
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
    chat_id, user_id, messages = app.authorize(request)
    session_id = app.load_session_id(user_id, chat_id)
    if session_id:
        stream = client.chat(
            agent_id=AGENT_ID, session_id=session_id, messages=messages, user_id=user_id
        )
    else:
        stream = client.chat(agent_id=AGENT_ID, messages=messages, user_id=user_id)
        app.save_session_id(user_id, chat_id, stream.session_id)
    with stream:
        yield from stream
```

Keep these rules in your handler:

- Take the agent ID, session ID, and `userId` from your own server-side state, never from the request body.
- Accept only new user messages per request, one per send or several from the user's waiting queue. The session already holds the rest.
- If your UI steers messages or holds a waiting queue, give each sessions call its own backend route, and check that the signed-in user owns the session on every one, including steer, list receipts, and stop.
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

- [Build a chatbot](/getting-started/chatbot) that sends messages, then add stop, edit, and regenerate.
- [Stream answers to your frontend](/agents/output/generation-and-streaming).
- [`client.chat()` reference](/sdk/typescript/client#chat) and [Python](/sdk/python/client#chat).
