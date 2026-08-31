---
title: Agents
description: Create, inspect, update, version, disable, and extend Agents.
---

# Agents

## Overview [#overview]

Agents are Tenant-owned configuration records. Use these endpoints to configure execution, inspect immutable Versions, attach capabilities, or operate the reversible execution kill switch; Attribution remains immutable after creation.

## Endpoints [#endpoints]

### POST /v1/agents [#create-agent]

Creates an Agent. Names are unique per Tenant.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and JSON. There are no path or query parameters. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |

| Body field               | Type           | Required | Default                      |
| ------------------------ | -------------- | -------- | ---------------------------- |
| `name`                   | string         | yes      | —                            |
| `model`                  | string \| null | no       | `null`                       |
| `providerId`             | string \| null | no       | `null`                       |
| `tools`                  | string[]       | no       | `[]`                         |
| `workspaceId`            | string         | no       | New default Workspace        |
| `instructions`           | string         | no       | `""`                         |
| `memoryInjectionEnabled` | boolean        | no       | `false`                      |
| `userId`                 | string         | no       | `""`                         |
| `metadata`               | object         | no       | `{}`                         |
| `mcpConnectionIds`       | string[]       | no       | `[]`                         |

`providerId` and `model` form one optional pair: omit both or set both to `null`
for an unconfigured Agent, and supply both to configure one. `model` is a
trimmed, non-empty Provider-native ID when configured. Tool groups are
`workspace`, `write_todos`, and `memory`. Tool-group selection
is independent of `workspaceId`; the first Workspace operation freezes the
Agent's current Tenant-owned Workspace ID for that Turn, while every operation
refreshes its runtime state. Omitting `workspaceId` atomically creates and
attaches a normal Workspace. Supplying an
existing same-Tenant ID shares it. The implicit Workspace starts with the
Agent's name and Attribution, then remains independent; Agent updates do not
synchronize it. Neither path initializes Container compute.

#### Response

