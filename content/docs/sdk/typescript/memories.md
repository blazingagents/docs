---
title: Memories
description: Create, search, update, and delete Agent-owned persistent Memories.
---

# Memories

`client.memories` manages durable text owned by one Agent. A Memory's `userId` Attribution is fixed at creation; use `""` for Agent-general Memory.

## Overview [#overview]

Every method is nested under an `agentId`. A Memory cannot be moved to another Agent or End-user. Creating beyond the Agent's 500-Memory pool may evict the least recently accessed Memory across all `userId` partitions.

Administrative `list()` and `get()` calls do not change `lastAccessedAt`. `update()` replaces the complete text and does update access recency.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create an Agent-owned Memory | `MemoryResponse` |
| [`list()`](#list) | List or search an Agent's Memories | `MemoriesListResponse` |
| [`get()`](#get) | Retrieve one Memory | `MemoryResponse` |
| [`update()`](#update) | Replace a Memory's text | `MemoryResponse` |
| [`delete()`](#delete) | Permanently delete a Memory | `void` |

## Methods [#methods]

### `create()` [#create]

Creates a text Memory under one Agent.

**Signature:** `create(agentId: string, body: CreateMemoryBody): Promise<MemoryResponse>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Owning Agent ID (`ag_…`) |
| `body.text` | `string` | yes | Non-empty UTF-8 text, at most 10 KiB |
| `body.userId` | `string` | no | Immutable Attribution; defaults to `""` |

```typescript
const { memory } = await client.memories.create(agentId, {
  text: "Prefers concise release notes.",
  userId: "user-42",
});
```

Returns [`MemoryResponse`](#memoryresponse). Raises `validation_failed` for invalid input or `not_found` when the Agent is unavailable. See [`POST .../memories`](/api-reference/rest-api/memories#create-memory).

### `list()` [#list]

Lists or full-text searches an Agent's Memories. Omit `userId` to include every Attribution partition; pass `""` to select Agent-general Memory.

**Signature:** `list(agentId: string, options?: MemoriesListOptions): Promise<MemoriesListResponse>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Owning Agent ID (`ag_…`) |
| `options.userId` | `string` | no | Exact Attribution filter |
| `options.search` | `string` | no | Non-empty full-text query |
| `options.cursor` | `string` | no | Opaque cursor from `nextCursor` |
| `options.limit` | `number` | no | Page size, default 50 and maximum 100 |

```typescript
const page = await client.memories.list(agentId, {
  userId: "user-42",
  search: "release",
  limit: 25,
});
```

Returns [`MemoriesListResponse`](#memorieslistresponse). Raises `validation_failed` for invalid filters, `invalid_cursor` for an unusable cursor, or `not_found` when the Agent is unavailable. See [`GET .../memories`](/api-reference/rest-api/memories#list-memories).

### `get()` [#get]

Retrieves one Memory without changing its access recency.

**Signature:** `get(agentId: string, memoryId: string): Promise<MemoryResponse>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Owning Agent ID (`ag_…`) |
| `memoryId` | `string` | yes | Memory ID (`mem_…`) |

```typescript
const { memory } = await client.memories.get(agentId, memoryId);
```

Returns [`MemoryResponse`](#memoryresponse). Raises `validation_failed` for malformed IDs or `not_found` when the Agent/Memory pair is unavailable. See [`GET .../memories/:memoryId`](/api-reference/rest-api/memories#get-memory).

### `update()` [#update]

Replaces a Memory's complete text and updates `lastAccessedAt`. Its Agent and `userId` remain unchanged.

**Signature:** `update(agentId: string, memoryId: string, body: UpdateMemoryBody): Promise<MemoryResponse>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Owning Agent ID (`ag_…`) |
| `memoryId` | `string` | yes | Memory ID (`mem_…`) |
| `body.text` | `string` | yes | Replacement text, at most 10 KiB |

```typescript
const { memory } = await client.memories.update(agentId, memoryId, {
  text: "Prefers release notes under five lines.",
});
```

Returns [`MemoryResponse`](#memoryresponse). Raises `validation_failed` for malformed IDs or text and `not_found` when the Agent/Memory pair is unavailable. See [`PATCH .../memories/:memoryId`](/api-reference/rest-api/memories#update-memory).

### `delete()` [#delete]

Permanently deletes one Memory.

**Signature:** `delete(agentId: string, memoryId: string): Promise<void>`

```typescript
await client.memories.delete(agentId, memoryId);
```

Returns `void`. Raises `validation_failed` for malformed IDs or `not_found` when the Agent/Memory pair is unavailable. See [`DELETE .../memories/:memoryId`](/api-reference/rest-api/memories#delete-memory).

## Response types [#response-types]

### `MemoryResponse` [#memoryresponse]

`MemoryResponse` is `{ memory: Memory }`.

| `Memory` field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Memory ID (`mem_…`) |
| `tenantId` | `string` | Owning Tenant ID |
| `agentId` | `string` | Owning Agent ID |
| `userId` | `string` | Immutable End-user Attribution or `""` |
| `text` | `string` | Stored text |
| `createdAt` | `string` | ISO 8601 creation timestamp |
| `updatedAt` | `string` | ISO 8601 content update timestamp |
| `lastAccessedAt` | `string` | ISO 8601 eviction-recency timestamp |

### `MemoriesListResponse` [#memorieslistresponse]

```typescript
interface MemoriesListResponse {
  data: Memory[];
  nextCursor: string | null;
}
```

Pass a non-null `nextCursor` back to `list()` for the next page. See the canonical [Memory schemas](/api-reference/protocols/objects-and-schemas#memory-response).

## Errors [#errors]

SDK request failures throw `BlazingAgentsError`. Branch on its stable `code`, not its message.

| Code | Applies to | Action |
| --- | --- | --- |
| `validation_failed` | All methods; list filters | Correct malformed IDs, empty/oversized text, limits, or search |
| `invalid_cursor` | `list()` | Restart pagination without the stale or malformed cursor |
| `not_found` | All methods | Check the Agent and Agent/Memory ownership pair |

Authentication, transport, malformed-response, and service failures can also throw. See [SDK errors](/api-reference/protocols/errors).

## End-to-end workflow [#end-to-end-workflow]

Create attributed Memory, find and update it, then delete it:

```typescript
import { BlazingAgents } from "@blazing-agents/sdk";

const client = new BlazingAgents({ apiKey: process.env.BLAZING_AGENTS_API_KEY! });
const agentId = "ag_0123456789abcdef";

const { memory } = await client.memories.create(agentId, {
  userId: "user-42",
  text: "Prefers concise release notes.",
});

const page = await client.memories.list(agentId, {
  userId: "user-42",
  search: "release",
});

const updated = await client.memories.update(agentId, memory.id, {
  text: "Prefers release notes under five lines.",
});

console.log(page.data.length, updated.memory.lastAccessedAt);
await client.memories.delete(agentId, memory.id);
```

## Related [#related]

- [Memory](/agents/memory)
- [Add durable Memory](/agents/memory)
- [REST Memories](/api-reference/rest-api/memories)
- [Pagination and filtering](/api-reference/protocols/pagination-and-filtering)
