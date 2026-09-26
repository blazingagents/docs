---
title: Workspaces
description: Create, list, update, and delete the persistent file systems your agents use.
---

# Workspaces

`client.workspaces` manages workspaces: private file systems that keep your agents' files between sessions. Several agents in your tenant can share one workspace, and its network policy controls what those agents can reach from it.

Every agent gets its own workspace when you create it, so you only need this resource to share a workspace, restrict its network, or clean up. Creating a workspace costs nothing until an agent first uses its files.

Examples assume `client = BlazingAgents()`. Every method also accepts `extra_headers` and `timeout`. On `AsyncBlazingAgents`, await the same method names and use `async for` with `iter()`.

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
| [`delete()`](#delete) | Delete a workspace and its files | `WorkspaceDeletionOutcome` |

## Methods [#methods]

### `create()` [#create]

Creates an empty workspace.

```python
workspace = client.workspaces.create(
    name="Customer files",
    user_id="customer_123",
    metadata={"project": "docs"},
)
```

**Signature:** `create(*, name=..., user_id=..., metadata=..., network_policy=...) -> Workspace`

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | `str` | `None` | Display name, 1 to 80 characters |
| `user_id` | `str` | `""` | End user the workspace belongs to; `""` means tenant level. Fixed after creation |
| `metadata` | `dict[str, object]` | `{}` | Your own data |
| `network_policy` | `WorkspaceNetworkPolicy` | `{"mode": "unrestricted"}` | Outbound network access for every agent using the workspace |

A network policy is one of `{"mode": "unrestricted"}`, `{"mode": "offline"}`, or `{"mode": "allowlist", "allowed_hosts": [...]}`.

Returns [`Workspace`](#workspace). Raises `APIStatusError` with `validation_failed`.

### `list()` [#list]

Gets one page of workspaces, newest first.

```python
page = client.workspaces.list(user_id="customer_123", limit=50)
if page.next_cursor is not None:
    page = client.workspaces.list(cursor=page.next_cursor, limit=50)
```

**Signature:** `list(*, cursor=..., limit=..., user_id=...) -> WorkspacesPage`

`limit` is 1 to 200 and defaults to 50. Pass the previous page's `next_cursor` as `cursor`. `user_id=""` returns tenant-level workspaces; omitting `user_id` returns all of them.

Returns `WorkspacesPage` with `data: list[Workspace]` and `next_cursor: str | None`. Raises `validation_failed` or `invalid_cursor`.

### `iter()` [#iter]

Iterates every workspace, fetching pages as you go.

```python
for workspace in client.workspaces.iter(user_id="customer_123"):
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

Returns [`Workspace`](#workspace). Raises `validation_failed` or `workspace_not_found`.

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

Omitted parameters keep their current value. `name=None` clears the name. `metadata` and `network_policy` replace the current values completely. `user_id` cannot change. Calling `update()` with nothing to change raises `ValueError` before any request.

Returns [`Workspace`](#workspace). Raises `validation_failed` or `workspace_not_found`.

### `delete()` [#delete]

Deletes a workspace and all its files.

```python
outcome = client.workspaces.delete(workspace_id=workspace.id)
```

**Signature:** `delete(*, workspace_id: str) -> WorkspaceDeletionOutcome`

Move every agent to another workspace first. Returns `"completed"` when deletion finished right away, or `"pending"` when it was accepted and cleanup continues in the background.

| Code | Meaning |
| --- | --- |
| `workspace_in_use` | Agents still use it; their IDs are in `error.details["agentIds"]` |
| `workspace_busy` | An agent is working in it; retry when that work finishes |
| `workspace_not_found` | No such workspace in your tenant |
| `service_unavailable` | Temporary failure; retry with backoff |

## Response types [#response-types]

### `Workspace` [#workspace]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `str` | Workspace ID (`ws_...`) |
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
