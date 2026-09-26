---
title: MCP connections
description: Connect remote MCP tool servers, then test, update, and reconnect them.
---

# MCP connections

## Overview [#overview]

An MCP connection gives your agents the tools on a remote MCP server that speaks Streamable HTTP. Store the server URL and its credentials once, then attach the connection to any agent in your tenant. Credentials are never returned. Connections have no `userId`.

## Endpoints [#endpoints]

### POST /v1/mcp-connections [#create-mcp-connection]

Creates an MCP connection you can attach to agents. Credentials are never returned.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |

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

For `none`, `bearer`, and client-credentials authentication, Blazing Agents checks the live server before saving and returns `connected`. For authorization-code OAuth, it does not contact the server; it saves the connection as `needs_auth` so an administrator can finish sign-in with [connect](#connect-mcp-connection).

Response schema: [`mcpConnectionResponseSchema`](/api-reference/protocols/objects-and-schemas#mcp-connection-response).

#### Errors

`400 validation_failed` for an invalid body. A failed server check returns
`mcp_connection_invalid`, `mcp_connection_authentication_failed`,
`mcp_connection_unreachable`, or `mcp_connection_discovery_failed`. A
duplicate name returns `409 mcp_connection_name_conflict`, and reaching the
tenant limit returns `mcp_connection_limit_reached`. A failed create saves
nothing. For `none` and `bearer`, the server check runs before the name and
limit checks, so a server error can come back first. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"Docs","url":"https://mcp.example.com/mcp","authType":"none"}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/mcp-connections#create), [Python](/sdk/python/mcp-connections#create). See [MCP connections](/agents/tools/mcp-tools).

### GET /v1/mcp-connections [#list-mcp-connections]

Lists your MCP connections without their credentials.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |

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

SDKs: [TypeScript](/sdk/typescript/mcp-connections#list), [Python](/sdk/python/mcp-connections#list). See [MCP connections](/agents/tools/mcp-tools).

### GET /v1/mcp-connections/:id [#get-mcp-connection]

Retrieves one MCP connection without its credentials.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `id`            | yes      | MCP Connection ID.                        |

#### Response

| Status   | Body                                                                                      | Lifecycle effect                     |
| -------- | ----------------------------------------------------------------------------------------- | ------------------------------------ |
| `200 OK` | [McpConnectionResponse](/api-reference/protocols/objects-and-schemas#mcp-connection-response) | Read-only; credentials are redacted. |

Response schema: [`mcpConnectionResponseSchema`](/api-reference/protocols/objects-and-schemas#mcp-connection-response).

#### Errors

`404 not_found` for an unknown ID or one in another tenant. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections/mcp_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/mcp-connections#get), [Python](/sdk/python/mcp-connections#get). See [MCP connections](/agents/tools/mcp-tools).

### PATCH /v1/mcp-connections/:id [#update-mcp-connection]

Renames an MCP connection.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
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

SDKs: [TypeScript](/sdk/typescript/mcp-connections#update), [Python](/sdk/python/mcp-connections#update). See [MCP connections](/agents/tools/mcp-tools).

### DELETE /v1/mcp-connections/:id [#delete-mcp-connection]

Deletes an MCP connection and revokes its stored OAuth credentials.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `id`            | yes      | MCP Connection ID.                        |

#### Response

| Status           | Body  | Lifecycle effect                                             |
| ---------------- | ----- | ------------------------------------------------------------ |
| `204 No Content` | Empty | Removes the definition and revokes stored OAuth credentials. |

#### Errors

`400 validation_failed` for a malformed ID; `404 not_found`; `409
mcp_connection_in_use` while an agent is attached to the connection. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections/mcp_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/mcp-connections#delete), [Python](/sdk/python/mcp-connections#delete). See [MCP connections](/agents/tools/mcp-tools).

### POST /v1/mcp-connections/:id/test [#test-mcp-connection]

Tests an MCP connection and lists its server details and tools.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `id`            | yes      | MCP Connection ID.                        |

#### Response

| Status   | Body                                                                                               | Lifecycle effect                                                                 |
| -------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `200 OK` | [McpConnectionTestResponse](/api-reference/protocols/objects-and-schemas#mcp-connection-test-response) | Persists `status` and `lastAuthErrorCode`; OAuth testing may also renew a token. |

A test of an existing connection always returns HTTP `200` and saves the
outcome on the connection:

- Success returns `ok: true`, sets `status: "connected"`, and clears `lastAuthErrorCode`.
- A rejected credential returns `ok: false`, sets `status: "needs_auth"`, and records the code.
- Any other failure returns `ok: false`, sets `status: "error"`, and records the code.

Testing an OAuth connection can refresh its stored tokens first.

Response schema: [`mcpConnectionTestResponseSchema`](/api-reference/protocols/objects-and-schemas#mcp-connection-test-response).

#### Errors

`404 not_found` for a missing connection. Server and network failures come back as `200` with `{ "ok": false, "error": "…" }`, not as an error status. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections/mcp_1234567890ABCDEF/test" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/mcp-connections#test), [Python](/sdk/python/mcp-connections#test). See [MCP connections](/agents/tools/mcp-tools).

### POST /v1/mcp-connections/:id/connect [#connect-mcp-connection]

Starts OAuth sign-in for an MCP connection. Requires a dashboard JWT.

#### Request

Requires a [dashboard JWT](/api-reference/rest-api/authentication). The signed-in administrator and every resource in the request must belong to the same tenant.

| Location | Field           | Required | Description                                           |
| -------- | --------------- | -------- | ----------------------------------------------------- |
| Header   | `Authorization` | yes      | Dashboard JWT; Tenant API keys are rejected. |
| Path     | `id`            | yes      | MCP Connection ID.                                    |

#### Response

| Status   | Body                                                                                                                | Lifecycle effect                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `200 OK` | [McpConnectionOauthConnectResponse](/api-reference/protocols/objects-and-schemas#mcp-connection-oauth-connect-response) | Creates a short-lived setup continuation and returns a dashboard URL. |

Response schema: [`mcpConnectionOauthConnectResponseSchema`](/api-reference/protocols/objects-and-schemas#mcp-connection-oauth-connect-response).

#### Errors

`400 validation_failed` for a malformed ID. A request without a dashboard JWT
returns `401 unauthorized`. A missing connection, one in another tenant, or one
with the wrong auth type or status currently returns `500 internal`, not
`404`. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections/mcp_1234567890ABCDEF/connect" \
  --header "Authorization: Bearer $BLAZING_AGENTS_DASHBOARD_JWT"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/mcp-connections#connect), [Python](/sdk/python/mcp-connections#connect). See [MCP connections](/agents/tools/mcp-tools).

### POST /v1/mcp-connections/:id/reconnect [#reconnect-mcp-connection]

Replaces a connection's server URL and credentials. For authorization-code OAuth, finish sign-in with connect afterward.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
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

For `none`, `bearer`, or client credentials, Blazing Agents checks the server before replacing anything and returns `connected`. For authorization-code OAuth, it saves the replacement as `needs_auth`; call connect next. Later, a failed test or tool call can move a connection from `connected` to `needs_auth` when the credential is rejected, or to `error` for other failures.

Response schema: [`mcpConnectionReconnectResultSchema`](/api-reference/protocols/objects-and-schemas#mcp-connection-reconnect-result).

#### Errors

`400 validation_failed` for a malformed ID or invalid body. A failed server
check returns `mcp_connection_invalid`, `mcp_connection_authentication_failed`,
`mcp_connection_unreachable`, or `mcp_connection_discovery_failed`, and leaves
the existing configuration as it was. `404 not_found` for a missing
connection, and `409 mcp_connection_stale_credential_version` if the
credential changed at the same time. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections/mcp_1234567890ABCDEF/reconnect" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"authType":"none","url":"https://mcp.example.com/mcp"}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/mcp-connections#reconnect), [Python](/sdk/python/mcp-connections#reconnect). See [MCP connections](/agents/tools/mcp-tools).

## Next [#next]

- [MCP connections](/agents/tools/mcp-tools) to give an agent remote tools.
- [Agents API](/api-reference/rest-api/agents#update-agent-mcp-attachment) to control what each attachment forwards.
- [MCP OAuth](/api-reference/rest-api/mcp-oauth) to finish OAuth sign-in.
