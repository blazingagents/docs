---
title: MCP OAuth
description: Continue MCP authorization-code setup from an authenticated dashboard session.
---

# MCP OAuth

## Overview [#overview]

This authenticated operation converts the short-lived setup token returned by
MCP connect into a browser authorization URL. It requires the same Tenant's
dashboard JWT; an API key cannot approve the admin-session continuation.

## Endpoints [#endpoints]

### POST /v1/mcp/oauth/authorize [#approve-mcp-oauth-authorization]

Starts OAuth authorization for an MCP setup continuation. It requires a dashboard Supabase JWT, not an API key.

#### Request

Requires a [dashboard Supabase JWT](/api-reference/rest-api/authentication). The dashboard JWT selects the Tenant ownership boundary; the authenticated administrator and every referenced resource must belong to that Tenant.

| Location | Field           | Required | Description                                           |
| -------- | --------------- | -------- | ----------------------------------------------------- |
| Header   | `Authorization` | yes      | Dashboard Supabase JWT; Tenant API keys are rejected. |

| Location | Field          | Required | Description                   |
| -------- | -------------- | -------- | ----------------------------- |
| Header   | `Content-Type` | yes      | `application/json`            |
| Body     | `setupToken`   | yes      | Opaque token from MCP connect |

#### Response

| Status   | Body                                                                                                                            | Lifecycle effect                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `200 OK` | [`mcpOauthAuthorizationLaunchResponseSchema`](/api-reference/protocols/objects-and-schemas#mcp-oauth-authorization-launch-response) | Creates a short-lived browser authorization launch URL |

Opening the returned URL reaches the unauthenticated protocol-support routes
`GET /v1/mcp/oauth/authorize` and `GET /v1/mcp/oauth/callback`. Those browser
redirect routes, plus client metadata discovery, are not authenticated
operations in this inventory.

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

No SDK method: this administrator-only approval consumes a dashboard JWT's
`authUserId`, while the backend SDK authenticates with a Tenant API key.
[`mcpConnections.connect()`](/sdk/typescript/mcp-connections#connect)
returns the dashboard continuation that this operation approves.
Python [`mcp_connections.connect()`](/sdk/python/mcp-connections#connect)
returns the same continuation when the client uses the required admin credential.
See [MCP connections](/agents/tools/mcp-tools) and
[Connect an MCP server](/agents/tools/mcp-tools).

## Related [#related]

- [MCP connections API](/api-reference/rest-api/mcp-connections)
- [MCP connections SDK](/sdk/typescript/mcp-connections)
- [Python MCP connections SDK](/sdk/python/mcp-connections)
