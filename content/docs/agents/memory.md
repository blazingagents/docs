---
title: Memory
description: Let an agent remember facts about each user across sessions.
---

# Memory

Memory lets an agent keep short notes that outlast a single conversation, such as "prefers concise status updates" or "works in the Berlin office". A note can belong to the whole agent or to one of your end users. The agent can save and look up notes itself, or you can have every turn start with the relevant notes already in context.

Memory is for facts that change over time. A [session's messages](/platform/sessions-and-turns) cover one conversation, and [skills](/agents/skills) hold reusable instructions.

## Remember a user's preference [#remember-a-users-preference]

This turns on automatic memory, saves a note for one user, and then asks a fresh question as that user. Set `AGENT_ID` to one of your `ag_...` agents.

```typescript tab="TypeScript" tab-group="sdk-language"
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});
const agentId = process.env.AGENT_ID!;
const userId = "app-user-42";

await client.agents.update({ agentId, memoryInjectionEnabled: true });

await client.memories.create({
  agentId,
  userId,
  text: "Prefers concise status updates.",
});

const result = await client.completion({
  agentId,
  userId,
  prompt: "How should you format my status updates?",
});
console.log(await result.text);
```

```python tab="Python"
import os

from blazing_agents import BlazingAgents

client = BlazingAgents()
agent_id = os.environ["AGENT_ID"]
user_id = "app-user-42"

client.agents.update(agent_id, memory_injection_enabled=True)

client.memories.create(
    agent_id=agent_id,
    user_id=user_id,
    text="Prefers concise status updates.",
)

print(
    client.completion(
        agent_id=agent_id,
        user_id=user_id,
        prompt="How should you format my status updates?",
    )
)
```

The answer mentions keeping updates concise, even though the question never said so. The same note reaches every later turn, in any session, that passes `userId: "app-user-42"`.

## Who sees which notes [#who-sees-which-notes]

Each note belongs to one agent. A note saved with `userId: ""` is general and every turn of that agent sees it. A note saved with a user ID is visible only to turns that pass the same `userId`. A turn with no `userId` sees only general notes.

A `userId` sorts notes. It is not a security boundary: a tenant-wide API key can read and change every note in your account, so your backend decides which user is which. See [tenancy and attribution](/platform/tenancy-and-attribution).

## Choose how the agent recalls notes [#choose-how-the-agent-recalls-notes]

- **Automatic.** With `memoryInjectionEnabled`, each turn starts with the newest visible notes, up to 4,000 words. The last note that fits may be cut short.
- **Tools.** The `memory` tool group lets the agent save, look up, search, update, and delete notes on its own during a turn. Add it with `tools` on the [agent](/agents/agents#change-an-agent).

Use either one or both. Automatic recall suits a handful of stable preferences. Tools suit an agent that should decide what is worth remembering.

## Search and clean up [#search-and-clean-up]

List a user's notes, optionally filtered by words they contain:

```typescript tab="TypeScript" tab-group="sdk-language"
const { data } = await client.memories.list({
  agentId,
  userId,
  search: "status updates",
  limit: 10,
});
for (const memory of data) console.log(memory.id, memory.text);
```

```python tab="Python"
page = client.memories.list(
    agent_id=agent_id, user_id=user_id, search="status updates", limit=10
)
for memory in page.data:
    print(memory.id, memory.text)
```

Search matches words, not meaning, so "status updates" finds notes containing those words but not "progress reports".

Each agent holds up to 500 notes across all its users. Saving a note at that limit removes the one used least recently. Notes never expire on their own, so delete stale or sensitive notes yourself. Deleting the agent deletes its notes.

## Next [#next]

- [Tenancy and attribution](/platform/tenancy-and-attribution) to pass the right `userId` for each end user.
- [Built-in tools](/agents/tools/built-in-tools) for what the `memory` tools can do.
- Memories SDK reference for [TypeScript](/sdk/typescript/memories) or [Python](/sdk/python/memories).
