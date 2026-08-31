---
title: MCP connections
description: Manage, test, connect, and reconnect Tenant MCP Connections.
---

# MCP connections

## Overview [#overview]

MCP Connections are Tenant configuration for remote Streamable HTTP tool servers and do not carry Attribution. Use these endpoints to store write-only credentials, inspect definitions, test connectivity, or complete reconnection and OAuth setup without exposing secrets.

## Endpoints [#endpoints]

### POST /v1/mcp-connections [#create-mcp-connection]

Creates a reusable MCP Connection. Credentials remain write-only.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |

| Location | Field          | Required    | Description                                                                                                          |
| -------- | -------------- | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| Body     | `name`         | yes         | Unique display name.                                                                                                 |
| Body     | `url`          | yes         | Remote Streamable HTTP URL.                                                                                          |
| Body     | `authType`     | yes         | `none`, `bearer`, `oauth_client_credentials`, or `oauth_authorization_code`; credentials depend on the discriminant. |
| Body     | `bearerToken`  | conditional | Required only for `bearer`.                                                                                          |
| Body     | `clientId`     | conditional | Required with `clientSecret` for client credentials; optional but paired for authorization code.                     |
| Body     | `clientSecret` | conditional | Required with `clientId` for client credentials; optional but paired for authorization code.                         |
| Body     | `scope`        | no          | Optional OAuth scope for either OAuth mode.                                                                          |
| Header   | `Content-Type` | yes         | `application/json`.                                                                                                  |

#### Response

