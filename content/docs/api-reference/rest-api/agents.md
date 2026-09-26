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
saved. On the platform-managed `ba assist` agent you can change the thinking level
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

### GET /v1/agents [#list-agents]

List agents.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `userId` | string | query |  |  |
| `workspaceId` | string | query |  | `ws_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The tenant's agents.

Response schema: `AgentList`.

```json
{
  "agents": [
    {
      "approvalInChat": {
        "default": "full",
        "overrides": []
      },
      "approvalInTasks": {
        "default": "full",
        "overrides": []
      },
      "id": "ag_1234567890ABCDEF",
      "tenantId": "ten_1234567890ABCDEF",
      "name": "string",
      "model": "openai/gpt-6-luna",
      "thinkingLevel": "string",
      "providerId": "prv_1234567890ABCDEF",
      "workspaceId": "ws_1234567890ABCDEF",
      "autoCompaction": true,
      "compactionReserveTokens": 0,
      "memoryInjectionEnabled": true,
      "tools": [
        "workspace"
      ],
      "instructions": "string",
      "userId": "string",
      "metadata": {},
      "mcpConnectionIds": [
        "mcp_1234567890ABCDEF"
      ],
      "avatarUrl": "https://example.com",
      "createdAt": "2026-07-10T10:00:00Z",
      "updatedAt": "2026-07-10T10:00:00Z",
      "version": 1,
      "status": "active"
    }
  ]
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents [#create-agent]

Create an agent.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `approvalInChat` | object | body |  | Defaults to `{"default":"full","overrides":[]}`. |
| `approvalInTasks` | object | body |  | Defaults to `{"default":"full","overrides":[]}`. |
| `name` | string | body | required | 1–80 characters. |
| `model` | string \| null | body |  | Defaults to `null`. |
| `thinkingLevel` | string \| null | body |  | Defaults to `null`. |
| `providerId` | string \| null | body |  | `prv_…` ID. Defaults to `null`. |
| `workspaceId` | string | body |  | `ws_…` ID. |
| `autoCompaction` | boolean | body |  | Defaults to `true`. |
| `compactionReserveTokens` | integer | body |  | Minimum 0. Defaults to `16384`. |
| `memoryInjectionEnabled` | boolean | body |  | Defaults to `false`. |
| `tools` | string[] | body |  | Defaults to `[]`. |
| `instructions` | string | body |  | Up to 3000 characters. Defaults to `""`. |
| `userId` | string | body |  | Defaults to `""`. |
| `metadata` | object | body |  | Defaults to `{}`. |
| `mcpConnectionIds` | string[] | body |  | Defaults to `[]`. |

#### Response

Returns `201 Created` as `application/json`. The created agent.

Response schema: `Agent`.

```json
{
  "approvalInChat": {
    "default": "full",
    "overrides": []
  },
  "approvalInTasks": {
    "default": "full",
    "overrides": []
  },
  "id": "ag_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "name": "string",
  "model": "openai/gpt-6-luna",
  "thinkingLevel": "string",
  "providerId": "prv_1234567890ABCDEF",
  "workspaceId": "ws_1234567890ABCDEF",
  "autoCompaction": true,
  "compactionReserveTokens": 0,
  "memoryInjectionEnabled": true,
  "tools": [
    "workspace"
  ],
  "instructions": "string",
  "userId": "string",
  "metadata": {},
  "mcpConnectionIds": [
    "mcp_1234567890ABCDEF"
  ],
  "avatarUrl": "https://example.com",
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z",
  "version": 1,
  "status": "active"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |
| `409` | Agent name already exists |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"string"}'
```

### GET /v1/agents/:agentId/mcp-attachments [#list-agent-mcp-attachments]

List agent MCP attachments.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The agent's MCP attachments.

Response schema: `McpAttachmentList`.

```json
{
  "mcpAttachments": [
    {
      "mcpConnectionId": "mcp_1234567890ABCDEF",
      "forwardUserId": true,
      "forwardedMetadataKeys": [
        "string"
      ],
      "createdAt": "2026-07-10T10:00:00Z",
      "updatedAt": "2026-07-10T10:00:00Z"
    }
  ]
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/mcp-attachments" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PATCH /v1/agents/:agentId/mcp-attachments/:mcpConnectionId [#update-agent-mcp-attachment]

Update an agent MCP attachment.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `mcpConnectionId` | string | path | required | `mcp_…` ID. |
| `forwardUserId` | boolean | body |  |  |
| `forwardedMetadataKeys` | string[] | body |  |  |

#### Response

Returns `200 OK` as `application/json`. The updated MCP attachment.

Response schema: `McpAttachment`.

```json
{
  "mcpConnectionId": "mcp_1234567890ABCDEF",
  "forwardUserId": true,
  "forwardedMetadataKeys": [
    "string"
  ],
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/mcp-attachments/mcp_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"forwardUserId":true}'
```

### GET /v1/agents/:agentId/versions [#list-agent-versions]

List agent versions.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `cursor` | string | query |  |  |
| `limit` | integer | query |  | 1–200. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. A page of agent versions.

Response schema: `AgentVersionList`.

```json
{
  "data": [
    {
      "approvalInChat": {
        "default": "full",
        "overrides": []
      },
      "approvalInTasks": {
        "default": "full",
        "overrides": []
      },
      "agentId": "ag_1234567890ABCDEF",
      "tenantId": "ten_1234567890ABCDEF",
      "version": 1,
      "name": "string",
      "model": "openai/gpt-6-luna",
      "thinkingLevel": "string",
      "providerId": "prv_1234567890ABCDEF",
      "autoCompaction": true,
      "compactionReserveTokens": 0,
      "memoryInjectionEnabled": true,
      "tools": [
        "workspace"
      ],
      "instructions": "string",
      "metadata": {},
      "mcpConnectionIds": [
        "mcp_1234567890ABCDEF"
      ],
      "createdAt": "2026-07-10T10:00:00Z"
    }
  ],
  "nextCursor": "string"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/versions" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/agents/:agentId/versions/:version [#get-agent-version]

Get an agent version.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `version` | number | path | required |  |

#### Response

Returns `200 OK` as `application/json`. The agent version.

Response schema: `AgentVersion`.

```json
{
  "approvalInChat": {
    "default": "full",
    "overrides": []
  },
  "approvalInTasks": {
    "default": "full",
    "overrides": []
  },
  "agentId": "ag_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "version": 1,
  "name": "string",
  "model": "openai/gpt-6-luna",
  "thinkingLevel": "string",
  "providerId": "prv_1234567890ABCDEF",
  "autoCompaction": true,
  "compactionReserveTokens": 0,
  "memoryInjectionEnabled": true,
  "tools": [
    "workspace"
  ],
  "instructions": "string",
  "metadata": {},
  "mcpConnectionIds": [
    "mcp_1234567890ABCDEF"
  ],
  "createdAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/versions/0" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/agents/:agentId [#get-agent]

Get an agent.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The agent.

Response schema: `Agent`.

```json
{
  "approvalInChat": {
    "default": "full",
    "overrides": []
  },
  "approvalInTasks": {
    "default": "full",
    "overrides": []
  },
  "id": "ag_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "name": "string",
  "model": "openai/gpt-6-luna",
  "thinkingLevel": "string",
  "providerId": "prv_1234567890ABCDEF",
  "workspaceId": "ws_1234567890ABCDEF",
  "autoCompaction": true,
  "compactionReserveTokens": 0,
  "memoryInjectionEnabled": true,
  "tools": [
    "workspace"
  ],
  "instructions": "string",
  "userId": "string",
  "metadata": {},
  "mcpConnectionIds": [
    "mcp_1234567890ABCDEF"
  ],
  "avatarUrl": "https://example.com",
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z",
  "version": 1,
  "status": "active"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PUT /v1/agents/:agentId [#update-agent]

Update an agent.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `approvalInChat` | object | body |  |  |
| `approvalInTasks` | object | body |  |  |
| `name` | string | body |  | 1–80 characters. |
| `model` | string \| null | body |  |  |
| `thinkingLevel` | string \| null | body |  |  |
| `providerId` | string \| null | body |  | `prv_…` ID. |
| `workspaceId` | string | body |  | `ws_…` ID. |
| `autoCompaction` | boolean | body |  |  |
| `compactionReserveTokens` | integer | body |  | Minimum 0. |
| `memoryInjectionEnabled` | boolean | body |  |  |
| `tools` | string[] | body |  |  |
| `instructions` | string | body |  | Up to 3000 characters. |
| `metadata` | object | body |  |  |
| `mcpConnectionIds` | string[] | body |  |  |

#### Response

Returns `200 OK` as `application/json`. The updated agent.

Response schema: `Agent`.

```json
{
  "approvalInChat": {
    "default": "full",
    "overrides": []
  },
  "approvalInTasks": {
    "default": "full",
    "overrides": []
  },
  "id": "ag_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "name": "string",
  "model": "openai/gpt-6-luna",
  "thinkingLevel": "string",
  "providerId": "prv_1234567890ABCDEF",
  "workspaceId": "ws_1234567890ABCDEF",
  "autoCompaction": true,
  "compactionReserveTokens": 0,
  "memoryInjectionEnabled": true,
  "tools": [
    "workspace"
  ],
  "instructions": "string",
  "userId": "string",
  "metadata": {},
  "mcpConnectionIds": [
    "mcp_1234567890ABCDEF"
  ],
  "avatarUrl": "https://example.com",
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z",
  "version": 1,
  "status": "active"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PUT "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"approvalInChat":{"default":"full"}}'
```

### DELETE /v1/agents/:agentId [#delete-agent]

Delete an agent.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `includeArtifacts` | string | query | required | One of `true`, `false`. |

#### Response

Returns `204 No Content`. Deleted.

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF?includeArtifacts=true" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/disable [#disable-agent]

Disable an agent.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The updated agent.

Response schema: `Agent`.

```json
{
  "approvalInChat": {
    "default": "full",
    "overrides": []
  },
  "approvalInTasks": {
    "default": "full",
    "overrides": []
  },
  "id": "ag_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "name": "string",
  "model": "openai/gpt-6-luna",
  "thinkingLevel": "string",
  "providerId": "prv_1234567890ABCDEF",
  "workspaceId": "ws_1234567890ABCDEF",
  "autoCompaction": true,
  "compactionReserveTokens": 0,
  "memoryInjectionEnabled": true,
  "tools": [
    "workspace"
  ],
  "instructions": "string",
  "userId": "string",
  "metadata": {},
  "mcpConnectionIds": [
    "mcp_1234567890ABCDEF"
  ],
  "avatarUrl": "https://example.com",
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z",
  "version": 1,
  "status": "active"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/disable" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/enable [#enable-agent]

Enable an agent.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The updated agent.

Response schema: `Agent`.

```json
{
  "approvalInChat": {
    "default": "full",
    "overrides": []
  },
  "approvalInTasks": {
    "default": "full",
    "overrides": []
  },
  "id": "ag_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "name": "string",
  "model": "openai/gpt-6-luna",
  "thinkingLevel": "string",
  "providerId": "prv_1234567890ABCDEF",
  "workspaceId": "ws_1234567890ABCDEF",
  "autoCompaction": true,
  "compactionReserveTokens": 0,
  "memoryInjectionEnabled": true,
  "tools": [
    "workspace"
  ],
  "instructions": "string",
  "userId": "string",
  "metadata": {},
  "mcpConnectionIds": [
    "mcp_1234567890ABCDEF"
  ],
  "avatarUrl": "https://example.com",
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z",
  "version": 1,
  "status": "active"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/enable" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/avatar [#upload-agent-avatar]

Upload an agent avatar.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a multipart form body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `file` | file | form | required | PNG, JPEG or WebP image, 512 KiB or smaller. |

#### Response

Returns `200 OK` as `application/json`. The updated agent.

Response schema: `Agent`.

```json
{
  "approvalInChat": {
    "default": "full",
    "overrides": []
  },
  "approvalInTasks": {
    "default": "full",
    "overrides": []
  },
  "id": "ag_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "name": "string",
  "model": "openai/gpt-6-luna",
  "thinkingLevel": "string",
  "providerId": "prv_1234567890ABCDEF",
  "workspaceId": "ws_1234567890ABCDEF",
  "autoCompaction": true,
  "compactionReserveTokens": 0,
  "memoryInjectionEnabled": true,
  "tools": [
    "workspace"
  ],
  "instructions": "string",
  "userId": "string",
  "metadata": {},
  "mcpConnectionIds": [
    "mcp_1234567890ABCDEF"
  ],
  "avatarUrl": "https://example.com",
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z",
  "version": 1,
  "status": "active"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/avatar" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --form "file=@./file"
```

### DELETE /v1/agents/:agentId/avatar [#delete-agent-avatar]

Delete an agent avatar.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The updated agent.

Response schema: `Agent`.

```json
{
  "approvalInChat": {
    "default": "full",
    "overrides": []
  },
  "approvalInTasks": {
    "default": "full",
    "overrides": []
  },
  "id": "ag_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "name": "string",
  "model": "openai/gpt-6-luna",
  "thinkingLevel": "string",
  "providerId": "prv_1234567890ABCDEF",
  "workspaceId": "ws_1234567890ABCDEF",
  "autoCompaction": true,
  "compactionReserveTokens": 0,
  "memoryInjectionEnabled": true,
  "tools": [
    "workspace"
  ],
  "instructions": "string",
  "userId": "string",
  "metadata": {},
  "mcpConnectionIds": [
    "mcp_1234567890ABCDEF"
  ],
  "avatarUrl": "https://example.com",
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z",
  "version": 1,
  "status": "active"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/avatar" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Agents](/agents/agents) to decide what each setting does.
- [Versions and lifecycle](/agents/versions-and-lifecycle) to pin and restore versions.
- [Sessions API](/api-reference/rest-api/sessions) to start a conversation with the agent.
