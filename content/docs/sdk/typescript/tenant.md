---
title: Tenant
description: Read and update Tenant display settings and soft quota configuration.
---

# Tenant

`client.tenant` reads and updates settings for the Tenant authenticated by the client credential. It is a singleton resource: methods do not accept a Tenant ID.

## Overview [#overview]

Settings contain a display `name` and nullable `quota`. `quota: null` means no configured monthly quota. Within a quota, either token or request limit may be `null` to disable that measure; `resetDay` is always required and ranges from 1 through 28.

`client.tenant` does not expose identity lookup. [`GET /v1/me`](/api-reference/rest-api/tenant#get-current-identity) requires a dashboard JWT and has no backend SDK method.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`get()`](#get) | Read the authenticated Tenant's settings | `TenantSettingsResponse` |
| [`patch()`](#patch) | Update its name or complete quota configuration | `TenantSettingsResponse` |

## Methods [#methods]

### `get()` [#get]

Returns the complete settings for the authenticated Tenant.

**Signature:** `get(): Promise<TenantSettingsResponse>`

```typescript
const settings = await client.tenant.get();
```

Returns [`TenantSettingsResponse`](#tenantsettingsresponse). Only standard authentication and service errors apply. See [`GET /v1/tenant`](/api-reference/rest-api/tenant#get-tenant-settings).

### `patch()` [#patch]

Changes the Tenant display name, quota, or both. Omitted top-level fields remain unchanged. A supplied quota is a complete replacement; pass `quota: null` to remove it.

**Signature:** `patch(body: UpdateTenantSettingsBody): Promise<TenantSettingsResponse>`

| Body field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | no | Display name, 1–80 characters |
| `quota` | `Quota \| null` | no | Complete monthly quota, or `null` to clear it |
| `quota.monthlyTokenLimit` | `number \| null` | with `quota` | Positive integer ceiling; `null` disables it |
| `quota.monthlyRequestLimit` | `number \| null` | with `quota` | Positive integer ceiling; `null` disables it |
| `quota.resetDay` | `number` | with `quota` | Integer from 1 through 28 |

At least one top-level body field is required.

```typescript
const settings = await client.tenant.patch({
  quota: {
    monthlyTokenLimit: 1_000_000,
    monthlyRequestLimit: null,
    resetDay: 1,
  },
});
```

Returns [`TenantSettingsResponse`](#tenantsettingsresponse). Raises `validation_failed` for an empty body, invalid name, non-positive limit, or reset day outside 1–28. See [`PATCH /v1/tenant`](/api-reference/rest-api/tenant#update-tenant-settings).

## Response types [#response-types]

### `Quota` [#quota]

```typescript
interface Quota {
  monthlyTokenLimit: number | null;
  monthlyRequestLimit: number | null;
  resetDay: number;
}
```

### `TenantSettingsResponse` [#tenantsettingsresponse]

```typescript
interface TenantSettingsResponse {
  name: string;
  quota: Quota | null;
}
```

`UpdateTenantSettingsBody` is `{ name?: string; quota?: Quota | null }` with at least one field. See the canonical [Tenant settings schema](/api-reference/protocols/objects-and-schemas#tenant-settings-response).

## Errors [#errors]

SDK request failures throw `BlazingAgentsError`. Branch on its stable `code`, not its message.

| Code | Applies to | Action |
| --- | --- | --- |
| `validation_failed` | `patch()` | Supply at least one valid setting and a complete valid quota |

Authentication, transport, malformed-response, and service failures may also throw. See [SDK errors](/api-reference/protocols/errors).

## End-to-end workflow [#end-to-end-workflow]

Read the current singleton settings, configure a quota while leaving the name unchanged, and inspect the result:

```typescript
import { BlazingAgents } from "@blazing-agents/sdk";

const client = new BlazingAgents({ apiKey: process.env.BLAZING_AGENTS_API_KEY! });

const current = await client.tenant.get();
const updated = await client.tenant.patch({
  quota: {
    monthlyTokenLimit: 1_000_000,
    monthlyRequestLimit: 10_000,
    resetDay: 1,
  },
});

console.log({
  nameUnchanged: updated.name === current.name,
  monthlyTokenLimit: updated.quota?.monthlyTokenLimit,
});
```

To clear the quota later:

```typescript
await client.tenant.patch({ quota: null });
```

## Related [#related]

- [Tenancy and end-user Attribution](/platform/tenancy-and-attribution)
- [Security and credentials](/platform/security-and-credentials)
- [Build a multi-tenant application](/platform/tenancy-and-attribution)
- [REST Tenant](/api-reference/rest-api/tenant)
