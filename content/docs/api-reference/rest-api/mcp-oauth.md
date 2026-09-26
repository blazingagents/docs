---
title: MCP OAuth
description: Continue MCP authorization-code setup from an authenticated dashboard session.
---

# MCP OAuth

## Overview [#overview]

Finish connecting an MCP server that signs in with OAuth. Exchange the
short-lived setup token from MCP connect for a URL, then open it in the
administrator's browser. This call needs the same tenant's dashboard JWT; an
API key cannot approve it.

## Endpoints [#endpoints]

### POST /v1/mcp/oauth/authorize [#approve-mcp-oauth-authorization]

Starts OAuth sign-in for a pending MCP connection. It requires a dashboard JWT, not an API key.

#### Request

Requires a [dashboard JWT](/api-reference/rest-api/authentication). The signed-in administrator and every resource in the request must belong to the same tenant.

| Location | Field           | Required | Description                                           |
| -------- | --------------- | -------- | ----------------------------------------------------- |
| Header   | `Authorization` | yes      | Dashboard JWT; Tenant API keys are rejected. |

| Location | Field          | Required | Description                   |
| -------- | -------------- | -------- | ----------------------------- |
| Header   | `Content-Type` | yes      | `application/json`            |
| Body     | `setupToken`   | yes      | Opaque token from MCP connect |

#### Response

| Status   | Body                                                                                                                            | Lifecycle effect                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `200 OK` | [`mcpOauthAuthorizationLaunchResponseSchema`](/api-reference/protocols/objects-and-schemas#mcp-oauth-authorization-launch-response) | Creates a short-lived browser authorization launch URL |

The returned URL leads the browser through `GET /v1/mcp/oauth/authorize` and
`GET /v1/mcp/oauth/callback`. Those redirect routes and OAuth client metadata
discovery are handled for you, so they are not listed as operations here.

#### Errors

`400 validation_failed` applies when the parsed body does not contain a valid
setup token. Expired, already-used, or wrong-owner setup state uses `400
invalid_request`. Authentication without a dashboard JWT and its `authUserId`
uses `401 unauthorized`. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/mcp/oauth/authorize" \
  --header "Authorization: Bearer $BLAZING_AGENTS_DASHBOARD_JWT" \
  --header "Content-Type: application/json" \
  --data '{"setupToken":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}'
```

#### SDK and related guides

No SDK method: this approval needs the signed-in administrator from a dashboard
JWT, and the SDKs authenticate with an API key.
[`mcpConnections.connect()`](/sdk/typescript/mcp-connections#connect)
returns the dashboard continuation that this operation approves.
Python [`mcp_connections.connect()`](/sdk/python/mcp-connections#connect)
returns the same continuation when the client uses the required admin credential.
See [MCP connections](/agents/tools/mcp-tools).

## Next [#next]

- [MCP connections API](/api-reference/rest-api/mcp-connections#connect-mcp-connection) to get a setup token.
- [MCP connections](/agents/tools/mcp-tools) to attach the connected server to an agent.
