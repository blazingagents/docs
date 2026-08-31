---
title: MCP connections
description: Create, authorize, inspect, test, reconnect, and delete MCP Connections with the Python SDK.
---

# MCP connections

`client.mcp_connections` manages Tenant-level remote Streamable HTTP MCP
Connections. A Connection stores tenant-admin-managed credentials, is reusable
across Agents, and has no Attribution. MCP Attachments separately select which
Connection tools and Attribution forwarding settings an Agent uses.

The asynchronous client exposes the same operation names; await each method.

## Overview [#overview]

`auth_type` is a discriminant:

- `none` accepts no credential fields.
- `bearer` requires only `bearer_token`.
- `oauth_client_credentials` requires `client_id` and `client_secret`, with
  optional `scope`.
- `oauth_authorization_code` accepts an optional paired `client_id` and
  `client_secret`, with optional `scope`.

The SDK rejects invalid combinations with `ValueError` before sending them.
Connection URLs must be HTTP(S) Streamable HTTP endpoints without embedded
credentials, query, or fragment. Creation and reconnection validate non-
authorization-code modes before committing. Authorization-code OAuth instead
stores `needs_auth` for browser continuation.

Every method accepts `extra_headers: Mapping[str, str] | None` and `Timeout`.
Request fields are keyword-only and snake case; credential values are
write-only and marked sensitive by the transport.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`connect()`](#connect) | Start dashboard authorization-code OAuth | `McpConnectionAuthorization` |
| [`create()`](#create) | Create and, when possible, validate a Connection | `McpConnection` |
| [`list()`](#list) | List the Tenant's Connections | `McpConnections` |
| [`get()`](#get) | Retrieve one Connection | `McpConnection` |
| [`update()`](#update) | Rename a Connection | `McpConnection` |
| [`delete()`](#delete) | Delete an unused Connection | `None` |
| [`test()`](#test) | Test stored configuration and discover Tools | `McpConnectionTestResult` |
| [`reconnect()`](#reconnect) | Replace URL, authentication mode, and credential | `McpConnectionReconnectResult` |

## Methods [#methods]

### `connect()` [#connect]

**Signature:** `connect(mcp_connection_id: str, *, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> McpConnectionAuthorization`

Creates a short-lived setup continuation for an authorization-code Connection.
This method requires a separate `BlazingAgents` client initialized with a
dashboard Supabase Auth JWT, not a Tenant API key. Open the returned
`authorization_url` in the authenticated Blazing Agents application; it is not
the upstream Provider authorization URL.

```python
import os

from blazing_agents import BlazingAgents

dashboard_client = BlazingAgents(
    api_key=os.environ["BLAZING_AGENTS_DASHBOARD_JWT"]
)
authorization = dashboard_client.mcp_connections.connect(connection.id)
print(authorization.authorization_url)
```

A Tenant API key raises `unauthorized`; malformed IDs raise
`validation_failed`. The current service maps a missing, foreign,
wrong-auth-type, or wrong-state Connection to `internal`. See
[`POST .../connect`](/api-reference/rest-api/mcp-connections#connect-mcp-connection).

### `create()` [#create]

**Signature:** `create(*, name: str, url: str, auth_type: McpConnectionAuthType, bearer_token: str = ..., client_id: str = ..., client_secret: str = ..., scope: str = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> McpConnection`

Creates a reusable MCP Connection. `name` is Tenant-unique. For `none`,
bearer, and client credentials, the server validates the live Connection
before storing it and returns `connected`. Authorization-code OAuth returns
`needs_auth`.

```python
import os

connection = client.mcp_connections.create(
    name="Issue tracker",
    url="https://mcp.example.com/mcp",
    auth_type="bearer",
    bearer_token=os.environ["MCP_BEARER_TOKEN"],
)
```

Failures include `validation_failed`, `mcp_connection_name_conflict`,
`mcp_connection_limit_reached`, and live setup errors. A failed live setup
does not retain its staged Connection. See
[`POST /v1/mcp-connections`](/api-reference/rest-api/mcp-connections#create-mcp-connection).

### `list()` [#list]

**Signature:** `list(*, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> McpConnections`

Lists the Tenant's Connections with credentials redacted. The unpaginated
result contains `mcp_connections: list[McpConnection]`. See
[`GET /v1/mcp-connections`](/api-reference/rest-api/mcp-connections#list-mcp-connections).

### `get()` [#get]

**Signature:** `get(mcp_connection_id: str, *, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> McpConnection`

Retrieves one Connection by its `mcp_…` ID. Failures include
`validation_failed` and `not_found`. See
[`GET /v1/mcp-connections/:id`](/api-reference/rest-api/mcp-connections#get-mcp-connection).

### `update()` [#update]

**Signature:** `update(mcp_connection_id: str, *, name: str = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> McpConnection`

Renames a Connection without changing its URL or credential. Use
[`reconnect()`](#reconnect) for connection details. Omitting `name` raises
`ValueError` before a request is sent. Failures include `validation_failed`,
`mcp_connection_name_conflict`, and `not_found`. See
[`PATCH .../:id`](/api-reference/rest-api/mcp-connections#update-mcp-connection).

### `delete()` [#delete]

**Signature:** `delete(mcp_connection_id: str, *, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> None`

Deletes an unused Connection, its credentials, and stored OAuth material.
Detach it from every Agent first. Returns `None`; failures include
`validation_failed`, `not_found`, and `mcp_connection_in_use`. See
[`DELETE .../:id`](/api-reference/rest-api/mcp-connections#delete-mcp-connection).

### `test()` [#test]

**Signature:** `test(mcp_connection_id: str, *, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> McpConnectionTestResult`

Tests stored configuration, discovers server and Tool details, and persists
the resulting status and last authentication error. OAuth testing may refresh
stored credentials.

```python
result = client.mcp_connections.test(connection.id)
if result.ok:
    print(result.server.name, result.tool_names)
else:
    print(result.error.code, result.error.message)
```

A completed live failure returns `ok=False`; a missing Connection raises
`not_found`. See
[`POST .../test`](/api-reference/rest-api/mcp-connections#test-mcp-connection).

### `reconnect()` [#reconnect]

**Signature:** `reconnect(mcp_connection_id: str, *, url: str, auth_type: McpConnectionAuthType, bearer_token: str = ..., client_id: str = ..., client_secret: str = ..., scope: str = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> McpConnectionReconnectResult`

Atomically replaces the endpoint, authentication mode, and credential while
keeping the name. Credential rules match [`create()`](#create).
Authorization-code OAuth stores `needs_auth`; other modes validate before
replacement. Failed validation leaves the previous configuration unchanged.

```python
replacement = await async_client.mcp_connections.reconnect(
    connection.id,
    url="https://mcp.example.com/v2/mcp",
    auth_type="oauth_client_credentials",
    client_id=os.environ["MCP_CLIENT_ID"],
    client_secret=os.environ["MCP_CLIENT_SECRET"],
    scope="tools.read",
)
```

Failures include `validation_failed`, `not_found`, live setup errors, and
`mcp_connection_stale_credential_version` after a concurrent credential
change. See
[`POST .../reconnect`](/api-reference/rest-api/mcp-connections#reconnect-mcp-connection).

## Response models [#response-models]

### `McpConnection` [#mcpconnection]

This Pydantic model exposes `id`, `name`, `url`, `auth_type`, `status`,
`credential_fragment`, `last_auth_error_code`, `oauth_issuer`,
`oauth_resource`, `token_expires_at`, `created_at`, and `updated_at`.
Credential values are never returned. Status, auth type, and error-code
response fields are forward-compatible strings. `McpConnections` contains
`mcp_connections: list[McpConnection]`.

### `McpConnectionTestResult` [#mcpconnectiontestresult]

When `ok` is `True`, `latency_ms`, `server: McpServer`, `tool_count`, and
`tool_names` are present, the count matches the names, and `error` is `None`.
When `ok` is `False`, only `error: McpConnectionTestError` is present. Both
error code and message are strings. `McpServer` contains the non-empty string
fields `name` and `version`.

### `McpConnectionAuthorization` [#mcpconnectionauthorization]

Contains `authorization_url`, validated as an HTTP(S) Blazing Agents
`/app/mcp-connections` URL carrying exactly one opaque `mcpOAuthSetup` token.

### `McpConnectionReconnectResult` [#mcpconnectionreconnectresult]

Contains forward-compatible `status` and the resulting `connection`.
Current successful statuses are `connected` and `needs_auth`.

All response models preserve unknown server fields and carry a non-serialized
`_request_id`. See
[response observation](/sdk/python/client#response-observation-and-request-ids).

## Errors and secrets [#errors-and-secrets]

Local authentication-discriminant and omission violations raise `ValueError`.
API failures raise `APIStatusError`; inspect its stable lowercase `code`,
`details`, status, request ID, headers, response body, and retry metadata.
Connection and timeout failures raise `APIConnectionError` and
`APITimeoutError`. An HTTP success whose body violates its documented
response model raises `pydantic.ValidationError`.

Live setup codes include `mcp_connection_authentication_failed`,
`mcp_connection_invalid`, `mcp_connection_unreachable`, and
`mcp_connection_discovery_failed`. Do not log bearer tokens, client secrets,
or returned authorization URLs. The SDK is silent by default and does not
retry automatically.

## Related [#related]

- [MCP Connections](/agents/tools/mcp-tools)
- [Connect an MCP server](/agents/tools/mcp-tools)
- [REST MCP Connections](/api-reference/rest-api/mcp-connections)
- [MCP OAuth](/api-reference/rest-api/mcp-oauth)
- [TypeScript MCP Connections](/sdk/typescript/mcp-connections)
