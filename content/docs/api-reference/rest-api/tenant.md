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
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |

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
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/tenant" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"quota":{"monthlyTokenLimit":5000000,"monthlyRequestLimit":null,"resetDay":1}}'
```

### GET /v1/tenant/spending-limit [#get-tenant-spending-limit]

Get the tenant model spending limit.

An estimated USD allowance for model tokens, priced from the built-in model price list. It excludes platform compute, storage, workspace and network charges, and a request that costs more than estimated can exceed it. While a limit applies, models without a price are refused. Resets happen at midnight UTC on the schedule anchored to resetStartDate; a future date applies the limit at once until then. Saving takes effect immediately and keeps the spending already counted in the current period. Money held for work whose usage is never reported is released at the next reset. Requires a tenant API key; a user-scoped request gets forbidden.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

There are no parameters and no request body.

#### Response

Returns `200 OK` as `application/json`. Model spending configuration and current UTC period.

Response schema: `ModelSpendingLimitStatus`.

```json
{
  "spendingLimit": null,
  "period": null,
  "nextResetAt": null
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/tenant/spending-limit" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PUT /v1/tenant/spending-limit [#update-tenant-spending-limit]

Set the tenant model spending limit.

An estimated USD allowance for model tokens, priced from the built-in model price list. It excludes platform compute, storage, workspace and network charges, and a request that costs more than estimated can exceed it. While a limit applies, models without a price are refused. Resets happen at midnight UTC on the schedule anchored to resetStartDate; a future date applies the limit at once until then. Saving takes effect immediately and keeps the spending already counted in the current period. Money held for work whose usage is never reported is released at the next reset. Requires a tenant API key; a user-scoped request gets forbidden.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `spendingLimit` | object \| null | body | required | Model-only USD allowance and UTC reset schedule. Set null to disable the limit. |

#### Response

Returns `200 OK` as `application/json`. Model spending configuration and current UTC period.

Response schema: `ModelSpendingLimitStatus`.

```json
{
  "spendingLimit": null,
  "period": null,
  "nextResetAt": null
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PUT "$BLAZING_AGENTS_BASE_URL/v1/tenant/spending-limit" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"spendingLimit":null}'
```

## Next [#next]

- [Usage and quotas](/platform/usage-and-quotas) to choose quota values.
- [Usage API](/api-reference/rest-api/usage) to compare usage with your quota.