| Status        | Body                                                                                      | Lifecycle effect                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `201 Created` | [McpConnectionResponse](/api-reference/protocols/objects-and-schemas#mcp-connection-response) | Stores a `connected` definition, or `needs_auth` for authorization-code OAuth; secrets remain write-only. |

For `none`, `bearer`, and client-credentials authentication, create validates the live server before committing and returns `connected`. Authorization-code create does not contact the upstream server; it stores `needs_auth` for the admin-session connect flow.

Response schema: [`mcpConnectionResponseSchema`](/api-reference/protocols/objects-and-schemas#mcp-connection-response).

#### Errors

`400 validation_failed` applies to an invalid discriminated body. Live setup
uses `mcp_connection_invalid`, `mcp_connection_authentication_failed`,
`mcp_connection_unreachable`, or `mcp_connection_discovery_failed`. Duplicate
names use `409 mcp_connection_name_conflict`, and the Tenant cap uses
`mcp_connection_limit_reached`. A failed create does not retain the staged
connection. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"Docs","url":"https://mcp.example.com/mcp","authType":"none"}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/mcp-connections#create), [Python](/sdk/python/mcp-connections#create). See [MCP Connections](/agents/tools/mcp-tools) and [Connect an MCP server](/agents/tools/mcp-tools).

### GET /v1/mcp-connections [#list-mcp-connections]

Lists MCP Connections with credentials redacted.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |

#### Response

| Status   | Body                                                                                        | Lifecycle effect                 |
| -------- | ------------------------------------------------------------------------------------------- | -------------------------------- |
| `200 OK` | [McpConnectionsResponse](/api-reference/protocols/objects-and-schemas#mcp-connections-response) | Read-only; secrets are redacted. |

Response schema: [`mcpConnectionsResponseSchema`](/api-reference/protocols/objects-and-schemas#mcp-connections-response).

#### Errors

Authentication and service errors only. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/mcp-connections#list), [Python](/sdk/python/mcp-connections#list). See [MCP Connections](/agents/tools/mcp-tools) and [Connect an MCP server](/agents/tools/mcp-tools).

### GET /v1/mcp-connections/:id [#get-mcp-connection]

Retrieves an MCP Connection with credentials redacted.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `id`            | yes      | MCP Connection ID.                        |

#### Response

| Status   | Body                                                                                      | Lifecycle effect                     |
| -------- | ----------------------------------------------------------------------------------------- | ------------------------------------ |
| `200 OK` | [McpConnectionResponse](/api-reference/protocols/objects-and-schemas#mcp-connection-response) | Read-only; credentials are redacted. |

Response schema: [`mcpConnectionResponseSchema`](/api-reference/protocols/objects-and-schemas#mcp-connection-response).

#### Errors

`404 not_found` for an unknown or out-of-Tenant ID. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections/mcp_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/mcp-connections#get), [Python](/sdk/python/mcp-connections#get). See [MCP Connections](/agents/tools/mcp-tools) and [Connect an MCP server](/agents/tools/mcp-tools).

### PATCH /v1/mcp-connections/:id [#update-mcp-connection]

Renames an MCP Connection.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `id`            | yes      | MCP Connection ID.                        |

| Location | Field          | Required | Description                                              |
| -------- | -------------- | -------- | -------------------------------------------------------- |
| Body     | `name`         | yes      | New unique display name; at least one field is required. |
| Header   | `Content-Type` | yes      | `application/json`.                                      |

#### Response

| Status   | Body                                                                                      | Lifecycle effect                                            |
| -------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `200 OK` | [McpConnectionResponse](/api-reference/protocols/objects-and-schemas#mcp-connection-response) | Updates the definition without changing stored credentials. |

Response schema: [`mcpConnectionResponseSchema`](/api-reference/protocols/objects-and-schemas#mcp-connection-response).

#### Errors

`400 validation_failed`; `404 not_found`; `409
mcp_connection_name_conflict` for a duplicate name. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections/mcp_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"Docs production"}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/mcp-connections#update), [Python](/sdk/python/mcp-connections#update). See [MCP Connections](/agents/tools/mcp-tools) and [Connect an MCP server](/agents/tools/mcp-tools).

### DELETE /v1/mcp-connections/:id [#delete-mcp-connection]

Deletes an MCP Connection and revokes stored OAuth credentials.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `id`            | yes      | MCP Connection ID.                        |

#### Response

| Status           | Body  | Lifecycle effect                                             |
| ---------------- | ----- | ------------------------------------------------------------ |
| `204 No Content` | Empty | Removes the definition and revokes stored OAuth credentials. |

#### Errors

`400 validation_failed` for a malformed ID; `404 not_found`; `409
mcp_connection_in_use` while an Agent references the connection. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections/mcp_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/mcp-connections#delete), [Python](/sdk/python/mcp-connections#delete). See [MCP Connections](/agents/tools/mcp-tools) and [Connect an MCP server](/agents/tools/mcp-tools).

### POST /v1/mcp-connections/:id/test [#test-mcp-connection]

Tests an MCP Connection and discovers its server and tools.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `id`            | yes      | MCP Connection ID.                        |

#### Response

| Status   | Body                                                                                               | Lifecycle effect                                                                 |
| -------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `200 OK` | [McpConnectionTestResponse](/api-reference/protocols/objects-and-schemas#mcp-connection-test-response) | Persists `status` and `lastAuthErrorCode`; OAuth testing may also renew a token. |

Test always returns HTTP `200` after finding the stored connection and persists both fields: success returns `ok: true`, sets `status: "connected"`, and clears `lastAuthErrorCode`; authentication rejection returns `ok: false`, sets `status: "needs_auth"`, and records its code; other live validation or connectivity failures return `ok: false`, set `status: "error"`, and record their code. OAuth testing may renew stored token material before reporting the result.

Response schema: [`mcpConnectionTestResponseSchema`](/api-reference/protocols/objects-and-schemas#mcp-connection-test-response).

#### Errors

`404 not_found` for a missing connection. A stored unsafe URL is impossible because create and reconnect validate before persistence; live validation and connectivity failures normally return `200 { "ok": false, "error": "…" }`. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections/mcp_1234567890ABCDEF/test" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/mcp-connections#test), [Python](/sdk/python/mcp-connections#test). See [MCP Connections](/agents/tools/mcp-tools) and [Connect an MCP server](/agents/tools/mcp-tools).

### POST /v1/mcp-connections/:id/connect [#connect-mcp-connection]

Starts authorization-code OAuth for an MCP Connection. Requires a dashboard session.

#### Request

Requires a [dashboard Supabase JWT](/api-reference/rest-api/authentication). The dashboard JWT selects the Tenant ownership boundary; the authenticated administrator and every referenced resource must belong to that Tenant.

| Location | Field           | Required | Description                                           |
| -------- | --------------- | -------- | ----------------------------------------------------- |
| Header   | `Authorization` | yes      | Dashboard Supabase JWT; Tenant API keys are rejected. |
| Path     | `id`            | yes      | MCP Connection ID.                                    |

#### Response

| Status   | Body                                                                                                                | Lifecycle effect                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `200 OK` | [McpConnectionOauthConnectResponse](/api-reference/protocols/objects-and-schemas#mcp-connection-oauth-connect-response) | Creates a short-lived setup continuation and returns a dashboard URL. |

Response schema: [`mcpConnectionOauthConnectResponseSchema`](/api-reference/protocols/objects-and-schemas#mcp-connection-oauth-connect-response).

#### Errors

`400 validation_failed` for a malformed ID. Authentication without the
dashboard JWT's `authUserId` uses `401 unauthorized`. The current service maps
a missing or foreign connection—and a connection with the wrong auth type or
status—to `500 internal`, not `404`. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections/mcp_1234567890ABCDEF/connect" \
  --header "Authorization: Bearer $BLAZING_AGENTS_DASHBOARD_JWT"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/mcp-connections#connect), [Python](/sdk/python/mcp-connections#connect). See [MCP Connections](/agents/tools/mcp-tools) and [Connect an MCP server](/agents/tools/mcp-tools).

### POST /v1/mcp-connections/:id/reconnect [#reconnect-mcp-connection]

Replaces a disconnected MCP Connection's endpoint and credentials. Authorization-code OAuth must be completed separately.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `id`            | yes      | MCP Connection ID.                        |

| Location | Field          | Required    | Description                                                                                      |
| -------- | -------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| Body     | `authType`     | yes         | Authentication discriminant.                                                                     |
| Body     | `url`          | yes         | Replacement remote URL; credential fields depend on `authType`.                                  |
| Body     | `bearerToken`  | conditional | Required only for `bearer`.                                                                      |
| Body     | `clientId`     | conditional | Required with `clientSecret` for client credentials; optional but paired for authorization code. |
| Body     | `clientSecret` | conditional | Required with `clientId` for client credentials; optional but paired for authorization code.     |
| Body     | `scope`        | no          | Optional OAuth scope for either OAuth mode.                                                      |
| Header   | `Content-Type` | yes         | `application/json`.                                                                              |

#### Response

| Status   | Body                                                                                                     | Lifecycle effect                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `200 OK` | [McpConnectionReconnectResult](/api-reference/protocols/objects-and-schemas#mcp-connection-reconnect-result) | Returns `connected` after live validation, or `needs_auth` for authorization-code OAuth. |

Reconnect to `none`, `bearer`, or client credentials validates before replacing the stored configuration and returns `connected`. Reconnect to authorization-code OAuth stores the replacement as `needs_auth`; use connect to continue. Live test or runtime failures may later move a stored connection from `connected` to `needs_auth` for authentication rejection or to `error` for other failures.

Response schema: [`mcpConnectionReconnectResultSchema`](/api-reference/protocols/objects-and-schemas#mcp-connection-reconnect-result).

#### Errors

`400 validation_failed` applies to malformed IDs and invalid discriminated
configuration. Live validation uses `mcp_connection_invalid`,
`mcp_connection_authentication_failed`, `mcp_connection_unreachable`, or
`mcp_connection_discovery_failed`; failed validation leaves the existing
configuration unchanged. `404 not_found` applies to the stored connection
lookup, and `409 mcp_connection_stale_credential_version` applies if the
credential changes concurrently. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections/mcp_1234567890ABCDEF/reconnect" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"authType":"none","url":"https://mcp.example.com/mcp"}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/mcp-connections#reconnect), [Python](/sdk/python/mcp-connections#reconnect). See [MCP Connections](/agents/tools/mcp-tools) and [Connect an MCP server](/agents/tools/mcp-tools).

## Related [#related]

- [TypeScript SDK](/sdk/typescript)
- [Objects and schemas](/api-reference/protocols/objects-and-schemas)
- [Errors](/api-reference/protocols/errors)
