---
title: Workspaces
description: Create, list, update, and delete the private file systems your agents use with the Rust SDK.
---

# Workspaces

`client.workspaces()` manages the private file systems your agents share. A workspace starts no compute until an agent first reads, writes, or runs something in it.

Examples receive a `client: blazing_agents::Client`. Every call also takes the `with_timeout`, `without_timeout`, `with_header`, and `with_client_request_id` transport options.

```rust
use blazing_agents::workspaces::NetworkPolicy;

let workspace = client
    .workspaces()
    .create()
    .name("Release files")
    .network_policy(NetworkPolicy::allowlist(["registry.npmjs.org"]))
    .await?;
println!("{}", workspace.id);
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create a workspace | [`Workspace`](#workspace) |
| [`list()`](#list) | List workspaces | [`Page<Workspace>`](#workspace) |
| [`get()`](#get) | Get one workspace | [`Workspace`](#workspace) |
| [`update()`](#update) | Change name, metadata, or network policy | [`Workspace`](#workspace) |
| [`delete()`](#delete) | Permanently delete a workspace | `()` |

## Methods [#methods]

### `create()` [#create]

Creates a workspace. With no setters it is a tenant-level, unnamed Core workspace.

```rust
let workspace = client
    .workspaces()
    .create()
    .name("Release files")
    .await?;
```

**Signature:** `create() -> Call<CreateWorkspace>`

| Setter | Type | Default | Description |
| --- | --- | --- | --- |
| `tier` | `WorkspaceTier` | `WorkspaceTier::Core` | Tier, fixed at creation. `Core` loses its files when the workspace stops; `Plus` keeps them while it is stopped |
| `name` | `impl Into<String>` | unnamed | Display name, up to 80 characters |
| `user_id` | `impl Into<String>` | `""` | The end user who owns the workspace. Fixed after creation |
| `metadata` | `Metadata` | `{}` | Your own data |
| `network_policy` | `NetworkPolicy` | `NetworkPolicy::Unrestricted` | Which hosts the workspace can reach |

`NetworkPolicy` is `Unrestricted`, `allowlist(hosts)` for a host allowlist such as `registry.npmjs.org`, `Offline`, or `Unrecognized` for a mode this SDK version does not know.

Awaiting returns [`Workspace`](#workspace). Fails with `Error::Api` whose code is [`validation_failed`](/api-reference/protocols/errors#validation_failed).

### `list()` [#list]

Lists workspaces, newest first. The workspace reserved for the admin agent is never listed.

```rust
let page = client.workspaces().list().user_id("").limit(50).await?;
for workspace in &page.data {
    println!("{}", workspace.id);
}
```

**Signature:** `list() -> Call<ListWorkspaces>`

| Setter | Type | Description |
| --- | --- | --- |
| `user_id` | `impl Into<String>` | Only workspaces of this end user; `""` selects tenant-level workspaces |
| `limit` | `u8` | Page size, 1 to 200; defaults to 50 |

Awaiting returns [`Page<Workspace>`](#workspace); call `.items()` or `.pages()` on the call to walk every page lazily. Fails with `validation_failed` or [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor).

### `get()` [#get]

Gets one workspace without starting it.

```rust
let workspace = client.workspaces().get("ws_0123456789abcdef").await?;
```

**Signature:** `get(workspace_id: impl Into<WorkspaceId>) -> Call<GetWorkspace>`

Awaiting returns [`Workspace`](#workspace). Fails with `validation_failed` or [`workspace_not_found`](/api-reference/protocols/errors#workspace_not_found).

### `update()` [#update]

Changes a workspace's name, metadata, or network policy. Setters you do not call keep their values; `metadata` and `network_policy` replace their current values completely.

```rust
let workspace = client
    .workspaces()
    .update("ws_0123456789abcdef")
    .name("Release files v2")
    .await?;
```

**Signature:** `update(workspace_id: impl Into<WorkspaceId>) -> Call<UpdateWorkspace>`

| Setter | Description |
| --- | --- |
| `name(name)` | A new display name, up to 80 characters |
| `clear_name()` | Removes the display name |
| `metadata(metadata)` | Replaces the workspace's metadata completely |
| `network_policy(network_policy)` | Replaces the network policy. Switching between `NetworkPolicy::Unrestricted` and a restricted policy stops a running workspace, which applies the new policy on next use |

Awaiting returns [`Workspace`](#workspace). Fails with `validation_failed` or `workspace_not_found`.

### `delete()` [#delete]

Permanently deletes a workspace and all its files.

```rust
client.workspaces().delete("ws_0123456789abcdef").await?;
```

**Signature:** `delete(workspace_id: impl Into<WorkspaceId>) -> Call<DeleteWorkspace>`

Move attached agents to another workspace first. Awaiting returns `()` once the deletion is accepted; the files are removed in the background.

| Code | Meaning |
| --- | --- |
| [`workspace_in_use`](/api-reference/protocols/errors#workspace_in_use) | Agents still use it; `ApiError::details()` holds their IDs under `agentIds` |
| [`workspace_busy`](/api-reference/protocols/errors#workspace_busy) | An agent is working in it; retry when that work finishes |
| `workspace_not_found` | No such workspace in your tenant |
| [`service_unavailable`](/api-reference/protocols/errors#service_unavailable) | Temporary failure; retry with backoff |

## Response models [#response-models]

### `Workspace` [#workspace]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `WorkspaceId` | Workspace ID (`ws_...`) |
| `tenant_id` | `TenantId` | Your tenant ID |
| `tier` | `WorkspaceTier` | `Core` or `Plus` |
| `name` | `Option<String>` | Display name, if any |
| `user_id` | `String` | End user, or `""` for tenant level |
| `metadata` | `Metadata` | Your own data |
| `network_policy` | `NetworkPolicy` | Which hosts the workspace can reach |
| `created_at`, `updated_at` | `Timestamp` | Timestamps |

## Next [#next]

- [Workspaces guide](/agents/workspaces)
- [Agents](/sdk/rust/agents)
