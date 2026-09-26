---
title: MCP connections
description: Save, test, authorize, and replace remote MCP server connections with the TypeScript SDK.
---

# MCP connections

`client.mcpConnections` saves the remote MCP servers your agents can call, along with their credentials. You create a connection once, then give it to any agent through the agent's `mcpConnectionIds`. To learn how MCP tools reach your agent, read [MCP tools](/agents/tools/mcp-tools).

```typescript
const connection = await client.mcpConnections.create({
  name: "Issue tracker",
  url: "https://mcp.example.com/mcp",
  authType: "bearer",
  bearerToken: process.env.MCP_BEARER_TOKEN!,
});

await client.agents.update({ agentId, mcpConnectionIds: [connection.id] });
```

Every method takes one input object and accepts an optional `abortSignal`. Credentials are never returned; responses show at most four characters in `credentialFragment`.

## Authentication types [#authentication-types]

`authType` picks which credential fields the connection needs:

| `authType` | Credential fields | What happens on save |
| --- | --- | --- |
| `"none"` | none | Blazing Agents connects to the server to check it |
| `"bearer"` | `bearerToken` | Checks the server with the token |
| `"oauth_client_credentials"` | `clientId`, `clientSecret`, optional `scope` | Gets a token and checks the server |
| `"oauth_authorization_code"` | optional `clientId` and `clientSecret` together, optional `scope` | Saves with `status: "needs_auth"` until a person signs in |

