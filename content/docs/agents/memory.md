---
title: Memory
description: Persist Agent-owned notes across Sessions with explicit Tools or automatic context injection.
---

# Memory

Memory is durable Agent-owned text that persists across Sessions. Use it for
recall that changes over time. [Session messages](/platform/sessions-and-turns)
are one conversation's transcript, while [Skills](/agents/skills) are reusable
instruction material.

## Ownership and visibility [#ownership-and-visibility]

Every Memory belongs to one Agent. `userId: ""` creates an Agent-general row;
a non-empty value creates an end-user partition. A Turn sees general rows plus
rows matching its `userId`. A Turn without `userId` sees only general rows.

Tenant API credentials can administer every Memory in that Tenant. Attribution
filters data; it is not end-user authentication or an ACL. See
[Tenancy and Attribution](/platform/tenancy-and-attribution).

## Choose a recall mode [#choose-a-recall-mode]

- `memoryInjectionEnabled` adds visible Memory to every Turn's context.
- The `memory` Tool group exposes `save_memory`, `get_memory`,
  `search_memories`, `update_memory`, and `delete_memory` to the model.

These settings are independent and can be enabled separately or together.
Automatic injection selects newest visible rows up to 4,000 words. The final
row may be truncated to fit.

## Save and recall across Sessions [#save-and-recall-across-sessions]

This example creates a Memory through the SDK and verifies automatic recall in
a second Session with the same Attribution scope:

```typescript
import assert from "node:assert/strict";

const userId = "app-user-42";
await client.agents.update(agentId, { memoryInjectionEnabled: true });

const first = await client.chat({
  agentId,
  userId,
  message: {
    id: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: "I prefer concise status updates." }],
  },
});
await first.toResponse().text();
const firstSessionId = await first.sessionId;

const saved = await client.memories.create(agentId, {
  userId,
  text: "Prefers concise status updates.",
});

const second = await client.chat({
  agentId,
  userId,
  message: {
    id: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: "How should you format my status updates?" }],
  },
});
const reply = await second.toResponse().text();

assert.notEqual(await second.sessionId, firstSessionId);
assert.equal(saved.memory.userId, userId);
assert.match(reply, /concise/i);
```

Omitting `sessionId` creates distinct Sessions. The stored record proves
persistence; the response demonstrates injection into a later Turn.

## Search and retention [#search-and-retention]

```typescript
const matches = await client.memories.list(agentId, {
  userId,
  search: "concise status",
  limit: 10,
});
```

Search uses PostgreSQL lexical full-text matching, not semantic or vector
search. One Agent-wide pool holds at most 500 rows across all end-user
partitions. Creating at capacity evicts the least recently accessed row.
Memory has no time-based retention; delete stale or sensitive rows explicitly.
Deleting the Agent cascades to its Memories.

## SDK and API [#sdk-and-api]

- [TypeScript Memories SDK](/sdk/typescript/memories)
- [Python Memories SDK](/sdk/python/memories)
- Agent settings: [TypeScript](/sdk/typescript/agents) and [Python](/sdk/python/agents)
- [Memories REST API](/api-reference/rest-api/memories)
