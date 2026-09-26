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

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `userId` | string | query |  |  |
| `search` | string | query |  |  |
| `cursor` | string | query |  |  |
| `limit` | integer | query |  | 1–100. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. A page of memories.

Response schema: `MemoryList`.

```json
{
  "data": [
    {
      "id": "mem_1234567890ABCDEF",
      "tenantId": "ten_1234567890ABCDEF",
      "agentId": "ag_1234567890ABCDEF",
      "userId": "string",
      "text": "string",
      "createdAt": "2026-07-10T10:00:00Z",
      "updatedAt": "2026-07-10T10:00:00Z",
      "lastAccessedAt": "2026-07-10T10:00:00Z"
    }
  ],
  "nextCursor": "string"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/memories" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/memories [#create-memory]

Create a memory.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `text` | string | body | required |  |
| `userId` | string | body |  | Defaults to `""`. |

#### Response

Returns `201 Created` as `application/json`. The created memory. Sets `Location`: URL of the created memory resource.

Response schema: `Memory`.

```json
{
  "memory": {
    "id": "mem_1234567890ABCDEF",
    "tenantId": "ten_1234567890ABCDEF",
    "agentId": "ag_1234567890ABCDEF",
    "userId": "string",
    "text": "string",
    "createdAt": "2026-07-10T10:00:00Z",
    "updatedAt": "2026-07-10T10:00:00Z",
    "lastAccessedAt": "2026-07-10T10:00:00Z"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/memories" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"text":"string"}'
```

### GET /v1/agents/:agentId/memories/:memoryId [#get-memory]

Get a memory.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `memoryId` | string | path | required | `mem_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The memory.

Response schema: `Memory`.

```json
{
  "memory": {
    "id": "mem_1234567890ABCDEF",
    "tenantId": "ten_1234567890ABCDEF",
    "agentId": "ag_1234567890ABCDEF",
    "userId": "string",
    "text": "string",
    "createdAt": "2026-07-10T10:00:00Z",
    "updatedAt": "2026-07-10T10:00:00Z",
    "lastAccessedAt": "2026-07-10T10:00:00Z"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/memories/mem_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PATCH /v1/agents/:agentId/memories/:memoryId [#update-memory]

Update a memory.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `memoryId` | string | path | required | `mem_…` ID. |
| `text` | string | body | required |  |

#### Response

Returns `200 OK` as `application/json`. The updated memory.

Response schema: `Memory`.

```json
{
  "memory": {
    "id": "mem_1234567890ABCDEF",
    "tenantId": "ten_1234567890ABCDEF",
    "agentId": "ag_1234567890ABCDEF",
    "userId": "string",
    "text": "string",
    "createdAt": "2026-07-10T10:00:00Z",
    "updatedAt": "2026-07-10T10:00:00Z",
    "lastAccessedAt": "2026-07-10T10:00:00Z"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/memories/mem_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"text":"string"}'
```

### DELETE /v1/agents/:agentId/memories/:memoryId [#delete-memory]

Delete a memory.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `memoryId` | string | path | required | `mem_…` ID. |

#### Response

Returns `204 No Content`. Deleted.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/memories/mem_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Memory](/agents/memory) to let an agent remember across sessions.
- [Service limits](/api-reference/protocols/service-limits#memories-per-agent) for memory size and count limits.
