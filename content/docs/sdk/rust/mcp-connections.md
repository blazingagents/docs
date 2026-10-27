---
title: MCP connections
description: Connect remote MCP servers, test them, and rotate their credentials with the Rust SDK.
---

# MCP connections

`client.mcp_connections()` connects your agents to remote MCP servers. Submitted secrets are never returned; the API reports only a `credential_fragment`.

MCP connections are tenant administration: a `UserClient` has no `mcp_connections()`. Examples receive a `client: blazing_agents::Client`. Every call also takes the `with_timeout`, `without_timeout`, `with_header`, and `with_client_request_id` transport options.

```rust
use blazing_agents::mcp_connections::NewMcpConnection;

let connection = client
    .mcp_connections()
    .create(NewMcpConnection::Bearer {
        name: "Search tools".to_owned(),
        url: "https://mcp.example.com".to_owned(),
        bearer_token: std::env::var("MCP_BEARER_TOKEN")?,
    })
    .await?;
println!("{} {}", connection.id, connection.status);
```

## Authentication types [#authentication-types]

`NewMcpConnection` has one variant per `auth_type`, and fields that do not apply to a variant cannot be sent with it:

| Variant | `auth_type` | Fields |
| --- | --- | --- |
| `None` | `none` | `name`, `url` |
| `Bearer` | `bearer` | `name`, `url`, `bearer_token` |
| `OAuthAuthorizationCode` | `oauth_authorization_code` | `name`, `url`, optional `client` (`OAuthClient::new(id, secret)`), optional `scope` |

