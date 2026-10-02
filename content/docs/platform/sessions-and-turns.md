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

- Stopping ends your stream and asks Blazing Agents to cancel the turn. The exchange may already be saved, so reload the history rather than guessing.
- A resend is an ordinary new message with a fresh message ID. You do not need to poll for the outcome of the earlier attempt.
- Keep using the session ID you received, even if that session is still empty.
- Sending again can repeat a tool's side effects, such as a sent email.

The [chatbot guide](/getting-started/chatbot) shows send, stop, edit, and regenerate end to end.

## Read the history [#read-the-history]

`client.sessions.messages()` returns AI SDK `UIMessage` objects, oldest first within each page. With no cursor you get the newest page. Pass `nextCursor` back as `cursor` to load older pages, or pass `latestCursor` back as `after` to fetch only messages added since your last read. See [`sessions.messages()`](/sdk/typescript/sessions#messages) for page sizes and cursor rules.

To show an agent's conversations, call `client.sessions.list({ agentId })`. For an inbox across all agents, call `client.sessions.listLatest({ byAgent: true })` to get each agent's latest session in one request.

Files the agent deliberately published during a conversation are [artifacts](/agents/artifacts). List them with `client.artifacts.list({ sessionId })`.

## Saved configuration and user labels [#saved-configuration-and-user-labels]

The first turn saves the agent's current configuration. Later turns in the same session use those saved settings, even after you edit the agent. Call `sessions.get()` to read `agentConfig`; message pages contain only the transcript. See [configuration snapshots](/agents/configuration-snapshots).

Pass `userId` and `metadata` on the first turn to label the session with your end user. The `userId` is fixed once the session starts, and it labels usage for reporting. It does not control access, so your backend still decides who may open which session. See [tenancy and attribution](/platform/tenancy-and-attribution).

## Busy and concurrent sessions [#busy-and-concurrent-sessions]

A session returns [`session_busy`](/api-reference/protocols/errors#session_busy) (HTTP `409`) while a [tool approval](/agents/tools/tool-approvals) is waiting for a decision or an approved call is still running. Show the error and let the user send again later. Deleting a session also returns `session_busy` while an approved call is running.

If two turns run on the same session at once, the first to finish is saved and the other fails instead of merging the histories. Send one turn at a time per session when order matters.

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
