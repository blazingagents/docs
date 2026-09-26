---
title: Authentication
description: Authenticate REST requests and understand Tenant resolution.
---

# Authentication

## Overview [#overview]

Send one `Authorization: Bearer <credential>` header with every request. The
credential tells Blazing Agents which tenant you are, and every request can
reach only that tenant's data. Attribution fields such as `userId` group your
data by end user; they do not narrow what an API key can access.

## Credentials [#credentials]

| Credential    | Intended caller          | How it is checked                                    |
| ------------- | ------------------------ | ---------------------------------------------------- |
| `ba_` API key | Your backend             | Matched against your keys; the full key is shown only once, at creation |
| Dashboard JWT | Blazing Agents dashboard | Verified as a signed-in dashboard session for an existing tenant |

Create API keys at
[https://www.blazingagents.com/app/keys](https://www.blazingagents.com/app/keys).
Never give either credential to end-user clients.

## Authorization header [#authorization-header]

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

Send the header once. Blazing Agents recognizes the credential type from its
shape. There are no scopes, per-agent permissions, or extra auth headers.

## Tenant resolution [#tenant-resolution]

An API key always belongs to one tenant. A dashboard JWT works only after the
signed-in user's tenant exists; signing in with OAuth alone does not create
one. `GET /v1/me` accepts only a dashboard JWT, and API keys are managed only
in the dashboard. Every other endpoint accepts either credential unless its
page says otherwise.

Raw REST calls to MCP authorization-code
[connect](/api-reference/rest-api/mcp-connections#connect-mcp-connection) and
[approval](/api-reference/rest-api/mcp-oauth) need the same tenant's dashboard
JWT, because they check which administrator is signed in. An API key cannot
stand in for that administrator.

## Authentication failures [#authentication-failures]

| Status | Code           | Meaning                                                                                                   |
| ------ | -------------- | --------------------------------------------------------------------------------------------------------- |
| `401`  | `unauthorized` | Header missing, malformed, expired, invalid, or unknown; also returned when an API key calls `GET /v1/me` |
| `404`  | `not_found`    | Valid JWT, but the signed-in user has no tenant yet                                                       |

See the complete [error contract](/api-reference/protocols/errors).

## Secret handling [#secret-handling]

You see the full API key only once, when you create it. Store it in a backend
secret manager and never log it. To rotate, create the replacement before you
delete the old key. Use a separate key per environment when that helps you
operate.

## Next [#next]

- [Security and credentials](/platform/security-and-credentials) for key handling in production.
- [Set up Blazing Agents](/getting-started/setup) to create your first key.