If the check fails, nothing is saved and the call throws. The `url` must be `http` or `https` without credentials, a query string, or a fragment. Servers must speak Streamable HTTP.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Save a connection | `McpConnectionResponse` |
| [`list()`](#list) | List connections | `McpConnectionsResponse` |
| [`get()`](#get) | Read one connection | `McpConnectionResponse` |
| [`update()`](#update) | Rename a connection | `McpConnectionResponse` |
| [`delete()`](#delete) | Delete a connection | `void` |
| [`test()`](#test) | Check the server and list its tools | `McpConnectionTestResponse` |
| [`connect()`](#connect) | Start an OAuth sign-in | `McpConnectionOauthConnectResponse` |
| [`reconnect()`](#reconnect) | Replace the URL and credentials | `McpConnectionReconnectResult` |

## Methods [#methods]

### `create()` [#create]

Saves a connection and, except for authorization-code OAuth, checks that the server answers.

**Signature:** `create(input: CreateMcpConnectionBody & ResourceRequestOptions): Promise<McpConnectionResponse>`

```typescript
const connection = await client.mcpConnections.create({
  name: "Analytics",
  url: "https://mcp.example.com/mcp",
  authType: "oauth_client_credentials",
  clientId: process.env.MCP_CLIENT_ID!,
  clientSecret: process.env.MCP_CLIENT_SECRET!,
  scope: "tools.read",
});
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | yes | 1 to 80 characters, unique in your tenant |
| `url` | `string` | yes | The server's MCP endpoint |
| `authType` | `McpConnectionAuthType` | yes | See [authentication types](#authentication-types) |
| `bearerToken` | `string` | for `"bearer"` | The token |
| `clientId`, `clientSecret` | `string` | for `"oauth_client_credentials"` | OAuth client credentials |
| `scope` | `string` | no | OAuth scope |

Returns [`McpConnectionResponse`](#mcpconnectionresponse) with `status: "connected"`, or `"needs_auth"` for authorization-code OAuth. Your tenant can hold up to 50 connections. Errors: `validation_failed`, `mcp_connection_name_conflict`, `mcp_connection_limit_reached`, and the [check errors](#errors).

### `list()` [#list]

Lists your connections.

**Signature:** `list(input?: ResourceRequestOptions): Promise<McpConnectionsResponse>`

```typescript
const { mcpConnections } = await client.mcpConnections.list();
```

Returns `{ mcpConnections: McpConnectionResponse[] }`.

### `get()` [#get]

Reads one connection.

**Signature:** `get(input: { mcpConnectionId: string } & ResourceRequestOptions): Promise<McpConnectionResponse>`

```typescript
const connection = await client.mcpConnections.get({ mcpConnectionId });
```

Returns [`McpConnectionResponse`](#mcpconnectionresponse). Errors: `validation_failed`, `not_found`.

### `update()` [#update]

Renames a connection. To change its URL or credentials, use [`reconnect()`](#reconnect).

**Signature:** `update(input: UpdateMcpConnectionBody & { mcpConnectionId: string } & ResourceRequestOptions): Promise<McpConnectionResponse>`

```typescript
const connection = await client.mcpConnections.update({
  mcpConnectionId,
  name: "Production issue tracker",
});
```

Returns [`McpConnectionResponse`](#mcpconnectionresponse). Errors: `validation_failed`, `mcp_connection_name_conflict`, `not_found`.

### `delete()` [#delete]

Deletes a connection and revokes any OAuth tokens it holds.

**Signature:** `delete(input: { mcpConnectionId: string } & ResourceRequestOptions): Promise<void>`

```typescript
await client.mcpConnections.delete({ mcpConnectionId });
```

Remove it from every agent's `mcpConnectionIds` first, or the call fails with `mcp_connection_in_use`. Errors: `validation_failed`, `not_found`, `mcp_connection_in_use`.

### `test()` [#test]

Connects to the server with the saved credentials and lists its tools.

**Signature:** `test(input: { mcpConnectionId: string } & ResourceRequestOptions): Promise<McpConnectionTestResponse>`

```typescript
const result = await client.mcpConnections.test({ mcpConnectionId });
if (result.ok) {
  console.log(result.server.name, result.toolNames);
} else {
  console.error(result.error.code, result.error.message);
}
```

A failed check returns `ok: false` instead of throwing, and updates the connection's `status`: `"connected"` on success, `"needs_auth"` when the credentials are rejected, `"error"` otherwise. Testing an OAuth connection may refresh its token. Returns [`McpConnectionTestResponse`](#mcpconnectiontestresponse). Errors: `not_found`.

### `connect()` [#connect]

Starts the sign-in for an authorization-code OAuth connection and returns a URL to open in a browser.

**Signature:** `connect(input: { mcpConnectionId: string } & ResourceRequestOptions): Promise<McpConnectionOauthConnectResponse>`

```typescript
const dashboardClient = new BlazingAgents({ apiKey: dashboardUserAccessToken });
const { authorizationUrl } = await dashboardClient.mcpConnections.connect({ mcpConnectionId });
```

The URL opens the connection's page in the Blazing Agents dashboard, where the person signs in to the MCP server's provider and approves access. The connection then turns `"connected"`. This call needs a signed-in dashboard user's access token in place of the API key; a client built with an API key gets `unauthorized`. Most apps send the person to the [dashboard](https://www.blazingagents.com/app) to finish OAuth instead.

Returns [`McpConnectionOauthConnectResponse`](#mcpconnectionoauthconnectresponse). Errors: `unauthorized`, `validation_failed`.

### `reconnect()` [#reconnect]

Replaces a connection's URL, authentication type, and credentials, and keeps its name and ID.

**Signature:** `reconnect(input: ReconnectMcpConnectionBody & { mcpConnectionId: string } & ResourceRequestOptions): Promise<McpConnectionReconnectResult>`

```typescript
const result = await client.mcpConnections.reconnect({
  mcpConnectionId,
  url: "https://mcp.example.com/v2/mcp",
  authType: "bearer",
  bearerToken: process.env.MCP_BEARER_TOKEN!,
});
console.log(result.status);
```

Takes the [`create()`](#create) fields except `name`. Blazing Agents checks the new settings the same way as `create()` and keeps the old ones if the check fails. Agents that use the connection pick up the change without an update. Returns [`McpConnectionReconnectResult`](#mcpconnectionreconnectresult). Errors: `validation_failed`, `not_found`, `mcp_connection_stale_credential_version` (someone changed it at the same time; reload and retry), and the [check errors](#errors).

## Response types [#response-types]

### `McpConnectionResponse` [#mcpconnectionresponse]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Connection ID (`mcp_…`) |
| `name` | `string` | Connection name |
| `url` | `string` | MCP endpoint |
| `authType` | `McpConnectionAuthType` | Authentication type |
| `status` | `"connected" \| "needs_auth" \| "error"` | Result of the last check |
| `credentialFragment` | `string \| null` | Up to four characters of the credential |
| `lastAuthErrorCode` | `McpConnectionTestErrorCode \| null` | Why the last check failed |
| `oauthIssuer` | `string \| null` | OAuth issuer, when discovered |
| `oauthResource` | `string \| null` | OAuth protected resource, when discovered |
| `tokenExpiresAt` | `string \| null` | When the OAuth token expires, if known |
| `createdAt` | `string` | ISO 8601 timestamp |
| `updatedAt` | `string` | ISO 8601 timestamp |

`McpConnectionsResponse` is `{ mcpConnections: McpConnectionResponse[] }`.

### `McpConnectionTestResponse` [#mcpconnectiontestresponse]

```typescript
type McpConnectionTestResponse =
  | {
      ok: true;
      latencyMs: number;
      server: { name: string; version: string };
      toolCount: number;
      toolNames: string[];
    }
  | {
      ok: false;
      error: { code: McpConnectionTestErrorCode; message: string };
    };

type McpConnectionTestErrorCode =
  | "MCP_CONNECTION_AUTHENTICATION_FAILED"
  | "MCP_CONNECTION_INVALID"
  | "MCP_CONNECTION_UNREACHABLE"
  | "MCP_CONNECTION_DISCOVERY_FAILED";
```

### `McpConnectionReconnectResult` [#mcpconnectionreconnectresult]

```typescript
interface McpConnectionReconnectResult {
  status: "connected" | "needs_auth";
  connection: McpConnectionResponse;
}
```

### `McpConnectionOauthConnectResponse` [#mcpconnectionoauthconnectresponse]

```typescript
interface McpConnectionOauthConnectResponse {
  authorizationUrl: string;
}
```

## Errors [#errors]

Failures throw [`BlazingAgentsError`](/sdk/typescript/client#errors). `create()` and `reconnect()` throw these when the server check fails:

| Code | Meaning |
| --- | --- |
| `mcp_connection_authentication_failed` | The server rejected the credentials |
| `mcp_connection_invalid` | The endpoint did not answer like an MCP server |
| `mcp_connection_unreachable` | The server could not be reached |
| `mcp_connection_discovery_failed` | OAuth or MCP discovery failed |

Other connection codes:

| Code | Meaning |
| --- | --- |
| `mcp_connection_name_conflict` | Another connection has this name |
| `mcp_connection_limit_reached` | Your tenant already has 50 connections |
| `mcp_connection_in_use` | An agent still uses the connection |
| `mcp_connection_stale_credential_version` | The connection changed during your call; reload and retry |

## Next [#next]

- [MCP tools](/agents/tools/mcp-tools)
- [Agents reference](/sdk/typescript/agents#update-mcp-attachment)
