---
title: Workspaces
description: Create, list, update, and delete the private file systems your agents use.
---

# Workspaces

`client.workspaces` manages workspaces: private file systems whose tier controls whether files resume after shutdown. Several agents in your tenant can share one workspace, and its network policy controls what those agents can reach from it.

Every agent gets its own workspace when you create it, so you only need this resource to share a workspace, restrict its network, or clean up. Creating a workspace starts no compute until an agent first uses its files.

Examples assume `client = BlazingAgents()`. Every method also accepts `extra_headers` and `timeout`. On `AsyncBlazingAgents`, await the same method names and use `async for` with `iter()`.

In a route that serves a signed-in end user, call these methods on [`client.for_user(verified_user_id)`](/sdk/python/client#for-user), which returns only that user's records. The tenant client sees every user's records and is for your backend's administration. Every turn of every agent attached to a workspace sees the same files, so give each end user a workspace of their own when their files must stay private.

```python
workspace = client.workspaces.create(
    name="Release files",
    network_policy={"mode": "allowlist", "allowed_hosts": ["registry.npmjs.org"]},
)
agent = client.agents.update("ag_0123456789abcdef", workspace_id=workspace.id)
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create a workspace | `Workspace` |
| [`list()`](#list) | Get one page of workspaces | `WorkspacesPage` |
| [`iter()`](#iter) | Iterate every workspace | `Iterator[Workspace]` |
| [`get()`](#get) | Get one workspace | `Workspace` |
| [`update()`](#update) | Change name, metadata, or network policy | `Workspace` |
| [`delete()`](#delete) | Delete a workspace and its files | `None` |

## Methods [#methods]

### `create()` [#create]

Creates an empty workspace. Core is the default. Pass `tier="plus"` to keep files when the workspace stops; see [what survives a stop](/agents/workspaces#snapshot-resume). The tier cannot change through `update()`; create and attach another workspace to change it. Files are not copied.

```python
user = client.for_user(verified_user_id)
workspace = user.workspaces.create(
    name="Customer files",
    metadata={"project": "docs"},
)
```

**Signature:** `create(*, tier=..., name=..., user_id=..., metadata=..., network_policy=...) -> Workspace`

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `tier` | `Literal["core", "plus"]` | `"core"` | Immutable workspace tier |
| `name` | `str` | `None` | Display name, within the [workspace name limit](/api-reference/protocols/service-limits#workspace-name) |
| `user_id` | `str` | `""` | End user the workspace belongs to; `""` means tenant level. Fixed after creation. A scoped client fills it in |
| `metadata` | `dict[str, object]` | `{}` | Your own data |
| `network_policy` | `WorkspaceNetworkPolicy` | `{"mode": "unrestricted"}` | Outbound network access for every agent using the workspace |

A network policy is one of `{"mode": "unrestricted"}`, `{"mode": "offline"}`, or `{"mode": "allowlist", "allowed_hosts": [...]}`.

Returns [`Workspace`](#workspace). Raises `APIStatusError` with [`validation_failed`](/api-reference/protocols/errors#validation_failed).

### `list()` [#list]

Gets one page of workspaces, newest first.

```python
user = client.for_user(verified_user_id)
page = user.workspaces.list(limit=50)
if page.next_cursor is not None:
    page = user.workspaces.list(cursor=page.next_cursor, limit=50)
```

**Signature:** `list(*, cursor=..., limit=..., user_id=...) -> WorkspacesPage`

`limit` follows the [workspace page limit](/api-reference/protocols/service-limits#workspace-page). Pass the previous page's `next_cursor` as `cursor`. On a scoped client, the page holds only that user's workspaces. On the tenant client, for an administration view, `user_id` filters by end user, `user_id=""` returns tenant-level workspaces, and omitting `user_id` returns all of them.

Returns `WorkspacesPage` with `data: list[Workspace]` and `next_cursor: str | None`. Raises `validation_failed` or [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor).

### `iter()` [#iter]

Iterates every workspace, fetching pages as you go.

```python
for workspace in client.for_user(verified_user_id).workspaces.iter():
    print(workspace.id, workspace.name)
```

**Signature:** `iter(*, cursor=..., limit=..., user_id=...) -> Iterator[Workspace]`

Takes the same parameters as [`list()`](#list). No request is sent until you start iterating. On the async client, use `async for` directly on `iter(...)`; do not await it.

### `get()` [#get]

Gets one workspace.

```python
workspace = client.workspaces.get(workspace_id="ws_0123456789abcdef")
```

**Signature:** `get(*, workspace_id: str) -> Workspace`

Returns [`Workspace`](#workspace). Raises `validation_failed` or [`workspace_not_found`](/api-reference/protocols/errors#workspace_not_found).

### `update()` [#update]

Changes a workspace's name, metadata, or network policy.

```python
workspace = client.workspaces.update(
    workspace_id=workspace.id,
    name=None,
    network_policy={"mode": "offline"},
)
```

**Signature:** `update(*, workspace_id: str, name=..., metadata=..., network_policy=...) -> Workspace`

Omitted parameters keep their current value. `name=None` clears the name. `metadata` and `network_policy` replace the current values completely. `user_id` cannot change. Calling `update()` with nothing to change raises `validation_failed`.

A `network_policy` that switches between `unrestricted` and a restricted mode (`offline` or `allowlist`) stops a running workspace. The workspace applies the new policy the next time an agent uses it. A Core workspace loses its files in that restart, and a Plus workspace keeps them. See [control network access](/agents/workspaces#control-network-access).

Returns [`Workspace`](#workspace). Raises `validation_failed`, `workspace_not_found`, or [`workspace_busy`](/api-reference/protocols/errors#workspace_busy).

### `delete()` [#delete]

Deletes a workspace and all its files.

```python
client.workspaces.delete(workspace_id=workspace.id)
```

**Signature:** `delete(*, workspace_id: str) -> None`

Move every agent to another workspace first. When the call returns, the workspace and its files are gone.

| Code | Meaning |
| --- | --- |
| `validation_failed` | The ID is malformed |
| [`workspace_in_use`](/api-reference/protocols/errors#workspace_in_use) | Agents still use it; their IDs are in `error.details["agentIds"]` |
| `workspace_not_found` | No such workspace in your tenant |

## Response types [#response-types]

### `Workspace` [#workspace]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `str` | Workspace ID (`ws_...`) |
| `tier` | `Literal["core", "plus"]` | Immutable workspace tier |
| `tenant_id` | `str` | Your tenant ID |
| `name` | `str \| None` | Display name |
| `user_id` | `str` | End user, or `""` for tenant level |
| `metadata` | `dict[str, object]` | Your own data |
| `network_policy` | `WorkspaceNetworkPolicy` | Outbound network policy |
| `created_at`, `updated_at` | `datetime` | Timestamps |

## Next [#next]

- [Workspaces guide](/agents/workspaces)
- [Built-in tools](/agents/tools/built-in-tools)
- [Agents](/sdk/python/agents)
