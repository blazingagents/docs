---
title: Memories
description: Create, search, iterate, update, and delete Agent-owned Memories with the Python SDK.
---

# Memories

`client.memories` manages durable text notes owned by exactly one Agent. The
asynchronous client uses the same method names; await request methods and use
`async for` for lazy iteration.

## Overview [#overview]

A Memory's `user_id` Attribution is fixed at creation. `""` means
Agent-general; a non-empty value partitions the Memory to one End-user.
Attribution is a filtering dimension, not access control. Memories are
database rows, never files or cross-Agent storage.

An Agent has one 500-row pool across all Attribution partitions. Creating at
capacity may evict the least recently accessed row. Administrative `list()`
and `get()` do not update access recency; `update()` does.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create an Agent-owned Memory | `MemoryResponse` |
| [`list()`](#list) | Read one filtered page | `MemoriesPage` |
| [`iter()`](#iter) | Lazily iterate filtered pages | `Iterator[Memory]` |
| [`get()`](#get) | Retrieve one Memory | `MemoryResponse` |
| [`update()`](#update) | Replace its complete text | `MemoryResponse` |
| [`delete()`](#delete) | Permanently delete it | `None` |

## Methods [#methods]

### `create()` [#create]

**Signature:** `create(*, agent_id: str, text: str, user_id: str = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> MemoryResponse`

Creates a non-empty text Memory of at most 10 KiB. Omitted `user_id` becomes
`""`; it cannot be changed later.

```python
created = client.memories.create(
    agent_id=agent_id,
    text="Prefers release notes under five lines.",
    user_id="user-42",
)
memory = created.memory
```

See [`POST .../memories`](/api-reference/rest-api/memories#create-memory).

### `list()` [#list]

**Signature:** `list(*, agent_id: str, user_id: str = ..., search: str = ..., cursor: str = ..., limit: int = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> MemoriesPage`

Returns one page with `data: list[Memory]` and
`next_cursor: str | None`. Omit `user_id` for every partition or pass an exact
value. `search` is a non-empty lexical full-text query. `limit` defaults to 50
and accepts 1 through 100.

```python
page = client.memories.list(
    agent_id=agent_id,
    user_id="user-42",
    search="release",
    limit=25,
)
```

Failures include `validation_failed`, `invalid_cursor`, and `not_found`. See
[`GET .../memories`](/api-reference/rest-api/memories#list-memories).

### `iter()` [#iter]

**Signature:** `iter(*, agent_id: str, user_id: str = ..., search: str = ..., cursor: str = ..., limit: int = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Iterator[Memory]`

Returns a lazy iterator using the same filters as [`list()`](#list). It fetches
the first page only when iteration starts and later pages only as needed.

```python
for memory in client.memories.iter(agent_id=agent_id, user_id="user-42"):
    print(memory.text)

async for memory in async_client.memories.iter(
    agent_id=agent_id,
    user_id="user-42",
):
    print(memory.text)
```

The asynchronous return is `AsyncIterator[Memory]`; do not await the iterator
factory. Page requests can raise the same errors as `list()`.

### `get()` [#get]

**Signature:** `get(*, agent_id: str, memory_id: str, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> MemoryResponse`

Retrieves the Agent/Memory pair without changing `last_accessed_at`. Failures
include `validation_failed` and `not_found`. See
[`GET .../memories/:memoryId`](/api-reference/rest-api/memories#get-memory).

### `update()` [#update]

**Signature:** `update(*, agent_id: str, memory_id: str, text: str, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> MemoryResponse`

Replaces the complete text and advances `updated_at` and
`last_accessed_at`. Agent ownership and Attribution remain unchanged. See
[`PATCH .../memories/:memoryId`](/api-reference/rest-api/memories#update-memory).

### `delete()` [#delete]

**Signature:** `delete(*, agent_id: str, memory_id: str, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> None`

Permanently deletes the Memory and returns `None`. See
[`DELETE .../memories/:memoryId`](/api-reference/rest-api/memories#delete-memory).

## Response models and errors [#response-models-and-errors]

`MemoryResponse.memory` is a `Memory` with `id`, `tenant_id`, `agent_id`,
`user_id`, `text`, `created_at`, `updated_at`, and `last_accessed_at`.
`MemoriesPage` adds cursor pagination. These Pydantic v2 models preserve
unknown fields and expose a non-serialized `_request_id`.

Every method accepts `extra_headers` and `timeout`. API failures raise
`APIStatusError`; connection and timeout failures raise `APIConnectionError`
and `APITimeoutError`. See [Python errors](/sdk/python/client#errors).

## Related [#related]

- [Memory capability](/agents/memory)
- [Add durable Memory](/agents/memory)
- [REST Memories](/api-reference/rest-api/memories)
- [TypeScript Memories](/sdk/typescript/memories)
