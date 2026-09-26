---
title: Tenant
description: Read and change your tenant settings.
---

# Tenant

## Overview [#overview]

Read or change your tenant's display name and monthly quota.

## Endpoints [#endpoints]

### GET /v1/tenant [#get-tenant-settings]

Get tenant settings.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

There are no parameters and no request body.

#### Response

Returns `200 OK` as `application/json`. The tenant settings.

Response schema: `TenantSettings`.

```json
{
  "name": "string",
  "quota": {
    "monthlyTokenLimit": 1,
    "monthlyRequestLimit": 1,
    "resetDay": 1
  },
  "deletion": {
    "deletesAt": "2026-07-10T10:00:00Z",
    "requestedAt": "2026-07-10T10:00:00Z"
  },
  "monetizationEnabled": true
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/tenant" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PATCH /v1/tenant [#update-tenant-settings]

Update tenant settings.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `monetizationEnabled` | boolean | body |  |  |
| `name` | string | body |  | 1–80 characters. |
| `quota` | object \| null | body |  |  |

#### Response

Returns `200 OK` as `application/json`. The updated tenant settings.

Response schema: `TenantSettings`.

```json
{
  "name": "string",
  "quota": {
    "monthlyTokenLimit": 1,
    "monthlyRequestLimit": 1,
    "resetDay": 1
  },
  "deletion": {
    "deletesAt": "2026-07-10T10:00:00Z",
    "requestedAt": "2026-07-10T10:00:00Z"
  },
  "monetizationEnabled": true
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/tenant" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"monetizationEnabled":true}'
```

## Next [#next]

- [Usage and quotas](/platform/usage-and-quotas) to choose quota values.
- [Usage API](/api-reference/rest-api/usage) to compare usage with your quota.
