---
title: MCP connections
description: Manage, test, authorize, and reconnect tenant MCP Connections.
---

# MCP connections

`client.mcpConnections` manages Tenant-level remote Streamable HTTP MCP Connections. Credentials are write-only. Attach Connection IDs to an Agent through its configuration; MCP Attachments control which Attribution fields are forwarded.

## Overview [#overview]

Authentication is a discriminated union:

- `none` has no credential fields.
- `bearer` requires `bearerToken`.
- `oauth_client_credentials` requires `clientId` and `clientSecret`, with optional `scope`.
- `oauth_authorization_code` accepts an optional `clientId` and `clientSecret` pair, with optional `scope`.

Connection URLs must use HTTP(S) and cannot contain credentials, a query, or a fragment. For `none`, bearer, and client credentials, create and reconnect validate the live server before committing. Authorization-code OAuth instead stores `needs_auth` and requires a browser continuation.

Most methods work with a Tenant API key. [`connect()`](#connect) is the exception: its client must carry a dashboard Supabase Auth JWT with an `authUserId`. A normal API key receives `unauthorized`. The returned URL starts the authenticated application flow; it is not the upstream Provider authorization URL.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Store and, when possible, validate a Connection | `McpConnectionResponse` |
| [`list()`](#list) | List the Tenant's Connections | `McpConnectionsResponse` |
| [`get()`](#get) | Retrieve one Connection | `McpConnectionResponse` |
| [`update()`](#update) | Rename a Connection | `McpConnectionResponse` |
| [`delete()`](#delete) | Delete an unused Connection and revoke OAuth credentials | `void` |
| [`test()`](#test) | Test a stored Connection and discover its tools | `McpConnectionTestResponse` |
| [`connect()`](#connect) | Start authorization-code OAuth through the dashboard | `McpConnectionOauthConnectResponse` |
| [`reconnect()`](#reconnect) | Replace a Connection's URL and credentials | `McpConnectionReconnectResult` |

## Methods [#methods]

### `create()` [#create]

Creates a reusable MCP Connection. Secrets are encrypted and never returned.

**Signature:** `create(body: CreateMcpConnectionBody): Promise<McpConnectionResponse>`

| Body field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | yes | Tenant-unique display name, 1–80 characters |
| `url` | `string` | yes | Remote Streamable HTTP endpoint |
| `authType` | `McpConnectionAuthType` | yes | Selects the remaining fields |
| `bearerToken` | `string` | bearer only | Write-only bearer credential |
| `clientId` | `string` | client credentials; optional pair for authorization code | Write-only OAuth client ID |
| `clientSecret` | `string` | client credentials; optional pair for authorization code | Write-only OAuth client secret |
| `scope` | `string` | no | OAuth scope for either OAuth mode |

```typescript
const connection = await client.mcpConnections.create({
  name: "Issue tracker",
  url: "https://mcp.example.com/mcp",
  authType: "bearer",
  bearerToken: process.env.MCP_BEARER_TOKEN!,
});
```

Returns [`McpConnectionResponse`](#mcpconnectionresponse). Authorization-code OAuth returns `needs_auth`; other modes return `connected` after live validation. Raises `validation_failed`, `mcp_connection_name_conflict`, `mcp_connection_limit_reached`, or a live setup error. A failed live setup does not retain its staged Connection. See [`POST /v1/mcp-connections`](/api-reference/rest-api/mcp-connections#create-mcp-connection).

### `list()` [#list]

Lists the Tenant's MCP Connections with every credential redacted.

**Signature:** `list(): Promise<McpConnectionsResponse>`

```typescript
const { mcpConnections } = await client.mcpConnections.list();
```

Returns `{ mcpConnections: McpConnectionResponse[] }`. Only standard authentication and service errors apply. See [`GET /v1/mcp-connections`](/api-reference/rest-api/mcp-connections#list-mcp-connections).

### `get()` [#get]

Retrieves one MCP Connection by its `mcp_…` ID.

**Signature:** `get(id: string): Promise<McpConnectionResponse>`

```typescript
const connection = await client.mcpConnections.get(connectionId);
```

Returns [`McpConnectionResponse`](#mcpconnectionresponse). Raises `validation_failed` for a malformed ID or `not_found` when the Connection is unavailable. See [`GET /v1/mcp-connections/:id`](/api-reference/rest-api/mcp-connections#get-mcp-connection).

### `update()` [#update]

Renames a Connection without changing its URL or credentials. Use `reconnect()` for connection details.

**Signature:** `update(id: string, body: UpdateMcpConnectionBody): Promise<McpConnectionResponse>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | yes | MCP Connection ID (`mcp_…`) |
| `body.name` | `string` | yes | New Tenant-unique name, 1–80 characters |

```typescript
const renamed = await client.mcpConnections.update(connectionId, {
  name: "Production issue tracker",
});
```

Returns [`McpConnectionResponse`](#mcpconnectionresponse). Raises `validation_failed`, `mcp_connection_name_conflict`, or `not_found`. See [`PATCH /v1/mcp-connections/:id`](/api-reference/rest-api/mcp-connections#update-mcp-connection).

### `delete()` [#delete]

Permanently deletes an unused Connection and revokes stored OAuth credentials. Detach it from every Agent first.

**Signature:** `delete(id: string): Promise<void>`

```typescript
await client.mcpConnections.delete(connectionId);
```

Returns `void`. Raises `validation_failed`, `not_found`, or `mcp_connection_in_use` while an Agent references the Connection. See [`DELETE /v1/mcp-connections/:id`](/api-reference/rest-api/mcp-connections#delete-mcp-connection).

### `test()` [#test]

Tests the stored endpoint and credential, discovers server and Tool details, and persists the resulting lifecycle state.

**Signature:** `test(id: string): Promise<McpConnectionTestResponse>`

```typescript
const result = await client.mcpConnections.test(connectionId);

if (result.ok) {
  console.log(result.server, result.toolNames);
} else {
  console.error(result.error.code, result.error.message);
}
```

Returns [`McpConnectionTestResponse`](#mcpconnectiontestresponse). Success sets `status: "connected"` and clears `lastAuthErrorCode`. Authentication failure sets `needs_auth`; another live failure sets `error`. OAuth testing may refresh stored credentials. A completed live failure returns `ok: false`, not an exception. A missing Connection raises `not_found`. See [`POST /v1/mcp-connections/:id/test`](/api-reference/rest-api/mcp-connections#test-mcp-connection).

### `connect()` [#connect]

Creates a short-lived setup continuation for an authorization-code OAuth Connection and returns an application URL to open in a browser.

**Signature:** `connect(id: string): Promise<McpConnectionOauthConnectResponse>`

```typescript
const dashboardClient = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_DASHBOARD_JWT!,
});

const { authorizationUrl } =
  await dashboardClient.mcpConnections.connect(connectionId);

console.log("Open in the authenticated application:", authorizationUrl);
```

This call requires a dashboard Supabase Auth JWT. The SDK constructor calls its credential option `apiKey`, but the value for this client must be that JWT; the method has no per-call second-credential option. The application page continues discovery, user approval, the upstream redirect, callback validation, and live Connection validation.

Returns [`McpConnectionOauthConnectResponse`](#mcpconnectionoauthconnectresponse). A normal Tenant API key raises `unauthorized`. Malformed input raises `validation_failed`; current service failures for a missing, foreign, wrong-auth-type, or wrong-state Connection surface as `internal`. See [`POST /v1/mcp-connections/:id/connect`](/api-reference/rest-api/mcp-connections#connect-mcp-connection).

### `reconnect()` [#reconnect]

Replaces a Connection's URL, authentication mode, and credential. The name stays unchanged.

**Signature:** `reconnect(id: string, body: ReconnectMcpConnectionBody): Promise<McpConnectionReconnectResult>`

The body matches [`create()`](#create) without `name`. `url` and `authType` are required; credential fields depend on `authType`.

```typescript
const result = await client.mcpConnections.reconnect(connectionId, {
  url: "https://mcp.example.com/v2/mcp",
  authType: "oauth_client_credentials",
  clientId: process.env.MCP_CLIENT_ID!,
  clientSecret: process.env.MCP_CLIENT_SECRET!,
  scope: "tools.read",
});

if (result.status === "needs_auth") {
  console.log("Complete authorization-code OAuth in the dashboard.");
}
```

Returns [`McpConnectionReconnectResult`](#mcpconnectionreconnectresult). Authorization-code OAuth stores `needs_auth`; other modes validate before replacement and return `connected`. Raises `validation_failed`, `not_found`, live setup errors, or `mcp_connection_stale_credential_version` when credentials changed concurrently. Failed validation leaves the previous configuration unchanged. See [`POST /v1/mcp-connections/:id/reconnect`](/api-reference/rest-api/mcp-connections#reconnect-mcp-connection).

## Request types [#request-types]

### `CreateMcpConnectionBody` [#createmcpconnectionbody]

```typescript
type CreateMcpConnectionBody =
  | { name: string; url: string; authType: "none" }
  | {
      name: string;
      url: string;
      authType: "bearer";
      bearerToken: string;
    }
  | {
      name: string;
      url: string;
      authType: "oauth_authorization_code";
      clientId?: string;
      clientSecret?: string;
      scope?: string;
    }
  | {
      name: string;
      url: string;
      authType: "oauth_client_credentials";
      clientId: string;
      clientSecret: string;
      scope?: string;
    };
```

For authorization-code OAuth, provide both `clientId` and `clientSecret` or omit both.

`ReconnectMcpConnectionBody` is the same discriminated union without `name`. `UpdateMcpConnectionBody` is `{ name?: string }`, with at least one field required.

## Response types [#response-types]

### `McpConnectionResponse` [#mcpconnectionresponse]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | MCP Connection ID (`mcp_…`) |
| `name` | `string` | Tenant-unique display name |
| `url` | `string` | Normalized remote endpoint |
| `authType` | `McpConnectionAuthType` | `none`, `bearer`, `oauth_authorization_code`, or `oauth_client_credentials` |
| `status` | `McpConnectionStatus` | `connected`, `needs_auth`, or `error` |
| `credentialFragment` | `string \| null` | Up to four redacted credential characters, or `null` |
| `lastAuthErrorCode` | `McpConnectionTestErrorCode \| null` | Last persisted live-test error |
| `oauthIssuer` | `string \| null` | Discovered OAuth issuer |
| `oauthResource` | `string \| null` | Discovered protected resource |
| `tokenExpiresAt` | `string \| null` | OAuth token expiry as ISO 8601, when known |
| `createdAt` | `string` | ISO 8601 creation timestamp |
| `updatedAt` | `string` | ISO 8601 update timestamp |

`McpConnectionsResponse` is `{ mcpConnections: McpConnectionResponse[] }`.

### `McpConnectionTestResponse` [#mcpconnectiontestresponse]

```typescript
type McpConnectionTestErrorCode =
  | "MCP_CONNECTION_AUTHENTICATION_FAILED"
  | "MCP_CONNECTION_INVALID"
  | "MCP_CONNECTION_UNREACHABLE"
  | "MCP_CONNECTION_DISCOVERY_FAILED";

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
      error: {
        code: McpConnectionTestErrorCode;
        message: string;
      };
    };
```

Use the `ok` discriminant before reading live details or `error`.

### `McpConnectionReconnectResult` [#mcpconnectionreconnectresult]

```typescript
type McpConnectionReconnectResult =
  | {
      status: "connected";
      connection: McpConnectionResponse;
    }
  | {
      status: "needs_auth";
      connection: McpConnectionResponse;
    };
```

### `McpConnectionOauthConnectResponse` [#mcpconnectionoauthconnectresponse]

```typescript
interface McpConnectionOauthConnectResponse {
  authorizationUrl: string;
}
```

The URL targets `/app/mcp-connections` with one opaque, short-lived setup token.

## Errors [#errors]

SDK request failures throw `BlazingAgentsError`. Branch on its stable lowercase `code`, not the uppercase entity-owned code inside an `ok: false` test result.

| Code | Applies to | Action |
| --- | --- | --- |
| `validation_failed` | Mutations and malformed IDs | Correct the discriminated input |
| `mcp_connection_name_conflict` | `create()`, `update()` | Choose a unique name |
| `mcp_connection_limit_reached` | `create()` | Delete an unused Connection or raise the Tenant cap |
| `mcp_connection_in_use` | `delete()` | Detach the Connection from every Agent |
| `mcp_connection_stale_credential_version` | `reconnect()` | Reload and retry against current state |
| `mcp_connection_authentication_failed` | Live create or reconnect | Correct or reauthorize credentials |
| `mcp_connection_invalid` | Live create or reconnect | Correct the MCP endpoint or protocol response |
| `mcp_connection_unreachable` | Live create or reconnect | Check endpoint reachability |
| `mcp_connection_discovery_failed` | Live create or reconnect | Check OAuth or MCP discovery |
| `not_found` | ID-based methods except current `connect()` behavior | Check the Connection ID and Tenant |
| `unauthorized` | `connect()` with a normal API key | Use an authenticated dashboard JWT client |

`test()` represents expected live failures as `ok: false`. Authentication, transport, malformed-response, and service failures still throw. See [SDK errors](/api-reference/protocols/errors).

## End-to-end workflow [#end-to-end-workflow]

Create a non-OAuth Connection, test it, reconnect it with a replacement credential, and inspect the stored state:

```typescript
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});

const connection = await client.mcpConnections.create({
  name: "Issue tracker",
  url: "https://mcp.example.com/mcp",
  authType: "bearer",
  bearerToken: process.env.MCP_BEARER_TOKEN!,
});

const test = await client.mcpConnections.test(connection.id);
if (!test.ok) throw new Error(test.error.message);

const replacement = await client.mcpConnections.reconnect(connection.id, {
  url: connection.url,
  authType: "bearer",
  bearerToken: process.env.MCP_REPLACEMENT_BEARER_TOKEN!,
});

const stored = await client.mcpConnections.get(connection.id);
console.log({
  status: replacement.status,
  tools: test.toolNames,
  credentialFragment: stored.credentialFragment,
});
```

For authorization-code OAuth, create with `authType: "oauth_authorization_code"`, then use a separate JWT-authenticated SDK client to call `connect()` and open its returned application URL.

## Related [#related]

- [MCP Connections](/agents/tools/mcp-tools)
- [Connect an MCP server](/agents/tools/mcp-tools)
- [REST MCP Connections](/api-reference/rest-api/mcp-connections)
- [MCP OAuth](/api-reference/rest-api/mcp-oauth)
