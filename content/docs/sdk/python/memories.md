---
title: Memories
description: Create, search, update, and delete the notes an agent remembers, with the Python SDK.
---

# Memories

`client.memories` manages the short text notes an agent keeps across sessions. Your code can seed, correct, or remove them, and an agent with memory tools such as `save_memory` can also write them itself. Each memory belongs to one agent and, optionally, one end user.

Examples assume `client = BlazingAgents()` and an `agent_id`. Every method also accepts `extra_headers` and `timeout`. On `AsyncBlazingAgents`, await the same method names and use `async for` with `iter()`.

In a route that serves a signed-in end user, call these methods on [`client.for_user(verified_user_id)`](/sdk/python/client#for-user), which returns only that user's records. The tenant client sees every user's records and is for your backend's administration.

```python
user = client.for_user(verified_user_id)
memory = user.memories.create(
    agent_id=agent_id,
    text="Prefers release notes under five lines.",
).memory
print(memory.id, memory.user_id)
```

## How memories are kept [#how-memories-are-kept]

A memory's `user_id` is fixed when you create it. `""` makes a general memory of the agent; any other value ties it to one end user. A general memory reaches only turns that the tenant client runs, never scoped turns.

A scoped client works only with its user's memories, on agents that belong to that user. It creates memories with its user's `user_id` and never reads the agent's general memories. Turns that the scoped client runs also see only that user's memories. On the tenant client, `user_id` only filters. A turn that the tenant client runs in a session with a `user_id` sees both the general memories and that user's.

An agent holds a [limited number of memories](/api-reference/protocols/service-limits#memories-per-agent) across all its end users. Creating one when the agent is full can remove the memory that was used least recently. Reading with `list()` or `get()` does not count as use; `update()` does.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create a memory | `MemoryResponse` |
| [`list()`](#list) | Get one page of memories | `MemoriesPage` |
| [`iter()`](#iter) | Iterate every memory | `Iterator[Memory]` |
| [`get()`](#get) | Get one memory | `MemoryResponse` |
| [`update()`](#update) | Replace a memory's text | `MemoryResponse` |
| [`delete()`](#delete) | Delete a memory | `None` |

## Methods [#methods]

### `create()` [#create]

Creates a memory for an agent.

```python
memory = client.memories.create(agent_id=agent_id, text="Works in UTC.").memory
```

**Signature:** `create(*, agent_id: str, text: str, user_id=...) -> MemoryResponse`

`text` is non-empty and within the [memory text limit](/api-reference/protocols/service-limits#memory-text). `user_id` defaults to `""` on the tenant client and to the scoped user on a scoped client. Returns `MemoryResponse`, whose `memory` field is the new [`Memory`](#memory). Raises `APIStatusError` with [`validation_failed`](/api-reference/protocols/errors#validation_failed) or [`not_found`](/api-reference/protocols/errors#not_found).

### `list()` [#list]

Gets one page of an agent's memories, optionally filtered or searched.

```python
user = client.for_user(verified_user_id)
page = user.memories.list(agent_id=agent_id, search="release", limit=25)
```

**Signature:** `list(*, agent_id: str, user_id=..., search=..., cursor=..., limit=...) -> MemoriesPage`

| Parameter | Type | Description |
| --- | --- | --- |
| `user_id` | `str` | Tenant client: only memories with exactly this `user_id`; omit for all |
| `search` | `str` | Non-empty full-text query over the memory text |
| `cursor` | `str` | `next_cursor` from the previous page |
| `limit` | `int` | Page size within the [memory page limit](/api-reference/protocols/service-limits#memory-page) |

Returns `MemoriesPage` with `data: list[Memory]` and `next_cursor: str | None`. Raises `validation_failed`, [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor), or `not_found`.

### `iter()` [#iter]

Iterates every matching memory, fetching pages as you go.

```python
for memory in client.for_user(verified_user_id).memories.iter(agent_id=agent_id):
    print(memory.text)
```

**Signature:** `iter(*, agent_id: str, user_id=..., search=..., cursor=..., limit=...) -> Iterator[Memory]`

Takes the same parameters as [`list()`](#list). No request is sent until you start iterating. On the async client, use `async for` directly on `iter(...)`; do not await it.

### `get()` [#get]

Gets one memory.

```python
memory = client.memories.get(agent_id=agent_id, memory_id=memory.id).memory
```

**Signature:** `get(*, agent_id: str, memory_id: str) -> MemoryResponse`

Does not change `last_accessed_at`. Raises `validation_failed` or `not_found`.

### `update()` [#update]

Replaces a memory's whole text.

```python
memory = client.memories.update(
    agent_id=agent_id,
    memory_id=memory.id,
    text="Prefers release notes under three lines.",
).memory
```

**Signature:** `update(*, agent_id: str, memory_id: str, text: str) -> MemoryResponse`

Updates `updated_at` and `last_accessed_at`. The agent and `user_id` stay the same. Raises `validation_failed` or `not_found`.

### `delete()` [#delete]

Permanently deletes a memory.

```python
client.memories.delete(agent_id=agent_id, memory_id=memory.id)
```

**Signature:** `delete(*, agent_id: str, memory_id: str) -> None`

Raises `validation_failed` or `not_found`.

## Response models [#response-models]

### `Memory` [#memory]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `str` | Memory ID (`mem_...`) |
| `tenant_id` | `str` | Your tenant ID |
| `agent_id` | `str` | Owning agent |
| `user_id` | `str` | End user, or `""` for a general memory |
| `text` | `str` | The note |
| `created_at`, `updated_at` | `datetime` | Timestamps |
| `last_accessed_at` | `datetime` | Last time the memory was used |

## Next [#next]

- [Memory guide](/agents/memory)
- [Agents](/sdk/python/agents)
- [Client errors](/sdk/python/client#errors)
