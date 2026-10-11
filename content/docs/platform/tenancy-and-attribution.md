---
title: Tenancy and end-user attribution
description: Label sessions, tasks, and usage with your own user IDs so you can filter and report per user.
---

# Tenancy and end-user attribution

Tag each turn with your own user ID, then filter sessions and break down usage per user. Your API key has tenant-wide authority by default. For requests from one signed-in user, scope the client to that user's ID so Blazing Agents checks ownership.

## Label a turn and filter by user [#label-a-turn-and-filter-by-user]

Pass `userId` and optional `metadata` when you call the agent. Later, pass the same `userId` as a filter. Set `AGENT_ID` to an agent with a provider and model, such as the one from the [quickstart](/getting-started/quickstart).

```typescript tab="TypeScript"
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});
const agentId = process.env.AGENT_ID!;
const userId = "app:user-42";

const result = await client.chat({
  agentId,
  message: {
    id: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: "Summarize my open items." }],
  },
  userId,
  metadata: { plan: "pro" },
});
const sessionId = await result.sessionId;
await result.toResponse().text();

const sessions = await client.sessions.list({ agentId, userId });
console.log(sessions.data.some((session) => session.id === sessionId));

const usage = await client.usage.get({ userId, groupBy: "day" });
console.log(usage.totals.inputTokens + usage.totals.outputTokens);
```

```python tab="Python"
import os
import uuid

from blazing_agents import BlazingAgents

client = BlazingAgents()
agent_id = os.environ["AGENT_ID"]
user_id = "app:user-42"

message = {
    "id": str(uuid.uuid4()),
    "role": "user",
    "parts": [{"type": "text", "text": "Summarize my open items."}],
}
with client.chat(
    agent_id=agent_id, message=message, user_id=user_id, metadata={"plan": "pro"}
) as stream:
    session_id = stream.session_id
    for _ in stream:
        pass

sessions = client.sessions.list(agent_id=agent_id, user_id=user_id)
print(any(session.id == session_id for session in sessions.data))

usage = client.usage.get(user_id=user_id, group_by="day")
print(usage.totals.input_tokens + usage.totals.output_tokens)
```

The first line prints `true`: the new session carries the user's label. The second prints the tokens this user used over the last 30 days, the default usage window.

## What carries a user label [#what-carries-a-user-label]

Agents, workspaces, prompts, sessions, tasks, and memories accept `userId` and `metadata`. Task runs, artifacts, and usage records inherit those labels from the work that creates them. A skill takes its agent's label. Account-wide settings such as API keys, providers, and quotas have no user label.

Labels flow to the work they produce:

- A session takes the `userId` and `metadata` of its first turn, and that turn's usage record gets the same values.
- A task run takes its task's label, and so do the run's session, usage, and artifacts.
- An artifact saved during a chat takes the session's label.

Once set, a `userId` never changes. Some resources let you update `metadata` later.

## Filter and report [#filter-and-report]

Session lists, task lists, and usage queries accept a `userId` filter. Usage can also be grouped by `user`, and the usage overview ranks your top users. See [usage and quotas](/platform/usage-and-quotas).

The filter has three modes:

- Omit `userId` to include everything in your account.
- Pass `userId: ""` to select only activity with no user label.
- Pass any other value to select that exact user.

If you forget to pass `userId`, the activity is recorded with the empty label. Decide whether that is acceptable, or require a user ID in your backend.

## User labels and user scope [#user-labels-and-user-scope]

A `userId` in a request body or list filter labels or selects data. It does not change the API key's authority. Derive the user ID from a session your backend verified, then call [`forUser()`](/sdk/typescript/client#for-user) in TypeScript or [`for_user()`](/sdk/python/client#for-user) in Python. The scoped client sends `X-BA-User-Id`, and the API checks that resources belong to that user. A scoped request cannot administer tenant-wide settings.

Blazing Agents does not authenticate your product's users. Your backend still decides whether the signed-in person may use a feature or reach an application record.

Your backend must sign in the user, check that they own the chat or resource, and only then call Blazing Agents with IDs from its own storage.

## Multi-tenant application pattern [#multi-tenant-application-pattern]

When your product serves many customers, derive every ID on the server:

```typescript tab="TypeScript"
import { type UIMessage } from "@blazingagents/sdk";
import { client } from "./client.ts";
import * as app from "./app.ts";

export async function runAuthorizedTurn(
  principal: app.Principal,
  appChatId: string,
  message: UIMessage,
) {
  const chat = await app.resolveAuthorizedChat(principal, appChatId);
  const result = await client.forUser(`app:${principal.subject}`).chat({
    agentId: chat.agentId,
    ...(chat.sessionId ? { sessionId: chat.sessionId } : {}),
    message,
    metadata: { organizationId: principal.organizationId },
  });
  if (!chat.sessionId) {
    await app.saveAuthorizedSession(appChatId, await result.sessionId);
  }
  return result.toResponse();
}
```

```python tab="Python"
from collections.abc import Iterator

import app
from client import client


def run_authorized_turn(
    principal: app.Principal, app_chat_id: str, message: dict
) -> Iterator[bytes]:
    chat = app.resolve_authorized_chat(principal, app_chat_id)
    user_id = f"app:{principal.subject}"
    if chat.session_id:
        stream = client.chat(
            agent_id=chat.agent_id,
            session_id=chat.session_id,
            message=message,
            user_id=user_id,
            metadata={"organizationId": principal.organization_id},
        )
    else:
        stream = client.chat(
            agent_id=chat.agent_id,
            message=message,
            user_id=user_id,
            metadata={"organizationId": principal.organization_id},
        )
        app.save_authorized_session(app_chat_id, stream.session_id)
    with stream:
        yield from stream
```

`app` is your own code. `resolveAuthorizedChat` throws unless the signed-in principal owns the chat, and it returns the agent and session IDs from your database. The TypeScript client also scopes the Blazing Agents request to that principal. Test that one user cannot reach another user's chat ID.

## Production notes [#production-notes]

- Use a stable, opaque `userId` such as `app:<internal id>`. Keep the mapping to real people in your own system.
- Treat `metadata` as product data. Keep personal information out of it where you can, and validate it in your backend.
- Derive user scope from your verified session for end-user requests. A matching list filter is not an authorization check.

## Next [#next]

- [Usage and quotas](/platform/usage-and-quotas) to report per user and set monthly ceilings.
- [Security and credentials](/platform/security-and-credentials) to keep your API key on the server.
- [Bill your users for model tokens](/platform/monetization) using the same `userId`.
