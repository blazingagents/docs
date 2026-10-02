---
title: Agents
description: Create, inspect, update, disable, and extend Agents.
---

# Agents

## Overview [#overview]

An agent holds the configuration Blazing Agents uses to run a turn: its
provider and model, instructions, tools, workspace, and attachments. Use these
endpoints to create and change agents, attach MCP
servers, and turn an agent off and on again. `userId` is fixed once the agent
is created. Names are display labels and can repeat. List results use `data`
and `nextCursor`; pass the cursor with the same filters to read another page.

## Automatic context compaction [#automatic-context-compaction]

`POST` and `PUT` accept `autoCompaction` (default `true` on create) and
`compactionReserveTokens` (default `16384` on create, a nonnegative safe
integer). Leave them out of an update to keep the saved values. Agents return them. See
[context compaction](/agents/agents#automatic-context-compaction) for how
summaries work, what they cost, and what happens when they fail.

## Thinking configuration [#thinking-configuration]

`POST` and `PUT` accept `thinkingLevel: string | null`. It defaults to `null`
on create. Leave it out of an update to keep it, or send `null` to clear it. A
non-null value must be non-empty and needs a configured provider and model.
Agent responses include it. A level the model is known not to
support returns `validation_failed` with the valid choices, and nothing is
saved. On the [admin agent](/agents/agents#the-admin-agent) you can change the
thinking level along with its provider and model, but nothing else.

## Tool approval configuration [#tool-approval-configuration]

`POST` and `PUT` accept `approvalInChat` and `approvalInTasks`, each an
[ApprovalPolicy](/api-reference/protocols/objects-and-schemas#approval-policy).
Agent responses include both. Each defaults to
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

Lists your agents, newest first. Filter by end user or by workspace. Pass `nextCursor` as `cursor` for older agents.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `userId` | string | query |  | Return only agents for this end user. Send an empty string for tenant-level agents, or leave it out for all agents. |
| `workspaceId` | string | query |  | Return only agents that use this workspace. |
| `cursor` | string | query |  | `nextCursor` from the previous page. |
| `limit` | integer | query |  | Maximum number of agents to return. 1–100. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. The tenant's agents.

Response schema: `AgentList`.

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
      "id": "ag_4kP9sT2vXq7LmN3a",
      "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
      "name": "Support Agent",
      "model": "openai/gpt-6-luna",
      "thinkingLevel": null,
      "providerId": "prv_7Tn4Kd9QwE2sLx5R",
      "workspaceId": "ws_3Vb8Ny6HpU1cGf4M",
      "autoCompaction": true,
      "compactionReserveTokens": 16384,
      "memoryInjectionEnabled": false,
      "tools": [
        "workspace",
        "write_todos"
      ],
      "instructions": "Answer billing questions clearly and briefly.",
      "userId": "",
      "metadata": {
        "team": "support"
      },
      "mcpConnectionIds": [],
      "avatarUrl": null,
      "createdAt": "2026-07-10T10:00:00.000Z",
      "updatedAt": "2026-07-10T10:00:00.000Z",
      "status": "active"
    }
  ],
  "nextCursor": null
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents [#create-agent]

Create an agent.

Creates an agent. `providerId` and `model` go together: send both to give the agent a model, or leave both out. Leave out `workspaceId` to create a new workspace for the agent.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `approvalInChat` | object | body |  | Which tool calls need approval in sessions and stateless generation. Defaults to `{"default":"full","overrides":[]}`. |
| `approvalInTasks` | object | body |  | Which tool calls need approval in task runs. Defaults to `{"default":"full","overrides":[]}`. |
| `name` | string | body | required | Display name. 1–80 characters. |
| `model` | string \| null | body |  | The provider's own model ID, such as `openai/gpt-6-luna`. Send it together with `providerId`. Defaults to `null`. |
| `thinkingLevel` | string \| null | body |  | How much reasoning to request from the model, such as `high`. Needs a provider and model, and must be a level the model supports. Defaults to `null`. |
| `providerId` | string \| null | body |  | ID of the provider whose key runs the model. Send it together with `model`. Defaults to `null`. |
| `workspaceId` | string | body |  | ID of the workspace the agent reads and writes files in. Leave it out to create a new workspace for the agent, or send an existing one to share it. |
| `autoCompaction` | boolean | body |  | Summarize older context automatically when a conversation nears the model's context limit. Defaults to `true`. |
| `compactionReserveTokens` | integer | body |  | Tokens to keep free for the model's reply when deciding whether to compact. Minimum 0. Defaults to `16384`. |
| `memoryInjectionEnabled` | boolean | body |  | Add the agent's saved memories to every turn automatically. Defaults to `false`. |
| `tools` | string[] | body |  | Built-in tool groups the agent can use: `workspace`, `write_todos`, and `memory`. Defaults to `[]`. |
| `instructions` | string | body |  | Instructions the agent follows on every turn. Up to 3000 characters. Defaults to `""`. |
| `userId` | string | body |  | Your end user's ID, used for attribution. An empty string means a tenant-level agent. It cannot change after creation. Defaults to `""`. |
| `metadata` | object | body |  | Your own key-value data, returned unchanged. Defaults to `{}`. |
| `mcpConnectionIds` | string[] | body |  | IDs of the MCP connections attached to the agent. Defaults to `[]`. |

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
  "id": "ag_4kP9sT2vXq7LmN3a",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "name": "Support Agent",
  "model": "openai/gpt-6-luna",
  "thinkingLevel": null,
  "providerId": "prv_7Tn4Kd9QwE2sLx5R",
  "workspaceId": "ws_3Vb8Ny6HpU1cGf4M",
  "autoCompaction": true,
  "compactionReserveTokens": 16384,
  "memoryInjectionEnabled": false,
  "tools": [
    "workspace",
    "write_todos"
  ],
  "instructions": "Answer billing questions clearly and briefly.",
  "userId": "",
  "metadata": {
    "team": "support"
  },
  "mcpConnectionIds": [],
  "avatarUrl": null,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z",
  "status": "active"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`model_not_found`](/api-reference/protocols/errors#model_not_found), [`agent_mcp_connection_not_found`](/api-reference/protocols/errors#agent_mcp_connection_not_found), [`agent_mcp_connections_invalid`](/api-reference/protocols/errors#agent_mcp_connections_invalid), [`mcp_connection_discovery_failed`](/api-reference/protocols/errors#mcp_connection_discovery_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`provider_not_found`](/api-reference/protocols/errors#provider_not_found), [`workspace_not_found`](/api-reference/protocols/errors#workspace_not_found) | The resource was not found |
| `429` | [`rate_limited`](/api-reference/protocols/errors#rate_limited) | Too many requests |
| `503` | [`model_validation_unavailable`](/api-reference/protocols/errors#model_validation_unavailable), [`service_unavailable`](/api-reference/protocols/errors#service_unavailable) | The service is temporarily unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"Support Agent","providerId":"prv_7Tn4Kd9QwE2sLx5R","model":"openai/gpt-6-luna","tools":["workspace","write_todos"],"instructions":"Answer billing questions clearly and briefly.","metadata":{"team":"support"}}'
```

### GET /v1/agents/:agentId/mcp-attachments [#list-agent-mcp-attachments]

List agent MCP attachments.

Lists the MCP connections attached to an agent and what the agent forwards to each one.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |

#### Response

Returns `200 OK` as `application/json`. The agent's MCP attachments.

Response schema: `McpAttachmentList`.

```json
{
  "mcpAttachments": [
    {
      "mcpConnectionId": "mcp_2Rk7Wm4XsQ9dHv1B",
      "forwardUserId": true,
      "forwardedMetadataKeys": [
        "plan"
      ],
      "createdAt": "2026-07-10T10:00:00.000Z",
      "updatedAt": "2026-07-10T10:05:00.000Z"
    }
  ]
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/mcp-attachments" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PATCH /v1/agents/:agentId/mcp-attachments/:mcpConnectionId [#update-agent-mcp-attachment]

Update an agent MCP attachment.

Changes what an agent forwards to one of its attached MCP connections. Send at least one field.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `mcpConnectionId` | string | path | required | ID of an MCP connection attached to the agent. |
| `forwardUserId` | boolean | body |  | Send the session's `userId` to the MCP server with every tool call. |
| `forwardedMetadataKeys` | string[] | body |  | Session metadata keys whose values are sent to the MCP server with every tool call. Replaces the current list. |

#### Response

Returns `200 OK` as `application/json`. The updated MCP attachment.

Response schema: `McpAttachment`.

```json
{
  "mcpConnectionId": "mcp_2Rk7Wm4XsQ9dHv1B",
  "forwardUserId": true,
  "forwardedMetadataKeys": [
    "plan"
  ],
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:05:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/mcp-attachments/mcp_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"forwardUserId":true,"forwardedMetadataKeys":["plan"]}'
```

### GET /v1/agents/:agentId [#get-agent]

Get an agent.

Returns an agent's current configuration, including a short-lived `avatarUrl` when the agent has an avatar.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |

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
  "id": "ag_4kP9sT2vXq7LmN3a",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "name": "Support Agent",
  "model": "openai/gpt-6-luna",
  "thinkingLevel": null,
  "providerId": "prv_7Tn4Kd9QwE2sLx5R",
  "workspaceId": "ws_3Vb8Ny6HpU1cGf4M",
  "autoCompaction": true,
  "compactionReserveTokens": 16384,
  "memoryInjectionEnabled": false,
  "tools": [
    "workspace",
    "write_todos"
  ],
  "instructions": "Answer billing questions clearly and briefly.",
  "userId": "",
  "metadata": {
    "team": "support"
  },
  "mcpConnectionIds": [],
  "avatarUrl": null,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z",
  "status": "active"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PUT /v1/agents/:agentId [#update-agent]

Update an agent.

Updates the current agent configuration. New sessions and future task runs use these settings; existing sessions and queued runs keep their saved configuration. Send at least one field. Fields you leave out keep their values, and arrays replace the current list. Changing `providerId` requires `model` in the same request, and sending both as `null` clears them. On the platform-managed `ba assist` agent, only `providerId`, `model`, and `thinkingLevel` can change.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `approvalInChat` | object | body |  | Which tool calls need approval in sessions and stateless generation. |
| `approvalInTasks` | object | body |  | Which tool calls need approval in task runs. |
| `name` | string | body |  | Display name. 1–80 characters. |
| `model` | string \| null | body |  | The provider's own model ID, such as `openai/gpt-6-luna`. Send it together with `providerId`. |
| `thinkingLevel` | string \| null | body |  | How much reasoning to request from the model, such as `high`. Needs a provider and model, and must be a level the model supports. |
| `providerId` | string \| null | body |  | ID of the provider whose key runs the model. Send it together with `model`. |
| `workspaceId` | string | body |  | ID of the workspace the agent reads and writes files in. |
| `autoCompaction` | boolean | body |  | Summarize older context automatically when a conversation nears the model's context limit. |
| `compactionReserveTokens` | integer | body |  | Tokens to keep free for the model's reply when deciding whether to compact. Minimum 0. |
| `memoryInjectionEnabled` | boolean | body |  | Add the agent's saved memories to every turn automatically. |
| `tools` | string[] | body |  | Built-in tool groups the agent can use: `workspace`, `write_todos`, and `memory`. |
| `instructions` | string | body |  | Instructions the agent follows on every turn. Up to 3000 characters. |
| `metadata` | object | body |  | Your own key-value data, returned unchanged. |
| `mcpConnectionIds` | string[] | body |  | IDs of the MCP connections attached to the agent. |

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
  "id": "ag_4kP9sT2vXq7LmN3a",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "name": "Support Agent",
  "model": "openai/gpt-6-luna",
  "thinkingLevel": null,
  "providerId": "prv_7Tn4Kd9QwE2sLx5R",
  "workspaceId": "ws_3Vb8Ny6HpU1cGf4M",
  "autoCompaction": true,
  "compactionReserveTokens": 16384,
  "memoryInjectionEnabled": false,
  "tools": [
    "workspace"
  ],
  "instructions": "Answer billing and refund questions clearly and briefly.",
  "userId": "",
  "metadata": {
    "team": "support"
  },
  "mcpConnectionIds": [],
  "avatarUrl": null,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:15:00.000Z",
  "status": "active"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`model_not_found`](/api-reference/protocols/errors#model_not_found), [`agent_mcp_connection_not_found`](/api-reference/protocols/errors#agent_mcp_connection_not_found), [`agent_mcp_connections_invalid`](/api-reference/protocols/errors#agent_mcp_connections_invalid), [`mcp_connection_discovery_failed`](/api-reference/protocols/errors#mcp_connection_discovery_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found), [`provider_not_found`](/api-reference/protocols/errors#provider_not_found), [`workspace_not_found`](/api-reference/protocols/errors#workspace_not_found) | The resource was not found |
| `409` | [`admin_agent_managed`](/api-reference/protocols/errors#admin_agent_managed) | The request conflicts with the resource's current state |
| `503` | [`model_validation_unavailable`](/api-reference/protocols/errors#model_validation_unavailable) | The service is temporarily unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PUT "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"instructions":"Answer billing and refund questions clearly and briefly.","tools":["workspace"]}'
```

### DELETE /v1/agents/:agentId [#delete-agent]

Delete an agent.

Permanently deletes an agent. Its workspace is kept. Set `includeArtifacts` to choose whether its artifacts are deleted too. The platform-managed `ba assist` agent cannot be deleted.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `includeArtifacts` | string | query | required | `true` also deletes the agent's artifacts; `false` keeps them. One of `true`, `false`. |

#### Response

Returns `204 No Content`. The agent was deleted.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`admin_agent_managed`](/api-reference/protocols/errors#admin_agent_managed) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF?includeArtifacts=false" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/disable [#disable-agent]

Disable an agent.

Turns an agent off. New turns for a disabled agent fail with `agent_disabled` until you enable it again. The platform-managed `ba assist` agent cannot be disabled.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |

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
  "id": "ag_4kP9sT2vXq7LmN3a",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "name": "Support Agent",
  "model": "openai/gpt-6-luna",
  "thinkingLevel": null,
  "providerId": "prv_7Tn4Kd9QwE2sLx5R",
  "workspaceId": "ws_3Vb8Ny6HpU1cGf4M",
  "autoCompaction": true,
  "compactionReserveTokens": 16384,
  "memoryInjectionEnabled": false,
  "tools": [
    "workspace",
    "write_todos"
  ],
  "instructions": "Answer billing questions clearly and briefly.",
  "userId": "",
  "metadata": {
    "team": "support"
  },
  "mcpConnectionIds": [],
  "avatarUrl": null,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z",
  "status": "disabled"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`admin_agent_managed`](/api-reference/protocols/errors#admin_agent_managed) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/disable" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/enable [#enable-agent]

Enable an agent.

Turns a disabled agent back on.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |

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
  "id": "ag_4kP9sT2vXq7LmN3a",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "name": "Support Agent",
  "model": "openai/gpt-6-luna",
  "thinkingLevel": null,
  "providerId": "prv_7Tn4Kd9QwE2sLx5R",
  "workspaceId": "ws_3Vb8Ny6HpU1cGf4M",
  "autoCompaction": true,
  "compactionReserveTokens": 16384,
  "memoryInjectionEnabled": false,
  "tools": [
    "workspace",
    "write_todos"
  ],
  "instructions": "Answer billing questions clearly and briefly.",
  "userId": "",
  "metadata": {
    "team": "support"
  },
  "mcpConnectionIds": [],
  "avatarUrl": null,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z",
  "status": "active"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`admin_agent_managed`](/api-reference/protocols/errors#admin_agent_managed) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/enable" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/avatar [#upload-agent-avatar]

Upload an agent avatar.

Sets the agent's avatar, replacing any current one. Send the image as the `file` field of a multipart form. The platform-managed `ba assist` agent's avatar cannot change.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a multipart form body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `file` | file | form | required | PNG, JPEG, or WebP image of 512 KiB or smaller. Its file extension must match its type. |

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
  "id": "ag_4kP9sT2vXq7LmN3a",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "name": "Support Agent",
  "model": "openai/gpt-6-luna",
  "thinkingLevel": null,
  "providerId": "prv_7Tn4Kd9QwE2sLx5R",
  "workspaceId": "ws_3Vb8Ny6HpU1cGf4M",
  "autoCompaction": true,
  "compactionReserveTokens": 16384,
  "memoryInjectionEnabled": false,
  "tools": [
    "workspace",
    "write_todos"
  ],
  "instructions": "Answer billing questions clearly and briefly.",
  "userId": "",
  "metadata": {
    "team": "support"
  },
  "mcpConnectionIds": [],
  "avatarUrl": "https://files.example.com/avatars/ag_4kP9sT2vXq7LmN3a.webp",
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z",
  "status": "active"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`admin_agent_managed`](/api-reference/protocols/errors#admin_agent_managed) | The request conflicts with the resource's current state |
| `415` | [`invalid_request`](/api-reference/protocols/errors#invalid_request) | The request body has an unsupported media type |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/avatar" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --form "file=@./file"
```

### DELETE /v1/agents/:agentId/avatar [#delete-agent-avatar]

Delete an agent avatar.

Removes the agent's avatar and returns the updated agent. The platform-managed `ba assist` agent's avatar cannot change.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |

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
  "id": "ag_4kP9sT2vXq7LmN3a",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "name": "Support Agent",
  "model": "openai/gpt-6-luna",
  "thinkingLevel": null,
  "providerId": "prv_7Tn4Kd9QwE2sLx5R",
  "workspaceId": "ws_3Vb8Ny6HpU1cGf4M",
  "autoCompaction": true,
  "compactionReserveTokens": 16384,
  "memoryInjectionEnabled": false,
  "tools": [
    "workspace",
    "write_todos"
  ],
  "instructions": "Answer billing questions clearly and briefly.",
  "userId": "",
  "metadata": {
    "team": "support"
  },
  "mcpConnectionIds": [],
  "avatarUrl": null,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z",
  "status": "active"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`admin_agent_managed`](/api-reference/protocols/errors#admin_agent_managed) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/avatar" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Agents](/agents/agents) to decide what each setting does.
- [Configuration snapshots and lifecycle](/agents/configuration-snapshots) to inspect saved settings.
- [Sessions API](/api-reference/rest-api/sessions) to start a conversation with the agent.
