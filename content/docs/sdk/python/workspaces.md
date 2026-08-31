---
title: Workspaces
description: Create, inspect, update, iterate, and delete durable private Workspaces with the Python SDK.
---

# Workspaces

`client.workspaces` manages Tenant-owned durable private filesystems and their
Attribution. Creating a Workspace stores its product record; private runtime
provisioning remains lazy until its Cloudflare Sandbox container is needed.
The asynchronous client exposes the same operation names. Await request
methods and use `async for` for lazy iteration.

## Overview [#overview]

A Workspace can be shared by several Agents in the same Tenant. Its `user_id`
is immutable End-user Attribution: omit it or pass `""` for a tenant-level
Workspace. `name`, `metadata`, and `network_policy` remain mutable. The network
policy applies to every Agent sharing the Workspace. Reassign every attached
Agent before deleting a Workspace.

Lists use opaque cursor pagination, are ordered newest first, and exclude the
reserved Admin Workspace. Use `list()` for explicit page control or `iter()`
to fetch later pages lazily. Every request accepts
`extra_headers: Mapping[str, str] | None` and the exported `Timeout` type
(`float | httpx.Timeout | None`).

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create a Workspace record | `Workspace` |
| [`list()`](#list) | Read one Workspace page | `WorkspacesPage` |
| [`iter()`](#iter) | Lazily iterate Workspace pages | `Iterator[Workspace]` |
| [`get()`](#get) | Retrieve one Workspace | `Workspace` |
| [`update()`](#update) | Change its name or metadata | `Workspace` |
| [`delete()`](#delete) | Start fenced deletion | `WorkspaceDeletionOutcome` |

## Methods [#methods]

### `create()` [#create]

**Signature:** `create(*, name: str = ..., user_id: str = ..., metadata: dict[str, object] = ..., network_policy: WorkspaceNetworkPolicy = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Workspace`

Creates a Workspace without starting its Cloudflare Sandbox container. Omitted
`name` becomes `None`, `user_id` becomes `""`, `metadata` becomes `{}`, and
`network_policy` becomes `{"mode": "unrestricted"}`. Attribution cannot be
changed later.

```python
workspace = client.workspaces.create(
    name="Release files",
    user_id="user_42",
    metadata={"project": "docs"},
    network_policy={
        "mode": "allowlist",
        "allowed_hosts": ["registry.npmjs.org"],
    },
)
```

Returns [`Workspace`](#workspace). Server failures include
`validation_failed`. See
[`POST /v1/workspaces`](/api-reference/rest-api/workspaces#create-workspace).

### `list()` [#list]

**Signature:** `list(*, cursor: str = ..., limit: int = ..., user_id: str = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> WorkspacesPage`

Returns one newest-first page. `limit` defaults to 50 and accepts 1 through
200. `cursor` is the opaque `next_cursor` from a previous page. Supplying
`user_id=""` selects tenant-level Workspaces; omitting it applies no
Attribution filter.

```python
page = client.workspaces.list(user_id="user_42", limit=50)
if page.next_cursor is not None:
    next_page = client.workspaces.list(cursor=page.next_cursor, limit=50)
```

The response contains `data: list[Workspace]` and
`next_cursor: str | None`. Server failures include `validation_failed` and
`invalid_cursor`. See
[`GET /v1/workspaces`](/api-reference/rest-api/workspaces#list-workspaces).

### `iter()` [#iter]

**Signature:** `iter(*, cursor: str = ..., limit: int = ..., user_id: str = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Iterator[Workspace]`

Returns a lazy iterator. No request is made until iteration starts, and later
pages are requested only as needed. The options have the same meanings as
[`list()`](#list).

```python
for workspace in client.workspaces.iter(user_id="user_42", limit=50):
    print(workspace.id)

# AsyncBlazingAgents uses the same operation name.
async for workspace in async_client.workspaces.iter(
    user_id="user_42",
    limit=50,
):
    print(workspace.id)
```

The asynchronous return is `AsyncIterator[Workspace]`; do not `await` the
iterator factory. Page requests can raise the same errors as `list()`.

### `get()` [#get]

**Signature:** `get(*, workspace_id: str, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Workspace`

Retrieves one Workspace by its `ws_…` ID without starting its Cloudflare
Sandbox container.
Server failures include `validation_failed` and `workspace_not_found`. See
[`GET /v1/workspaces/:workspaceId`](/api-reference/rest-api/workspaces#get-workspace).

### `update()` [#update]

**Signature:** `update(*, workspace_id: str, name: str | None = ..., metadata: dict[str, object] = ..., network_policy: WorkspaceNetworkPolicy = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Workspace`

Replaces supplied mutable fields without starting the Cloudflare Sandbox
container. Omission
leaves a field unchanged; `name=None` clears the display name. Supplied
`metadata` completely replaces existing metadata, and `network_policy`
replaces the Workspace-wide outbound policy. Attribution is immutable.
Calling the method without a mutable field raises `ValueError` before a
request is sent.

```python
workspace = client.workspaces.update(
    workspace_id=workspace.id,
    name=None,
    metadata={"project": "docs", "stage": "release"},
    network_policy={"mode": "offline"},
)
```

Returns [`Workspace`](#workspace). Server failures include
`validation_failed` and `workspace_not_found`. See
[`PUT /v1/workspaces/:workspaceId`](/api-reference/rest-api/workspaces#update-workspace).

### `delete()` [#delete]

**Signature:** `delete(*, workspace_id: str, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> WorkspaceDeletionOutcome`

Deletes the Workspace, its Cloudflare Sandbox container, and its R2 backup. The exported
`WorkspaceDeletionOutcome` is `Literal["completed", "pending"]`:
`"completed"` represents an immediate `204`, while `"pending"` represents a
`202` after durable Container or R2 cleanup begins.

```python
outcome = client.workspaces.delete(workspace_id=workspace.id)
```

Reassign all attached Agents first. Server failures include `workspace_in_use`,
`workspace_busy`, `workspace_not_found`, and `service_unavailable`. See
[`DELETE /v1/workspaces/:workspaceId`](/api-reference/rest-api/workspaces#delete-workspace).

## Response types [#response-types]

### `Workspace` [#workspace]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `str` | Workspace ID (`ws_…`) |
| `tenant_id` | `str` | Owning Tenant ID |
| `name` | `str \| None` | Optional display name |
| `user_id` | `str` | Immutable End-user Attribution |
| `metadata` | `dict[str, object]` | Mutable application metadata |
| `network_policy` | `WorkspaceNetworkPolicy` | Workspace-wide outbound network policy |
| `created_at` | `datetime` | Time created |
| `updated_at` | `datetime` | Time last updated |

`WorkspacesPage` contains `data: list[Workspace]` and
`next_cursor: str | None`. Responses are Pydantic v2 models, retain unknown
server fields, and expose the non-serialized `_request_id`.

## Errors [#errors]

Request failures raise subclasses of `BlazingAgentsError`. Branch on stable
`code`, not the message.

| Code | Applies to | Action |
| --- | --- | --- |
| `validation_failed` | All methods | Correct the indicated input |
| `invalid_cursor` | `list()`, `iter()` | Restart without the rejected cursor |
| `workspace_not_found` | ID methods | Check the Workspace and Tenant |
| `workspace_in_use` | `delete()` | Reassign Agents listed in `details.agentIds` |
| `workspace_busy` | `delete()` | Retry after active Workspace work finishes |
| `service_unavailable` | `delete()` | Retry explicitly with backoff |

See [Python errors](/sdk/python/client#errors).

## Related [#related]

- [REST Workspaces](/api-reference/rest-api/workspaces)
- [Workspace capability](/agents/workspaces)
- [File operations](/agents/tools/built-in-tools)
- [Agents](/sdk/python/agents)
