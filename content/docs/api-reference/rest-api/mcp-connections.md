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

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

There are no parameters and no request body.

#### Response

Returns `200 OK` as `application/json`. The tenant's connections.

Response schema: `McpConnectionList`.

```json
{
  "mcpConnections": [
    {
      "id": "mcp_1234567890ABCDEF",
      "name": "string",
      "url": "https://example.com",
      "authType": "none",
      "status": "connected",
      "credentialFragment": "string",
      "lastAuthErrorCode": "MCP_CONNECTION_AUTHENTICATION_FAILED",
      "oauthIssuer": "https://example.com",
      "oauthResource": "https://example.com",
      "tokenExpiresAt": "2026-07-10T10:00:00Z",
      "createdAt": "2026-07-10T10:00:00Z",
      "updatedAt": "2026-07-10T10:00:00Z"
    }
  ]
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/mcp-connections [#create-mcp-connection]

Create an MCP connection.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `(body)` | object | body | required | Raw `application/json` request body. |

#### Response

Returns `201 Created` as `application/json`. The created connection.

Response schema: `McpConnection`.

```json
{
  "id": "mcp_1234567890ABCDEF",
  "name": "string",
  "url": "https://example.com",
  "authType": "none",
  "status": "connected",
  "credentialFragment": "string",
  "lastAuthErrorCode": "MCP_CONNECTION_AUTHENTICATION_FAILED",
  "oauthIssuer": "https://example.com",
  "oauthResource": "https://example.com",
  "tokenExpiresAt": "2026-07-10T10:00:00Z",
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |
| `409` |  | Connection name already exists |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"string","url":"https://example.com","authType":"none"}'
```

### POST /v1/mcp-connections/:id/test [#test-mcp-connection]

Test an MCP connection.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | `mcp_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The connection test result.

Response schema: `McpConnectionTest`.

```json
{
  "server": {
    "name": "string",
    "version": "string"
  },
  "toolNames": [
    "string"
  ],
  "ok": true,
  "latencyMs": 0,
  "toolCount": 0
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections/mcp_1234567890ABCDEF/test" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/mcp-connections/:id/reconnect [#reconnect-mcp-connection]

Reconnect an MCP connection.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | `mcp_…` ID. |
| `(body)` | object | body | required | Raw `application/json` request body. |

#### Response

Returns `200 OK` as `application/json`. The reconnect result.

Response schema: `McpConnectionReconnectResult`.

```json
{
  "status": "connected",
  "connection": {
    "id": "mcp_1234567890ABCDEF",
    "name": "string",
    "url": "https://example.com",
    "authType": "none",
    "status": "connected",
    "credentialFragment": "string",
    "lastAuthErrorCode": "MCP_CONNECTION_AUTHENTICATION_FAILED",
    "oauthIssuer": "https://example.com",
    "oauthResource": "https://example.com",
    "tokenExpiresAt": "2026-07-10T10:00:00Z",
    "createdAt": "2026-07-10T10:00:00Z",
    "updatedAt": "2026-07-10T10:00:00Z"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections/mcp_1234567890ABCDEF/reconnect" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"authType":"none","url":"https://example.com"}'
```

### GET /v1/mcp-connections/:id [#get-mcp-connection]

Get an MCP connection.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | `mcp_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The connection.

Response schema: `McpConnection`.

```json
{
  "id": "mcp_1234567890ABCDEF",
  "name": "string",
  "url": "https://example.com",
  "authType": "none",
  "status": "connected",
  "credentialFragment": "string",
  "lastAuthErrorCode": "MCP_CONNECTION_AUTHENTICATION_FAILED",
  "oauthIssuer": "https://example.com",
  "oauthResource": "https://example.com",
  "tokenExpiresAt": "2026-07-10T10:00:00Z",
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections/mcp_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PATCH /v1/mcp-connections/:id [#update-mcp-connection]

Update an MCP connection.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | `mcp_…` ID. |
| `name` | string | body |  | 1–80 characters. |

#### Response

Returns `200 OK` as `application/json`. The updated connection.

Response schema: `McpConnection`.

```json
{
  "id": "mcp_1234567890ABCDEF",
  "name": "string",
  "url": "https://example.com",
  "authType": "none",
  "status": "connected",
  "credentialFragment": "string",
  "lastAuthErrorCode": "MCP_CONNECTION_AUTHENTICATION_FAILED",
  "oauthIssuer": "https://example.com",
  "oauthResource": "https://example.com",
  "tokenExpiresAt": "2026-07-10T10:00:00Z",
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |
| `409` |  | Connection name already exists |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections/mcp_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"string"}'
```

### DELETE /v1/mcp-connections/:id [#delete-mcp-connection]

Delete an MCP connection.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | string | path | required | `mcp_…` ID. |

#### Response

Returns `204 No Content`. Deleted.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |
| `409` |  | Connection still attached to an agent |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/mcp-connections/mcp_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [MCP connections](/agents/tools/mcp-tools) to give an agent remote tools.
- [Agents API](/api-reference/rest-api/agents#update-agent-mcp-attachment) to control what each attachment forwards.
