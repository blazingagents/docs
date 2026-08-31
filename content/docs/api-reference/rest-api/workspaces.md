---
title: Workspaces
description: Create, list, inspect, update, and delete Tenant-owned durable private Workspaces.
---

# Workspaces

## Overview [#overview]

Workspaces hold durable private Agent files. Public operations create and
manage the product resource; its Cloudflare Sandbox Container starts lazily
only on the first actual Workspace file or process operation. Agent and Skill
creation, Skill activation, and virtual Skill reads do not initialize it.
Every operation is fenced to the authenticated Tenant.

## Endpoints [#endpoints]

### POST /v1/workspaces [#create-workspace]

Creates a Workspace without starting its Cloudflare Sandbox container.

#### Request

Requires bearer authentication and JSON. `name` is optional, `userId` defaults
to `""`, `metadata` defaults to `{}`, and `networkPolicy` defaults to
`{"mode":"unrestricted"}`. Restricted policies are
`{"mode":"allowlist","allowedHosts":["api.example.com"]}` and
`{"mode":"offline"}`.

#### Response

Returns `201 Created` with [`workspaceSchema`](/api-reference/protocols/objects-and-schemas#workspace).

SDK: [TypeScript](/sdk/typescript/workspaces#create) /
[Python](/sdk/python/workspaces#create).

#### Errors

`400 validation_failed` for invalid fields.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/workspaces" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"Release files","userId":"user_42","metadata":{"project":"docs"},"networkPolicy":{"mode":"allowlist","allowedHosts":["registry.npmjs.org"]}}'
```

### GET /v1/workspaces [#list-workspaces]

Lists Workspaces newest first with cursor pagination and optional Attribution
filtering. The reserved Admin Workspace is excluded from every list result.

#### Request

Requires bearer authentication. `cursor` is opaque, `limit` defaults to 50 and
accepts 1–200, and `userId` filters by exact value.

#### Response

Returns `200 OK` with
[`workspacesListResponseSchema`](/api-reference/protocols/objects-and-schemas#workspaces-list-response).
Use `nextCursor` for the next page.

SDK: [TypeScript](/sdk/typescript/workspaces#list) /
[Python](/sdk/python/workspaces#list).

#### Errors

`400 validation_failed` for invalid or unknown query parameters.

#### cURL

```bash
curl --get "$BLAZING_AGENTS_BASE_URL/v1/workspaces" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --data-urlencode "limit=50" \
  --data-urlencode "userId=user_42"
```

### GET /v1/workspaces/:workspaceId [#get-workspace]

Retrieves a Workspace without starting its Cloudflare Sandbox container.

#### Request

Requires bearer authentication and a `ws_…` `workspaceId` path parameter.

#### Response

Returns `200 OK` with
[`workspaceSchema`](/api-reference/protocols/objects-and-schemas#workspace).

SDK: [TypeScript](/sdk/typescript/workspaces#get) /
[Python](/sdk/python/workspaces#get).

#### Errors

`400 validation_failed`; `404 workspace_not_found` for missing or foreign
Workspaces.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/workspaces/ws_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PUT /v1/workspaces/:workspaceId [#update-workspace]

Updates mutable Workspace fields without starting its Cloudflare Sandbox
container.

#### Request

Requires bearer authentication, a `ws_…` path parameter, and JSON. `name`
accepts `null`; `metadata` and `networkPolicy` are replaced when supplied.
Attribution is immutable.

#### Response

Returns `200 OK` with
[`workspaceSchema`](/api-reference/protocols/objects-and-schemas#workspace).

SDK: [TypeScript](/sdk/typescript/workspaces#update) /
[Python](/sdk/python/workspaces#update).

#### Errors

`400 validation_failed`; `404 workspace_not_found`.

#### cURL

```bash
curl --request PUT \
  "$BLAZING_AGENTS_BASE_URL/v1/workspaces/ws_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"networkPolicy":{"mode":"offline"}}'
```

### DELETE /v1/workspaces/:workspaceId [#delete-workspace]

Deletes a Workspace, its Cloudflare Sandbox container, and its R2 backup.
Attached Agents block deletion; reassign them first because Agents cannot be
detached.

#### Request

Requires bearer authentication and a `ws_…` `workspaceId` path parameter.

#### Response

Returns `204 No Content` with an empty body when deletion completes
immediately, or `202 Accepted` with an empty body when durable Container or R2
cleanup is pending.

SDK: [TypeScript](/sdk/typescript/workspaces#delete) /
[Python](/sdk/python/workspaces#delete).

#### Errors

`404 workspace_not_found`; `409 workspace_in_use` with
`details.agentIds`; `409 workspace_busy`; `503 service_unavailable`.

#### cURL

```bash
curl --request DELETE \
  "$BLAZING_AGENTS_BASE_URL/v1/workspaces/ws_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Related [#related]

- [TypeScript SDK Workspaces](/sdk/typescript/workspaces)
- [Python SDK Workspaces](/sdk/python/workspaces)
- [Workspace object](/api-reference/protocols/objects-and-schemas#workspace)
- [Workspaces](/agents/workspaces)
