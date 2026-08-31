---
title: Tenant
description: Read and update Tenant settings and soft quotas with the Python SDK.
---

# Tenant

`client.tenant` reads and updates settings for the Tenant selected by the
client credential. It is a singleton resource: methods do not accept a Tenant
ID. The asynchronous client exposes the same operation names; await each
method.

## Overview [#overview]

Settings contain a display `name` and nullable `quota`. `quota=None` means no
configured monthly quota. Within a quota, either monthly ceiling may be `None`
to disable that measure; `reset_day` is required and ranges from 1 through 28.

Tenant name and quota are Tenant configuration. Unlike Agents, Sessions,
Tasks, and usage records, they do not carry `user_id` or metadata and cannot
be attributed to an End-user.

`client.tenant` does not expose identity lookup or credential management.
[`GET /v1/me`](/api-reference/rest-api/tenant#get-current-identity) requires a
dashboard JWT, and Tenant API-key creation, rotation, and revocation are
dashboard-only.

Every method accepts `extra_headers: Mapping[str, str] | None` and
`timeout: Timeout`.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`get()`](#get) | Read the authenticated Tenant's settings | `TenantSettings` |
| [`update()`](#update) | Update the name or complete quota configuration | `TenantSettings` |

## Methods [#methods]

### `get()` [#get]

**Signature:** `get(*, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> TenantSettings`

Returns the complete settings for the authenticated Tenant.

```python
settings = client.tenant.get()
print(settings.name, settings.quota)
```

Only standard authentication and service errors apply. See
[`GET /v1/tenant`](/api-reference/rest-api/tenant#get-tenant-settings).

### `update()` [#update]

**Signature:** `update(*, name: str = ..., quota: QuotaUpdate | None = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> TenantSettings`

Changes the supplied Tenant display name, quota, or both. Omission leaves a
top-level field unchanged. A supplied quota is a complete replacement; pass
`quota=None` to remove it. Supplying no mutable field raises `ValueError`
locally. `name` must contain 1–80 characters and cannot be blank after
trimming.

`QuotaUpdate` requires all three keys:

| Key | Type | Meaning |
| --- | --- | --- |
| `monthly_token_limit` | `int \| None` | Positive token ceiling; `None` disables it |
| `monthly_request_limit` | `int \| None` | Positive Turn ceiling; `None` disables it |
| `reset_day` | `int` | Monthly reset day, 1–28 |

```python
settings = client.tenant.update(
    quota={
        "monthly_token_limit": 1_000_000,
        "monthly_request_limit": None,
        "reset_day": 1,
    }
)
```

Passing a non-dictionary quota or omitting or adding any `QuotaUpdate` key
raises `TypeError` locally. Server failures include `validation_failed` for an
invalid name, non-positive ceiling, or invalid reset day. See
[`PATCH /v1/tenant`](/api-reference/rest-api/tenant#update-tenant-settings).

## Quota semantics [#quota-semantics]

A quota is a Tenant-set operational safety ceiling, not a billing
entitlement, plan limit, credit balance, or invoice meter. With no quota, or
with one measure set to `None`, that measure is unlimited. The server checks
current-window usage before execution, fails open when no quota exists, and
does not stop an in-flight Turn that crosses a ceiling; concurrent Turns may
overshoot.

An ordinary Turn rejected at the gate receives `quota_exceeded`. A Task run
also has a preflight before Session creation and then the ordinary Turn gate;
a denied Task run ends as `blocked`, not `failed`.

## Response model [#response-model]

`TenantSettings` exposes `name: str` and `quota: Quota | None`. `Quota`
exposes `monthly_token_limit`, `monthly_request_limit`, and `reset_day`.
These are Pydantic v2 models that preserve unknown server fields. The
top-level `TenantSettings` carries a non-serialized `_request_id`.

## Async, errors, and request correlation [#async-errors-and-request-correlation]

Async Tenant operations keep the same names:

```python
current = await async_client.tenant.get()
updated = await async_client.tenant.update(name="Acme Agents")
```

API failures raise `APIStatusError`; connection and timeout failures raise
`APIConnectionError` and `APITimeoutError`. Inspect `error.request_id` on a
failure or `settings._request_id` on a successful response. The SDK performs
no automatic retries. Use
`client.with_options(client_request_id="tenant-settings-update")` to send a
stable `X-Client-Request-Id` on these resource requests. See [Client errors and response
observation](/sdk/python/client#errors).

## Related [#related]

- [Tenancy and End-user Attribution](/platform/tenancy-and-attribution)
- [Usage and quotas](/platform/usage-and-quotas)
- [REST Tenant](/api-reference/rest-api/tenant)
- [TypeScript Tenant](/sdk/typescript/tenant)
