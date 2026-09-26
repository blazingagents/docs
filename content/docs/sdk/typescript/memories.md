---
title: Memories
description: Add, search, edit, and delete an agent's memories with the TypeScript SDK.
---

# Memories

`client.memories` reads and writes the notes an agent keeps across sessions. Agents save memories themselves through the `memory` tools; use these methods to seed facts, show a user what the agent remembers about them, or remove something. To learn how memory reaches the agent, read [Memory](/agents/memory).

```typescript
await client.memories.create({
  agentId,
  userId: "user_42",
  text: "Prefers concise release notes.",
});

const { data } = await client.memories.list({ agentId, userId: "user_42", search: "release" });
```

Every method takes the owning `agentId` and accepts an optional `abortSignal`.

## How memories are kept [#how-memories-are-kept]

- Each memory belongs to one agent and, through `userId`, to one of your end users or to no one (`""`). Neither can change later.
- Text is up to 10 KiB of UTF-8.
- An agent holds up to 500 memories across all users. When it is full, a new memory replaces the one used least recently.
- `update()` counts as a use. Reading with `list()` or `get()` does not.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Add a memory | `MemoryResponse` |
| [`list()`](#list) | List or search memories | `MemoriesListResponse` |
| [`get()`](#get) | Read one memory | `MemoryResponse` |
| [`update()`](#update) | Replace a memory's text | `MemoryResponse` |
| [`delete()`](#delete) | Delete a memory | `void` |

## Methods [#methods]

### `create()` [#create]

Adds a memory to an agent.

**Signature:** `create(input: CreateMemoryBody & { agentId: string } & ResourceRequestOptions): Promise<MemoryResponse>`

```typescript
const { memory } = await client.memories.create({
  agentId,
  userId: "user_42",
  text: "Prefers concise release notes.",
});
```

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `agentId` | `string` | yes | — | Agent ID (`ag_…`) |
| `text` | `string` | yes | — | The note, up to 10 KiB |
| `userId` | `string` | no | `""` | The end user it is about; `""` for everyone |

Returns [`MemoryResponse`](#memoryresponse). Errors: `validation_failed`, `not_found`.

### `list()` [#list]

Lists an agent's memories, or searches their text.

**Signature:** `list(input: { agentId: string } & MemoriesListOptions): Promise<MemoriesListResponse>`

```typescript
const page = await client.memories.list({ agentId, userId: "user_42", search: "release" });
```

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `agentId` | `string` | yes | — | Agent ID (`ag_…`) |
| `userId` | `string` | no | all users | Only this end user's memories; `""` for the shared ones |
| `search` | `string` | no | — | Full-text search terms |
| `limit` | `number` | no | `50` | 1 to 100 per page |
| `cursor` | `string` | no | — | `nextCursor` from the previous page |

Returns [`MemoriesListResponse`](#memorieslistresponse). Errors: `validation_failed`, `invalid_cursor`, `not_found`.

### `get()` [#get]

Reads one memory.

**Signature:** `get(input: { agentId: string; memoryId: string } & ResourceRequestOptions): Promise<MemoryResponse>`

```typescript
const { memory } = await client.memories.get({ agentId, memoryId });
```

Returns [`MemoryResponse`](#memoryresponse). Errors: `validation_failed`, `not_found`.

### `update()` [#update]

Replaces a memory's text.

**Signature:** `update(input: UpdateMemoryBody & { agentId: string; memoryId: string } & ResourceRequestOptions): Promise<MemoryResponse>`

```typescript
const { memory } = await client.memories.update({
  agentId,
  memoryId,
  text: "Prefers release notes under five lines.",
});
```

`text` is required and replaces the old text. The agent and `userId` stay the same. Returns [`MemoryResponse`](#memoryresponse). Errors: `validation_failed`, `not_found`.

### `delete()` [#delete]

Deletes a memory for good.

**Signature:** `delete(input: { agentId: string; memoryId: string } & ResourceRequestOptions): Promise<void>`

```typescript
await client.memories.delete({ agentId, memoryId });
```

Errors: `validation_failed`, `not_found`.

## Response types [#response-types]

### `MemoryResponse` [#memoryresponse]

`MemoryResponse` is `{ memory: Memory }`.

| `Memory` field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Memory ID (`mem_…`) |
| `tenantId` | `string` | Your tenant ID |
| `agentId` | `string` | The agent that owns it |
| `userId` | `string` | The end user it is about, or `""` |
| `text` | `string` | The note |
| `createdAt` | `string` | ISO 8601 timestamp |
| `updatedAt` | `string` | When the text last changed |
| `lastAccessedAt` | `string` | When it was last used |

### `MemoriesListResponse` [#memorieslistresponse]

```typescript
interface MemoriesListResponse {
  data: Memory[];
  nextCursor: string | null;
}
```

## Next [#next]

- [Memory](/agents/memory)
- [Agents reference](/sdk/typescript/agents#create)