The URL is the server's streamable HTTP endpoint. With the authorization code flow the connection is saved with `McpConnectionStatus::NeedsAuth` until an administrator signs in to the upstream service in the [dashboard](https://www.blazingagents.com/app); there is no SDK method for that step. `url` is the MCP server URL in every case.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create an MCP connection | [`McpConnection`](#mcpconnection) |
| [`list()`](#list) | List MCP connections | [`McpConnectionList`](#mcpconnection) |
| [`get()`](#get) | Get one connection | [`McpConnection`](#mcpconnection) |
| [`update()`](#update) | Rename a connection | [`McpConnection`](#mcpconnection) |
| [`delete()`](#delete) | Delete a connection | `()` |
| [`test()`](#test) | Test a connection against its server | [`McpConnectionTest`](#mcpconnectiontestresult) |
| [`reconnect()`](#reconnect) | Replace URL and credentials | [`McpConnectionReconnectResult`](#mcpconnectionreconnectresult) |

## Methods [#methods]

### `create()` [#create]

Creates an MCP connection. Secrets are never returned.

```rust
use blazing_agents::mcp_connections::NewMcpConnection;

let connection = client
    .mcp_connections()
    .create(NewMcpConnection::None {
        name: "Public tools".to_owned(),
        url: "https://mcp.example.com".to_owned(),
    })
    .await?;
```

**Signature:** `create(connection: NewMcpConnection) -> Call<CreateMcpConnection>`

For `None` and `Bearer`, Blazing Agents checks the live server before it saves the connection. `OAuthAuthorizationCode` is saved as `needs_auth` without a check, and an admin finishes sign-in from the dashboard. A failed create saves nothing.

Awaiting returns [`McpConnection`](#mcpconnection). Fails with `Error::Api` whose code is [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`mcp_connection_name_conflict`](/api-reference/protocols/errors#mcp_connection_name_conflict), [`mcp_connection_limit_reached`](/api-reference/protocols/errors#mcp_connection_limit_reached), or [`mcp_connection_invalid`](/api-reference/protocols/errors#mcp_connection_invalid). A failed live check fails with [`mcp_connection_authentication_failed`](/api-reference/protocols/errors#mcp_connection_authentication_failed) when the server rejects the credentials, [`mcp_connection_unreachable`](/api-reference/protocols/errors#mcp_connection_unreachable) when it cannot be reached, or [`mcp_connection_discovery_failed`](/api-reference/protocols/errors#mcp_connection_discovery_failed) when its tool list cannot be read. If a response ever echoes credential material back, the call fails client-side with `Error::CredentialEcho` and the body is discarded.

### `list()` [#list]

Lists MCP connections.

```rust
let connections = client.mcp_connections().list().await?.mcp_connections;
```

**Signature:** `list() -> Call<ListMcpConnections>`

Awaiting returns [`McpConnectionList`](#mcpconnection) with `mcp_connections: Vec<McpConnection>`.

### `get()` [#get]

Gets one MCP connection.

```rust
let connection = client
    .mcp_connections()
    .get("mcp_0123456789abcdef")
    .await?;
```

**Signature:** `get(mcp_connection_id: impl Into<McpConnectionId>) -> Call<GetMcpConnection>`

Awaiting returns [`McpConnection`](#mcpconnection). Fails with `validation_failed` or [`not_found`](/api-reference/protocols/errors#not_found).

### `update()` [#update]

Renames an MCP connection.

```rust
let connection = client
    .mcp_connections()
    .update("mcp_0123456789abcdef", "Search tools v2")
    .await?;
```

**Signature:** `update(mcp_connection_id: impl Into<McpConnectionId>, name: impl Into<String>) -> Call<UpdateMcpConnection>`

Awaiting returns [`McpConnection`](#mcpconnection). Fails with `validation_failed`, `mcp_connection_name_conflict`, or `not_found`.

### `delete()` [#delete]

Deletes an MCP connection.

```rust
client
    .mcp_connections()
    .delete("mcp_0123456789abcdef")
    .await?;
```

**Signature:** `delete(mcp_connection_id: impl Into<McpConnectionId>) -> Call<DeleteMcpConnection>`

Fails with `validation_failed`, `not_found`, or [`mcp_connection_in_use`](/api-reference/protocols/errors#mcp_connection_in_use) while an agent references it.

### `test()` [#test]

Tests an MCP connection against its server.

```rust
use blazing_agents::mcp_connections::McpConnectionTest;

match client.mcp_connections().test("mcp_0123456789abcdef").await? {
    McpConnectionTest::Passed { server, tool_names, .. } => {
        println!("{} {:?}", server.name, tool_names)
    }
    McpConnectionTest::Failed { error } => println!("{}", error.message),
    _ => {}
}
```

**Signature:** `test(mcp_connection_id: impl Into<McpConnectionId>) -> Call<TestMcpConnection>`

Awaiting returns `McpConnectionTest::Passed` with `server` (`McpServerInfo`), `tool_names`, `latency_ms`, and `tool_count`, or `McpConnectionTest::Failed` with an `McpConnectionTestError` (`code`, `message`). Fails with `validation_failed` or `not_found`.

### `reconnect()` [#reconnect]

Replaces an MCP connection's URL and credentials. Secrets are never returned.

```rust
use blazing_agents::mcp_connections::McpReconnect;

let result = client
    .mcp_connections()
    .reconnect(
        "mcp_0123456789abcdef",
        McpReconnect::Bearer {
            url: "https://mcp.example.com".to_owned(),
            bearer_token: std::env::var("MCP_BEARER_TOKEN")?,
        },
    )
    .await?;
```

**Signature:** `reconnect(mcp_connection_id: impl Into<McpConnectionId>, auth: McpReconnect) -> Call<ReconnectMcpConnection>`

`McpReconnect` has the same variants as `NewMcpConnection` without `name`. As with `create()`, every variant except `OAuthAuthorizationCode` checks the live server before anything is replaced, and a failed check leaves the existing configuration as it was. Awaiting returns [`McpConnectionReconnectResult`](#mcpconnectionreconnectresult) with `status` (`McpReconnectStatus::Connected`, or `McpReconnectStatus::NeedsAuth` when an admin must sign in through the dashboard) and the updated `connection`. Fails with `validation_failed`, `not_found`, `mcp_connection_invalid`, or [`mcp_connection_stale_credential_version`](/api-reference/protocols/errors#mcp_connection_stale_credential_version). A failed live check fails with `mcp_connection_authentication_failed`, `mcp_connection_unreachable`, or `mcp_connection_discovery_failed`.

## Response models [#response-models]

### `McpConnection` [#mcpconnection]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `McpConnectionId` | Connection ID (`mcp_...`) |
| `name` | `String` | Display name |
| `url` | `String` | MCP server URL |
| `auth_type` | `McpAuthType` | How Blazing Agents authenticates |
| `status` | `McpConnectionStatus` | `Connected`, `NeedsAuth`, or `Error` |
| `credential_fragment` | `Option<String>` | Last characters of the stored credential |
| `last_auth_error_code` | `Option<McpConnectionErrorCode>` | Why it last failed |
| `oauth_issuer`, `oauth_resource` | `Option<String>` | Discovered OAuth metadata |
| `token_expires_at` | `Option<Timestamp>` | When the current access token expires |
| `created_at`, `updated_at` | `Timestamp` | Timestamps |

### `McpConnectionTest` [#mcpconnectiontestresult]

`Passed` has `latency_ms`, `server` (an `McpServerInfo` with `name` and `version`), `tool_count`, and `tool_names`. `Failed` has `error` with a `code` (an `McpConnectionErrorCode`) and a `message`.

### `McpConnectionReconnectResult` [#mcpconnectionreconnectresult]

Has `status` (`McpReconnectStatus::Connected` or `McpReconnectStatus::NeedsAuth`) and the updated `connection`.

## Errors and secrets [#errors-and-secrets]

A failure to authenticate or reach the server shows up as `status` `Error` with `last_auth_error_code`, not as a failed request: `AuthenticationFailed`, `Invalid`, `Unreachable`, or `DiscoveryFailed`. Bearer tokens and OAuth secrets are write-only. They are redacted from `Debug` output and from `ApiError` bodies and headers, and a response that contains credential material fails with `Error::CredentialEcho`.

## Next [#next]

- [MCP tools](/agents/tools/mcp-tools)
- [Agents](/sdk/rust/agents)
