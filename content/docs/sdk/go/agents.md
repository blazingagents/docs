---
title: Agents
description: Create, configure, pause, and delete agents with the Go SDK.
---

# Agents

`client.Agents` creates and configures your agents. You can pause an agent without losing its setup. Sessions and task runs save the configuration they start with.

Examples are function bodies that receive `ctx context.Context`, `client *ba.Client`, `agentID ba.AgentID`, and `sessionID ba.SessionID`, and return an `error`. Every method also takes the per-call options `ba.WithRequestTimeout`, `ba.WithRequestHeader`, `ba.WithClientRequestID`, and `ba.CaptureResponse`.

```go
provider, err := client.Providers.Create(ctx, ba.CreateProviderParams{
	Name:         "OpenRouter",
	ProviderType: ba.ProviderTypeOpenRouter,
	APIKey:       ba.NewSecret(os.Getenv("OPENROUTER_API_KEY")),
})
if err != nil {
	return err
}
agent, err := client.Agents.Create(ctx, ba.CreateAgentParams{
	Name:         "Release writer",
	ProviderID:   ba.Value(provider.ID),
	Model:        ba.Value("openai/gpt-6-luna"),
	Instructions: new("Write concise release notes."),
})
if err != nil {
	return err
}
fmt.Println(agent.ID, agent.Name)
return nil
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`Create`](#create) | Create an agent | `*Agent` |
| [`List`](#list), `All` | List agents | `*Page[Agent]` |
| [`Get`](#get) | Get the current configuration | `*Agent` |
| [`Update`](#update) | Change configuration | `*Agent` |
| [`Delete`](#delete) | Permanently delete an agent | `error` |
| [`Disable`](#disable) | Stop new turns | `*Agent` |
| [`Enable`](#enable) | Allow new turns again | `*Agent` |
| [`UploadAvatar`](#upload-avatar) | Set the avatar image | `*Agent` |
| [`RemoveAvatar`](#remove-avatar) | Remove the avatar | `*Agent` |
| [`ListMCPAttachments`](#list-mcp-attachments) | List MCP forwarding settings | `[]MCPAttachment` |
| [`UpdateMCPAttachment`](#update-mcp-attachment) | Change MCP forwarding settings | `*MCPAttachment` |
| [`SpendingLimits.GetAgent`](#get-spending-limit) | Get the agent's model spending limit | `*ModelSpendingLimitStatus` |
| [`SpendingLimits.UpdateAgent`](#update-spending-limit) | Set or turn off the agent's model spending limit | `*ModelSpendingLimitStatus` |

## Methods [#methods]

### `Create` [#create]

Creates an agent. `Name` is required; every other field of `ba.CreateAgentParams` is optional.

```go
agent, err := client.Agents.Create(ctx, ba.CreateAgentParams{
	Name:       "Support agent",
	ProviderID: ba.Value[ba.ProviderID]("prv_0123456789abcdef"),
	Model:      ba.Value("openai/gpt-6-luna"),
	Tools: []ba.AgentTool{
		ba.AgentToolRead,
		ba.AgentToolGrep,
		ba.AgentToolGlob,
		ba.AgentToolSaveMemory,
		ba.AgentToolSearchMemories,
	},
	UserID:   new("customer_123"),
	Metadata: ba.Metadata{"team": "support"},
})
if err != nil {
	return err
}
fmt.Println(agent.ID)
return nil
```

**Signature:** `func (s *AgentsService) Create(ctx context.Context, params CreateAgentParams, opts ...RequestOption) (*Agent, error)`

Returns [`*ba.Agent`](#agent).

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `Name` | `string` | required | Display name |
| `ProviderID`, `Model` | `ba.Nullable[ba.ProviderID]`, `ba.Nullable[string]` | none | Provider and its native model ID. Set both or neither |
| `ThinkingLevel` | `ba.Nullable[string]` | provider default | Reasoning level. Needs a provider and model, and must be a level the model supports. See [`ThinkingLevels`](/sdk/go/providers#get-thinking-levels) |
| `WorkspaceTier` | `*ba.WorkspaceTier` | `ba.WorkspaceTierCore` | Tier for a new workspace; cannot be combined with `WorkspaceID` |
| `WorkspaceID` | `*ba.WorkspaceID` | new workspace | Existing workspace to share instead of getting a new one |
| `Tools` | `[]ba.AgentTool` | none | Built-in tools to turn on, such as `ba.AgentToolRead`, `ba.AgentToolWriteTodos`, `ba.AgentToolSaveMemory`, or `ba.AgentToolWebSearch`. See [built-in tools](/agents/tools/built-in-tools) |
| `Instructions` | `*string` | `""` | System instructions, up to 3,000 characters |
| `MemoryInjectionEnabled` | `*bool` | `false` | Add the agent's memories to each turn's context automatically |
| `AutoCompaction` | `*bool` | `true` | Summarize older context when it nears the model's context window |
| `CompactionReserveTokens` | `*int` | `16384` | Tokens to keep free below the model's context window |
| `ApprovalInChat` | `*ba.ApprovalPolicy` | `ba.ApprovalModeFull` | Tool approval policy for chat and stateless calls |
| `ApprovalInTasks` | `*ba.ApprovalPolicy` | `ba.ApprovalModeFull` | Tool approval policy for task runs |
| `UserID` | `*string` | `""` | End user this agent belongs to; `""` means tenant level. Fixed after creation |
| `Metadata` | `ba.Metadata` | `{}` | Your own data |
| `MCPConnectionIDs` | `[]ba.MCPConnectionID` | none | Up to 10 MCP connections |

Without a model, the agent is saved unconfigured. `WorkspaceTier` chooses Core or Plus for a new workspace and defaults to Core. A workspace created for the agent stays independent afterwards: renaming the agent does not rename it.

The SDK checks a few combinations before it sends anything, and returns a `*ba.ArgumentError` when `ProviderID` and `Model` are not both set or both left out, when `ThinkingLevel` is set without a provider, or when both `WorkspaceTier` and `WorkspaceID` are set.

The Go SDK has no tool catalog. To build a tool picker, use the names, descriptions, and tags on the [built-in tools](/agents/tools/built-in-tools#read-tool-tags) page. `ba.AgentTool` is a string type with a constant per tool, so a tool this version does not know can still be sent as `ba.AgentTool("new_tool")`.

An approval policy is a `ba.ApprovalPolicy` with a `Default` decision and optional per-tool `Overrides`. Decisions are `ba.ApprovalModeFull`, `ba.ApprovalModeDeny`, `ba.ApprovalModeManual`, or `ba.ApprovalModeAuto`, and a tool reference is `ba.ToolReferenceBuiltin{Name: tool}` or `ba.ToolReferenceMCP{ConnectionID: id, Name: name}`. See [tool approvals](/agents/tools/tool-approvals) for what each decision does.

```go
agent, err := client.Agents.Create(ctx, ba.CreateAgentParams{
	Name:       "Careful operator",
	ProviderID: ba.Value[ba.ProviderID]("prv_0123456789abcdef"),
	Model:      ba.Value("openai/gpt-6-luna"),
	Tools:      []ba.AgentTool{ba.AgentToolRead, ba.AgentToolBash},
	ApprovalInChat: &ba.ApprovalPolicy{
		Default: ba.ApprovalModeFull,
		Overrides: []ba.ApprovalOverride{
			{Tool: ba.ToolReferenceBuiltin{Name: ba.AgentToolBash}, Decision: ba.ApprovalModeManual},
		},
	},
	ApprovalInTasks: &ba.ApprovalPolicy{Default: ba.ApprovalModeDeny},
})
if err != nil {
	return err
}
fmt.Println(agent.ID)
return nil
```

Fails with `*ba.APIError` whose `Code` is [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`provider_not_found`](/api-reference/protocols/errors#provider_not_found), [`model_not_found`](/api-reference/protocols/errors#model_not_found), [`model_validation_unavailable`](/api-reference/protocols/errors#model_validation_unavailable), [`agent_mcp_connection_not_found`](/api-reference/protocols/errors#agent_mcp_connection_not_found), or [`agent_mcp_connections_invalid`](/api-reference/protocols/errors#agent_mcp_connections_invalid).

### `List` [#list]

Lists your agents, most recently updated first.

```go
page, err := client.Agents.List(ctx, ba.ListAgentsParams{UserID: new(""), Limit: new(50)})
if err != nil {
	return err
}
for _, agent := range page.Data {
	fmt.Println(agent.ID, agent.Name)
}
if page.NextCursor != "" {
	nextPage, err := client.Agents.List(ctx, ba.ListAgentsParams{
		UserID: new(""),
		Cursor: new(page.NextCursor),
		Limit:  new(50),
	})
	if err != nil {
		return err
	}
	fmt.Println(len(nextPage.Data))
}
return nil
```

**Signature:** `func (s *AgentsService) List(ctx context.Context, params ListAgentsParams, opts ...RequestOption) (*Page[Agent], error)`

| Field | Type | Description |
| --- | --- | --- |
| `UserID` | `*string` | Only agents for this end user; `new("")` selects tenant-level agents, and nil returns all agents |
| `WorkspaceID` | `*ba.WorkspaceID` | Only agents that use this workspace |
| `Cursor` | `*string` | The `NextCursor` of the previous page |
| `Limit` | `*int` | Page size, 1 to 100; defaults to 50 |

Returns `*ba.Page[Agent]` with `Data` and `NextCursor`, which is `""` on the last page. Keep the same filters when paging. To walk every page lazily, range over `All` with the same params instead:

```go
for agent, err := range client.Agents.All(ctx, ba.ListAgentsParams{}) {
	if err != nil {
		return err
	}
	fmt.Println(agent.Name)
}
return nil
```

Nothing is sent until the loop starts, breaking out stops fetching, and ranging the sequence again starts over. Fails with `validation_failed`, [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor), or `not_found` when a `*ba.UserClient` filters by a workspace it does not own.

### `Get` [#get]

Gets an agent's current configuration.

```go
agent, err := client.Agents.Get(ctx, agentID)
if err != nil {
	return err
}
fmt.Println(agent.Name)
return nil
```

**Signature:** `func (s *AgentsService) Get(ctx context.Context, agentID AgentID, opts ...RequestOption) (*Agent, error)`

Returns [`*ba.Agent`](#agent). Fails with `validation_failed` for a malformed ID or [`not_found`](/api-reference/protocols/errors#not_found). An empty, `.`, or `..` ID fails client-side with `*ba.ArgumentError` before any request.

### `Update` [#update]

Changes an agent's current configuration.

```go
agent, err := client.Agents.Update(ctx, agentID, ba.UpdateAgentParams{
	Instructions: new("Write concise release notes and include migration steps."),
})
if err != nil {
	return err
}
fmt.Println(agent.Instructions)
return nil
```

**Signature:** `func (s *AgentsService) Update(ctx context.Context, agentID AgentID, params UpdateAgentParams, opts ...RequestOption) (*Agent, error)`

`ba.UpdateAgentParams` has every [`Create`](#create) field except `UserID` (fixed after creation) and `WorkspaceTier`, and its `Name` is a `*string` of 1 to 80 characters. Fields you leave unset keep their current value. Values you set replace the old ones completely: `Tools`, `MCPConnectionIDs`, `Metadata`, and each approval policy are full replacements, not patches. To clear a list, set it to an empty slice such as `[]ba.AgentTool{}`.

- To change the model on the current provider, set only `Model` and the provider is kept. To switch providers, set `ProviderID` and `Model` together. Setting `ProviderID` without `Model` fails client-side with `*ba.ArgumentError`.
- To unconfigure the agent, set `ProviderID: ba.Null[ba.ProviderID]()` and `Model: ba.Null[string]()`. When you leave `ThinkingLevel` unset, the SDK also sends a `null` thinking level, because the server rejects removing the provider while a thinking level remains.
- `ThinkingLevel: ba.Null[string]()` resets to the provider default.
- `WorkspaceID` moves the agent to another workspace. It cannot be cleared.

Every call sends a request, even with no fields set. Returns [`*ba.Agent`](#agent). Fails with `validation_failed`, `not_found`, `provider_not_found`, `model_not_found`, `agent_mcp_connection_not_found`, or `agent_mcp_connections_invalid`.

### `Delete` [#delete]

Permanently deletes an agent with its sessions, tasks, memories, [skills](/sdk/go/skills), and linked prompts. Its workspace, providers, and MCP connections are kept.

```go
return client.Agents.Delete(ctx, agentID, ba.DeleteAgentParams{IncludeArtifacts: false})
```

**Signature:** `func (s *AgentsService) Delete(ctx context.Context, agentID AgentID, params DeleteAgentParams, opts ...RequestOption) error`

`IncludeArtifacts` is always sent: `true` also deletes the agent's published artifacts, and `false` keeps them. Fails with `validation_failed` or `not_found`.

### `Disable` [#disable]

Stops an agent from starting new turns. Turns already running finish normally.

```go
agent, err := client.Agents.Disable(ctx, agentID)
if err != nil {
	return err
}
fmt.Println(agent.Status)
return nil
```

**Signature:** `func (s *AgentsService) Disable(ctx context.Context, agentID AgentID, opts ...RequestOption) (*Agent, error)`

Returns [`*ba.Agent`](#agent) with `Status` `ba.AgentStatusDisabled`. Calling it again is harmless. A disabled agent stays readable and editable, and new turns fail with [`agent_disabled`](/api-reference/protocols/errors#agent_disabled). Fails with `not_found`.

### `Enable` [#enable]

Lets a disabled agent start turns again.

```go
agent, err := client.Agents.Enable(ctx, agentID)
if err != nil {
	return err
}
fmt.Println(agent.Status)
return nil
```

**Signature:** `func (s *AgentsService) Enable(ctx context.Context, agentID AgentID, opts ...RequestOption) (*Agent, error)`

Returns [`*ba.Agent`](#agent) with `Status` `ba.AgentStatusActive`. Calling it again is harmless. Scheduled task runs skipped while the agent was disabled do not run afterwards. Fails with `not_found`.

### `UploadAvatar` [#upload-avatar]

Sets or replaces the agent's avatar.

```go
agent, err := client.Agents.UploadAvatar(ctx, agentID, ba.UploadFile("avatar.webp"))
if err != nil {
	return err
}
fmt.Println(agent.AvatarURL != nil)
return nil
```

**Signature:** `func (s *AgentsService) UploadAvatar(ctx context.Context, agentID AgentID, file Upload, opts ...RequestOption) (*Agent, error)`

The image is a PNG, JPEG, or WebP of at most 512 KiB. `ba.UploadFile(path)` streams the file from disk and takes the file name from the path; a file that does not open fails with `*ba.ArgumentError` before anything is sent. `ba.UploadBytes(name, data)` and `ba.UploadReader(name, r)` send an in-memory body or a reader under the name you give. The part's Content-Type comes from the file name's extension, and `.WithContentType(mime)` overrides it.

Returns [`*ba.Agent`](#agent) whose `AvatarURL` is a short-lived signed URL. Fails with `validation_failed` for a missing, oversized, or unsupported file, or `not_found`.

### `RemoveAvatar` [#remove-avatar]

Removes the avatar. Calling it again is harmless.

```go
agent, err := client.Agents.RemoveAvatar(ctx, agentID)
if err != nil {
	return err
}
fmt.Println(agent.AvatarURL == nil)
return nil
```

**Signature:** `func (s *AgentsService) RemoveAvatar(ctx context.Context, agentID AgentID, opts ...RequestOption) (*Agent, error)`

Returns [`*ba.Agent`](#agent) with a nil `AvatarURL`. Fails with `validation_failed` or `not_found`.

### `ListMCPAttachments` [#list-mcp-attachments]

Lists how the agent forwards end-user details to each of its MCP connections.

```go
attachments, err := client.Agents.ListMCPAttachments(ctx, agentID)
if err != nil {
	return err
}
for _, attachment := range attachments {
	fmt.Println(attachment.MCPConnectionID, attachment.ForwardUserID)
}
return nil
```

**Signature:** `func (s *AgentsService) ListMCPAttachments(ctx context.Context, agentID AgentID, opts ...RequestOption) ([]MCPAttachment, error)`

Returns one [`ba.MCPAttachment`](#mcpattachment) per connection in the agent's `MCPConnectionIDs`. Fails with `validation_failed` or `not_found`.

### `UpdateMCPAttachment` [#update-mcp-attachment]

Chooses whether the agent sends the end user's ID and selected metadata keys to one MCP connection.

```go
attachment, err := client.Agents.UpdateMCPAttachment(ctx, agentID, "mcp_0123456789abcdef", ba.UpdateMCPAttachmentParams{
	ForwardUserID:         new(true),
	ForwardedMetadataKeys: []string{"locale"},
})
if err != nil {
	return err
}
fmt.Println(attachment.ForwardedMetadataKeys)
return nil
```

**Signature:** `func (s *AgentsService) UpdateMCPAttachment(ctx context.Context, agentID AgentID, mcpConnectionID MCPConnectionID, params UpdateMCPAttachmentParams, opts ...RequestOption) (*MCPAttachment, error)`

| Field | Type | Description |
| --- | --- | --- |
| `ForwardUserID` | `*bool` | Send the turn's `userId` to the MCP server with every tool call |
| `ForwardedMetadataKeys` | `[]string` | Up to 32 unique turn metadata keys to send, of 1 to 64 characters each. Replaces the current list |

Fields you leave unset keep their values. Returns [`*ba.MCPAttachment`](#mcpattachment). Fails with `validation_failed` or `not_found`.

### `SpendingLimits.GetAgent` [#get-spending-limit]

Gets one agent's model spending limit and the current period. Spending limits live on the tenant-only `client.SpendingLimits`.

```go
budget, err := client.SpendingLimits.GetAgent(ctx, agentID)
if err != nil {
	return err
}
fmt.Println(budget.SpendingLimit != nil)
return nil
```

**Signature:** `func (s *SpendingLimitsService) GetAgent(ctx context.Context, agentID AgentID, opts ...RequestOption) (*ModelSpendingLimitStatus, error)`

Returns the same `*ba.ModelSpendingLimitStatus` as the [tenant method](/sdk/go/tenant#get-spending-limit).

### `SpendingLimits.UpdateAgent` [#update-spending-limit]

Sets one agent's dollar allowance for model tokens across all its sessions and tasks, or turns it off with a nil `SpendingLimit`. The account limit, if you set one, still applies too.

```go
_, err := client.SpendingLimits.UpdateAgent(ctx, agentID, ba.UpdateSpendingLimitParams{
	SpendingLimit: &ba.ModelSpendingLimit{
		AmountUSD:      5,
		ResetStartDate: ba.Date{Year: 2026, Month: time.October, Day: 1},
		ResetInterval:  ba.ResetIntervalWeekly,
	},
})
return err
```

**Signature:** `func (s *SpendingLimitsService) UpdateAgent(ctx context.Context, agentID AgentID, params UpdateSpendingLimitParams, opts ...RequestOption) (*ModelSpendingLimitStatus, error)`

See [model spending limits](/platform/usage-and-quotas#model-spending-limits). Returns `*ba.ModelSpendingLimitStatus`.

## Response models [#response-models]

### `Agent` [#agent]

| Field | Type | Description |
| --- | --- | --- |
| `ID` | `ba.AgentID` | Agent ID (`ag_...`) |
| `TenantID` | `ba.TenantID` | Your tenant ID |
| `Name` | `string` | Name |
| `ProviderID` | `*ba.ProviderID` | Provider, or nil when unconfigured |
| `Model` | `*string` | Model ID, or nil when unconfigured |
| `ThinkingLevel` | `*string` | Reasoning level, or nil for the provider default |
| `WorkspaceID` | `ba.WorkspaceID` | Attached workspace |
| `Tools` | `[]ba.AgentTool` | Built-in tools turned on for the agent |
| `Instructions` | `string` | System instructions |
| `MemoryInjectionEnabled` | `bool` | Whether memories are added automatically |
| `AutoCompaction` | `bool` | Whether older context is summarized automatically |
| `CompactionReserveTokens` | `int64` | Tokens kept free below the context window |
| `ApprovalInChat`, `ApprovalInTasks` | `*ba.ApprovalPolicy` | Tool approval policies, with `Default` and `Overrides` |
| `UserID` | `string` | End user, or `""` for tenant level |
| `Metadata` | `ba.Metadata` | Your own data |
| `MCPConnectionIDs` | `[]ba.MCPConnectionID` | Selected MCP connections |
| `AvatarURL` | `*string` | Short-lived avatar URL |
| `Status` | `ba.AgentStatus` | `ba.AgentStatusActive` or `ba.AgentStatusDisabled` |
| `CreatedAt`, `UpdatedAt` | `time.Time` | Timestamps |

### `MCPAttachment` [#mcpattachment]

| Field | Type | Description |
| --- | --- | --- |
| `MCPConnectionID` | `ba.MCPConnectionID` | MCP connection |
| `ForwardUserID` | `bool` | Whether the turn's `userId` is sent |
| `ForwardedMetadataKeys` | `[]string` | Metadata keys that are sent |
| `CreatedAt`, `UpdatedAt` | `time.Time` | Timestamps |

## Next [#next]

- [Agents guide](/agents/agents)
- [Configuration snapshots and lifecycle](/agents/configuration-snapshots)
- [Providers](/sdk/go/providers)
