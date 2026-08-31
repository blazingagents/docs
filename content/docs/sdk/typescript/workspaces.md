---
title: Workspaces
description: Create, inspect, update, filter, and delete durable private Workspaces.
---

# Workspaces

`client.workspaces` manages Tenant-owned durable private files. Creating a
Workspace stores only its product record; its Cloudflare Sandbox Container
starts lazily on the first actual file or process operation.

## Overview [#overview]

Every Workspace is fenced to the authenticated Tenant. `userId` is immutable End-user Attribution: omit it or pass `""` for a tenant-level Workspace. `metadata` and `networkPolicy` remain mutable. The policy applies to every Agent sharing the Workspace. An attached Agent blocks deletion.

Workspace lists use opaque cursor pagination, are ordered newest first, and
exclude the reserved Admin Workspace. Deletion can finish immediately or
continue asynchronously while the Cloudflare Container and R2 backup are
cleaned up.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create a Workspace record | `Workspace` |
| [`list()`](#list) | List and filter Workspaces | `WorkspacesListResponse` |
| [`get()`](#get) | Retrieve one Workspace | `Workspace` |
| [`update()`](#update) | Change its name or metadata | `Workspace` |
| [`delete()`](#delete) | Start fenced deletion | `"completed" \| "pending"` |

## Methods [#methods]

### `create()` [#create]

Creates a Workspace without starting its Cloudflare Sandbox container.

**Signature:** `create(body?: CreateWorkspaceBody): Promise<Workspace>`

| Body field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `name` | `string` | no | — | Display name, 1–80 characters |
| `userId` | `string` | no | `""` | Immutable End-user Attribution |
| `metadata` | `Record<string, unknown>` | no | `{}` | Application-defined metadata |
| `networkPolicy` | `WorkspaceNetworkPolicy` | no | `{ mode: "unrestricted" }` | Workspace-wide outbound network policy |

```typescript
const workspace = await client.workspaces.create({
  name: "Release files",
  userId: "user_42",
  metadata: { project: "docs" },
  networkPolicy: {
    mode: "allowlist",
    allowedHosts: ["registry.npmjs.org"],
  },
});
```

Returns [`Workspace`](#workspace). Raises `validation_failed` for invalid input. See [`POST /v1/workspaces`](/api-reference/rest-api/workspaces#create-workspace).

### `list()` [#list]

Lists Workspaces newest first, optionally filtered by exact Attribution.

**Signature:** `list(options?: WorkspacesListOptions): Promise<WorkspacesListResponse>`

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `cursor` | `string` | no | — | Opaque cursor returned by the previous page |
| `limit` | `number` | no | `50` | Page size from 1 through 200 |
| `userId` | `string` | no | — | Exact Attribution filter; use `""` for tenant-level Workspaces |

```typescript
const page = await client.workspaces.list({
  userId: "user_42",
  limit: 50,
});
```

Returns [`WorkspacesListResponse`](#workspaceslistresponse). Raises `validation_failed` for invalid options or `invalid_cursor` for an unusable cursor. See [`GET /v1/workspaces`](/api-reference/rest-api/workspaces#list-workspaces).

### `get()` [#get]

Retrieves one Workspace without starting its Cloudflare Sandbox container.

**Signature:** `get(input: { workspaceId: string }): Promise<Workspace>`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `workspaceId` | `string` | yes | Workspace ID (`ws_…`) |

```typescript
const workspace = await client.workspaces.get({ workspaceId });
```

Returns [`Workspace`](#workspace). Raises `validation_failed` for a malformed ID or `workspace_not_found` when the Workspace is unavailable. See [`GET /v1/workspaces/:workspaceId`](/api-reference/rest-api/workspaces#get-workspace).

### `update()` [#update]

Replaces supplied mutable fields without starting the Cloudflare Sandbox container. Attribution cannot be changed.

**Signature:** `update(input: UpdateWorkspaceBody & { workspaceId: string }): Promise<Workspace>`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `workspaceId` | `string` | yes | Workspace ID (`ws_…`) |
| `name` | `string \| null` | no | New display name; `null` clears it |
| `metadata` | `Record<string, unknown>` | no | Complete replacement metadata |
| `networkPolicy` | `WorkspaceNetworkPolicy` | no | Complete replacement outbound policy |

At least one mutable field is required.

```typescript
const workspace = await client.workspaces.update({
  workspaceId,
  name: "Published files",
  metadata: { project: "docs", stage: "release" },
  networkPolicy: { mode: "offline" },
});
```

Returns [`Workspace`](#workspace). Raises `validation_failed` for invalid or empty input or `workspace_not_found` when unavailable. See [`PUT /v1/workspaces/:workspaceId`](/api-reference/rest-api/workspaces#update-workspace).

### `delete()` [#delete]

Deletes a Workspace, its Cloudflare Sandbox container, and its R2 backup.
Reassign all attached Agents first.

**Signature:** `delete(input: { workspaceId: string }): Promise<"completed" | "pending">`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `workspaceId` | `string` | yes | Workspace ID (`ws_…`) |

```typescript
const status = await client.workspaces.delete({ workspaceId });
```

Returns `"completed"` after an immediate `204` response or `"pending"` after a
`202` response queues durable Container or R2 cleanup. Raises
`workspace_in_use` with `details.agentIds`, `workspace_busy`,
`workspace_not_found`, or `service_unavailable`. See
[`DELETE /v1/workspaces/:workspaceId`](/api-reference/rest-api/workspaces#delete-workspace).

## Response types [#response-types]

### `Workspace` [#workspace]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Workspace ID (`ws_…`) |
| `tenantId` | `string` | Owning Tenant ID |
| `name` | `string \| null` | Optional display name |
| `userId` | `string` | Immutable End-user Attribution |
| `metadata` | `Record<string, unknown>` | Mutable application metadata |
| `networkPolicy` | `{ mode: "unrestricted" } \| { mode: "allowlist"; allowedHosts: string[] } \| { mode: "offline" }` | Workspace-wide outbound network policy |
| `createdAt` | `string` | ISO 8601 creation timestamp |
| `updatedAt` | `string` | ISO 8601 update timestamp |

### `WorkspacesListResponse` [#workspaceslistresponse]

```typescript
interface WorkspacesListResponse {
  data: Workspace[];
  nextCursor: string | null;
}
```

Pass a non-null `nextCursor` to the next `list()` call. See the canonical [Workspace schemas](/api-reference/protocols/objects-and-schemas#workspace).

## Errors [#errors]

SDK request failures throw `BlazingAgentsError`. Branch on its stable `code`, not its message.

| Code | Applies to | Action |
| --- | --- | --- |
| `validation_failed` | All methods | Correct the indicated input |
| `invalid_cursor` | `list()` | Restart pagination without the rejected cursor |
| `workspace_not_found` | ID-based methods | Check the Workspace and Tenant |
| `workspace_in_use` | `delete()` | Reassign the Agents in `details.agentIds` |
| `workspace_busy` | `delete()` | Retry after active Workspace work finishes |
| `service_unavailable` | `delete()` | Retry with backoff |

See [SDK errors](/api-reference/protocols/errors).

## End-to-end workflow [#end-to-end-workflow]

Create, update, find, and delete a Workspace:

```typescript
import { BlazingAgents } from "@blazing-agents/sdk";

const client = new BlazingAgents({ apiKey: process.env.BLAZING_AGENTS_API_KEY! });

const workspace = await client.workspaces.create({
  name: "Release files",
  userId: "user_42",
});

await client.workspaces.update({
  workspaceId: workspace.id,
  metadata: { project: "docs" },
});

const { data, nextCursor } = await client.workspaces.list({
  userId: "user_42",
  limit: 50,
});
const current = await client.workspaces.get({ workspaceId: data[0].id });
console.log(current.name, nextCursor);

const deletion = await client.workspaces.delete({
  workspaceId: workspace.id,
});
console.log(deletion);
```

## Related [#related]

- [REST Workspaces](/api-reference/rest-api/workspaces)
- [Workspace object](/api-reference/protocols/objects-and-schemas#workspace)
- [Workspaces](/agents/workspaces)
