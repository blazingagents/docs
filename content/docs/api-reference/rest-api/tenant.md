---
title: Tenant
description: Read Tenant identity and manage Tenant settings.
---

# Tenant

## Overview [#overview]

Read who is signed in to the dashboard, and read or change your tenant's display name and monthly quota. Your backend usually needs only the settings endpoints.

## Endpoints [#endpoints]

### GET /v1/me [#get-current-identity]

Returns the tenant identity of the administrator signed in to the dashboard. It requires a dashboard JWT, not an API key.

#### Request

The bearer credential must be a valid dashboard JWT. There are no path, query, or body parameters. The signed-in administrator and every resource in the request must belong to the same tenant.

| Location | Field           | Required | Description                                           |
| -------- | --------------- | -------- | ----------------------------------------------------- |
| Header   | `Authorization` | yes      | Dashboard JWT; Tenant API keys are rejected. |

#### Response

Returns `200 OK`.

Response schema: [`tenantResponseSchema`](/api-reference/protocols/objects-and-schemas#tenant-response).

```json
{
  "id": "ten_1234567890ABCDEF",
  "authUserId": "11111111-2222-4333-8444-555555555555",
  "email": "dev@example.com",
  "name": "Acme",
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z",
  "subscriptionStatus": "active"
}
```

#### Errors

`401 unauthorized` when an API key is used or the JWT is invalid. Standard service errors also apply; see [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/me" \
  --header "Authorization: Bearer $BLAZING_AGENTS_DASHBOARD_JWT"
```

Your backend normally uses [Get tenant settings](/api-reference/rest-api/tenant#get-tenant-settings) instead.

#### SDK and related guides

No SDK method: the SDKs authenticate with an API key, and this operation requires a dashboard JWT. See [Tenancy and attribution](/platform/tenancy-and-attribution).

### GET /v1/tenant [#get-tenant-settings]

Returns your tenant's display name and monthly quota. A `null` quota means usage is unlimited.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). There are no path, query, or body parameters. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |

#### Response

Returns `200 OK`.

Response schema: [`tenantSettingsResponseSchema`](/api-reference/protocols/objects-and-schemas#tenant-settings-response).

```json
{
  "name": "Acme",
  "quota": {
    "monthlyTokenLimit": 5000000,
    "monthlyRequestLimit": 10000,
    "resetDay": 1
  }
}
```

Either monthly limit may be `null`. `resetDay` is an integer from 1 through 28.

#### Errors

Only standard authentication and service errors apply; see [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/tenant" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDK: [TypeScript `get`](/sdk/typescript/tenant#get) or [Python
`get`](/sdk/python/tenant#get). See [Tenancy and
attribution](/platform/tenancy-and-attribution).

### PATCH /v1/tenant [#update-tenant-settings]

Updates your tenant's display name or monthly quota. Settings you leave out keep their values.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and JSON. There are no path or query parameters. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |

| Body field                  | Type                     | Required     | Description                        |
| --------------------------- | ------------------------ | ------------ | ---------------------------------- |
| `name`                      | string                   | no           | Display name, 1–80 characters      |
| `quota`                     | object \| null           | no           | Monthly limits, or `null` to clear |
| `quota.monthlyTokenLimit`   | positive integer \| null | with `quota` | Token ceiling                      |
| `quota.monthlyRequestLimit` | positive integer \| null | with `quota` | Turn ceiling                       |
| `quota.resetDay`            | integer                  | with `quota` | Reset day, 1–28                    |

At least one top-level field is required.

#### Response

Returns `200 OK` with the complete settings object.

Response schema: [`tenantSettingsResponseSchema`](/api-reference/protocols/objects-and-schemas#tenant-settings-response).

```json
{
  "name": "Acme",
  "quota": {
    "monthlyTokenLimit": 5000000,
    "monthlyRequestLimit": null,
    "resetDay": 1
  }
}
```

#### Errors

`400 validation_failed` for an empty parsed body or values that fail schema
validation. Malformed JSON uses `400 invalid_request`. Standard errors also
apply; see [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/tenant" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"quota":{"monthlyTokenLimit":5000000,"monthlyRequestLimit":null,"resetDay":1}}'
```

#### SDK and related guides

SDK: [TypeScript `patch`](/sdk/typescript/tenant#patch) or [Python
`update`](/sdk/python/tenant#update). See [Tenancy and
attribution](/platform/tenancy-and-attribution).

## Next [#next]

- [Usage and quotas](/platform/usage-and-quotas) to choose quota values.
- [Usage API](/api-reference/rest-api/usage) to compare usage with your quota.
