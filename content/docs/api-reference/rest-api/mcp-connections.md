---
title: MCP connections
description: Connect remote MCP tool servers, then test, update, and reconnect them.
---

# MCP connections

## Overview [#overview]

An MCP connection gives your agents the tools on a remote MCP server that speaks Streamable HTTP. Store the server URL and its credentials once, then attach the connection to any agent in your tenant. Credentials are never returned. Connections have no `userId`. Servers that sign in with OAuth finish connecting in the [dashboard](https://www.blazingagents.com/app).

## Endpoints [#endpoints]

### GET /v1/mcp-connections [#list-mcp-connections]

List MCP connections.

Lists your tenant's MCP connections, sorted by name. Credentials are never returned.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

There are no parameters and no request body.

#### Response

Returns `200 OK` as `application/json`. Your tenant's MCP connections.

Response schema: `McpConnectionList`.

```json
{
  "mcpConnections": [
    {
      "id": "mcp_2Rk7Wm4XsQ9dHv1B",
      "name": "Docs Search",
      "url": "https://mcp.example.com/mcp",
      "authType": "bearer",
      "status": "connected",
      "credentialFragment": "x7Qa",
      "lastAuthErrorCode": null,
      "oauthIssuer": null,
      "oauthResource": null,
      "tokenExpiresAt": null,
      "createdAt": "2026-07-10T10:00:00.000Z",
      "updatedAt": "2026-07-10T10:00:00.000Z"
    }
  ]
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/mcp-connections [#create-mcp-connection]

Create an MCP connection.

Creates an MCP connection you can attach to any agent in your tenant. Names are unique within your tenant, and credentials are never returned. The fields you send depend on `authType`: `bearerToken` is required for `bearer`; `clientId` and `clientSecret` are required together for `oauth_client_credentials`; for `oauth_authorization_code` they are optional but go together. For `none`, `bearer`, and `oauth_client_credentials`, Blazing Agents checks the live server before saving and returns `status: "connected"`. For `oauth_authorization_code`, it saves the connection as `needs_auth`, and an administrator finishes sign-in from the dashboard. A failed create saves nothing.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `(body)` | object | body | required | Raw `application/json` request body. |

#### Response

Returns `201 Created` as `application/json`. The created MCP connection.

Response schema: `McpConnection`.

```json
{
  "id": "mcp_2Rk7Wm4XsQ9dHv1B",
  "name": "Docs Search",
  "url": "https://mcp.example.com/mcp",
  "authType": "bearer",
  "status": "connected",
  "credentialFragment": "x7Qa",
  "lastAuthErrorCode": null,
  "oauthIssuer": null,
  "oauthResource": null,
  "tokenExpiresAt": null,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`mcp_connection_invalid`](/api-reference/protocols/errors#mcp_connection_invalid), [`mcp_connection_authentication_failed`](/api-reference/protocols/errors#mcp_connection_authentication_failed), [`mcp_connection_unreachable`](/api-reference/protocols/errors#mcp_connection_unreachable), [`mcp_connection_discovery_failed`](/api-reference/protocols/errors#mcp_connection_discovery_failed), [`mcp_connection_limit_reached`](/api-reference/protocols/errors#mcp_connection_limit_reached) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `409` | [`mcp_connection_name_conflict`](/api-reference/protocols/errors#mcp_connection_name_conflict) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"Docs Search","url":"https://mcp.example.com/mcp","authType":"bearer","bearerToken":"mcp_live_4f8Kq2Lz9Xw7x7Qa"}'
```

### POST /v1/mcp-connections/:id/test [#test-mcp-connection]

Test an MCP connection.

Connects to the MCP server with the stored credentials and returns its server details and tool names. The outcome is saved on the connection: success sets `status` to `connected` and clears `lastAuthErrorCode`; a rejected credential sets `needs_auth`; any other failure sets `error`. Server and network failures return `200` with `ok: false` and an error code, not an error status. Testing an OAuth connection can refresh its stored tokens first.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the MCP connection. |

#### Response

Returns `200 OK` as `application/json`. The test result.

Response schema: `McpConnectionTest`.

```json
{
  "ok": true,
  "latencyMs": 412,
  "server": {
    "name": "docs-search",
    "version": "1.4.0"
  },
  "toolCount": 2,
  "toolNames": [
    "search_docs",
    "get_page"
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
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections/mcp_1234567890ABCDEF/test" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/mcp-connections/:id/reconnect [#reconnect-mcp-connection]

Reconnect an MCP connection.

Replaces an MCP connection's server URL and credentials. The fields you send depend on `authType`, as when you create a connection: `bearerToken` is required for `bearer`; `clientId` and `clientSecret` are required together for `oauth_client_credentials`; for `oauth_authorization_code` they are optional but go together. For `none`, `bearer`, and `oauth_client_credentials`, Blazing Agents checks the live server before replacing anything and returns `status: "connected"`; a failed check leaves the existing configuration as it was. For `oauth_authorization_code`, it saves the replacement as `needs_auth`, and an administrator finishes sign-in from the dashboard.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the MCP connection. |
| `(body)` | object | body | required | Raw `application/json` request body. |

#### Response

Returns `200 OK` as `application/json`. The reconnected MCP connection.

Response schema: `McpConnectionReconnectResult`.

```json
{
  "status": "connected",
  "connection": {
    "id": "mcp_2Rk7Wm4XsQ9dHv1B",
    "name": "Docs Search",
    "url": "https://mcp.example.com/mcp",
    "authType": "bearer",
    "status": "connected",
    "credentialFragment": "8Rw2",
    "lastAuthErrorCode": null,
    "oauthIssuer": null,
    "oauthResource": null,
    "tokenExpiresAt": null,
    "createdAt": "2026-07-10T10:00:00.000Z",
    "updatedAt": "2026-07-10T10:20:00.000Z"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`mcp_connection_invalid`](/api-reference/protocols/errors#mcp_connection_invalid), [`mcp_connection_authentication_failed`](/api-reference/protocols/errors#mcp_connection_authentication_failed), [`mcp_connection_unreachable`](/api-reference/protocols/errors#mcp_connection_unreachable), [`mcp_connection_discovery_failed`](/api-reference/protocols/errors#mcp_connection_discovery_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`mcp_connection_stale_credential_version`](/api-reference/protocols/errors#mcp_connection_stale_credential_version) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections/mcp_1234567890ABCDEF/reconnect" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"authType":"bearer","url":"https://mcp.example.com/mcp","bearerToken":"mcp_live_9Tb3Vc6Nm1Pq8Rw2"}'
```

### GET /v1/mcp-connections/:id [#get-mcp-connection]

Get an MCP connection.

Retrieves one MCP connection, including its current `status`. Credentials are never returned.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the MCP connection. |

#### Response

Returns `200 OK` as `application/json`. The MCP connection.

Response schema: `McpConnection`.

```json
{
  "id": "mcp_2Rk7Wm4XsQ9dHv1B",
  "name": "Docs Search",
  "url": "https://mcp.example.com/mcp",
  "authType": "bearer",
  "status": "connected",
  "credentialFragment": "x7Qa",
  "lastAuthErrorCode": null,
  "oauthIssuer": null,
  "oauthResource": null,
  "tokenExpiresAt": null,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z"
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
curl "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections/mcp_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PATCH /v1/mcp-connections/:id [#update-mcp-connection]

Update an MCP connection.

Renames an MCP connection. Send at least one field. The URL and credentials stay as they are; change them with reconnect.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the MCP connection. |
| `name` | string | body |  | Display name of the connection, unique within your tenant. 1–80 characters. |

#### Response

Returns `200 OK` as `application/json`. The updated MCP connection.

Response schema: `McpConnection`.

```json
{
  "id": "mcp_2Rk7Wm4XsQ9dHv1B",
  "name": "Docs Search Production",
  "url": "https://mcp.example.com/mcp",
  "authType": "bearer",
  "status": "connected",
  "credentialFragment": "x7Qa",
  "lastAuthErrorCode": null,
  "oauthIssuer": null,
  "oauthResource": null,
  "tokenExpiresAt": null,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:15:00.000Z"
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
| `409` | [`mcp_connection_name_conflict`](/api-reference/protocols/errors#mcp_connection_name_conflict) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections/mcp_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"Docs Search Production"}'
```

### DELETE /v1/mcp-connections/:id [#delete-mcp-connection]

Delete an MCP connection.

Deletes an MCP connection and revokes its stored OAuth credentials. Detach the connection from every agent first; a connection that is still attached cannot be deleted.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | ID of the MCP connection. |

#### Response

Returns `204 No Content`. The MCP connection was deleted.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`mcp_connection_in_use`](/api-reference/protocols/errors#mcp_connection_in_use) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections/mcp_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [MCP connections](/agents/tools/mcp-tools) to give an agent remote tools.
- [Agents API](/api-reference/rest-api/agents#update-agent-mcp-attachment) to control what each attachment forwards.
