---
title: Workspaces
description: Create, list, update, and delete workspaces with the TypeScript SDK.
---

# Workspaces

`client.workspaces` manages the private file systems your agents work in. Every agent already gets a workspace when you create it, so use these methods when you want to share one workspace between agents, set its network rules, or clean it up. To learn how workspaces behave, read [Workspaces](/agents/workspaces).

```typescript
const workspace = await client.workspaces.create({
  name: "Release files",
  networkPolicy: { mode: "allowlist", allowedHosts: ["registry.npmjs.org"] },
});

await client.agents.update({ agentId, workspaceId: workspace.id });
```

Every method takes one input object and accepts an optional `abortSignal`. Reading or changing a workspace record does not touch its files.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create a workspace | `Workspace` |
| [`list()`](#list) | List workspaces | `WorkspacesListResponse` |
| [`get()`](#get) | Read one workspace | `Workspace` |
| [`update()`](#update) | Change its name, metadata, or network rules | `Workspace` |
| [`delete()`](#delete) | Delete a workspace and its files | `"completed" \| "pending"` |

## Methods [#methods]

### `create()` [#create]

Creates an empty workspace. Core is the default. Pass `tier: "plus"` to keep files when the workspace stops; see [what survives a stop](/agents/workspaces#snapshot-resume). The tier cannot change through `update()`; create and attach another workspace to change it. Files are not copied.

**Signature:** `create(input?: CreateWorkspaceBody & ResourceRequestOptions): Promise<Workspace>`

```typescript
const workspace = await client.workspaces.create({
  name: "Release files",
  userId: "user_42",
});
```

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `tier` | `"core" \| "plus"` | no | `"core"` | Immutable workspace tier |
| `name` | `string` | no | none | Display name, 1 to 80 characters |
| `userId` | `string` | no | `""` | The end user this workspace belongs to; cannot change later |
| `metadata` | `Record<string, unknown>` | no | `{}` | Your own labels |
| `networkPolicy` | `WorkspaceNetworkPolicy` | no | `{ mode: "unrestricted" }` | Outbound network rules |

`WorkspaceNetworkPolicy` is one of:

- `{ mode: "unrestricted" }`: commands can reach any host.
- `{ mode: "allowlist", allowedHosts: string[] }`: only the listed hosts, at least one.
- `{ mode: "offline" }`: no outbound network.

The policy applies to every agent that uses the workspace. Returns [`Workspace`](#workspace). Errors: [`validation_failed`](/api-reference/protocols/errors#validation_failed).

### `list()` [#list]

Lists workspaces, newest first.

**Signature:** `list(input?: WorkspacesListOptions): Promise<WorkspacesListResponse>`

```typescript
const { data, nextCursor } = await client.workspaces.list({ userId: "user_42" });
```

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `userId` | `string` | no | none | Only this end user's workspaces; `""` for tenant-level ones |
| `limit` | `number` | no | `50` | 1 to 200 per page |
| `cursor` | `string` | no | none | `nextCursor` from the previous page |

Returns [`WorkspacesListResponse`](#workspaceslistresponse). Errors: `validation_failed`, [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor).

### `get()` [#get]

Reads one workspace.

**Signature:** `get(input: { workspaceId: string } & ResourceRequestOptions): Promise<Workspace>`

```typescript
const workspace = await client.workspaces.get({ workspaceId });
```

Returns [`Workspace`](#workspace). Errors: `validation_failed`, [`workspace_not_found`](/api-reference/protocols/errors#workspace_not_found).

### `update()` [#update]

Changes a workspace's name, metadata, or network rules.

**Signature:** `update(input: UpdateWorkspaceBody & { workspaceId: string } & ResourceRequestOptions): Promise<Workspace>`

```typescript
const workspace = await client.workspaces.update({
  workspaceId,
  networkPolicy: { mode: "offline" },
});
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `workspaceId` | `string` | yes | Workspace ID (`ws_…`) |
| `name` | `string \| null` | no | New name; `null` removes it |
| `metadata` | `Record<string, unknown>` | no | Replaces all metadata |
| `networkPolicy` | `WorkspaceNetworkPolicy` | no | Replaces the network rules |

Pass at least one field. Fields you leave out stay as they are, and `userId` cannot change. Returns [`Workspace`](#workspace). Errors: `validation_failed`, `workspace_not_found`.

### `delete()` [#delete]

Deletes a workspace and all its files.

**Signature:** `delete(input: { workspaceId: string } & ResourceRequestOptions): Promise<"completed" | "pending">`

```typescript
const status = await client.workspaces.delete({ workspaceId });
```

Move every agent that uses the workspace to another one first. Returns `"completed"` when the workspace is fully deleted, or `"pending"` when the rest of the cleanup finishes in the background.

Errors:

- [`workspace_in_use`](/api-reference/protocols/errors#workspace_in_use): agents still use it. `details.agentIds` lists them.
- [`workspace_busy`](/api-reference/protocols/errors#workspace_busy): the workspace is running a command. Try again shortly.
- `workspace_not_found`: no such workspace in your tenant.
- [`service_unavailable`](/api-reference/protocols/errors#service_unavailable): try again with backoff.

## Response types [#response-types]

### `Workspace` [#workspace]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Workspace ID (`ws_…`) |
| `tier` | `"core" \| "plus"` | Immutable workspace tier |
| `tenantId` | `string` | Your tenant ID |
| `name` | `string \| null` | Display name, or `null` |
| `userId` | `string` | The end user it belongs to, or `""` |
| `metadata` | `Record<string, unknown>` | Your labels |
| `networkPolicy` | `WorkspaceNetworkPolicy` | Outbound network rules |
| `createdAt` | `string` | ISO 8601 timestamp |
| `updatedAt` | `string` | ISO 8601 timestamp |

### `WorkspacesListResponse` [#workspaceslistresponse]

```typescript
interface WorkspacesListResponse {
  data: Workspace[];
  nextCursor: string | null;
}
```

Pass `nextCursor` to the next `list()` call until it is `null`.

## Next [#next]

- [Workspaces](/agents/workspaces)
- [Agents reference](/sdk/typescript/agents)
- [Skills reference](/sdk/typescript/skills)
