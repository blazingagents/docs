---
title: Agents
description: Create, configure, pause, and delete agents with the TypeScript SDK.
---

# Agents

`client.agents` creates, configures, and pauses your agents. To learn what an agent is and how to design one, read [Agents](/agents/agents).

```typescript
const agent = await client.agents.create({
  name: "Release writer",
  providerId: "prv_0123456789abcdef",
  model: "openai/gpt-6-luna",
  instructions: "Write concise release notes.",
  tools: ["workspace"],
});
```

Every method takes one input object and accepts an optional `abortSignal`. New sessions and task runs save the current configuration when they start. See [Configuration snapshots and lifecycle](/agents/configuration-snapshots).

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create an agent | `Agent` |
| [`list()`](#list) | List agents | `AgentsResponse` |
| [`get()`](#get) | Read an agent's current configuration | `Agent` |
| [`update()`](#update) | Change configuration | `Agent` |
| [`delete()`](#delete) | Delete an agent for good | `void` |
| [`disable()`](#disable) | Stop new turns | `Agent` |
| [`enable()`](#enable) | Allow turns again | `Agent` |
| [`uploadAvatar()`](#upload-avatar) | Set the avatar image | `Agent` |
| [`removeAvatar()`](#remove-avatar) | Remove the avatar | `Agent` |
| [`listMcpAttachments()`](#list-mcp-attachments) | Read what each MCP connection receives | `McpAttachmentsResponse` |
| [`updateMcpAttachment()`](#update-mcp-attachment) | Choose what an MCP connection receives | `McpAttachmentResponse` |

## Methods [#methods]

### `create()` [#create]

Creates an agent.

**Signature:** `create(input: CreateAgentBody & ResourceRequestOptions): Promise<Agent>`

```typescript
const agent = await client.agents.create({
  name: "Release writer",
  providerId: "prv_0123456789abcdef",
  model: "openai/gpt-6-luna",
  instructions: "Write concise release notes.",
});
```

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `name` | `string` | yes | none | Display name, 1 to 80 characters. Agents can share a name |
| `providerId` | `string \| null` | no | `null` | Provider that runs the model; set together with `model` |
| `model` | `string \| null` | no | `null` | Model ID as your provider names it |
| `thinkingLevel` | `string \| null` | no | `null` | Reasoning level; `null` uses the provider's default. See [thinking level](/agents/providers-and-models#thinking-level) |
| `instructions` | `string` | no | `""` | System instructions, up to 3,000 characters |
| `tools` | `AgentToolGroupId[]` | no | `[]` | Tool groups: `"workspace"`, `"write_todos"`, `"memory"` |
| `mcpConnectionIds` | `string[]` | no | `[]` | Up to 10 MCP connections |
| `workspaceId` | `string` | no | new workspace | Existing workspace to share |
| `memoryInjectionEnabled` | `boolean` | no | `false` | Add relevant memories to each turn automatically |
| `autoCompaction` | `boolean` | no | `true` | Summarize older context when the conversation nears the model's limit |
| `compactionReserveTokens` | `number` | no | `16384` | Tokens kept free below the model's context window |
| `approvalInChat` | `ApprovalPolicy` | no | `{ default: "full" }` | Tool approval policy for chat and stateless turns |
| `approvalInTasks` | `ApprovalPolicy` | no | `{ default: "full" }` | Tool approval policy for task runs |
| `userId` | `string` | no | `""` | The end user this agent belongs to; cannot change later |
| `metadata` | `Record<string, unknown>` | no | `{}` | Your own labels |

Set `providerId` and `model` together, or leave both out to create an agent you configure later. Turns on an agent without a model fail with [`provider_required`](/api-reference/protocols/errors#provider_required). Blazing Agents checks the model against your provider when you save.

Without `workspaceId`, the agent gets a new workspace of its own named after it. Pass an ID to share an existing workspace. Changing the agent later does not rename its workspace.

An `ApprovalPolicy` has a `default` decision and optional `overrides` for single tools. Decisions are `"full"`, `"deny"`, `"manual"`, or `"auto"`. See [tool approvals](/agents/tools/tool-approvals#approval-policies).

```typescript
await client.agents.create({
  name: "Careful operator",
  providerId: "prv_0123456789abcdef",
  model: "openai/gpt-6-luna",
  tools: ["workspace"],
  approvalInChat: {
    default: "full",
    overrides: [{ tool: { type: "builtin", name: "bash" }, decision: "manual" }],
  },
  approvalInTasks: { default: "deny" },
});
```

Returns [`Agent`](#agent). Errors include [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`provider_not_found`](/api-reference/protocols/errors#provider_not_found), [`model_not_found`](/api-reference/protocols/errors#model_not_found), [`agent_mcp_connection_not_found`](/api-reference/protocols/errors#agent_mcp_connection_not_found), and [`agent_mcp_connections_invalid`](/api-reference/protocols/errors#agent_mcp_connections_invalid).

### `list()` [#list]

Lists your agents, most recently updated first, one page at a time.

**Signature:** `list(input?: AgentsListOptions): Promise<AgentsResponse>`

```typescript
const page = await client.agents.list({ userId: "user_123", limit: 50 });
for (const agent of page.data) console.log(agent.id, agent.name);
const next = page.nextCursor
  ? await client.agents.list({ userId: "user_123", cursor: page.nextCursor, limit: 50 })
  : null;
```

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `userId` | `string` | no | Only agents for this end user; `""` for tenant-level agents |
| `workspaceId` | `string` | no | Only agents that use this workspace |
| `cursor` | `string` | no | `nextCursor` from the previous page |
| `limit` | `number` | no | Page size, 1 to 100; defaults to 50 |

Returns `{ data: Agent[], nextCursor: string | null }`. Keep the same filters when paging. Errors: `validation_failed`, `invalid_cursor`.

### `get()` [#get]

Reads an agent's current configuration.

**Signature:** `get(input: { agentId: string } & ResourceRequestOptions): Promise<Agent>`

```typescript
const agent = await client.agents.get({ agentId });
```

Returns [`Agent`](#agent). Errors: `validation_failed`, [`not_found`](/api-reference/protocols/errors#not_found).

### `update()` [#update]

Changes one or more settings.

**Signature:** `update(input: UpdateAgentBody & { agentId: string } & ResourceRequestOptions): Promise<Agent>`

```typescript
const agent = await client.agents.update({
  agentId,
  instructions: "Write concise release notes and include migration steps.",
});
```

Takes `agentId` plus any [`create()`](#create) field except `userId`. Pass at least one field.

- Fields you leave out keep their current value.
- Arrays such as `tools` and `mcpConnectionIds` replace the whole list.
- A supplied approval policy replaces the whole policy; leaving out `overrides` clears them.
- `thinkingLevel: null` goes back to the provider's default.
- To switch providers, send `providerId` and `model` together. To unconfigure the agent, send both as `null`.
- `workspaceId` moves the agent to another workspace. It cannot be cleared.

Returns [`Agent`](#agent). Errors: `validation_failed`, `not_found`, `provider_not_found`, `model_not_found`, `agent_mcp_connection_not_found`, `agent_mcp_connections_invalid`, [`admin_agent_managed`](/api-reference/protocols/errors#admin_agent_managed).

### `delete()` [#delete]

Deletes an agent and its history for good. You choose whether its published artifacts go too.

**Signature:** `delete(input: { agentId: string; includeArtifacts: boolean } & ResourceRequestOptions): Promise<void>`

```typescript
await client.agents.delete({ agentId, includeArtifacts: false });
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |
| `includeArtifacts` | `boolean` | yes | `true` deletes the agent's artifacts; `false` keeps them |

The agent's workspace stays. Delete it with [`workspaces.delete()`](/sdk/typescript/workspaces#delete) if nothing else uses it. Errors: `validation_failed`, `not_found`, `admin_agent_managed`.

### `disable()` [#disable]

Stops the agent from starting new turns. Turns already running finish.

**Signature:** `disable(input: { agentId: string } & ResourceRequestOptions): Promise<Agent>`

```typescript
const agent = await client.agents.disable({ agentId });
```

New turns fail with [`agent_disabled`](/api-reference/protocols/errors#agent_disabled), and scheduled task runs are skipped. You can still read and update a disabled agent. Returns [`Agent`](#agent) with `status: "disabled"`. Errors: `not_found`, `admin_agent_managed`.

### `enable()` [#enable]

Lets a disabled agent run turns again.

**Signature:** `enable(input: { agentId: string } & ResourceRequestOptions): Promise<Agent>`

```typescript
const agent = await client.agents.enable({ agentId });
```

Schedule fires skipped while the agent was disabled do not run later. Returns [`Agent`](#agent) with `status: "active"`. Errors: `not_found`, `admin_agent_managed`.

### `uploadAvatar()` [#upload-avatar]

Sets or replaces the agent's avatar image.

**Signature:** `uploadAvatar(input: { agentId: string; file: File } & ResourceRequestOptions): Promise<Agent>`

```typescript
import { readFile } from "node:fs/promises";

const agent = await client.agents.uploadAvatar({
  agentId,
  file: new File([await readFile("avatar.webp")], "avatar.webp", { type: "image/webp" }),
});
```

`file` is a PNG, JPEG, or WebP image of at most 512 KiB. Returns [`Agent`](#agent) with a short-lived `avatarUrl`; fetch the agent again for a fresh URL. Errors: `validation_failed`, `not_found`, `admin_agent_managed`.

### `removeAvatar()` [#remove-avatar]

Removes the avatar. Calling it on an agent without one succeeds.

**Signature:** `removeAvatar(input: { agentId: string } & ResourceRequestOptions): Promise<Agent>`

```typescript
const agent = await client.agents.removeAvatar({ agentId });
```

Returns [`Agent`](#agent) with `avatarUrl: null`. Errors: `validation_failed`, `not_found`, `admin_agent_managed`.

### `listMcpAttachments()` [#list-mcp-attachments]

Shows, for each MCP connection the agent uses, whether it receives the end user's ID and which metadata keys.

**Signature:** `listMcpAttachments(input: { agentId: string } & ResourceRequestOptions): Promise<McpAttachmentsResponse>`

```typescript
const { mcpAttachments } = await client.agents.listMcpAttachments({ agentId });
```

Returns `{ mcpAttachments: McpAttachmentResponse[] }`. Errors: `validation_failed`, `not_found`.

### `updateMcpAttachment()` [#update-mcp-attachment]

Chooses what one MCP connection receives about the end user on each tool call.

**Signature:** `updateMcpAttachment(input: UpdateMcpAttachmentBody & { agentId: string; mcpConnectionId: string } & ResourceRequestOptions): Promise<McpAttachmentResponse>`

```typescript
const attachment = await client.agents.updateMcpAttachment({
  agentId,
  mcpConnectionId,
  forwardUserId: true,
  forwardedMetadataKeys: ["locale"],
});
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |
| `mcpConnectionId` | `string` | yes | An MCP connection in the agent's `mcpConnectionIds` |
| `forwardUserId` | `boolean` | no | Send the turn's `userId` |
| `forwardedMetadataKeys` | `string[]` | no | Turn metadata keys to send; up to 32 unique keys of at most 64 characters |

Pass at least one of the two settings. Returns [`McpAttachmentResponse`](#mcpattachmentresponse). Errors: `validation_failed`, `not_found`. See [MCP tools](/agents/tools/mcp-tools).

## Response types [#response-types]

### `Agent` [#agent]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Agent ID (`ag_…`) |
| `tenantId` | `string` | Your tenant ID |
| `name` | `string` | Agent name |
| `providerId` | `string \| null` | Provider, or `null` when unconfigured |
| `model` | `string \| null` | Model ID, or `null` when unconfigured |
| `thinkingLevel` | `string \| null` | Reasoning level, or `null` for the provider's default |
| `instructions` | `string` | System instructions |
| `tools` | `AgentToolGroupId[]` | Tool groups |
| `mcpConnectionIds` | `string[]` | MCP connections |
| `workspaceId` | `string` | The agent's workspace |
| `memoryInjectionEnabled` | `boolean` | Automatic memory injection |
| `autoCompaction` | `boolean` | Automatic context compaction |
| `compactionReserveTokens` | `number` | Tokens kept free for compaction |
| `approvalInChat` | `ApprovalPolicy` | Chat approval policy, with `overrides` always present |
| `approvalInTasks` | `ApprovalPolicy` | Task approval policy, with `overrides` always present |
| `userId` | `string` | The end user this agent belongs to, or `""` |
| `metadata` | `Record<string, unknown>` | Your labels |
| `avatarUrl` | `string \| null` | Short-lived avatar URL, or `null` |
| `status` | `"active" \| "disabled"` | Whether new turns can start |
| `createdAt` | `string` | ISO 8601 timestamp |
| `updatedAt` | `string` | ISO 8601 timestamp |

`AgentsResponse` is `{ data: Agent[], nextCursor: string | null }`. The package exports `Agent`, `ApprovalPolicy`, `ApprovalDecision`, and `ToolReference`.

### `McpAttachmentResponse` [#mcpattachmentresponse]

| Field | Type | Description |
| --- | --- | --- |
| `mcpConnectionId` | `string` | MCP connection ID |
| `forwardUserId` | `boolean` | Whether the end user's ID is sent |
| `forwardedMetadataKeys` | `string[]` | Metadata keys that are sent |
| `createdAt` | `string` | ISO 8601 timestamp |
| `updatedAt` | `string` | ISO 8601 timestamp |

## Errors [#errors]

Failures throw [`BlazingAgentsError`](/sdk/typescript/client#errors). The codes you are most likely to handle:

| Code | Meaning |
| --- | --- |
| `validation_failed` | An ID or field is invalid; `param` names it |
| `not_found` | No such agent or connection in your tenant |
| `provider_not_found` | The provider does not exist |
| `model_not_found` | The provider does not offer this model |
| `agent_mcp_connection_not_found` | A listed MCP connection does not exist |
| `agent_mcp_connections_invalid` | The MCP connection list is invalid |
| `admin_agent_managed` | The [admin agent](/agents/agents#the-admin-agent) does not allow this change |
| `invalid_cursor` | Start paging again without the cursor |

## Next [#next]

- [Agents](/agents/agents)
- [Configuration snapshots and lifecycle](/agents/configuration-snapshots)
- [Providers and models](/agents/providers-and-models)