Returns `201 Created` with an [Agent object](/api-reference/protocols/objects-and-schemas#agent).

Response schema: [`agentResponseSchema`](/api-reference/protocols/objects-and-schemas#agent-response).

```json
{
  "id": "ag_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "name": "Support Agent",
  "model": null,
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

SDK: [TypeScript](/sdk/typescript/agents#create) / [Python](/sdk/python/agents#create). See [Agents](/agents/agents) and [Build a chat endpoint](/platform/sessions-and-turns).

### GET /v1/agents [#list-agents]

Lists Agents by most recent update.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |

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
      "model": "gpt-4.1",
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

SDK: [TypeScript](/sdk/typescript/agents#list) / [Python](/sdk/python/agents#list). See [Agents](/agents/agents) and [Build a chat endpoint](/platform/sessions-and-turns).

### GET /v1/agents/:agentId [#get-agent]

Retrieves the current Agent configuration without creating a Version.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
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

SDK: [TypeScript](/sdk/typescript/agents#get) / [Python](/sdk/python/agents#get). See [Agents](/agents/agents) and [Build a chat endpoint](/platform/sessions-and-turns).

### PUT /v1/agents/:agentId [#update-agent]

Updates an Agent. Array fields replace their existing values.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and JSON. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |

| Parameter                     | Type           | Required | Description                          |
| ----------------------------- | -------------- | -------- | ------------------------------------ |
| Body `name`                   | string         | no       | 1–80 characters                      |
| Body `model`                  | string \| null | no       | Provider-native model ID or `null`   |
| Body `providerId`             | string \| null | no       | Stored Provider or `null`             |
| Body `tools`                  | string[]       | no       | Complete replacement tool-group list |
| Body `workspaceId`            | string         | no       | Reassign to another Workspace        |
| Body `instructions`           | string         | no       | Up to 3,000 characters               |
| Body `memoryInjectionEnabled` | boolean        | no       | Toggle automatic memory context      |
| Body `metadata`               | object         | no       | Replacement metadata                 |
| Body `mcpConnectionIds`       | string[]       | no       | Complete replacement MCP list        |

At least one field is required. Changing a Provider requires `model` in the same request. Send both fields as `null` to clear the configuration; every half-configured pair is rejected. There are no query parameters.

For the Admin Agent, only `providerId` and `model` are mutable. They use the
same settled-pair rules and create the next ordinary Version. Any request that
also supplies another field is rejected as platform-managed.

#### Response

Returns `200 OK` with the complete updated [Agent object](/api-reference/protocols/objects-and-schemas#agent).

Response schema: [`agentResponseSchema`](/api-reference/protocols/objects-and-schemas#agent-response).

```json
{
  "id": "ag_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "name": "Support Agent",
  "model": "gpt-4.1",
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

`400 validation_failed` for invalid/empty input. Specific configuration codes include `agent_name_conflict` and `provider_not_found`. `404 not_found` applies when the Agent is missing or foreign; `409 admin_agent_managed` protects every Admin Agent field except its Provider/model pair. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request PUT \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"workspaceId":"ws_1234567890ABCDEF","tools":["workspace"],"metadata":{"team":"support"}}'
```

#### SDK and related guides

SDK: [TypeScript](/sdk/typescript/agents#update) / [Python](/sdk/python/agents#update). See [Agents](/agents/agents) and [Build a chat endpoint](/platform/sessions-and-turns).

### DELETE /v1/agents/:agentId [#delete-agent]

Permanently deletes an Agent while preserving its Workspace.
`includeArtifacts=true` also hard-deletes its Artifacts;
`includeArtifacts=false` preserves them.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), an
`ag_…` `agentId`, and the `includeArtifacts=true|false` query parameter.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |
| Query    | `includeArtifacts` | yes   | Delete (`true`) or preserve (`false`) Artifacts. |

#### Response

Returns `204 No Content` with an empty body.

#### Errors

`400 validation_failed` for a malformed ID. `404 not_found` when the Agent is missing or foreign. `409 admin_agent_managed` protects the Admin Agent. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request DELETE \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF?includeArtifacts=false" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDK: [TypeScript](/sdk/typescript/agents#delete) / [Python](/sdk/python/agents#delete). See [Agents](/agents/agents) and [Build a chat endpoint](/platform/sessions-and-turns).

### POST /v1/agents/:agentId/disable [#disable-agent]

Disables an Agent, rejecting future Turns while in-flight Turns finish.

#### Authorizations

| Field           | Type   | Location | Required | Description                               |
| --------------- | ------ | -------- | -------- | ----------------------------------------- |
| `Authorization` | string | header   | required | Tenant API key or dashboard Supabase JWT. |

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

`404 not_found` when the Agent is missing. `409 admin_agent_managed` for the Admin Agent. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/disable" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDK: [TypeScript](/sdk/typescript/agents#disable) / [Python](/sdk/python/agents#disable). See [Agents](/agents/agents) and [Build a chat endpoint](/platform/sessions-and-turns).

### POST /v1/agents/:agentId/enable [#enable-agent]

Enables a disabled Agent. Skipped schedule fires are not replayed.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
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

SDK: [TypeScript](/sdk/typescript/agents#enable) / [Python](/sdk/python/agents#enable). See [Agents](/agents/agents) and [Build a chat endpoint](/platform/sessions-and-turns).

### POST /v1/agents/:agentId/avatar [#upload-agent-avatar]

Uploads or replaces an Agent's private avatar. Responses contain a short-lived signed URL.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and `multipart/form-data`. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |

| Parameter   | Type | Required | Description                         |
| ----------- | ---- | -------- | ----------------------------------- |
| Form `file` | file | yes      | PNG, JPEG, or WebP, at most 512 KiB |

There are no query parameters.

#### Response

Returns `200 OK` with the complete updated [Agent object](/api-reference/protocols/objects-and-schemas#agent). `avatarUrl` is a short-lived signed URL.

Response schema: [`agentSchema`](/api-reference/protocols/objects-and-schemas#agent).

#### Errors

`400 invalid_request` when the multipart body has no `file`. The same code uses
status `413` above 512 KiB and `415` for another media type. A malformed Agent
ID uses `400 validation_failed`; `404 not_found` applies when the Agent is
missing or foreign; and `409 admin_agent_managed` protects the Admin Agent. See
[REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/avatar" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --form "file=@./avatar.webp;type=image/webp"
```

#### SDK and related guides

SDK: [TypeScript](/sdk/typescript/agents#upload-avatar) / [Python](/sdk/python/agents#upload-avatar). See [Agents](/agents/agents) and [Build a chat endpoint](/platform/sessions-and-turns).

### DELETE /v1/agents/:agentId/avatar [#delete-agent-avatar]

Removes an Agent's avatar and returns the updated Agent.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). `agentId` is a required `ag_…` path parameter. There are no query or body parameters. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |

#### Response

Returns `200 OK` with the complete updated [Agent object](/api-reference/protocols/objects-and-schemas#agent); `avatarUrl` is `null`.

Response schema: [`agentSchema`](/api-reference/protocols/objects-and-schemas#agent).

#### Errors

`400 validation_failed` for a malformed ID. `404 not_found` when the Agent is missing or foreign. `409 admin_agent_managed` protects the Admin Agent. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request DELETE \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/avatar" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDK: [TypeScript](/sdk/typescript/agents#remove-avatar) / [Python](/sdk/python/agents#remove-avatar). See [Agents](/agents/agents) and [Build a chat endpoint](/platform/sessions-and-turns).

### GET /v1/agents/:agentId/versions [#list-agent-versions]

Lists an Agent's immutable Versions newest first.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
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

SDK: [TypeScript](/sdk/typescript/agents#list-versions) / [Python](/sdk/python/agents#list-versions). See [Agents](/agents/agents) and [Build a chat endpoint](/platform/sessions-and-turns).

### GET /v1/agents/:agentId/versions/:version [#get-agent-version]

Retrieves an immutable Agent Version without copying currently referenced resources.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
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

SDK: [TypeScript](/sdk/typescript/agents#get-version) / [Python](/sdk/python/agents#get-version). See [Agents](/agents/agents) and [Build a chat endpoint](/platform/sessions-and-turns).

### GET /v1/agents/:agentId/mcp-attachments [#list-agent-mcp-attachments]

Lists the MCP Attachments that select an Agent's MCP tools.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
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

SDK: [TypeScript](/sdk/typescript/agents#list-mcp-attachments) / [Python](/sdk/python/agents#list-mcp-attachments). See [Agents](/agents/agents) and [Build a chat endpoint](/platform/sessions-and-turns).

### PATCH /v1/agents/:agentId/mcp-attachments/:mcpConnectionId [#update-agent-mcp-attachment]

Updates end-user forwarding fields for one MCP Attachment without changing access control.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field             | Required | Description                               |
| -------- | ----------------- | -------- | ----------------------------------------- |
| Header   | `Authorization`   | yes      | Tenant API key or dashboard Supabase JWT. |
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

SDK: [TypeScript](/sdk/typescript/agents#update-mcp-attachment) / [Python](/sdk/python/agents#update-mcp-attachment). See [Agents](/agents/agents) and [Build a chat endpoint](/platform/sessions-and-turns).

## Related [#related]

- [Agents TypeScript SDK](/sdk/typescript/agents)
- [Agents Python SDK](/sdk/python/agents)
- [Versions and lifecycle](/agents/versions-and-lifecycle)
- [Objects and schemas](/api-reference/protocols/objects-and-schemas)
