---
title: MCP connections
description: Connect remote MCP servers, test them, and rotate their credentials with the Python SDK.
---

# MCP connections

`client.mcp_connections` stores remote MCP servers, and their credentials, for your whole tenant. Any agent can then use a server's tools by listing its connection in `mcp_connection_ids`. Credentials are write-only: you send them once and they never come back.

Examples assume `client = BlazingAgents()`. Every method also accepts `extra_headers` and `timeout`. On `AsyncBlazingAgents`, await the same method names.

```python
import os

connection = client.mcp_connections.create(
    name="Issue tracker",
    url="https://mcp.example.com/mcp",
    auth_type="bearer",
    bearer_token=os.environ["MCP_BEARER_TOKEN"],
)
client.agents.update("ag_0123456789abcdef", mcp_connection_ids=[connection.id])
```

## Authentication types [#authentication-types]

`auth_type` decides which credential arguments you pass. Any other combination raises `ValueError` before any request.

| `auth_type` | Credential arguments |
| --- | --- |
| `"none"` | None |
| `"bearer"` | `bearer_token` |
| `"oauth_client_credentials"` | `client_id` and `client_secret`, optional `scope` |
| `"oauth_authorization_code"` | Optional `client_id` and `client_secret` together, optional `scope` |

The `url` must be an HTTP or HTTPS Streamable HTTP endpoint without credentials, a query string, or a fragment. For every type except `"oauth_authorization_code"`, Blazing Agents connects to the server before saving and saves nothing if that fails. An authorization-code connection is saved with `status == "needs_auth"` until an administrator signs in to the upstream service; see [`connect()`](#connect).

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`connect()`](#connect) | Start OAuth sign-in for an authorization-code connection | `McpConnectionAuthorization` |
| [`create()`](#create) | Save and check a connection | `McpConnection` |
| [`list()`](#list) | List connections | `McpConnections` |
| [`get()`](#get) | Get one connection | `McpConnection` |
| [`update()`](#update) | Rename a connection | `McpConnection` |
| [`delete()`](#delete) | Delete an unused connection | `None` |
| [`test()`](#test) | Check the connection and list its tools | `McpConnectionTestResult` |
| [`reconnect()`](#reconnect) | Replace the URL and credentials | `McpConnectionReconnectResult` |

## Methods [#methods]

### `connect()` [#connect]

Starts OAuth sign-in for an `"oauth_authorization_code"` connection and returns a Blazing Agents dashboard URL to open.

```python
admin_client = BlazingAgents(api_key=dashboard_session_token)
authorization = admin_client.mcp_connections.connect(connection.id)
print(authorization.authorization_url)
```

**Signature:** `connect(mcp_connection_id: str) -> McpConnectionAuthorization`

This call needs a signed-in dashboard administrator's session token in place of the API key; a tenant API key raises [`unauthorized`](/api-reference/protocols/errors#unauthorized). Most teams finish this step in the [dashboard](https://www.blazingagents.com/app) instead. Open the returned `authorization_url` in the administrator's signed-in browser. It is a short-lived dashboard link, not the upstream provider's sign-in page.

Raises [`validation_failed`](/api-reference/protocols/errors#validation_failed) for a malformed ID. A missing connection, or one that does not need authorization, raises [`not_found`](/api-reference/protocols/errors#not_found).

### `create()` [#create]

Saves a connection. Unless it uses authorization-code OAuth, Blazing Agents checks it against the live server first.

```python
connection = client.mcp_connections.create(
    name="Search",
    url="https://search.example.com/mcp",
    auth_type="oauth_client_credentials",
    client_id=os.environ["MCP_CLIENT_ID"],
    client_secret=os.environ["MCP_CLIENT_SECRET"],
    scope="tools.read",
)
```

**Signature:** `create(*, name: str, url: str, auth_type: McpConnectionAuthType, bearer_token=..., client_id=..., client_secret=..., scope=...) -> McpConnection`

`name` must be unique in your tenant. Returns [`McpConnection`](#mcpconnection) with `status == "connected"`, or `"needs_auth"` for authorization-code OAuth.

Raises `APIStatusError` with `validation_failed`, [`mcp_connection_name_conflict`](/api-reference/protocols/errors#mcp_connection_name_conflict), [`mcp_connection_limit_reached`](/api-reference/protocols/errors#mcp_connection_limit_reached), or a [live check error](#errors-and-secrets). A failed check saves nothing.

### `list()` [#list]

Lists your connections.

```python
connections = client.mcp_connections.list().mcp_connections
```

**Signature:** `list() -> McpConnections`

Returns `McpConnections`, whose `mcp_connections` field is `list[McpConnection]`. The list is not paginated.

### `get()` [#get]

Gets one connection.

```python
connection = client.mcp_connections.get(connection.id)
print(connection.status, connection.last_auth_error_code)
```

**Signature:** `get(mcp_connection_id: str) -> McpConnection`

Returns [`McpConnection`](#mcpconnection). Raises `validation_failed` or [`not_found`](/api-reference/protocols/errors#not_found).

### `update()` [#update]

Renames a connection. To change the URL or credentials, use [`reconnect()`](#reconnect).

```python
connection = client.mcp_connections.update(connection.id, name="Issue tracker (prod)")
```

**Signature:** `update(mcp_connection_id: str, *, name=...) -> McpConnection`

Calling `update()` without `name` raises `ValueError` before any request. Raises `validation_failed`, `mcp_connection_name_conflict`, or `not_found`.

### `delete()` [#delete]

Deletes a connection and its stored credentials.

```python
client.mcp_connections.delete(connection.id)
```

**Signature:** `delete(mcp_connection_id: str) -> None`

Remove the connection from every agent's `mcp_connection_ids` first. Raises [`mcp_connection_in_use`](/api-reference/protocols/errors#mcp_connection_in_use) while an agent still uses it, `validation_failed`, or `not_found`.

### `test()` [#test]

Connects with the stored credentials, lists the server's tools, and saves the resulting status.

```python
result = client.mcp_connections.test(connection.id)
if result.ok:
    print(result.server.name, result.tool_names)
else:
    print(result.error.code, result.error.message)
```

**Signature:** `test(mcp_connection_id: str) -> McpConnectionTestResult`

A failed check is a normal result with `ok == False`, not an exception. Testing an OAuth connection can refresh its stored tokens. Raises `not_found` for an unknown connection.

### `reconnect()` [#reconnect]

Replaces a connection's URL, auth type, and credentials, and keeps its name and ID.

```python
result = client.mcp_connections.reconnect(
    connection.id,
    url="https://mcp.example.com/v2/mcp",
    auth_type="bearer",
    bearer_token=os.environ["MCP_BEARER_TOKEN"],
)
print(result.status)
```

**Signature:** `reconnect(mcp_connection_id: str, *, url: str, auth_type: McpConnectionAuthType, bearer_token=..., client_id=..., client_secret=..., scope=...) -> McpConnectionReconnectResult`

Credential arguments follow the same rules as [`create()`](#create). For every type except authorization-code OAuth, the new settings are checked first, and a failed check keeps the old ones. Authorization-code OAuth replaces the settings right away and returns `status == "needs_auth"`.

Raises `validation_failed`, `not_found`, a [live check error](#errors-and-secrets), or [`mcp_connection_stale_credential_version`](/api-reference/protocols/errors#mcp_connection_stale_credential_version) when someone else changed the credentials at the same time.

## Response models [#response-models]

### `McpConnection` [#mcpconnection]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `str` | Connection ID (`mcp_...`) |
| `name` | `str` | Display name |
| `url` | `AnyUrl` | Server endpoint |
| `auth_type` | `str` | Authentication type |
| `status` | `str` | For example `"connected"`, `"needs_auth"`, or `"error"` |
| `credential_fragment` | `str \| None` | Short, non-secret fragment of the credential |
| `last_auth_error_code` | `str \| None` | Last authentication error |
| `oauth_issuer`, `oauth_resource` | `AnyUrl \| None` | OAuth details, when used |
| `token_expires_at` | `datetime \| None` | OAuth token expiry, when known |
| `created_at`, `updated_at` | `datetime` | Timestamps |

### `McpConnectionTestResult` [#mcpconnectiontestresult]

When `ok` is `True`, it has `latency_ms`, `server` (with `name` and `version`), `tool_count`, and `tool_names`. When `ok` is `False`, only `error` is set, with a `code` and a `message`.

### `McpConnectionAuthorization` [#mcpconnectionauthorization]

Has one field, `authorization_url`: a dashboard link under `/app/mcp-connections` that finishes OAuth sign-in.

### `McpConnectionReconnectResult` [#mcpconnectionreconnectresult]

Has `status` (`"connected"` or `"needs_auth"`) and the updated `connection`.

## Errors and secrets [#errors-and-secrets]

Live checks in `create()` and `reconnect()` can raise [`mcp_connection_authentication_failed`](/api-reference/protocols/errors#mcp_connection_authentication_failed), [`mcp_connection_invalid`](/api-reference/protocols/errors#mcp_connection_invalid), [`mcp_connection_unreachable`](/api-reference/protocols/errors#mcp_connection_unreachable), or [`mcp_connection_discovery_failed`](/api-reference/protocols/errors#mcp_connection_discovery_failed). Never log bearer tokens, client secrets, or authorization URLs.

## Next [#next]

- [MCP tools guide](/agents/tools/mcp-tools)
- [MCP settings on an agent](/sdk/python/agents#update-mcp-attachment)
- [Client errors](/sdk/python/client#errors)
