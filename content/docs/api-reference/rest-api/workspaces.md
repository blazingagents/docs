---
title: Workspaces
description: Create, list, inspect, update, and delete the private file systems your agents work in.
---

# Workspaces

## Overview [#overview]

A workspace is a private file system with an immutable `tier`. Core (`core`) is the default and loses files on stop. Plus (`plus`) provides native snapshot resume after controlled shutdown. Several
agents can share one. These endpoints manage the workspace record: its name,
metadata, and network policy. None of them start the workspace or add compute
cost. The workspace starts only when an agent first reads, writes, or runs
something in it. Every request is scoped to your tenant.

## Endpoints [#endpoints]

### GET /v1/workspaces [#list-workspaces]

List workspaces.

Lists your tenant's workspaces newest first, one page at a time. Pass `nextCursor` as `cursor` to get the next page. The workspace reserved for the platform-managed `ba assist` agent is never listed.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `cursor` | string | query |  | `nextCursor` from the previous page. |
| `limit` | integer | query |  | Page size, from 1 to 200. Defaults to 50. 1–200. Defaults to `50`. |
| `userId` | string | query |  | Return only workspaces with this exact `userId`. Send `""` for tenant-level workspaces. |

#### Response

Returns `200 OK` as `application/json`. A page of workspaces.

Response schema: `WorkspaceList`.

```json
{
  "data": [
    {
      "id": "ws_3Vb8Ny6HpU1cGf4M",
      "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
      "name": "Release files",
      "userId": "user_42",
      "metadata": {
        "project": "docs"
      },
      "tier": "core",
      "networkPolicy": {
        "mode": "allowlist",
        "allowedHosts": [
          "registry.npmjs.org"
        ]
      },
      "createdAt": "2026-07-10T10:00:00.000Z",
      "updatedAt": "2026-07-10T10:00:00.000Z"
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

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/workspaces" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/workspaces [#create-workspace]

Create a workspace.

Creates a private file system your agents can keep between sessions. Creating it adds no compute cost: the workspace starts only when an agent first reads, writes, or runs something in it.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `tier` | string | body |  | Immutable Workspace tier. Core uses temporary files; Plus resumes native snapshots. One of `core`, `plus`. Defaults to `core`. |
| `name` | string | body |  | Display name, up to 80 characters. Leave it out for an unnamed workspace. 1–80 characters. |
| `userId` | string | body |  | Your own ID for the end user who owns the workspace. `""` means a tenant-level workspace. It cannot be changed later. Defaults to `""`. |
| `metadata` | object | body |  | Your own key-value data, returned as sent. Defaults to `{}`. |
| `networkPolicy` | object | body |  | Which hosts the workspace can reach: `unrestricted`, `allowlist` with `allowedHosts`, or `offline`. Defaults to `{"mode":"unrestricted"}`. |

#### Response

Returns `201 Created` as `application/json`. The created workspace.

Response schema: `Workspace`.

```json
{
  "id": "ws_3Vb8Ny6HpU1cGf4M",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "name": "Release files",
  "userId": "user_42",
  "metadata": {
    "project": "docs"
  },
  "tier": "core",
  "networkPolicy": {
    "mode": "allowlist",
    "allowedHosts": [
      "registry.npmjs.org"
    ]
  },
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `429` | [`rate_limited`](/api-reference/protocols/errors#rate_limited) | Too many requests |
| `503` | [`service_unavailable`](/api-reference/protocols/errors#service_unavailable) | The service is temporarily unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/workspaces" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"Release files","userId":"user_42","metadata":{"project":"docs"},"networkPolicy":{"mode":"allowlist","allowedHosts":["registry.npmjs.org"]}}'
```

### GET /v1/workspaces/:workspaceId [#get-workspace]

Get a workspace.

Returns a workspace without starting it.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `workspaceId` | string | path | required | ID of the workspace. |

#### Response

Returns `200 OK` as `application/json`. The workspace.

Response schema: `Workspace`.

```json
{
  "id": "ws_3Vb8Ny6HpU1cGf4M",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "name": "Release files",
  "userId": "user_42",
  "metadata": {
    "project": "docs"
  },
  "tier": "core",
  "networkPolicy": {
    "mode": "allowlist",
    "allowedHosts": [
      "registry.npmjs.org"
    ]
  },
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`workspace_not_found`](/api-reference/protocols/errors#workspace_not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/workspaces/ws_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PUT /v1/workspaces/:workspaceId [#update-workspace]

Update a workspace.

Updates a workspace's name, metadata, or network policy. Send at least one field. `metadata` and `networkPolicy` replace their current values, and `name: null` clears the name. `userId` cannot be changed. If a new network policy switches between `unrestricted` and a restricted mode, a running workspace saves its files and stops; it applies the new policy the next time an agent uses it. A concurrent workspace change can return `409 workspace_busy`; retry after the active work finishes.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `workspaceId` | string | path | required | ID of the workspace. |
| `name` | string \| null | body |  | New display name, up to 80 characters, or `null` to clear it. 1–80 characters. |
| `metadata` | object | body |  | Replaces the workspace's metadata. |
| `networkPolicy` | object | body |  | Replaces the network policy. Which hosts the workspace can reach: `unrestricted`, `allowlist` with `allowedHosts`, or `offline`. |

#### Response

Returns `200 OK` as `application/json`. The updated workspace.

Response schema: `Workspace`.

```json
{
  "id": "ws_3Vb8Ny6HpU1cGf4M",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "name": "Release files",
  "userId": "user_42",
  "metadata": {
    "project": "docs"
  },
  "tier": "core",
  "networkPolicy": {
    "mode": "offline"
  },
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:15:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`workspace_not_found`](/api-reference/protocols/errors#workspace_not_found) | The resource was not found |
| `409` | [`workspace_busy`](/api-reference/protocols/errors#workspace_busy) | The request conflicts with the resource's current state |
| `502` | [`internal`](/api-reference/protocols/errors#internal) | An upstream service failed |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PUT "$BLAZING_AGENTS_BASE_URL/v1/workspaces/ws_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"networkPolicy":{"mode":"offline"}}'
```

### DELETE /v1/workspaces/:workspaceId [#delete-workspace]

Delete a workspace.

Permanently deletes a workspace and all its files. Every agent needs a workspace, so move attached agents to another workspace first: while any agent uses it, the request returns `409 workspace_in_use` with their IDs in `details.agentIds`. Returns `202` after cleanup is accepted for processing.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `workspaceId` | string | path | required | ID of the workspace. |

#### Response

Returns `202 Accepted`. Deletion accepted for processing.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`workspace_not_found`](/api-reference/protocols/errors#workspace_not_found) | The resource was not found |
| `409` | [`workspace_in_use`](/api-reference/protocols/errors#workspace_in_use) | The request conflicts with the resource's current state |
| `503` | [`service_unavailable`](/api-reference/protocols/errors#service_unavailable) | The service is temporarily unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/workspaces/ws_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Workspaces](/agents/workspaces) to share files between agents and sessions.
- [Workspace object](/api-reference/protocols/objects-and-schemas#workspace) for every field.
