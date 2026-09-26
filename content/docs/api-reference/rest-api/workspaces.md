---
title: Workspaces
description: Create, list, inspect, update, and delete the private file systems your agents work in.
---

# Workspaces

## Overview [#overview]

A workspace is a private file system your agents keep between sessions. Several
agents can share one. These endpoints manage the workspace record: its name,
metadata, and network policy. None of them start the workspace or add compute
cost. The workspace starts only when an agent first reads, writes, or runs
something in it. Every request is scoped to your tenant.

## Endpoints [#endpoints]

### GET /v1/workspaces [#list-workspaces]

List workspaces.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `cursor` | string | query |  |  |
| `limit` | integer | query |  | 1–200. Defaults to `50`. |
| `userId` | string | query |  |  |

#### Response

Returns `200 OK` as `application/json`. A page of workspaces.

Response schema: `WorkspaceList`.

```json
{
  "data": [
    {
      "id": "ws_1234567890ABCDEF",
      "tenantId": "ten_1234567890ABCDEF",
      "name": "string",
      "userId": "string",
      "metadata": {},
      "networkPolicy": {
        "mode": "unrestricted"
      },
      "createdAt": "2026-07-10T10:00:00Z",
      "updatedAt": "2026-07-10T10:00:00Z"
    }
  ],
  "nextCursor": "string"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/workspaces" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/workspaces [#create-workspace]

Create a workspace.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `name` | string | body |  | 1–80 characters. |
| `userId` | string | body |  | Defaults to `""`. |
| `metadata` | object | body |  | Defaults to `{}`. |
| `networkPolicy` | object | body |  | Defaults to `{"mode":"unrestricted"}`. |

#### Response

Returns `201 Created` as `application/json`. The created workspace.

Response schema: `Workspace`.

```json
{
  "id": "ws_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "name": "string",
  "userId": "string",
  "metadata": {},
  "networkPolicy": {
    "mode": "unrestricted"
  },
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/workspaces" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"string"}'
```

### GET /v1/workspaces/:workspaceId [#get-workspace]

Get a workspace.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `workspaceId` | string | path | required | `ws_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The workspace.

Response schema: `Workspace`.

```json
{
  "id": "ws_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "name": "string",
  "userId": "string",
  "metadata": {},
  "networkPolicy": {
    "mode": "unrestricted"
  },
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/workspaces/ws_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PUT /v1/workspaces/:workspaceId [#update-workspace]

Update a workspace.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `workspaceId` | string | path | required | `ws_…` ID. |
| `name` | string \| null | body |  | 1–80 characters. |
| `metadata` | object | body |  |  |
| `networkPolicy` | object | body |  |  |

#### Response

Returns `200 OK` as `application/json`. The updated workspace.

Response schema: `Workspace`.

```json
{
  "id": "ws_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "name": "string",
  "userId": "string",
  "metadata": {},
  "networkPolicy": {
    "mode": "unrestricted"
  },
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PUT "$BLAZING_AGENTS_BASE_URL/v1/workspaces/ws_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"string"}'
```

### DELETE /v1/workspaces/:workspaceId [#delete-workspace]

Delete a workspace.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `workspaceId` | string | path | required | `ws_…` ID. |

#### Response

Returns `202 Accepted`. Deletion accepted and running.

Returns `204 No Content`. Deleted.

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |
| `409` | Workspace is in use or busy |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/workspaces/ws_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Workspaces](/agents/workspaces) to share files between agents and sessions.
- [Workspace object](/api-reference/protocols/objects-and-schemas#workspace) for every field.
