---
title: Agents
description: Create, configure, version, disable, and extend Agents with the TypeScript SDK.
---

# Agents

`client.agents` manages Tenant-owned Agent configuration, lifecycle, immutable Versions, avatars, and MCP Attachments.

## Overview [#overview]

Creating or ordinarily updating an Agent creates an immutable Version. Disable, enable, avatar, and MCP Attachment changes do not. Array fields are complete selections, not patches. `userId` is immutable End-user Attribution. `providerId` and `model` form one optional pair: omit both or set both to `null` for an unconfigured Agent, and supply both to configure one. `workspaceId` always identifies one attached Workspace and can be changed but not cleared.

Create requires `name`. When `workspaceId` is omitted, the operation atomically
creates and attaches a normal Workspace with the Agent's initial name and
Attribution. It remains independent after creation; Agent updates do not
synchronize it. An explicit ID attaches an existing same-Tenant Workspace.
The product row has no Container or compute cost until the first actual
Workspace file or process operation.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create an Agent and Version 1 | `Agent` |
| [`list()`](#list) | List and filter Agents | `AgentsResponse` |
| [`get()`](#get) | Retrieve current configuration | `Agent` |
| [`update()`](#update) | Update configuration and create a Version | `Agent` |
| [`delete()`](#delete) | Permanently delete an Agent | `void` |
| [`disable()`](#disable) | Reject future Turns | `Agent` |
| [`enable()`](#enable) | Allow future Turns | `Agent` |
| [`uploadAvatar()`](#upload-avatar) | Upload or replace the private avatar | `Agent` |
| [`removeAvatar()`](#remove-avatar) | Remove the avatar | `Agent` |
| [`listVersions()`](#list-versions) | List immutable Versions | `AgentVersionsResponse` |
| [`getVersion()`](#get-version) | Retrieve an immutable Version | `AgentVersion` |
| [`restoreVersion()`](#restore-version) | Copy an old Version into a new latest Version | `Agent` |
| [`listMcpAttachments()`](#list-mcp-attachments) | List MCP Attachment settings | `McpAttachmentsResponse` |
| [`updateMcpAttachment()`](#update-mcp-attachment) | Change end-user forwarding settings | `McpAttachmentResponse` |

## Methods [#methods]

### `create()` [#create]

Creates an Agent and its first immutable Version.

**Signature:** `create(body: CreateAgentBody): Promise<Agent>`

| Body field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `name` | `string` | yes | — | Tenant-unique name, 1–80 characters |
| `model` | `string \| null` | no | `null` | Provider-native model ID, paired with `providerId` |
| `providerId` | `string \| null` | no | `null` | Stored Provider, paired with `model` |
| `workspaceId` | `string` | no | new default Workspace | Existing same-Tenant Workspace to attach and share |
| `memoryInjectionEnabled` | `boolean` | no | `false` | Automatic Memory context |
| `tools` | `AgentToolGroupId[]` | no | `[]` | Complete tool-group selection |
| `instructions` | `string` | no | `""` | Instructions, up to 3,000 characters |
| `userId` | `string` | no | `""` | Immutable End-user Attribution |
| `metadata` | `Record<string, unknown>` | no | `{}` | Application metadata |
| `mcpConnectionIds` | `string[]` | no | `[]` | Up to 10 unique MCP Connection IDs |

```typescript
const agent = await client.agents.create({
  name: "Release writer",
  instructions: "Write concise release notes.",
});
```

Returns [`Agent`](#agent). Raises `validation_failed`, `agent_name_conflict`, `provider_not_found`, `agent_mcp_connection_not_found`, or `agent_mcp_connections_invalid`. See [`POST /v1/agents`](/api-reference/rest-api/agents#create-agent).

### `list()` [#list]

Lists current Agents by most recent update. The result is unpaginated.

**Signature:** `list(options?: AgentsListOptions): Promise<AgentsResponse>`

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `userId` | `string` | no | Exact Attribution; use `""` for tenant-level Agents |
| `workspaceId` | `string` | no | Return Agents attached to this Workspace |

```typescript
const { agents } = await client.agents.list({ userId: "" });
```

Returns `{ agents: Agent[] }`. Raises `validation_failed` for invalid options. See [`GET /v1/agents`](/api-reference/rest-api/agents#list-agents).

### `get()` [#get]

Retrieves current Agent configuration without creating a Version.

**Signature:** `get(agentId: string): Promise<Agent>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |

```typescript
const agent = await client.agents.get(agentId);
```

Returns [`Agent`](#agent). Raises `validation_failed` for a malformed ID or `not_found` when unavailable. See [`GET /v1/agents/:agentId`](/api-reference/rest-api/agents#get-agent).

### `update()` [#update]

Updates at least one mutable configuration field and creates the next immutable Version. Omitted fields stay unchanged; arrays replace their current values.

**Signature:** `update(agentId: string, body: UpdateAgentBody): Promise<Agent>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |
| `body` | `UpdateAgentBody` | yes | Mutable configuration fields |

`UpdateAgentBody` accepts every [`create()`](#create) configuration field except `userId`; all fields are optional, but at least one is required. A Provider change must include `model`. Clear a configured Agent by sending both fields as `null`; clearing either field alone is rejected.

For the Admin Agent, the same method accepts only `providerId` and `model`.
Each accepted settled-pair change creates the next ordinary Version; all other
fields remain platform-managed.

```typescript
const agent = await client.agents.update(agentId, {
  instructions: "Write concise release notes and include migration steps.",
  metadata: { team: "platform" },
});
```

Returns [`Agent`](#agent). Raises `validation_failed`, `not_found`, `agent_name_conflict`, `provider_not_found`, `agent_mcp_connection_not_found`, `agent_mcp_connections_invalid`, or `admin_agent_managed`. See [`PUT /v1/agents/:agentId`](/api-reference/rest-api/agents#update-agent).

### `delete()` [#delete]

Permanently deletes an Agent and its history, with an explicit choice to
preserve or delete its Artifacts.

**Signature:** `delete(agentId: string, includeArtifacts: boolean): Promise<void>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |
| `includeArtifacts` | `boolean` | yes | Delete (`true`) or preserve (`false`) the Agent's Artifacts |

```typescript
await client.agents.delete(agentId, false);
```

Returns `void`. The attached Workspace is preserved. Raises
`validation_failed`, `not_found`, or `admin_agent_managed`. See
[`DELETE /v1/agents/:agentId`](/api-reference/rest-api/agents#delete-agent).

### `disable()` [#disable]

Disables an Agent. New Turns fail with `agent_disabled`; in-flight Turns finish.

**Signature:** `disable(agentId: string): Promise<Agent>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |

```typescript
const disabled = await client.agents.disable(agentId);
```

Returns [`Agent`](#agent) with `status: "disabled"`. Raises `not_found` or `admin_agent_managed`. See [`POST .../disable`](/api-reference/rest-api/agents#disable-agent).

### `enable()` [#enable]

Enables a disabled Agent. Skipped schedule fires are not replayed.

**Signature:** `enable(agentId: string): Promise<Agent>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |

```typescript
const active = await client.agents.enable(agentId);
```

Returns [`Agent`](#agent) with `status: "active"`. Raises `not_found` or `admin_agent_managed`. See [`POST .../enable`](/api-reference/rest-api/agents#enable-agent).

### `uploadAvatar()` [#upload-avatar]

Uploads or replaces an Agent's private avatar. This does not create a Version.

**Signature:** `uploadAvatar(agentId: string, file: File): Promise<Agent>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |
| `file` | `File` | yes | PNG, JPEG, or WebP, at most 512 KiB |

```typescript
const agent = await client.agents.uploadAvatar(
  agentId,
  new File([avatarBytes], "avatar.webp", { type: "image/webp" }),
);
```

Returns [`Agent`](#agent) with a short-lived signed `avatarUrl`. Raises `invalid_request` for a missing, oversized, or unsupported file, plus `validation_failed`, `not_found`, or `admin_agent_managed`. See [`POST .../avatar`](/api-reference/rest-api/agents#upload-agent-avatar).

### `removeAvatar()` [#remove-avatar]

Idempotently removes an avatar without creating a Version.

**Signature:** `removeAvatar(agentId: string): Promise<Agent>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |

```typescript
const agent = await client.agents.removeAvatar(agentId);
```

Returns [`Agent`](#agent) with `avatarUrl: null`. Raises `validation_failed`, `not_found`, or `admin_agent_managed`. See [`DELETE .../avatar`](/api-reference/rest-api/agents#delete-agent-avatar).

### `listVersions()` [#list-versions]

Lists immutable Agent Versions newest first.

**Signature:** `listVersions(agentId: string, options?: AgentVersionsListOptions): Promise<AgentVersionsResponse>`

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `agentId` | `string` | yes | — | Agent ID (`ag_…`) |
| `options.cursor` | `string` | no | — | Opaque cursor from the previous page |
| `options.limit` | `number` | no | `50` | Page size from 1 through 200 |

```typescript
const page = await client.agents.listVersions(agentId, { limit: 20 });
```

Returns [`AgentVersionsResponse`](#agentversionsresponse). Raises `validation_failed`, `invalid_cursor`, or `not_found`. See [`GET .../versions`](/api-reference/rest-api/agents#list-agent-versions).

### `getVersion()` [#get-version]

Retrieves one immutable numbered Version.

**Signature:** `getVersion(agentId: string, version: number): Promise<AgentVersion>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |
| `version` | `number` | yes | Positive Version number |

```typescript
const version = await client.agents.getVersion(agentId, 1);
```

Returns [`AgentVersion`](#agentversion). Raises `validation_failed` for an invalid number or `not_found` when the Agent or Version is unavailable. See [`GET .../versions/:version`](/api-reference/rest-api/agents#get-agent-version).

### `restoreVersion()` [#restore-version]

SDK-only composition that calls `getVersion()` and copies its versioned fields through `update()`. It creates a new latest Version; it never rewrites history. Workspace attachment, Attribution, status, and avatar are not restored because they are not versioned.

**Signature:** `restoreVersion(agentId: string, version: number): Promise<Agent>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |
| `version` | `number` | yes | Positive source Version number |

```typescript
const restored = await client.agents.restoreVersion(agentId, 1);
```

Returns the new latest [`Agent`](#agent). It can raise the errors from `getVersion()` and `update()`, including reference errors when an old Provider or MCP Connection is no longer available.

### `listMcpAttachments()` [#list-mcp-attachments]

Lists forwarding settings for the MCP Connections selected by an Agent.

**Signature:** `listMcpAttachments(agentId: string): Promise<McpAttachmentsResponse>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |

```typescript
const { mcpAttachments } =
  await client.agents.listMcpAttachments(agentId);
```

Returns `{ mcpAttachments: McpAttachmentResponse[] }`. Raises `validation_failed` or `not_found`. See [`GET .../mcp-attachments`](/api-reference/rest-api/agents#list-agent-mcp-attachments).

### `updateMcpAttachment()` [#update-mcp-attachment]

Changes end-user forwarding settings without changing MCP access control or creating an Agent Version.

**Signature:** `updateMcpAttachment(agentId: string, mcpConnectionId: string, body: UpdateMcpAttachmentBody): Promise<McpAttachmentResponse>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID |
| `mcpConnectionId` | `string` | yes | Selected MCP Connection ID |
| `body.forwardUserId` | `boolean` | no | Forward the request's `userId` |
| `body.forwardedMetadataKeys` | `string[]` | no | Up to 32 unique metadata keys, each at most 64 characters |

At least one body field is required.

```typescript
const attachment = await client.agents.updateMcpAttachment(
  agentId,
  mcpConnectionId,
  { forwardUserId: true, forwardedMetadataKeys: ["locale"] },
);
```

Returns [`McpAttachmentResponse`](#mcpattachmentresponse). Raises `validation_failed` or `not_found`. See [`PATCH .../mcp-attachments/:mcpConnectionId`](/api-reference/rest-api/agents#update-agent-mcp-attachment).

## Response types [#response-types]

### `Agent` [#agent]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Agent ID (`ag_…`) |
| `tenantId` | `string` | Owning Tenant ID |
| `name` | `string` | Tenant-unique name |
| `model` | `string \| null` | Provider-native model ID, or `null` when unconfigured |
| `providerId` | `string \| null` | Stored Provider, or `null` when unconfigured |
| `workspaceId` | `string` | Current Workspace attachment |
| `memoryInjectionEnabled` | `boolean` | Whether Memory is injected automatically |
| `tools` | `AgentToolGroupId[]` | Selected tool groups |
| `instructions` | `string` | System instructions |
| `userId` | `string` | Immutable End-user Attribution |
| `metadata` | `Record<string, unknown>` | Application metadata |
| `mcpConnectionIds` | `string[]` | Selected MCP Connections |
| `avatarUrl` | `string \| null` | Short-lived signed URL when an avatar exists |
| `version` | `number` | Current positive Version number |
| `status` | `"active" \| "disabled"` | Execution status |
| `createdAt` | `string` | ISO 8601 creation timestamp |
| `updatedAt` | `string` | ISO 8601 update timestamp |

`AgentsResponse` is `{ agents: Agent[] }`.

`AgentToolGroupId` is `"workspace" | "write_todos" | "memory"`.

### `AgentVersion` [#agentversion]

`AgentVersion` contains `agentId`, `tenantId`, `version`, `name`, `model`, `providerId`, `memoryInjectionEnabled`, `tools`, `instructions`, `metadata`, `mcpConnectionIds`, and `createdAt`. It intentionally omits current `workspaceId`, `userId`, avatar, status, and update timestamp.

### `AgentVersionsResponse` [#agentversionsresponse]

```typescript
interface AgentVersionsResponse {
  data: AgentVersion[];
  nextCursor: string | null;
}
```

### `McpAttachmentResponse` [#mcpattachmentresponse]

| Field | Type | Description |
| --- | --- | --- |
| `mcpConnectionId` | `string` | Attached MCP Connection ID |
| `forwardUserId` | `boolean` | Whether requests forward End-user Attribution |
| `forwardedMetadataKeys` | `string[]` | Metadata-key allowlist |
| `createdAt` | `string` | ISO 8601 creation timestamp |
| `updatedAt` | `string` | ISO 8601 update timestamp |

See the canonical [Agent and MCP schemas](/api-reference/protocols/objects-and-schemas).

## Errors [#errors]

SDK request failures throw `BlazingAgentsError`. Branch on its stable `code`, not its message.

| Code | Typical methods | Meaning |
| --- | --- | --- |
| `validation_failed` | Methods with input | IDs, options, or bodies are invalid |
| `not_found` | ID-based methods | The resource is unavailable in this Tenant |
| `agent_name_conflict` | `create()`, `update()` | Another Agent has the name |
| `provider_not_found` | Configuration writes and historical execution | The selected Provider is unavailable |
| `agent_mcp_connection_not_found` | Configuration writes | A selected MCP Connection is unavailable |
| `agent_mcp_connections_invalid` | Configuration writes | Selected MCP Connections are incompatible |
| `admin_agent_managed` | Mutations | The platform manages this Admin Agent operation |
| `invalid_cursor` | `listVersions()` | Restart pagination without the rejected cursor |

A disabled Agent remains readable and configurable; generation later fails with `agent_disabled`. See [SDK errors](/api-reference/protocols/errors).

## End-to-end workflow [#end-to-end-workflow]

Create an Agent, create and restore Versions, operate the kill switch, then delete it:

```typescript
import { BlazingAgents } from "@blazing-agents/sdk";

const client = new BlazingAgents({ apiKey: process.env.BLAZING_AGENTS_API_KEY! });

const agent = await client.agents.create({
  name: "Release writer",
  instructions: "Write concise release notes.",
  metadata: { team: "platform" },
});

const updated = await client.agents.update(agent.id, {
  instructions: "Include migration steps.",
});
console.log(updated.version);

const versions = await client.agents.listVersions(agent.id, { limit: 50 });
const restored = await client.agents.restoreVersion(
  agent.id,
  versions.data.at(-1)!.version,
);

await client.agents.disable(restored.id);
await client.agents.enable(restored.id);
await client.agents.delete(restored.id, false);
```

## Related [#related]

- [Agents](/agents/agents)
- [Versions and lifecycle](/agents/versions-and-lifecycle)
- [MCP connections](/agents/tools/mcp-tools)
- [REST Agents](/api-reference/rest-api/agents)
