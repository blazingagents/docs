---
title: Workspaces
description: Create, list, update, and delete the private file systems your agents use with the Go SDK.
---

# Workspaces

`client.Workspaces` manages the private file systems your agents share. A workspace starts no compute until an agent first reads, writes, or runs something in it.

Examples are function bodies that receive `ctx context.Context`, `client *ba.Client`, `agentID ba.AgentID`, and `sessionID ba.SessionID`, and return an `error`. Every method also takes the per-call options `ba.WithRequestTimeout`, `ba.WithRequestHeader`, `ba.WithClientRequestID`, and `ba.CaptureResponse`.

```go
workspace, err := client.Workspaces.Create(ctx, ba.CreateWorkspaceParams{
	Name:          new("Release files"),
	NetworkPolicy: ba.NetworkPolicyAllowlist{AllowedHosts: []string{"registry.npmjs.org"}},
})
if err != nil {
	return err
}
fmt.Println(workspace.ID)
return nil
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`Create`](#create) | Create a workspace | [`*Workspace`](#workspace) |
| [`List`](#list), `All` | List workspaces | [`*Page[Workspace]`](#workspace) |
| [`Get`](#get) | Get one workspace | [`*Workspace`](#workspace) |
| [`Update`](#update) | Change name, metadata, or network policy | [`*Workspace`](#workspace) |
| [`Delete`](#delete) | Permanently delete a workspace | `error` |

## Methods [#methods]

### `Create` [#create]

Creates a workspace. With zero params it is a tenant-level, unnamed Core workspace.

```go
workspace, err := client.Workspaces.Create(ctx, ba.CreateWorkspaceParams{Name: new("Release files")})
if err != nil {
	return err
}
fmt.Println(workspace.ID)
return nil
```

**Signature:** `func (s *WorkspacesService) Create(ctx context.Context, params CreateWorkspaceParams, opts ...RequestOption) (*Workspace, error)`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `Tier` | `*ba.WorkspaceTier` | `ba.WorkspaceTierCore` | Tier, fixed at creation. Core loses its files when the workspace stops; Plus keeps them while it is stopped |
| `Name` | `*string` | unnamed | Display name, up to 80 characters |
| `UserID` | `*string` | `""` | The end user who owns the workspace. Fixed after creation |
| `Metadata` | `ba.Metadata` | `{}` | Your own data |
| `NetworkPolicy` | `ba.NetworkPolicy` | `ba.NetworkPolicyUnrestricted{}` | Which hosts the workspace can reach |

`ba.NetworkPolicy` is `ba.NetworkPolicyUnrestricted{}`, `ba.NetworkPolicyAllowlist{AllowedHosts: hosts}` for a host allowlist such as `registry.npmjs.org`, `ba.NetworkPolicyOffline{}`, or `ba.UnknownNetworkPolicy` for a mode this SDK version does not know. An allowlist with no hosts fails client-side with `*ba.ArgumentError`.

Returns [`*ba.Workspace`](#workspace). Fails with `*ba.APIError` whose `Code` is [`validation_failed`](/api-reference/protocols/errors#validation_failed).

### `List` [#list]

Lists workspaces, newest first. The workspace reserved for the admin agent is never listed.

```go
page, err := client.Workspaces.List(ctx, ba.ListWorkspacesParams{UserID: new(""), Limit: new(50)})
if err != nil {
	return err
}
for _, workspace := range page.Data {
	fmt.Println(workspace.ID)
}
return nil
```

**Signature:** `func (s *WorkspacesService) List(ctx context.Context, params ListWorkspacesParams, opts ...RequestOption) (*Page[Workspace], error)`

| Field | Type | Description |
| --- | --- | --- |
| `UserID` | `*string` | Only workspaces of this end user; `new("")` selects tenant-level workspaces |
| `Cursor` | `*string` | The `NextCursor` of the previous page |
| `Limit` | `*int` | Page size, 1 to 200; defaults to 50 |

Returns [`*ba.Page[Workspace]`](#workspace); range over `All` with the same params to walk every page lazily. Fails with `validation_failed` or [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor).

### `Get` [#get]

Gets one workspace without starting it.

```go
workspace, err := client.Workspaces.Get(ctx, "ws_0123456789abcdef")
if err != nil {
	return err
}
fmt.Println(workspace.Tier)
return nil
```

**Signature:** `func (s *WorkspacesService) Get(ctx context.Context, workspaceID WorkspaceID, opts ...RequestOption) (*Workspace, error)`

Returns [`*ba.Workspace`](#workspace). Fails with `validation_failed` or [`workspace_not_found`](/api-reference/protocols/errors#workspace_not_found).

### `Update` [#update]

Changes a workspace's name, metadata, or network policy. Fields you leave unset keep their values; `Metadata` and `NetworkPolicy` replace their current values completely.

```go
workspace, err := client.Workspaces.Update(ctx, "ws_0123456789abcdef", ba.UpdateWorkspaceParams{
	Name: ba.Value("Release files v2"),
})
if err != nil {
	return err
}
fmt.Println(workspace.ID)
return nil
```

**Signature:** `func (s *WorkspacesService) Update(ctx context.Context, workspaceID WorkspaceID, params UpdateWorkspaceParams, opts ...RequestOption) (*Workspace, error)`

| Field | Type | Description |
| --- | --- | --- |
| `Name` | `ba.Nullable[string]` | `ba.Value(name)` sets a display name of up to 80 characters; `ba.Null[string]()` removes it |
| `Metadata` | `ba.Metadata` | Replaces the workspace's metadata completely |
| `NetworkPolicy` | `ba.NetworkPolicy` | Replaces the network policy. Switching between `ba.NetworkPolicyUnrestricted{}` and a restricted policy stops a running workspace, which applies the new policy on next use |

Returns [`*ba.Workspace`](#workspace). Fails with `validation_failed` or `workspace_not_found`.

### `Delete` [#delete]

Permanently deletes a workspace and all its files.

```go
if err := client.Workspaces.Delete(ctx, "ws_0123456789abcdef"); err != nil {
	return err
}
return nil
```

**Signature:** `func (s *WorkspacesService) Delete(ctx context.Context, workspaceID WorkspaceID, opts ...RequestOption) error`

Move attached agents to another workspace first. When the call returns, the workspace and its files are gone.

| Code | Meaning |
| --- | --- |
| [`workspace_in_use`](/api-reference/protocols/errors#workspace_in_use) | Agents still use it; `APIError.Details` holds their IDs under `agentIds` |
| `workspace_not_found` | No such workspace in your tenant |

## Response models [#response-models]

### `Workspace` [#workspace]

| Field | Type | Description |
| --- | --- | --- |
| `ID` | `ba.WorkspaceID` | Workspace ID (`ws_...`) |
| `TenantID` | `ba.TenantID` | Your tenant ID |
| `Tier` | `ba.WorkspaceTier` | `ba.WorkspaceTierCore` or `ba.WorkspaceTierPlus` |
| `Name` | `*string` | Display name, if any |
| `UserID` | `string` | End user, or `""` for tenant level |
| `Metadata` | `ba.Metadata` | Your own data |
| `NetworkPolicy` | `ba.NetworkPolicy` | Which hosts the workspace can reach |
| `CreatedAt`, `UpdatedAt` | `time.Time` | Timestamps |

## Next [#next]

- [Workspaces guide](/agents/workspaces)
- [Agents](/sdk/go/agents)
