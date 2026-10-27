---
title: MCP connections
description: Connect remote MCP servers, test them, and rotate their credentials with the Go SDK.
---

# MCP connections

`client.MCPConnections` connects your agents to remote MCP servers. Submitted secrets are never returned; the API reports only a `CredentialFragment`.

MCP connections are tenant administration: a `*ba.UserClient` has no `MCPConnections`. Examples are function bodies that receive `ctx context.Context`, `client *ba.Client`, `agentID ba.AgentID`, and `sessionID ba.SessionID`, and return an `error`. Every method also takes the per-call options `ba.WithRequestTimeout`, `ba.WithRequestHeader`, `ba.WithClientRequestID`, and `ba.CaptureResponse`.

```go
connection, err := client.MCPConnections.Create(ctx, ba.CreateMCPConnectionParams{
	Name: "Search tools",
	URL:  "https://mcp.example.com",
	Auth: ba.MCPAuthBearer{Token: ba.NewSecret(os.Getenv("MCP_BEARER_TOKEN"))},
})
if err != nil {
	return err
}
fmt.Println(connection.ID, connection.Status)
return nil
```

## Authentication types [#authentication-types]

`Auth` takes one `ba.MCPAuth` value per `authType`, and fields that do not apply to a type cannot be sent with it:

| Type | `authType` | Fields |
| --- | --- | --- |
| `ba.MCPAuthNone{}` | `none` | none |
| `ba.MCPAuthBearer` | `bearer` | `Token` |
| `ba.MCPAuthOAuthAuthorizationCode` | `oauth_authorization_code` | optional `ClientID`, optional `ClientSecret`, optional `Scope` |

