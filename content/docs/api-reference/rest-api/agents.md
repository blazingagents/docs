---
title: Agents
description: Create, inspect, update, version, disable, and extend Agents.
---

# Agents

## Overview [#overview]

An agent holds the configuration Blazing Agents uses to run a turn: its
provider and model, instructions, tools, workspace, and attachments. Use these
endpoints to create and change agents, read their saved versions, attach MCP
servers, and turn an agent off and on again. `userId` is fixed once the agent
is created.

## Automatic context compaction [#automatic-context-compaction]

`POST` and `PUT` accept `autoCompaction` (default `true` on create) and
`compactionReserveTokens` (default `16384` on create, a nonnegative safe
integer). Leave them out of an update to keep the saved values. Agents and
agent versions both return them. See
[context compaction](/agents/agents#automatic-context-compaction) for how
summaries work, what they cost, and what happens when they fail.

## Thinking configuration [#thinking-configuration]

`POST` and `PUT` accept `thinkingLevel: string | null`. It defaults to `null`
on create. Leave it out of an update to keep it, or send `null` to clear it. A
non-null value must be non-empty and needs a configured provider and model.
Agent and version responses include it. A level the model is known not to
support returns `validation_failed` with the valid choices, and nothing is
saved. On the platform-managed admin agent you can change the thinking level
along with its provider and model, but nothing else.

## Tool approval configuration [#tool-approval-configuration]

`POST` and `PUT` accept `approvalInChat` and `approvalInTasks`, each an
[ApprovalPolicy](/api-reference/protocols/objects-and-schemas#approval-policy).
Agent and version responses include both. Each defaults to
`{"default":"full","overrides":[]}` on create. Leave a policy out of an update
to keep it; send one to replace it, and a missing or empty `overrides` clears
the list. Neither accepts `null`. Built-in tools you name must be available.
New or changed MCP tools must be found on an MCP connection attached to the
agent in your tenant. Naming the same tool twice is invalid, and later
configuration or attachment changes must keep every rule valid. See
[policy examples and validation](/agents/tools/tool-approvals#approval-policies).

## Endpoints [#endpoints]

### POST /v1/agents [#create-agent]

Creates an agent. Names are unique within your tenant.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and JSON. There are no path or query parameters. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |

| Body field               | Type           | Required | Default                      |
| ------------------------ | -------------- | -------- | ---------------------------- |
| `name`                   | string         | yes      | —                            |
| `model`                  | string \| null | no       | `null`                       |
| `providerId`             | string \| null | no       | `null`                       |
| `tools`                  | string[]       | no       | `[]`                         |
| `workspaceId`            | string         | no       | New default Workspace        |
| `instructions`           | string         | no       | `""`                         |
| `approvalInChat` | ApprovalPolicy | no | `{"default":"full","overrides":[]}` |
| `approvalInTasks` | ApprovalPolicy | no | `{"default":"full","overrides":[]}` |
| `autoCompaction` | boolean | no | `true` |
| `compactionReserveTokens` | integer | no | `16384` |
| `memoryInjectionEnabled` | boolean        | no       | `false`                      |
| `userId`                 | string         | no       | `""`                         |
| `metadata`               | object         | no       | `{}`                         |
| `mcpConnectionIds`       | string[]       | no       | `[]`                         |

`providerId` and `model` go together: leave both out or send both as `null`
for an agent without a model, or send both to configure one. `model` is the
provider's own model ID, trimmed and non-empty. Tool groups are `workspace`,
`write_todos`, and `memory`. Choosing tools does not depend on `workspaceId`.
During a turn, the agent keeps using the workspace it had when it first
touched its files, even if you reassign it mid-turn.

Leave out `workspaceId` and Blazing Agents creates a new workspace for the
agent. Send an existing workspace ID from your tenant to share it. A created
workspace starts with the agent's name and `userId`, then stays independent:
later agent changes do not update it. Neither choice starts the workspace.

#### Response

Returns `201 Created` with an [Agent object](/api-reference/protocols/objects-and-schemas#agent).

Response schema: [`agentResponseSchema`](/api-reference/protocols/objects-and-schemas#agent-response).

```json
{
  "id": "ag_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "name": "Support Agent",
  "model": null,
  "thinkingLevel": null,
  "approvalInChat": {"default":"full","overrides":[]},
  "approvalInTasks": {"default":"full","overrides":[]},
  "autoCompaction": true,
  "compactionReserveTokens": 16384,
  "providerId": null,
  "tools": ["workspace", "write_todos"],
  "workspaceId": "ws_1234567890ABCDEF",
  "instructions": "Answer clearly.",
  "memoryInjectionEnabled": true,
  "userId": "",
  "metadata": {},
  "mcpConnectionIds": [],
  "avatarUrl": null,
  "version": 1,
  "status": "active",
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

`400 validation_failed` for invalid fields. Name and reference failures use their specific codes, including `agent_name_conflict` and `provider_not_found`. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"Support Agent","workspaceId":"ws_1234567890ABCDEF","tools":["workspace","write_todos"],"instructions":"Answer clearly.","memoryInjectionEnabled":true}'
```

#### SDK and related guides

SDK: [TypeScript](/sdk/typescript/agents#create) / [Python](/sdk/python/agents#create). See [Agents](/agents/agents).

### GET /v1/agents [#list-agents]

Lists agents, most recently updated first.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |

| Query parameter | Type   | Required | Description                                                              |
| --------------- | ------ | -------- | ------------------------------------------------------------------------ |
| `userId`        | string | no       | Omit for all Agents; use an opaque value or `""` for tenant-level Agents |
| `workspaceId`   | string | no       | Return only Agents attached to the Workspace                             |

There is no request body.

#### Response

Returns `200 OK` with complete [Agent objects](/api-reference/protocols/objects-and-schemas#agent).

Response schema: [`agentsResponseSchema`](/api-reference/protocols/objects-and-schemas#agents-response).

```json
{
  "agents": [
    {
      "id": "ag_1234567890ABCDEF",
      "tenantId": "ten_1234567890ABCDEF",
      "name": "Support Agent",
      "model": "openai/gpt-6-luna",
      "thinkingLevel": null,
      "approvalInChat": {"default":"full","overrides":[]},
      "approvalInTasks": {"default":"full","overrides":[]},
      "autoCompaction": true,
      "compactionReserveTokens": 16384,
      "providerId": "prv_1234567890ABCDEF",
      "workspaceId": "ws_1234567890ABCDEF",
      "memoryInjectionEnabled": false,
      "tools": [],
      "instructions": "Answer clearly.",
      "userId": "",
      "metadata": {},
      "mcpConnectionIds": [],
      "avatarUrl": null,
      "version": 1,
      "status": "active",
      "createdAt": "2026-07-10T10:00:00Z",
      "updatedAt": "2026-07-10T10:00:00Z"
    }
  ]
}
```

#### Errors

`400 validation_failed` for invalid or unknown query fields. Standard errors also apply; see [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --get "$BLAZING_AGENTS_BASE_URL/v1/agents" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --data-urlencode "userId="
```

#### SDK and related guides

SDK: [TypeScript](/sdk/typescript/agents#list) / [Python](/sdk/python/agents#list). See [Agents](/agents/agents).

### GET /v1/agents/:agentId [#get-agent]

Retrieves an agent's current configuration.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |

| Path parameter | Type   | Description       |
| -------------- | ------ | ----------------- |
| `agentId`      | string | Agent ID (`ag_…`) |

There are no query or body parameters.

#### Response

Returns `200 OK` with an [Agent object](/api-reference/protocols/objects-and-schemas#agent), including a short-lived `avatarUrl` when an avatar exists.

Response schema: [`agentResponseSchema`](/api-reference/protocols/objects-and-schemas#agent-response).

```json
{
  "id": "ag_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "name": "Support Agent",
  "model": null,
  "thinkingLevel": null,
  "approvalInChat": {"default":"full","overrides":[]},
  "approvalInTasks": {"default":"full","overrides":[]},
  "autoCompaction": true,
  "compactionReserveTokens": 16384,
  "providerId": null,
  "workspaceId": "ws_1234567890ABCDEF",
  "memoryInjectionEnabled": false,
  "tools": [],
  "instructions": "Answer clearly.",
  "userId": "",
  "metadata": {},
  "mcpConnectionIds": [],
  "avatarUrl": null,
  "version": 1,
  "status": "active",
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

`400 validation_failed` for a malformed ID. `404 not_found` when the Agent is missing or belongs to another tenant. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDK: [TypeScript](/sdk/typescript/agents#get) / [Python](/sdk/python/agents#get). See [Agents](/agents/agents).

### PUT /v1/agents/:agentId [#update-agent]

Updates an agent. Array fields replace their current values.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and JSON. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |

| Parameter                     | Type           | Required | Description                          |
| ----------------------------- | -------------- | -------- | ------------------------------------ |
| Body `name`                   | string         | no       | 1–80 characters                      |
| Body `model`                  | string \| null | no       | Provider-native model ID or `null`   |
| Body `providerId`             | string \| null | no       | Stored Provider or `null`             |
| Body `tools`                  | string[]       | no       | Complete replacement tool-group list |
| Body `workspaceId`            | string         | no       | Reassign to another Workspace        |
| Body `instructions`           | string         | no       | Up to 3,000 characters               |
| Body `autoCompaction` | boolean | no | Enable automatic compaction |
| Body `compactionReserveTokens` | integer | no | Nonnegative safe-integer reserve in tokens |
| Body `approvalInChat` | ApprovalPolicy | no | Replace chat/stateless policy; omit to preserve |
| Body `approvalInTasks` | ApprovalPolicy | no | Replace Task policy; omit to preserve |
| Body `memoryInjectionEnabled` | boolean        | no       | Toggle automatic memory context      |
| Body `metadata`               | object         | no       | Replacement metadata                 |
| Body `mcpConnectionIds`       | string[]       | no       | Complete replacement MCP list        |

Send at least one field. Changing the provider requires `model` in the same request. Send both as `null` to clear them; a provider without a model, or the reverse, is rejected. There are no query parameters.

On the platform-managed admin agent that `ba assist` uses, you can change only
`providerId`, `model`, and `thinkingLevel`. The same pairing rules apply, and
each change saves a new version. A request that includes any other field
returns `409 admin_agent_managed`.

#### Response

Returns `200 OK` with the complete updated [Agent object](/api-reference/protocols/objects-and-schemas#agent).

Response schema: [`agentResponseSchema`](/api-reference/protocols/objects-and-schemas#agent-response).

```json
{
  "id": "ag_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "name": "Support Agent",
  "model": "openai/gpt-6-luna",
  "thinkingLevel": null,
  "approvalInChat": {"default":"full","overrides":[]},
  "approvalInTasks": {"default":"full","overrides":[]},
  "autoCompaction": true,
  "compactionReserveTokens": 16384,
  "providerId": "prv_1234567890ABCDEF",
  "tools": ["workspace"],
  "workspaceId": "ws_1234567890ABCDEF",
  "instructions": "Answer clearly.",
  "memoryInjectionEnabled": true,
  "userId": "",
  "metadata": { "team": "support" },
  "mcpConnectionIds": [],
  "avatarUrl": null,
  "version": 2,
  "status": "active",
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:15:00Z"
}
```

#### Errors

`400 validation_failed` for invalid/empty input. Specific configuration codes include `agent_name_conflict` and `provider_not_found`. `404 not_found` applies when the Agent is missing or foreign; `409 admin_agent_managed` rejects changes to the admin agent's other fields. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request PUT \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"workspaceId":"ws_1234567890ABCDEF","tools":["workspace"],"metadata":{"team":"support"}}'
```

#### SDK and related guides

SDK: [TypeScript](/sdk/typescript/agents#update) / [Python](/sdk/python/agents#update). See [Agents](/agents/agents).

### DELETE /v1/agents/:agentId [#delete-agent]

Permanently deletes an agent and keeps its workspace. `includeArtifacts=true`
also deletes its artifacts; `includeArtifacts=false` keeps them.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), an
`ag_…` `agentId`, and the `includeArtifacts=true|false` query parameter.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |
| Query    | `includeArtifacts` | yes   | Delete (`true`) or preserve (`false`) Artifacts. |

#### Response

Returns `204 No Content` with an empty body.

#### Errors

`400 validation_failed` for a malformed ID. `404 not_found` when the Agent is missing or foreign. `409 admin_agent_managed` for the admin agent. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request DELETE \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF?includeArtifacts=false" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDK: [TypeScript](/sdk/typescript/agents#delete) / [Python](/sdk/python/agents#delete). See [Agents](/agents/agents).

### POST /v1/agents/:agentId/disable [#disable-agent]

Turns an agent off. New turns are rejected, and turns already running finish.

#### Authorizations

| Field           | Type   | Location | Required | Description                               |
| --------------- | ------ | -------- | -------- | ----------------------------------------- |
| `Authorization` | string | header   | required | Tenant API key or dashboard JWT. |

#### Path parameters

| Field     | Type   | Location | Required | Description        |
| --------- | ------ | -------- | -------- | ------------------ |
| `agentId` | string | path     | required | Agent ID (`ag_…`). |

#### Response

| Status   | Body                                                    | Description                                          |
| -------- | ------------------------------------------------------- | ---------------------------------------------------- |
| `200 OK` | [Agent](/api-reference/protocols/objects-and-schemas#agent) | Sets `status` to `disabled`; in-flight Turns finish. |

Response schema: [`agentSchema`](/api-reference/protocols/objects-and-schemas#agent).

#### Errors

`404 not_found` when the Agent is missing. `409 admin_agent_managed` for the admin agent. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/disable" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDK: [TypeScript](/sdk/typescript/agents#disable) / [Python](/sdk/python/agents#disable). See [Agents](/agents/agents).

### POST /v1/agents/:agentId/enable [#enable-agent]

Turns a disabled agent back on. Scheduled runs skipped while it was off do not run later.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |

#### Response

| Status   | Body                                                    | Lifecycle effect                                                    |
| -------- | ------------------------------------------------------- | ------------------------------------------------------------------- |
| `200 OK` | [Agent](/api-reference/protocols/objects-and-schemas#agent) | Sets `status` to `active`; skipped schedule fires are not replayed. |

Response schema: [`agentSchema`](/api-reference/protocols/objects-and-schemas#agent).

#### Errors

`404 not_found`; `409 admin_agent_managed`. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/enable" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDK: [TypeScript](/sdk/typescript/agents#enable) / [Python](/sdk/python/agents#enable). See [Agents](/agents/agents).

### POST /v1/agents/:agentId/avatar [#upload-agent-avatar]

Uploads or replaces an agent's avatar. Responses include a short-lived signed URL for it.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and `multipart/form-data`. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |

| Parameter   | Type | Required | Description                         |
| ----------- | ---- | -------- | ----------------------------------- |
| Form `file` | file | yes      | PNG, JPEG, or WebP, at most 512 KiB |

There are no query parameters.

#### Response

Returns `200 OK` with the complete updated [Agent object](/api-reference/protocols/objects-and-schemas#agent). `avatarUrl` is a short-lived signed URL.

Response schema: [`agentSchema`](/api-reference/protocols/objects-and-schemas#agent).

#### Errors

`400 validation_failed` when the multipart body has no `file` or the file is
not a PNG, JPEG, or WebP image of at most 512 KiB; `415 invalid_request` when
the request body is not `multipart/form-data`. A malformed Agent
ID uses `400 validation_failed`; `404 not_found` applies when the Agent is
missing or foreign; and `409 admin_agent_managed` for the admin agent. See
[REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/avatar" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --form "file=@./avatar.webp;type=image/webp"
```

#### SDK and related guides

SDK: [TypeScript](/sdk/typescript/agents#upload-avatar) / [Python](/sdk/python/agents#upload-avatar). See [Agents](/agents/agents).

### DELETE /v1/agents/:agentId/avatar [#delete-agent-avatar]

Removes an agent's avatar and returns the updated agent.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). `agentId` is a required `ag_…` path parameter. There are no query or body parameters. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |

#### Response

Returns `200 OK` with the complete updated [Agent object](/api-reference/protocols/objects-and-schemas#agent); `avatarUrl` is `null`.

Response schema: [`agentSchema`](/api-reference/protocols/objects-and-schemas#agent).

#### Errors

`400 validation_failed` for a malformed ID. `404 not_found` when the Agent is missing or foreign. `409 admin_agent_managed` for the admin agent. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request DELETE \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/avatar" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDK: [TypeScript](/sdk/typescript/agents#remove-avatar) / [Python](/sdk/python/agents#remove-avatar). See [Agents](/agents/agents).

### GET /v1/agents/:agentId/versions [#list-agent-versions]

Lists an agent's saved versions, newest first.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |

| Location | Field    | Required | Description                          |
| -------- | -------- | -------- | ------------------------------------ |
| Query    | `cursor` | no       | Opaque backward-page cursor.         |
| Query    | `limit`  | no       | Page size; defaults to exactly `50`. |

#### Response

| Status   | Body                                                                                      | Lifecycle effect |
| -------- | ----------------------------------------------------------------------------------------- | ---------------- |
| `200 OK` | [AgentVersionsResponse](/api-reference/protocols/objects-and-schemas#agent-versions-response) | Read-only.       |

Use `nextCursor` for the next page.

Response schema: [`agentVersionsResponseSchema`](/api-reference/protocols/objects-and-schemas#agent-versions-response).

#### Errors

`400 validation_failed`; `404 not_found`. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --get "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/versions" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --data-urlencode "limit=20"
```

#### SDK and related guides

SDK: [TypeScript](/sdk/typescript/agents#list-versions) / [Python](/sdk/python/agents#list-versions). See [Agents](/agents/agents).

### GET /v1/agents/:agentId/versions/:version [#get-agent-version]

Retrieves one saved agent version. It references providers and connections by ID; it does not copy them.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |
| Path     | `version`       | yes      | Positive Agent Version number.            |

#### Response

| Status   | Body                                                                   | Lifecycle effect                                        |
| -------- | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| `200 OK` | [AgentVersion](/api-reference/protocols/objects-and-schemas#agent-version) | Read-only; current referenced resources are not copied. |

Response schema: [`agentVersionSchema`](/api-reference/protocols/objects-and-schemas#agent-version).

#### Errors

`400 validation_failed`; `404 not_found`. An unavailable Version pin supplied
to Agent creation, generation, or Task configuration instead uses
`agent_version_not_found`. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/versions/1" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDK: [TypeScript](/sdk/typescript/agents#get-version) / [Python](/sdk/python/agents#get-version). See [Agents](/agents/agents).

### GET /v1/agents/:agentId/mcp-attachments [#list-agent-mcp-attachments]

Lists the MCP connections attached to an agent.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |

#### Response

| Status   | Body                                                                                        | Lifecycle effect |
| -------- | ------------------------------------------------------------------------------------------- | ---------------- |
| `200 OK` | [McpAttachmentsResponse](/api-reference/protocols/objects-and-schemas#mcp-attachments-response) | Read-only.       |

Response schema: [`mcpAttachmentsResponseSchema`](/api-reference/protocols/objects-and-schemas#mcp-attachments-response).

#### Errors

`404 not_found`. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/mcp-attachments" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDK: [TypeScript](/sdk/typescript/agents#list-mcp-attachments) / [Python](/sdk/python/agents#list-mcp-attachments). See [Agents](/agents/agents).

### PATCH /v1/agents/:agentId/mcp-attachments/:mcpConnectionId [#update-agent-mcp-attachment]

Changes which end-user details one attached MCP connection receives. Access is not affected.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). You can reach only resources your tenant owns.

| Location | Field             | Required | Description                               |
| -------- | ----------------- | -------- | ----------------------------------------- |
| Header   | `Authorization`   | yes      | Tenant API key or dashboard JWT. |
| Path     | `agentId`         | yes      | Agent ID (`ag_…`).                        |
| Path     | `mcpConnectionId` | yes      | MCP Connection ID.                        |

| Location | Field                   | Required | Description                                                         |
| -------- | ----------------------- | -------- | ------------------------------------------------------------------- |
| Body     | `forwardUserId`         | no       | Whether to forward `userId`.                                        |
| Body     | `forwardedMetadataKeys` | no       | Unique metadata-key allowlist; at least one body field is required. |
| Header   | `Content-Type`          | yes      | `application/json`.                                                 |

#### Response

| Status   | Body                                                                                      | Lifecycle effect                                                       |
| -------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `200 OK` | [McpAttachmentResponse](/api-reference/protocols/objects-and-schemas#mcp-attachment-response) | Updates attachment forwarding only; it does not change access control. |

Response schema: [`mcpAttachmentResponseSchema`](/api-reference/protocols/objects-and-schemas#mcp-attachment-response).

#### Errors

`400 validation_failed`; `404 not_found`. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/mcp-attachments/mcp_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"forwardUserId":true,"forwardedMetadataKeys":["locale"]}'
```

#### SDK and related guides

SDK: [TypeScript](/sdk/typescript/agents#update-mcp-attachment) / [Python](/sdk/python/agents#update-mcp-attachment). See [Agents](/agents/agents).

## Next [#next]

- [Agents](/agents/agents) to decide what each setting does.
- [Versions and lifecycle](/agents/versions-and-lifecycle) to pin and restore versions.
- [Sessions API](/api-reference/rest-api/sessions) to start a conversation with the agent.
