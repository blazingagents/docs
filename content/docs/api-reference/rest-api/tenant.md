---
title: Tenant
description: Read and change your tenant settings.
---

# Tenant

## Overview [#overview]

Read or change your tenant's display name, model spending limit, and monetization setting. These are tenant operations, so a [user-scoped request](/api-reference/rest-api/authentication#end-user-scope) gets `403 forbidden`.

## Endpoints [#endpoints]

### GET /v1/tenant [#get-tenant-settings]

Get tenant settings.

Returns your tenant's display name and monetization setting. `deletion` is `null` unless your tenant is scheduled for deletion, when it holds the request and deletion times.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). A read-only or full [API key](/api-reference/rest-api/authentication#access-levels) can call it. A tenant operation: it refuses an [end-user scope](/api-reference/rest-api/authentication#end-user-scope) with `403 forbidden`.

There are no parameters and no request body.

#### Response

Returns `200 OK` as `application/json`. Your tenant's settings.

Response schema: `TenantSettings`.

```json
{
  "name": "Acme",
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
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The caller is not allowed to make this request |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/tenant" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PATCH /v1/tenant [#update-tenant-settings]

Update tenant settings.

Updates your tenant's display name or monetization setting. Send at least one field; the ones you leave out keep their values. Turning `monetizationEnabled` off drops usage events your merchant has not yet accepted.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body. Needs a full [API key](/api-reference/rest-api/authentication#access-levels); a read-only key gets `403 insufficient_scope`. A tenant operation: it refuses an [end-user scope](/api-reference/rest-api/authentication#end-user-scope) with `403 forbidden`.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `monetizationEnabled` | boolean | body |  | Bill usage to your end users through your merchant account. Turning it off drops usage events your merchant has not yet accepted. |
| `name` | string | body |  | Display name of your tenant. 1–80 characters. |

#### Response

Returns `200 OK` as `application/json`. Your tenant's updated settings.

Response schema: `TenantSettings`.

```json
{
  "name": "Acme",
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
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden), [`insufficient_scope`](/api-reference/protocols/errors#insufficient_scope) | The caller is not allowed to make this request |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/tenant" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name":"Acme"}'
```

### GET /v1/tenant/spending-limit [#get-tenant-spending-limit]

Get the tenant model spending limit.

A USD allowance for model tokens, priced from the built-in model price list or the provider's reported cost. It excludes platform compute, storage, workspace and network charges. Each running turn may finish one model request past the limit. While a limit applies, models without a price are refused, and a turn stops when a response has no reported cost. Resets happen at midnight UTC on the schedule anchored to resetStartDate; a future date applies the limit at once until then. Saving takes effect immediately and keeps the spending already counted in the current period. Requires a tenant API key; a user-scoped request gets forbidden.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). A read-only or full [API key](/api-reference/rest-api/authentication#access-levels) can call it. A tenant operation: it refuses an [end-user scope](/api-reference/rest-api/authentication#end-user-scope) with `403 forbidden`.

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
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The caller is not allowed to make this request |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/tenant/spending-limit" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PUT /v1/tenant/spending-limit [#update-tenant-spending-limit]

Set the tenant model spending limit.

A USD allowance for model tokens, priced from the built-in model price list or the provider's reported cost. It excludes platform compute, storage, workspace and network charges. Each running turn may finish one model request past the limit. While a limit applies, models without a price are refused, and a turn stops when a response has no reported cost. Resets happen at midnight UTC on the schedule anchored to resetStartDate; a future date applies the limit at once until then. Saving takes effect immediately and keeps the spending already counted in the current period. Requires a tenant API key; a user-scoped request gets forbidden.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body. Needs a full [API key](/api-reference/rest-api/authentication#access-levels); a read-only key gets `403 insufficient_scope`. A tenant operation: it refuses an [end-user scope](/api-reference/rest-api/authentication#end-user-scope) with `403 forbidden`.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `spendingLimit` | object \| null | body | required | Model-only USD allowance and UTC reset schedule. Set null to disable the limit. |
| `spendingLimit.amountUsd` | number | body | required | More than 0, up to 1000000000. |
| `spendingLimit.resetStartDate` | string | body | required | A `YYYY-MM-DD` date. |
| `spendingLimit.resetInterval` | string | body | required | One of `daily`, `weekly`, `biweekly`, `monthly`. |

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
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden), [`insufficient_scope`](/api-reference/protocols/errors#insufficient_scope) | The caller is not allowed to make this request |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PUT "$BLAZING_AGENTS_BASE_URL/v1/tenant/spending-limit" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"spendingLimit":null}'
```

## Next [#next]

- [Usage and spending limits](/platform/usage-and-spending-limits) to choose a spending limit.
- [Usage API](/api-reference/rest-api/usage) to compare usage with your spending limit.