Tokens and client secrets are `ba.Secret` values made with `ba.NewSecret`. The URL is the server's streamable HTTP endpoint. With the authorization code flow the connection is saved with status `needs_auth` until an administrator signs in to the upstream service in the [dashboard](https://www.blazingagents.com/app); there is no SDK method for that step. A nil `Auth` fails client-side with `*ba.ArgumentError`.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`Create`](#create) | Create an MCP connection | [`*MCPConnection`](#mcpconnection) |
| [`List`](#list) | List MCP connections | [`[]MCPConnection`](#mcpconnection) |
| [`Get`](#get) | Get one connection | [`*MCPConnection`](#mcpconnection) |
| [`Update`](#update) | Rename a connection | [`*MCPConnection`](#mcpconnection) |
| [`Delete`](#delete) | Delete a connection | `error` |
| [`Test`](#test) | Test a connection against its server | [`*MCPConnectionTest`](#mcpconnectiontestresult) |
| [`Reconnect`](#reconnect) | Replace URL and credentials | [`*MCPConnectionReconnectResult`](#mcpconnectionreconnectresult) |

## Methods [#methods]

### `Create` [#create]

Creates an MCP connection. Secrets are never returned.

```go
connection, err := client.MCPConnections.Create(ctx, ba.CreateMCPConnectionParams{
	Name: "Public tools",
	URL:  "https://mcp.example.com",
	Auth: ba.MCPAuthNone{},
})
if err != nil {
	return err
}
fmt.Println(connection.ID)
return nil
```

**Signature:** `func (s *MCPConnectionsService) Create(ctx context.Context, params CreateMCPConnectionParams, opts ...RequestOption) (*MCPConnection, error)`

Returns [`*ba.MCPConnection`](#mcpconnection). Fails with `*ba.APIError` whose `Code` is [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`mcp_connection_name_conflict`](/api-reference/protocols/errors#mcp_connection_name_conflict), [`mcp_connection_limit_reached`](/api-reference/protocols/errors#mcp_connection_limit_reached), or [`mcp_connection_invalid`](/api-reference/protocols/errors#mcp_connection_invalid). If a response ever echoes credential material back, the call fails client-side with `*ba.CredentialEchoError` and the body is discarded.

### `List` [#list]

Lists MCP connections.

```go
connections, err := client.MCPConnections.List(ctx)
if err != nil {
	return err
}
for _, connection := range connections {
	fmt.Println(connection.ID, connection.Name)
}
return nil
```

**Signature:** `func (s *MCPConnectionsService) List(ctx context.Context, opts ...RequestOption) ([]MCPConnection, error)`

Returns every [`ba.MCPConnection`](#mcpconnection).

### `Get` [#get]

Gets one MCP connection.

```go
connection, err := client.MCPConnections.Get(ctx, "mcp_0123456789abcdef")
if err != nil {
	return err
}
fmt.Println(connection.Status)
return nil
```

**Signature:** `func (s *MCPConnectionsService) Get(ctx context.Context, connectionID MCPConnectionID, opts ...RequestOption) (*MCPConnection, error)`

Returns [`*ba.MCPConnection`](#mcpconnection). Fails with `validation_failed` or [`not_found`](/api-reference/protocols/errors#not_found).

### `Update` [#update]

Renames an MCP connection.

```go
connection, err := client.MCPConnections.Update(ctx, "mcp_0123456789abcdef", ba.UpdateMCPConnectionParams{
	Name: new("Search tools v2"),
})
if err != nil {
	return err
}
fmt.Println(connection.Name)
return nil
```

**Signature:** `func (s *MCPConnectionsService) Update(ctx context.Context, connectionID MCPConnectionID, params UpdateMCPConnectionParams, opts ...RequestOption) (*MCPConnection, error)`

Returns [`*ba.MCPConnection`](#mcpconnection). Fails with `validation_failed`, `mcp_connection_name_conflict`, or `not_found`.

### `Delete` [#delete]

Deletes an MCP connection.

```go
return client.MCPConnections.Delete(ctx, "mcp_0123456789abcdef")
```

**Signature:** `func (s *MCPConnectionsService) Delete(ctx context.Context, connectionID MCPConnectionID, opts ...RequestOption) error`

Fails with `validation_failed`, `not_found`, or [`mcp_connection_in_use`](/api-reference/protocols/errors#mcp_connection_in_use) while an agent references it.

### `Test` [#test]

Tests an MCP connection against its server.

```go
test, err := client.MCPConnections.Test(ctx, "mcp_0123456789abcdef")
if err != nil {
	return err
}
if test.OK {
	fmt.Println(test.Server.Name, test.ToolNames)
} else {
	fmt.Println(test.Error.Message)
}
return nil
```

**Signature:** `func (s *MCPConnectionsService) Test(ctx context.Context, connectionID MCPConnectionID, opts ...RequestOption) (*MCPConnectionTest, error)`

Returns a `*ba.MCPConnectionTest`. When `OK` is `true`, it has `Server` (a `*ba.MCPServerInfo`), `ToolNames`, `Latency`, and `ToolCount`. When `OK` is `false`, it has `Error` with a `Code` and a `Message`. Fails with `validation_failed` or `not_found`.

### `Reconnect` [#reconnect]

Replaces an MCP connection's URL and credentials. Secrets are never returned.

```go
result, err := client.MCPConnections.Reconnect(ctx, "mcp_0123456789abcdef", ba.ReconnectMCPConnectionParams{
	URL:  "https://mcp.example.com",
	Auth: ba.MCPAuthBearer{Token: ba.NewSecret(os.Getenv("MCP_BEARER_TOKEN"))},
})
if err != nil {
	return err
}
fmt.Println(result.Status, result.Connection.Status)
return nil
```

**Signature:** `func (s *MCPConnectionsService) Reconnect(ctx context.Context, connectionID MCPConnectionID, params ReconnectMCPConnectionParams, opts ...RequestOption) (*MCPConnectionReconnectResult, error)`

`ba.ReconnectMCPConnectionParams` takes the same `Auth` types as `Create`, with `URL` and without `Name`. Returns [`*ba.MCPConnectionReconnectResult`](#mcpconnectionreconnectresult) with `Status` (`connected`, or `needs_auth` when an admin must sign in through the dashboard) and the updated `Connection`. Fails with `validation_failed`, `not_found`, `mcp_connection_invalid`, or [`mcp_connection_stale_credential_version`](/api-reference/protocols/errors#mcp_connection_stale_credential_version).

## Response models [#response-models]

### `MCPConnection` [#mcpconnection]

| Field | Type | Description |
| --- | --- | --- |
| `ID` | `ba.MCPConnectionID` | Connection ID (`mcp_...`) |
| `Name` | `string` | Display name |
| `URL` | `string` | MCP server URL |
| `AuthType` | `ba.MCPAuthType` | How Blazing Agents authenticates |
| `Status` | `ba.MCPConnectionStatus` | `ba.MCPConnectionStatusConnected`, `ba.MCPConnectionStatusNeedsAuth`, or `ba.MCPConnectionStatusError` |
| `CredentialFragment` | `*string` | Last characters of the stored credential |
| `LastAuthErrorCode` | `*ba.MCPConnectionErrorCode` | Why it last failed |
| `OAuthIssuer`, `OAuthResource` | `*string` | Discovered OAuth metadata |
| `TokenExpiresAt` | `*time.Time` | When the current access token expires |
| `CreatedAt`, `UpdatedAt` | `time.Time` | Timestamps |

### `MCPConnectionTest` [#mcpconnectiontestresult]

`OK` says whether the test passed. A passed test has `Latency` (a `time.Duration`), `Server` (a `*ba.MCPServerInfo` with `Name` and `Version`), `ToolCount`, and `ToolNames`. A failed test has `Error` with a `Code` and a `Message`.

### `MCPConnectionReconnectResult` [#mcpconnectionreconnectresult]

Has `Status` (a `ba.MCPReconnectStatus` of `connected` or `needs_auth`) and the updated `Connection`. A status this version does not know keeps its text, and `Connection` is still filled in.

## Errors and secrets [#errors-and-secrets]

A failure to authenticate or reach the server shows up as `Status` `error` with `LastAuthErrorCode`, not as a failed request: `MCP_CONNECTION_AUTHENTICATION_FAILED`, `MCP_CONNECTION_INVALID`, `MCP_CONNECTION_UNREACHABLE`, or `MCP_CONNECTION_DISCOVERY_FAILED`. Bearer tokens and OAuth secrets are write-only. They print as `[redacted]`, they are redacted from `*ba.APIError` bodies and headers, and a response that contains credential material fails with `*ba.CredentialEchoError`.

## Next [#next]

- [MCP tools](/agents/tools/mcp-tools)
- [Agents](/sdk/go/agents)
