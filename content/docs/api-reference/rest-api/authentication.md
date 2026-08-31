---
title: Authentication
description: Authenticate REST requests and understand Tenant resolution.
---

# Authentication

## Overview [#overview]

Send one `Authorization: Bearer <credential>` header. Authentication resolves
exactly one Tenant, which becomes the ownership boundary for the request.
Attribution fields such as `userId` filter and group Tenant-owned data; they do
not narrow what an API key can access.

## Credentials [#credentials]

| Credential        | Intended caller          | Resolution                                                     |
| ----------------- | ------------------------ | -------------------------------------------------------------- |
| `ba_` API key     | Tenant backend           | SHA-256 digest lookup; plaintext is returned only when created |
| Supabase Auth JWT | Blazing Agents dashboard | In-service JWKS verification, then provisioned Tenant lookup   |

Service-to-service M2M JWTs are internal and are not a public REST credential.
End-user clients must not hold either public credential.

## Authorization header [#authorization-header]

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

The header is required once. Credential shape selects the authentication path;
there is no second header, scope list, per-Agent ACL, or precedence rule.

## Tenant resolution [#tenant-resolution]

An API key resolves directly to its owning Tenant. A JWT must be valid and its
authenticated identity must already have a provisioned Tenant. Completing
OAuth sign-in alone does not provision product state. `GET /v1/me` and Tenant
credential lifecycle are JWT-only dashboard workflows; ordinary product
operations accept either credential unless their documented workflow requires
a dashboard session.
Raw REST calls to MCP authorization-code `connect` and approval require the
same Tenant's dashboard JWT because their ownership checks consume its
`authUserId`; an API key cannot substitute for that administrator identity.

## Authentication failures [#authentication-failures]

| Status | Code           | Meaning                                                                                                   |
| ------ | -------------- | --------------------------------------------------------------------------------------------------------- |
| `401`  | `unauthorized` | Header missing, malformed, expired, invalid, or unknown; also returned when an API key calls `GET /v1/me` |
| `404`  | `not_found`    | Valid JWT identity has no provisioned Tenant                                                              |

See the complete [error contract](/api-reference/protocols/errors).

## Secret handling [#secret-handling]

API-key creation returns the full token once. Store it in a backend secret
manager, never log it, rotate by creating a replacement before deleting the old
key, and use separate keys per environment when operational separation helps.

## Related [#related]

- [Security and credentials](/platform/security-and-credentials)
- [Setup](/getting-started/setup)
