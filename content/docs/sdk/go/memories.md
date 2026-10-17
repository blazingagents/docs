---
title: Memories
description: Create, search, update, and delete the notes an agent remembers, with the Go SDK.
---

# Memories

`client.Memories` manages the durable notes an agent remembers across sessions.

Examples are function bodies that receive `ctx context.Context`, `client *ba.Client`, `agentID ba.AgentID`, and `sessionID ba.SessionID`, and return an `error`. Every method also takes the per-call options `ba.WithRequestTimeout`, `ba.WithRequestHeader`, `ba.WithClientRequestID`, and `ba.CaptureResponse`.

```go
memory, err := client.Memories.Create(ctx, agentID, ba.CreateMemoryParams{
	Text:   "Prefers release notes under five lines.",
	UserID: new("customer_123"),
})
if err != nil {
	return err
}
fmt.Println(memory.ID)
return nil
```

## How memories are kept [#how-memories-are-kept]

A memory is a text note tied to one agent, optionally scoped to an end user. An empty or omitted `UserID` creates a general memory every turn of the agent sees. An agent holds at most 500 memories; creating one when it is full can remove the memory used least recently.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`Create`](#create) | Store a memory | [`*Memory`](#memory) |
| [`List`](#list), `All` | List an agent's memories | [`*Page[Memory]`](#memory) |
| [`Get`](#get) | Get one memory | [`*Memory`](#memory) |
| [`Update`](#update) | Replace a memory's text | [`*Memory`](#memory) |
| [`Delete`](#delete) | Permanently delete a memory | `error` |

## Methods [#methods]

### `Create` [#create]

Stores a memory. `Text` is non-empty and at most 10 KiB.

```go
memory, err := client.Memories.Create(ctx, agentID, ba.CreateMemoryParams{Text: "Prefers German in replies."})
if err != nil {
	return err
}
fmt.Println(memory.ID)
return nil
```

**Signature:** `func (s *MemoriesService) Create(ctx context.Context, agentID AgentID, params CreateMemoryParams, opts ...RequestOption) (*Memory, error)`

| Field | Type | Description |
| --- | --- | --- |
| `Text` | `string` | The text to remember |
| `UserID` | `*string` | The end user the memory belongs to. Fixed after creation |

Returns [`*ba.Memory`](#memory). Fails with `*ba.APIError` whose `Code` is [`validation_failed`](/api-reference/protocols/errors#validation_failed) or [`not_found`](/api-reference/protocols/errors#not_found).

### `List` [#list]

Lists an agent's memories.

```go
page, err := client.Memories.List(ctx, agentID, ba.ListMemoriesParams{Search: new("release notes")})
if err != nil {
	return err
}
for _, memory := range page.Data {
	fmt.Println(memory.ID, memory.Text)
}
return nil
```

**Signature:** `func (s *MemoriesService) List(ctx context.Context, agentID AgentID, params ListMemoriesParams, opts ...RequestOption) (*Page[Memory], error)`

| Field | Type | Description |
| --- | --- | --- |
| `UserID` | `*string` | Only memories with exactly this `UserID`; `new("")` selects general memories, and nil returns all |
| `Search` | `*string` | Only memories whose text matches these words; an empty string is ignored |
| `Cursor` | `*string` | The `NextCursor` of the previous page |
| `Limit` | `*int` | Page size, 1 to 100; defaults to 50 |

Returns [`*ba.Page[Memory]`](#memory); `All` walks every page lazily. Fails with `validation_failed`, `invalid_cursor`, or `not_found`.

### `Get` [#get]

Gets one memory. Does not change `LastAccessedAt`.

```go
memory, err := client.Memories.Get(ctx, agentID, "mem_0123456789abcdef")
if err != nil {
	return err
}
fmt.Println(memory.Text)
return nil
```

**Signature:** `func (s *MemoriesService) Get(ctx context.Context, agentID AgentID, memoryID MemoryID, opts ...RequestOption) (*Memory, error)`

Returns [`*ba.Memory`](#memory). Fails with `validation_failed` or `not_found`.

### `Update` [#update]

Replaces a memory's whole text. Updates `UpdatedAt` and `LastAccessedAt`.

```go
memory, err := client.Memories.Update(ctx, agentID, "mem_0123456789abcdef", ba.UpdateMemoryParams{
	Text: "Prefers release notes under ten lines.",
})
if err != nil {
	return err
}
fmt.Println(memory.UpdatedAt)
return nil
```

**Signature:** `func (s *MemoriesService) Update(ctx context.Context, agentID AgentID, memoryID MemoryID, params UpdateMemoryParams, opts ...RequestOption) (*Memory, error)`

Returns [`*ba.Memory`](#memory). Fails with `validation_failed` or `not_found`.

### `Delete` [#delete]

Permanently deletes a memory.

```go
return client.Memories.Delete(ctx, agentID, "mem_0123456789abcdef")
```

**Signature:** `func (s *MemoriesService) Delete(ctx context.Context, agentID AgentID, memoryID MemoryID, opts ...RequestOption) error`

Fails with `validation_failed` or `not_found`.

## Response models [#response-models]

### `Memory` [#memory]

| Field | Type | Description |
| --- | --- | --- |
| `ID` | `ba.MemoryID` | Memory ID (`mem_...`) |
| `TenantID` | `ba.TenantID` | Your tenant ID |
| `AgentID` | `ba.AgentID` | The agent it belongs to |
| `UserID` | `string` | End user, or `""` for a general memory |
| `Text` | `string` | The remembered text |
| `LastAccessedAt` | `time.Time` | When it was last used; `Get` and `List` do not count |
| `CreatedAt`, `UpdatedAt` | `time.Time` | Timestamps |

## Next [#next]

- [Memory](/agents/memory)
- [Agents](/sdk/go/agents)
