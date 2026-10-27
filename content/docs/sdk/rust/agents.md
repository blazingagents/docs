---
title: Agents
description: Create, configure, pause, and delete agents with the Rust SDK.
---

# Agents

`client.agents()` creates and configures your agents. You can pause an agent without losing its setup. Sessions and task runs save the configuration they start with.

Examples receive a `client: blazing_agents::Client`. Every call also takes the `with_timeout`, `without_timeout`, `with_header`, and `with_client_request_id` transport options.

In a route that serves a signed-in end user, call these methods on the [scoped client](/sdk/rust/client#for-user) from `client.for_user()`, which returns only that user's agents. The tenant client sees every user's agents and is for your backend's administration, such as adding the provider in this first example.

```rust
use blazing_agents::providers::ProviderType;

let provider = client
    .providers()
    .create(
        "OpenRouter",
        ProviderType::OpenRouter,
        std::env::var("OPENROUTER_API_KEY")?,
    )
    .await?;
let agent = client
    .agents()
    .create("Release writer")
    .model(&provider.id, "openai/gpt-6-luna")
    .instructions("Write concise release notes.")
    .await?;
println!("{} {}", agent.id, agent.name);
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create an agent | `Agent` |
| [`list()`](#list) | List agents | `Page<Agent>` |
| [`get()`](#get) | Get the current configuration | `Agent` |
| [`update()`](#update) | Change configuration | `Agent` |
| [`delete()`](#delete) | Permanently delete an agent | `()` |
| [`disable()`](#disable) | Stop new turns | `Agent` |
| [`enable()`](#enable) | Allow new turns again | `Agent` |
| [`upload_avatar()`](#upload-avatar) | Set the avatar image | `Agent` |
| [`remove_avatar()`](#remove-avatar) | Remove the avatar | `Agent` |
| [`list_mcp_attachments()`](#list-mcp-attachments) | List MCP forwarding settings | `McpAttachmentList` |
| [`update_mcp_attachment()`](#update-mcp-attachment) | Change MCP forwarding settings | `McpAttachment` |
| [`get_spending_limit()`](#get-spending-limit) | Get the agent's model spending limit | `SpendingLimitStatus` |
| [`update_spending_limit()`](#update-spending-limit) | Set or turn off the agent's model spending limit | `SpendingLimitStatus` |

## Methods [#methods]

### `create()` [#create]

Creates an agent. `name` is required; every other input is a setter on the call.

```rust
use blazing_agents::agents::AgentTool;
use blazing_agents::types::Metadata;

let user = client.for_user("user_0123456789abcdef")?;
let agent = user
    .agents()
    .create("Support agent")
    .model("prv_0123456789abcdef", "openai/gpt-6-luna")
    .tools([
        AgentTool::Read,
        AgentTool::Grep,
        AgentTool::Glob,
        AgentTool::SaveMemory,
        AgentTool::SearchMemories,
    ])
    .metadata(Metadata::new().insert("team", "support"))
    .await?;
```

**Signature:** `create(name: impl Into<String>) -> Call<CreateAgent>`

Awaiting returns [`Agent`](#agent).

| Setter | Type | Default | Description |
| --- | --- | --- | --- |
| `model(provider_id, model)` | `impl Into<ProviderId>`, `impl Into<String>` | none | Provider and its native model ID, sent together |
| `thinking_level` | `impl Into<String>` | provider default | Reasoning level. Needs a provider and model, and must be a level the model supports. See [`get_thinking_levels()`](/sdk/rust/providers#get-thinking-levels) |
| `workspace_tier` | `WorkspaceTier` | `WorkspaceTier::Core` | Tier for a new workspace; mutually exclusive with `workspace_id`, the setter called last wins |
| `workspace_id` | `impl Into<WorkspaceId>` | new workspace | Existing workspace to share instead of getting a new one |
| `tools` | `impl IntoIterator<Item = AgentTool>` | `[]` | Built-in tools, each turned on by variant, such as `AgentTool::Read`, `AgentTool::WriteTodos`, `AgentTool::SaveMemory`, or `AgentTool::WebSearch`. See [built-in tools](/agents/tools/built-in-tools) |
| `instructions` | `impl Into<String>` | `""` | System instructions, within the [agent field limits](/api-reference/protocols/service-limits#agent-fields) |
| `memory_injection_enabled` | `bool` | `false` | Add the agent's memories to each turn's context automatically |
| `auto_compaction` | `bool` | `true` | Summarize older context when it nears the model's context window |
| `compaction_reserve_tokens` | `u64` | `16384` | Tokens to keep free below the model's context window |
| `approval_in_chat` | `ApprovalPolicy` | `ApprovalPolicy::default()` | Tool approval policy for chat and stateless calls |
| `approval_in_tasks` | `ApprovalPolicy` | `ApprovalPolicy::default()` | Tool approval policy for task runs |
| `user_id` | `impl Into<String>` | `""`, or the scoped user on a `UserClient` | End user this agent belongs to; `""` means tenant level. Fixed after creation |
| `metadata` | `Metadata` | `{}` | Your own data |
| `mcp_connection_ids` | `impl IntoIterator<Item = impl Into<McpConnectionId>>` | `[]` | MCP connections, within the [per-agent limit](/api-reference/protocols/service-limits#mcp-connections-per-agent) |

Without `model`, the agent is saved unconfigured. Without `workspace_id`, the agent gets a new workspace that belongs to the same end user as the agent. `workspace_tier` chooses Core or Plus for a new workspace and defaults to Core. It cannot combine with `workspace_id`. A workspace created for the agent stays independent afterwards: renaming the agent does not rename it.

To build a tool picker, read `agent_tools::AGENT_TOOLS`. Each `AgentToolDefinition` has the tool's `name`, `description`, `requires_workspace`, `group`, and `file_access`. `group` is an `AgentToolGroupTag`, and `agent_tools::AGENT_TOOL_GROUPS` holds a display name and description for each one. A file tool's `file_access` is `Some(AgentToolFileAccessTag::FileRead)`, `FileWrite`, or `Execute`, and every other tool's is `None`, so filtering on `tool.file_access == Some(AgentToolFileAccessTag::FileRead)` gives the read-only file tools. Tags only describe tools; `tools` accepts tool names. See [tool tags](/agents/tools/built-in-tools#read-tool-tags).

An approval policy is `ApprovalPolicy::new(default)` with `with_override(tool, decision)` per tool. Decisions are `ApprovalDecision::Full`, `Deny`, `Manual`, or `Auto`, and a tool reference is `ToolReference::builtin(tool)` or `ToolReference::mcp(connection_id, name)`. `builtin` takes an `AgentTool` or `BuiltinToolName::ActivateSkill`, which an agent with skills has without listing it in `tools`. See [tool approvals](/agents/tools/tool-approvals) for what each decision does.

```rust
use blazing_agents::agents::{AgentTool, ApprovalDecision, ApprovalPolicy, ToolReference};

let agent = client
    .agents()
    .create("Careful operator")
    .model("prv_0123456789abcdef", "openai/gpt-6-luna")
    .tools([AgentTool::Read, AgentTool::Bash])
    .approval_in_chat(
        ApprovalPolicy::new(ApprovalDecision::Full)
            .with_override(ToolReference::builtin(AgentTool::Bash), ApprovalDecision::Manual),
    )
    .approval_in_tasks(ApprovalPolicy::new(ApprovalDecision::Deny))
    .await?;
```

Fails with `Error::Api` whose code is [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`provider_not_found`](/api-reference/protocols/errors#provider_not_found), [`model_not_found`](/api-reference/protocols/errors#model_not_found), [`model_validation_unavailable`](/api-reference/protocols/errors#model_validation_unavailable), [`agent_mcp_connection_not_found`](/api-reference/protocols/errors#agent_mcp_connection_not_found), [`agent_mcp_connections_invalid`](/api-reference/protocols/errors#agent_mcp_connections_invalid), or [`workspace_not_found`](/api-reference/protocols/errors#workspace_not_found) when `workspace_id` names a workspace you cannot see, such as another user's on a `UserClient`.

### `list()` [#list]

Lists your agents, newest first. This tenant-admin view selects tenant-level agents; a `UserClient` returns only its user's agents.

```rust
let page = client.agents().list().user_id("").limit(50).await?;
for agent in &page.data {
    println!("{} {}", agent.id, agent.name);
}
if let Some(cursor) = page.next_cursor.clone() {
    let next_page = client
        .agents()
        .list()
        .user_id("")
        .cursor(cursor)
        .limit(50)
        .await?;
}
```

**Signature:** `list() -> Call<ListAgents>`

| Setter | Type | Description |
| --- | --- | --- |
| `user_id` | `impl Into<String>` | Only agents for this end user; `""` selects tenant-level agents, and unset returns all agents |
| `workspace_id` | `impl Into<WorkspaceId>` | Only agents that use this workspace |
| `limit` | `u8` | Page size, within the [agent page limit](/api-reference/protocols/service-limits#agent-page) |

Awaiting returns `Page<Agent>` with `data` and `next_cursor`. Keep the same filters when paging. To walk every page lazily, call `.pages()` or `.items()` on the call instead of awaiting it:

```rust
use futures_util::TryStreamExt;

let mut items = client.agents().list().items();
while let Some(agent) = items.try_next().await? {
    println!("{}", agent.name);
}
```

Fails with `validation_failed`, [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor), or `not_found` when a `UserClient` filters by a workspace it does not own.

### `get()` [#get]

Gets an agent's current configuration.

```rust
let user = client.for_user("user_0123456789abcdef")?;
let agent = user.agents().get("ag_0123456789abcdef").await?;
```

**Signature:** `get(agent_id: impl Into<AgentId>) -> Call<GetAgent>`

Awaiting returns [`Agent`](#agent). Fails with `validation_failed` for a malformed ID or [`not_found`](/api-reference/protocols/errors#not_found). An empty or `..` ID fails client-side with `Error::InvalidArgument` before any request.

### `update()` [#update]

Changes an agent's current configuration.

```rust
let agent = client
    .agents()
    .update("ag_0123456789abcdef")
    .instructions("Write concise release notes and include migration steps.")
    .await?;
```

**Signature:** `update(agent_id: impl Into<AgentId>) -> Call<UpdateAgent>`

Accepts every [`create()`](#create) setter except `user_id` (fixed after creation) and `workspace_tier`, plus `name` (within the [agent field limits](/api-reference/protocols/service-limits#agent-fields)), `model_on_current_provider`, `clear_model`, and `clear_thinking_level` for the nullable provider fields. Setters you do not call keep their current value. Supplied values replace the old ones completely: `tools`, `mcp_connection_ids`, `metadata`, and each approval policy are full replacements, not patches.

- To change the model on the current provider, call `model_on_current_provider(model)` and the provider is kept. To switch providers, call `model(provider_id, model)` with both values.
- To unconfigure the agent, `clear_model()` removes the provider, model, and thinking level together. The server rejects removing the provider while a thinking level remains.
- `clear_thinking_level()` resets to the provider default.
- `workspace_id` moves the agent to another workspace. It cannot be cleared.

Awaiting always sends a request, even with no setters. Awaiting returns [`Agent`](#agent). Fails with `validation_failed`, `not_found`, `provider_not_found`, `model_not_found`, `agent_mcp_connection_not_found`, or `agent_mcp_connections_invalid`.

### `delete()` [#delete]

Permanently deletes an agent with its sessions, tasks, memories, [skills](/sdk/rust/skills), and linked prompts. Its workspace, providers, and MCP connections are kept.

```rust
client.agents().delete("ag_0123456789abcdef", false).await?;
```

**Signature:** `delete(agent_id: impl Into<AgentId>, include_artifacts: bool) -> Call<DeleteAgent>`

`include_artifacts` is required: `true` also deletes the agent's published artifacts, and `false` keeps them. Fails with [`agent_busy`](/api-reference/protocols/errors#agent_busy) (HTTP `409`) while the agent has a running turn or a queued or running task run; stop that work or wait for it, then delete again. Fails with [`admin_agent_managed`](/api-reference/protocols/errors#admin_agent_managed) (HTTP `409`) for the admin agent, and with `validation_failed` or `not_found`.

### `disable()` [#disable]

Stops an agent from starting new turns. Turns already running finish normally.

```rust
let agent = client.agents().disable("ag_0123456789abcdef").await?;
```

**Signature:** `disable(agent_id: impl Into<AgentId>) -> Call<DisableAgent>`

Awaiting returns [`Agent`](#agent) with `status` `AgentStatus::Disabled`. Calling it again is harmless. A disabled agent stays readable and editable, and new turns fail with [`agent_disabled`](/api-reference/protocols/errors#agent_disabled). Fails with `not_found`.

### `enable()` [#enable]

Lets a disabled agent start turns again.

```rust
let agent = client.agents().enable("ag_0123456789abcdef").await?;
```

**Signature:** `enable(agent_id: impl Into<AgentId>) -> Call<EnableAgent>`

Awaiting returns [`Agent`](#agent) with `status` `AgentStatus::Active`. Calling it again is harmless. Scheduled task runs skipped while the agent was disabled do not run afterwards. Fails with `not_found`.

### `upload_avatar()` [#upload-avatar]

Sets or replaces the agent's avatar.

```rust
use blazing_agents::files::Upload;

let agent = client
    .agents()
    .upload_avatar("ag_0123456789abcdef", Upload::file("avatar.webp").await?)
    .await?;
```

**Signature:** `upload_avatar(agent_id: impl Into<AgentId>, avatar: Upload) -> Call<UploadAgentAvatar>`

The image is a PNG, JPEG, or WebP within the [avatar upload limit](/api-reference/protocols/service-limits#agent-avatar-upload). `Upload::file(path)` streams the file from disk and takes the file name from the path; `Upload::bytes(bytes)` sends an in-memory body and needs `.file_name("avatar.webp")`, since the part's Content-Type comes from the file name's extension. `Upload::content_type(mime)` overrides the guess.

Awaiting returns [`Agent`](#agent) whose `avatar_url` is a short-lived signed URL. Fails with `validation_failed` for a missing, oversized, or unsupported file, or `not_found`.

### `remove_avatar()` [#remove-avatar]

Removes the avatar. Calling it again is harmless.

```rust
let agent = client.agents().remove_avatar("ag_0123456789abcdef").await?;
```

**Signature:** `remove_avatar(agent_id: impl Into<AgentId>) -> Call<DeleteAgentAvatar>`

Awaiting returns [`Agent`](#agent) with `avatar_url` `None`. Fails with `validation_failed` or `not_found`.

### `list_mcp_attachments()` [#list-mcp-attachments]

Lists how the agent forwards end-user details to each of its MCP connections.

```rust
let attachments = client
    .agents()
    .list_mcp_attachments("ag_0123456789abcdef")
    .await?
    .mcp_attachments;
```

**Signature:** `list_mcp_attachments(agent_id: impl Into<AgentId>) -> Call<ListAgentMcpAttachments>`

Awaiting returns `McpAttachmentList`, whose `mcp_attachments` field is a `Vec<McpAttachment>` with one entry per connection in the agent's `mcp_connection_ids`. Fails with `validation_failed` or `not_found`.

### `update_mcp_attachment()` [#update-mcp-attachment]

Chooses whether the agent sends the end user's ID and selected metadata keys to one MCP connection.

```rust
let attachment = client
    .agents()
    .update_mcp_attachment("ag_0123456789abcdef", "mcp_0123456789abcdef")
    .forward_user_id(true)
    .forwarded_metadata_keys(["locale"])
    .await?;
```

**Signature:** `update_mcp_attachment(agent_id: impl Into<AgentId>, mcp_connection_id: impl Into<McpConnectionId>) -> Call<UpdateAgentMcpAttachment>`

| Setter | Type | Description |
| --- | --- | --- |
| `forward_user_id` | `bool` | Send the turn's `user_id` to the MCP server with every tool call |
| `forwarded_metadata_keys` | `impl IntoIterator<Item = impl Into<String>>` | Unique turn metadata keys to send, within the [forwarded metadata limit](/api-reference/protocols/service-limits#mcp-forwarded-metadata). Replaces the current list |

Setters you do not call keep their values. Awaiting returns [`McpAttachment`](#mcpattachment). Fails with `validation_failed` or `not_found`.

### `get_spending_limit()` [#get-spending-limit]

Gets one agent's model spending limit and the current period. Tenant only: a `UserClient` has no spending limit methods.

```rust
let budget = client
    .agents()
    .get_spending_limit("ag_0123456789abcdef")
    .await?;
```

**Signature:** `get_spending_limit(agent_id: impl Into<AgentId>) -> Call<GetAgentSpendingLimit>`

Awaiting returns the same `SpendingLimitStatus` as the [tenant method](/sdk/rust/tenant#get-spending-limit).

### `update_spending_limit()` [#update-spending-limit]

Sets one agent's dollar allowance for model tokens across all its sessions and tasks, or turns it off with `None`. The account limit, if you set one, still applies too. Tenant only.

```rust
use blazing_agents::spending_limits::{ResetInterval, SpendingLimitInput};

client
    .agents()
    .update_spending_limit(
        "ag_0123456789abcdef",
        Some(SpendingLimitInput::new(
            5.0,
            "2026-10-01",
            ResetInterval::Weekly,
        )),
    )
    .await?;
```

**Signature:** `update_spending_limit(agent_id: impl Into<AgentId>, limit: Option<SpendingLimitInput>) -> Call<UpdateAgentSpendingLimit>`

See [model spending limits](/platform/usage-and-spending-limits#model-spending-limits). Awaiting returns `SpendingLimitStatus`.

## Response models [#response-models]

### `Agent` [#agent]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `AgentId` | Agent ID (`ag_...`) |
| `tenant_id` | `TenantId` | Your tenant ID |
| `name` | `String` | Name |
| `provider_id` | `Option<ProviderId>` | Provider, or `None` when unconfigured |
| `model` | `Option<String>` | Model ID, or `None` when unconfigured |
| `thinking_level` | `Option<String>` | Reasoning level, or `None` for the provider default |
| `workspace_id` | `WorkspaceId` | Attached workspace |
| `tools` | `Vec<AgentTool>` | Built-in tools turned on for the agent |
| `instructions` | `String` | System instructions |
| `memory_injection_enabled` | `bool` | Whether memories are added automatically |
| `auto_compaction` | `bool` | Whether older context is summarized automatically |
| `compaction_reserve_tokens` | `u64` | Tokens kept free below the context window |
| `approval_in_chat`, `approval_in_tasks` | `ApprovalPolicy` | Tool approval policies, with `default` and `overrides` |
| `user_id` | `String` | End user, or `""` for tenant level |
| `metadata` | `Metadata` | Your own data |
| `mcp_connection_ids` | `Vec<McpConnectionId>` | Selected MCP connections |
| `avatar_url` | `Option<String>` | Short-lived avatar URL |
| `status` | `AgentStatus` | `Active` or `Disabled` |
| `created_at`, `updated_at` | `Timestamp` | Timestamps |

### `McpAttachment` [#mcpattachment]

| Field | Type | Description |
| --- | --- | --- |
| `mcp_connection_id` | `McpConnectionId` | MCP connection |
| `forward_user_id` | `bool` | Whether the turn's `user_id` is sent |
| `forwarded_metadata_keys` | `Vec<String>` | Metadata keys that are sent |
| `created_at`, `updated_at` | `Timestamp` | Timestamps |

## Next [#next]

- [Agents guide](/agents/agents)
- [Configuration snapshots and lifecycle](/agents/configuration-snapshots)
- [Providers](/sdk/rust/providers)
