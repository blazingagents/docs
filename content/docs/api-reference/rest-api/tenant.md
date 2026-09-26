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

Returns your tenant's display name, monthly quota, and monetization setting. A `null` quota means usage is unlimited. `deletion` is `null` unless your tenant is scheduled for deletion, when it holds the request and deletion times.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

There are no parameters and no request body.

#### Response

Returns `200 OK` as `application/json`. Your tenant's settings.

Response schema: `TenantSettings`.

```json
{
  "name": "Acme",
  "quota": {
    "monthlyTokenLimit": 5000000,
    "monthlyRequestLimit": 10000,
    "resetDay": 1
  },
  "monetizationEnabled": false,
  "deletion": null
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/tenant" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PATCH /v1/tenant [#update-tenant-settings]

Update tenant settings.

Updates your tenant's display name, monthly quota, or monetization setting. Send at least one field; the ones you leave out keep their values. A `quota` replaces the whole quota, so send all three of its fields with at least one limit set, or send `null` to remove it. Turning `monetizationEnabled` off drops usage events your merchant has not yet accepted.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `monetizationEnabled` | boolean | body |  | Bill usage to your end users through your merchant account. Turning it off drops usage events your merchant has not yet accepted. |
| `name` | string | body |  | Display name of your tenant. 1–80 characters. |
| `quota` | object \| null | body |  | The whole monthly quota, replacing the current one, or `null` to remove it. Send `monthlyTokenLimit`, `monthlyRequestLimit`, and `resetDay`, with at least one limit set. |

#### Response

Returns `200 OK` as `application/json`. Your tenant's updated settings.

Response schema: `TenantSettings`.

```json
{
  "name": "Acme",
  "quota": {
    "monthlyTokenLimit": 5000000,
    "monthlyRequestLimit": null,
    "resetDay": 1
  },
  "monetizationEnabled": false,
  "deletion": null
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`invalid_request`](/api-reference/protocols/errors#invalid_request) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/tenant" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"quota":{"monthlyTokenLimit":5000000,"monthlyRequestLimit":null,"resetDay":1}}'
```

## Next [#next]

- [Usage and quotas](/platform/usage-and-quotas) to choose quota values.
- [Usage API](/api-reference/rest-api/usage) to compare usage with your quota.
