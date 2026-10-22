---
title: Memories
description: Create, search, update, and delete the notes an agent remembers, with the Rust SDK.
---

# Memories

`client.memories()` manages the durable notes an agent remembers across sessions.

Examples receive a `client: blazing_agents::Client`. Every call also takes the `with_timeout`, `without_timeout`, `with_header`, and `with_client_request_id` transport options.

In a route that serves a signed-in end user, call these methods on the [scoped client](/sdk/rust/client#for-user) from `client.for_user()`, which returns only that user's memories. The tenant client sees every user's memories and is for your backend's administration.

```rust
let user = client.for_user("user_0123456789abcdef")?;
let memory = user
    .memories()
    .create(
        "ag_0123456789abcdef",
        "Prefers release notes under five lines.",
    )
    .await?;
println!("{}", memory.id);
```

## How memories are kept [#how-memories-are-kept]

A memory is a text note tied to one agent, optionally scoped to an end user. A memory created on a `UserClient` belongs to its user. On the tenant client, an empty or omitted `user_id` creates a general memory. Turns on the tenant client see the general memories and those of the session's end user. Turns on a `UserClient` see only that user's memories, never the general ones. An agent has a [memory limit](/api-reference/protocols/service-limits#memories-per-agent); creating one when it is full can remove the memory used least recently.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Store a memory | [`Memory`](#memory) |
| [`list()`](#list) | List an agent's memories | [`Page<Memory>`](#memory) |
| [`get()`](#get) | Get one memory | [`Memory`](#memory) |
| [`update()`](#update) | Replace a memory's text | [`Memory`](#memory) |
| [`delete()`](#delete) | Permanently delete a memory | `()` |

## Methods [#methods]

### `create()` [#create]

Stores a memory. `text` is non-empty and within the [memory text limit](/api-reference/protocols/service-limits#memory-text). This tenant-client example creates a general memory.

```rust
let memory = client
    .memories()
    .create("ag_0123456789abcdef", "Prefers German in replies.")
    .await?;
```

**Signature:** `create(agent_id: impl Into<AgentId>, text: impl Into<String>) -> Call<CreateMemory>`

| Setter | Type | Description |
| --- | --- | --- |
| `user_id` | `impl Into<String>` | The end user the memory belongs to. Fixed after creation |

Awaiting returns [`Memory`](#memory). Fails with `Error::Api` whose code is [`validation_failed`](/api-reference/protocols/errors#validation_failed) or [`not_found`](/api-reference/protocols/errors#not_found).

### `list()` [#list]

Lists an agent's memories.

```rust
let user = client.for_user("user_0123456789abcdef")?;
let page = user
    .memories()
    .list("ag_0123456789abcdef")
    .search("release notes")
    .await?;
for memory in &page.data {
    println!("{} {}", memory.id, memory.text);
}
```

**Signature:** `list(agent_id: impl Into<AgentId>) -> Call<ListMemories>`

| Setter | Type | Description |
| --- | --- | --- |
| `user_id` | `impl Into<String>` | Only memories with exactly this `user_id`; `""` selects general memories, and unset returns all. A `UserClient` returns only its user's memories |
| `search` | `impl Into<String>` | Only memories whose text matches these words; an empty string is ignored |
| `limit` | `u8` | Page size, within the [memory page limit](/api-reference/protocols/service-limits#memory-page) |

Awaiting returns [`Page<Memory>`](#memory); `.items()` and `.pages()` walk every page lazily. Fails with `validation_failed`, `invalid_cursor`, or `not_found`.

### `get()` [#get]

Gets one memory. Does not change `last_accessed_at`.

```rust
let user = client.for_user("user_0123456789abcdef")?;
let memory = user
    .memories()
    .get("ag_0123456789abcdef", "mem_0123456789abcdef")
    .await?;
```

**Signature:** `get(agent_id: impl Into<AgentId>, memory_id: impl Into<MemoryId>) -> Call<GetMemory>`

Awaiting returns [`Memory`](#memory). Fails with `validation_failed` or `not_found`.

### `update()` [#update]

Replaces a memory's whole text. Updates `updated_at` and `last_accessed_at`.

```rust
let memory = client
    .memories()
    .update(
        "ag_0123456789abcdef",
        "mem_0123456789abcdef",
        "Prefers release notes under ten lines.",
    )
    .await?;
```

**Signature:** `update(agent_id: impl Into<AgentId>, memory_id: impl Into<MemoryId>, text: impl Into<String>) -> Call<UpdateMemory>`

Awaiting returns [`Memory`](#memory). Fails with `validation_failed` or `not_found`.

### `delete()` [#delete]

Permanently deletes a memory.

```rust
client
    .memories()
    .delete("ag_0123456789abcdef", "mem_0123456789abcdef")
    .await?;
```

**Signature:** `delete(agent_id: impl Into<AgentId>, memory_id: impl Into<MemoryId>) -> Call<DeleteMemory>`

Fails with `validation_failed` or `not_found`.

## Response models [#response-models]

### `Memory` [#memory]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `MemoryId` | Memory ID (`mem_...`) |
| `tenant_id` | `TenantId` | Your tenant ID |
| `agent_id` | `AgentId` | The agent it belongs to |
| `user_id` | `String` | End user, or `""` for a general memory |
| `text` | `String` | The remembered text |
| `last_accessed_at` | `Timestamp` | When it was last used; `get` and `list` do not count |
| `created_at`, `updated_at` | `Timestamp` | Timestamps |

## Next [#next]

- [Memory](/agents/memory)
- [Agents](/sdk/rust/agents)
