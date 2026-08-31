---
title: Memories
description: Create, search, update, and delete Agent-owned Memory.
---

# Memories

## Overview [#overview]

Memory is durable Agent-owned text with immutable `userId` Attribution. Use these endpoints to create, search, inspect, update, or delete Memory; administrative reads never update `lastAccessedAt`, while Agent memory use affects eviction recency.

## Endpoints [#endpoints]

### POST /v1/agents/:agentId/memories [#create-memory]

Creates one text Memory for an Agent. At the 500-Memory cap, the least recently accessed Memory may be evicted.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |

| Location | Field          | Required | Description                              |
| -------- | -------------- | -------- | ---------------------------------------- |
| Body     | `text`         | yes      | Non-empty UTF-8 text, at most 10 KiB.    |
| Body     | `userId`       | no       | Immutable Attribution; defaults to `""`. |
| Header   | `Content-Type` | yes      | `application/json`.                      |

#### Response

| Status        | Body                                                                       | Lifecycle effect                                                                           |
| ------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `201 Created` | [MemoryResponse](/api-reference/protocols/objects-and-schemas#memory-response) | Creates the Memory and may evict the least-recently-accessed row at the 500-per-Agent cap. |

The response includes `Location: /v1/agents/:agentId/memories/:memoryId`.

Response schema: [`memoryResponseSchema`](/api-reference/protocols/objects-and-schemas#memory-response).

#### Errors

`400 validation_failed`; `404 not_found` for the Agent. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/memories" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"text":"Prefers concise answers.","userId":"user-42"}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/memories#create) / [Python](/sdk/python/memories#create). See [Memory](/agents/memory) and [Add durable Memory](/agents/memory).

### GET /v1/agents/:agentId/memories [#list-memories]

Lists or searches an Agent's Memory without updating access recency.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |

| Location | Field    | Required | Description                             |
| -------- | -------- | -------- | --------------------------------------- |
| Query    | `userId` | no       | Exact Attribution filter.               |
| Query    | `search` | no       | Non-empty full-text search.             |
| Query    | `cursor` | no       | Opaque cursor.                          |
| Query    | `limit`  | no       | Page size, default `50`, maximum `100`. |

#### Response

| Status   | Body                                                                                    | Lifecycle effect                                           |
| -------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `200 OK` | [MemoriesListResponse](/api-reference/protocols/objects-and-schemas#memories-list-response) | Read-only; list and search do not update `lastAccessedAt`. |

Use `nextCursor` for the next page.

Response schema: [`memoriesListResponseSchema`](/api-reference/protocols/objects-and-schemas#memories-list-response).

#### Errors

`400 validation_failed` for invalid parameters; `400 invalid_cursor` for an
opaque cursor that cannot be decoded; and `404 not_found` for the Agent. See
[REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --get "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/memories" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --data-urlencode "userId=user-42" \
  --data-urlencode "search=concise"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/memories#list) / [Python](/sdk/python/memories#list). See [Memory](/agents/memory) and [Add durable Memory](/agents/memory).

### GET /v1/agents/:agentId/memories/:memoryId [#get-memory]

Gets one Memory without updating its access recency.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |
| Path     | `memoryId`      | yes      | Memory ID (`mem_…`).                      |

#### Response

| Status   | Body                                                                       | Lifecycle effect                             |
| -------- | -------------------------------------------------------------------------- | -------------------------------------------- |
| `200 OK` | [MemoryResponse](/api-reference/protocols/objects-and-schemas#memory-response) | Read-only; does not update `lastAccessedAt`. |

Response schema: [`memoryResponseSchema`](/api-reference/protocols/objects-and-schemas#memory-response).

#### Errors

`404 not_found` for an unknown Agent/Memory pair. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/memories/mem_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/memories#get) / [Python](/sdk/python/memories#get). See [Memory](/agents/memory) and [Add durable Memory](/agents/memory).

### PATCH /v1/agents/:agentId/memories/:memoryId [#update-memory]

Replaces one Memory's text and updates its access time.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |
| Path     | `memoryId`      | yes      | Memory ID (`mem_…`).                      |

| Location | Field          | Required | Description                       |
| -------- | -------------- | -------- | --------------------------------- |
| Body     | `text`         | yes      | Replacement text, at most 10 KiB. |
| Header   | `Content-Type` | yes      | `application/json`.               |

#### Response

| Status   | Body                                                                       | Lifecycle effect                                      |
| -------- | -------------------------------------------------------------------------- | ----------------------------------------------------- |
| `200 OK` | [MemoryResponse](/api-reference/protocols/objects-and-schemas#memory-response) | Updates text and access time; `userId` cannot change. |

Response schema: [`memoryResponseSchema`](/api-reference/protocols/objects-and-schemas#memory-response).

#### Errors

`400 validation_failed`; `404 not_found`. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/memories/mem_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"text":"Prefers answers under five lines."}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/memories#update) / [Python](/sdk/python/memories#update). See [Memory](/agents/memory) and [Add durable Memory](/agents/memory).

### DELETE /v1/agents/:agentId/memories/:memoryId [#delete-memory]

Permanently deletes one Memory.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |
| Path     | `memoryId`      | yes      | Memory ID (`mem_…`).                      |

#### Response

| Status           | Body  | Lifecycle effect             |
| ---------------- | ----- | ---------------------------- |
| `204 No Content` | Empty | Permanently removes the row. |

#### Errors

`404 not_found`. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/memories/mem_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/memories#delete) / [Python](/sdk/python/memories#delete). See [Memory](/agents/memory) and [Add durable Memory](/agents/memory).

## Related [#related]

- [TypeScript SDK](/sdk/typescript)
- [Python SDK Memories](/sdk/python/memories)
- [Objects and schemas](/api-reference/protocols/objects-and-schemas)
- [Errors](/api-reference/protocols/errors)
