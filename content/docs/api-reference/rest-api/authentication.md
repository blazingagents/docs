---
title: Authentication
description: Authenticate REST requests, choose an API key access level, and scope a request to one end user.
---

# Authentication

## Overview [#overview]

Send one `Authorization: Bearer <credential>` header with every request. The
credential tells Blazing Agents which tenant you are, and every request can
reach only that tenant's data. An API key also has an access level, and your
backend can narrow a request to one of your end users with the
`X-BA-User-Id` header.

## Credentials [#credentials]

| Credential    | Intended caller          | How it is checked                                    |
| ------------- | ------------------------ | ---------------------------------------------------- |
| API key (`ba_read_…` or `ba_full_…`) | Your backend | Matched against your keys; the full key is shown only once, at creation |
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
shape.

## Access levels [#access-levels]

Each API key is read-only (`ba_read_…`) or full (`ba_full_…`), and the level
never changes. A read-only key can read your setup and run your agents, which
spends credit. A full key can also create, change, and delete your setup. Every
operation in this reference says which level it needs. A read-only key that
calls an operation that needs a full key gets `403 insufficient_scope`, and
nothing changes. See [access levels](/platform/security-and-credentials#api-key-access-levels)
to choose one.

## End-user scope [#end-user-scope]

To act for one of your end users, send `X-BA-User-Id` with your own ID for
that user, next to an API key. The SDKs send it for a client made with
`forUser` (`for_user` in Python and Rust, `ForUser` in Go). The value is 1 to
256 printable ASCII characters with no space at either end.

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "X-BA-User-Id: app:user-42"
```

A scoped request sees only that user's records:

- Lists and reads return only records whose `userId` is that user. Records with
  no user, such as general memories, stay hidden.
- Records you create get that `userId`.
- Every agent, session, workspace, skill, task, or other record you name must
  belong to that user, or the request fails with that record's not-found code.
  Providers and MCP connections belong to the tenant and stay usable.
- A turn also needs the agent's workspace to belong to that user, or it fails
  with `404 workspace_not_found`.

Only operations marked as accepting an end-user scope take the header. Tenant
operations, such as providers, spending limits, and the usage overview, refuse
it with `403 forbidden`. See
[tenancy and attribution](/platform/tenancy-and-attribution#user-labels-and-user-scope)
for how to give each user their own agent and workspace.

## Tenant resolution [#tenant-resolution]

An API key always belongs to one tenant. A dashboard JWT works only after the
signed-in user's tenant exists; signing in with OAuth alone does not create
one. Every endpoint in this reference accepts either credential. A few
dashboard-only endpoints, such as API key management and MCP OAuth approval,
accept only a dashboard JWT because they check which administrator is signed
in; they are not part of this reference.

## Authentication failures [#authentication-failures]

| Status | Code           | Meaning |
| ------ | -------------- | ------- |
| `400`  | `invalid_request` | `X-BA-User-Id` is not a valid user ID, or a `userId` field or filter names a different user than the scope |
| `401`  | `unauthorized` | Header missing, malformed, expired, invalid, or unknown, or a dashboard JWT whose user has no tenant yet |
| `403`  | `insufficient_scope` | A read-only key called an operation that needs a full key |
| `403`  | `forbidden` | `X-BA-User-Id` sent to a tenant operation or with a dashboard JWT, or a scoped request changes or runs a task that was not created with that scope |

See the complete [error contract](/api-reference/protocols/errors).

## Secret handling [#secret-handling]

You see the full API key only once, when you create it. Store it in a backend
secret manager and never log it. To rotate, create the replacement before you
delete the old key. Use a separate key per environment when that helps you
operate.

## Next [#next]

- [Security and credentials](/platform/security-and-credentials) for key handling in production.
- [Set up Blazing Agents](/getting-started/setup) to create your first key.
