---
title: Memories
description: Create, search, update, and delete the notes an agent remembers between sessions.
---

# Memories

## Overview [#overview]

Memories are short notes an agent keeps between sessions, such as a user's preferences. Each belongs to one agent, and its `userId` cannot change. Use these endpoints to add, search, read, edit, and remove memories. Reading through the API does not change `lastAccessedAt`; the agent's own use does, and that decides which memory is removed first when the agent is full.

## Endpoints [#endpoints]

### GET /v1/agents/:agentId/memories [#list-memories]

List an agent's memories.

Lists or searches an agent's memories, newest first, one page at a time. Pass `nextCursor` back as `cursor` for the next page. Reading memories here does not change their `lastAccessedAt`.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `userId` | string | query |  | Return only memories for this end user. Send an empty string for general memories, or leave it out for all memories. |
| `search` | string | query |  | Return only memories whose text matches these words. |
| `cursor` | string | query |  | `nextCursor` from the previous page. Leave it out for the first page. |
| `limit` | integer | query |  | Maximum number of memories to return. 1–100. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. A page of memories.

Response schema: `MemoryList`.

```json
{
  "data": [
    {
      "id": "mem_6Jd2Pq8LzR4wYk1C",
      "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
      "agentId": "ag_4kP9sT2vXq7LmN3a",
      "userId": "user_42",
      "text": "Prefers concise answers.",
      "createdAt": "2026-07-10T10:00:00.000Z",
      "updatedAt": "2026-07-10T10:00:00.000Z",
      "lastAccessedAt": "2026-07-10T10:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/memories" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/memories [#create-memory]

Create a memory.

Adds a memory to an agent. An agent keeps up to 500 memories; when it is full, the least recently used memory is removed to make room. The `Location` header points to the new memory.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `text` | string | body | required | The note to remember, up to 10 KiB. |
| `userId` | string | body |  | The end user this memory belongs to. Only turns that pass the same `userId` see it. Leave it out or send an empty string for a general memory that every turn of the agent sees. It cannot change after creation. Defaults to `""`. |

#### Response

Returns `201 Created` as `application/json`. The created memory. Sets `Location`: URL of the created memory.

Response schema: `Memory`.

```json
{
  "memory": {
    "id": "mem_6Jd2Pq8LzR4wYk1C",
    "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
    "agentId": "ag_4kP9sT2vXq7LmN3a",
    "userId": "user_42",
    "text": "Prefers concise answers.",
    "createdAt": "2026-07-10T10:00:00.000Z",
    "updatedAt": "2026-07-10T10:00:00.000Z",
    "lastAccessedAt": "2026-07-10T10:00:00.000Z"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/memories" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"text":"Prefers concise answers.","userId":"user_42"}'
```

### GET /v1/agents/:agentId/memories/:memoryId [#get-memory]

Get a memory.

Retrieves one memory. Reading it here does not change its `lastAccessedAt`.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent that owns the memory. |
| `memoryId` | string | path | required | ID of the memory. |

#### Response

Returns `200 OK` as `application/json`. The memory.

Response schema: `Memory`.

```json
{
  "memory": {
    "id": "mem_6Jd2Pq8LzR4wYk1C",
    "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
    "agentId": "ag_4kP9sT2vXq7LmN3a",
    "userId": "user_42",
    "text": "Prefers concise answers.",
    "createdAt": "2026-07-10T10:00:00.000Z",
    "updatedAt": "2026-07-10T10:00:00.000Z",
    "lastAccessedAt": "2026-07-10T10:00:00.000Z"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/memories/mem_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PATCH /v1/agents/:agentId/memories/:memoryId [#update-memory]

Update a memory.

Replaces a memory's text and marks it as used now, which moves it to the back of the line for removal when the agent is full. Its `userId` cannot change.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent that owns the memory. |
| `memoryId` | string | path | required | ID of the memory. |
| `text` | string | body | required | Replacement text for the memory, up to 10 KiB. |

#### Response

Returns `200 OK` as `application/json`. The updated memory.

Response schema: `Memory`.

```json
{
  "memory": {
    "id": "mem_6Jd2Pq8LzR4wYk1C",
    "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
    "agentId": "ag_4kP9sT2vXq7LmN3a",
    "userId": "user_42",
    "text": "Prefers answers under five lines.",
    "createdAt": "2026-07-10T10:00:00.000Z",
    "updatedAt": "2026-07-10T10:15:00.000Z",
    "lastAccessedAt": "2026-07-10T10:15:00.000Z"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/memories/mem_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"text":"Prefers answers under five lines."}'
```

### DELETE /v1/agents/:agentId/memories/:memoryId [#delete-memory]

Delete a memory.

Permanently deletes a memory.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent that owns the memory. |
| `memoryId` | string | path | required | ID of the memory. |

#### Response

Returns `204 No Content`. The memory was deleted.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/memories/mem_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Memory](/agents/memory) to let an agent remember across sessions.
- [Service limits](/api-reference/protocols/service-limits#memories-per-agent) for memory size and count limits.
