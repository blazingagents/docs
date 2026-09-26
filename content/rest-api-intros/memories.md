---
title: Memories
description: Create, search, update, and delete the notes an agent remembers between sessions.
---

## Overview [#overview]

Memories are short notes an agent keeps between sessions, such as a user's preferences. Each belongs to one agent, and its `userId` cannot change. Use these endpoints to add, search, read, edit, and remove memories. Reading through the API does not change `lastAccessedAt`; the agent's own use does, and that decides which memory is removed first when the agent is full.

## Next [#next]

- [Memory](/agents/memory) to let an agent remember across sessions.
- [Service limits](/api-reference/protocols/service-limits#memories-per-agent) for memory size and count limits.
