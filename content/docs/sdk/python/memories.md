---
title: Memories
description: Create, search, update, and delete the notes an agent remembers, with the Python SDK.
---

# Memories

`client.memories` manages the short text notes an agent keeps across sessions. Your code can seed, correct, or remove them, and the agent can also write them itself with its `memory` tools. Each memory belongs to one agent and, optionally, one end user.

Examples assume `client = BlazingAgents()` and an `agent_id`. Every method also accepts `extra_headers` and `timeout`. On `AsyncBlazingAgents`, await the same method names and use `async for` with `iter()`.

```python
memory = client.memories.create(
    agent_id=agent_id,
    text="Prefers release notes under five lines.",
    user_id="customer_123",
).memory
print(memory.id)
```

## How memories are kept [#how-memories-are-kept]

A memory's `user_id` is fixed when you create it. `""` means the memory applies to every user of the agent; any other value ties it to one end user. `user_id` filters memories; it is not an access control.

An agent holds at most 500 memories in total. Creating one when the agent is full can remove the memory that was used least recently. Reading with `list()` or `get()` does not count as use; `update()` does.

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

`text` is non-empty and at most 10 KiB. `user_id` defaults to `""`. Returns `MemoryResponse`, whose `memory` field is the new [`Memory`](#memory). Raises `APIStatusError` with [`validation_failed`](/api-reference/protocols/errors#validation_failed) or [`not_found`](/api-reference/protocols/errors#not_found).

### `list()` [#list]

Gets one page of an agent's memories, optionally filtered or searched.

```python
page = client.memories.list(agent_id=agent_id, user_id="customer_123", search="release", limit=25)
```

**Signature:** `list(*, agent_id: str, user_id=..., search=..., cursor=..., limit=...) -> MemoriesPage`

| Parameter | Type | Description |
| --- | --- | --- |
| `user_id` | `str` | Only memories with exactly this `user_id`; omit for all |
| `search` | `str` | Non-empty full-text query over the memory text |
| `cursor` | `str` | `next_cursor` from the previous page |
| `limit` | `int` | 1 to 100, default 50 |

Returns `MemoriesPage` with `data: list[Memory]` and `next_cursor: str | None`. Raises `validation_failed`, [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor), or `not_found`.

### `iter()` [#iter]

Iterates every matching memory, fetching pages as you go.

```python
for memory in client.memories.iter(agent_id=agent_id, user_id="customer_123"):
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
| `user_id` | `str` | End user, or `""` for every user |
| `text` | `str` | The note |
| `created_at`, `updated_at` | `datetime` | Timestamps |
| `last_accessed_at` | `datetime` | Last time the memory was used |

## Next [#next]

- [Memory guide](/agents/memory)
- [Agents](/sdk/python/agents)
- [Client errors](/sdk/python/client#errors)
