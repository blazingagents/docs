---
title: Tenant
description: Read and change your tenant's name, monthly quota, and billing switch with the TypeScript SDK.
---

# Tenant

`client.tenant` reads and changes settings for the tenant your API key belongs to: its name, an optional monthly quota that stops new turns past a ceiling, and whether usage is billed to your end users. It takes no tenant ID, because a key belongs to exactly one tenant.

```typescript
const settings = await client.tenant.patch({
  quota: { monthlyTokenLimit: 1_000_000, monthlyRequestLimit: null, resetDay: 1 },
});
console.log(settings.quota);
```

Every method takes one input object and accepts an optional `abortSignal`.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`get()`](#get) | Read your tenant's settings | `TenantSettingsResponse` |
| [`patch()`](#patch) | Change the name, quota, or billing switch | `TenantSettingsResponse` |

## Methods [#methods]

### `get()` [#get]

Reads your tenant's settings.

**Signature:** `get(input?: ResourceRequestOptions): Promise<TenantSettingsResponse>`

```typescript
const settings = await client.tenant.get();
console.log(settings.name, settings.quota?.monthlyTokenLimit);
```

Returns [`TenantSettingsResponse`](#tenantsettingsresponse).

### `patch()` [#patch]

Changes one or more settings.

**Signature:** `patch(input: UpdateTenantSettingsBody & ResourceRequestOptions): Promise<TenantSettingsResponse>`

```typescript
await client.tenant.patch({ quota: null });
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | no | 1 to 80 characters |
| `quota` | `Quota \| null` | no | The whole monthly quota; `null` removes it |
| `monetizationEnabled` | `boolean` | no | Bill usage to your end users through your merchant account |

Pass at least one field; the ones you leave out stay as they are. A `quota` replaces the whole quota, so send all three of its fields:

| `Quota` field | Type | Description |
| --- | --- | --- |
| `monthlyTokenLimit` | `number \| null` | Tokens per month; `null` for no token limit |
| `monthlyRequestLimit` | `number \| null` | Turns per month; `null` for no turn limit |
| `resetDay` | `number` | Day of the month, 1 to 28, when the count starts over |

At least one limit must be a positive number. Once usage passes a limit, new turns fail with [`quota_exceeded`](/api-reference/protocols/errors#quota_exceeded) and task runs end as `blocked`; turns already running finish. See [Usage and quotas](/platform/usage-and-quotas#quota-and-capacity-outcomes).

Turning `monetizationEnabled` off drops usage events your merchant has not yet accepted. See [Monetization](/platform/monetization) before you change it.

Returns [`TenantSettingsResponse`](#tenantsettingsresponse). Errors: [`validation_failed`](/api-reference/protocols/errors#validation_failed).

## Response types [#response-types]

### `TenantSettingsResponse` [#tenantsettingsresponse]

```typescript
interface TenantSettingsResponse {
  name: string;
  quota: Quota | null;
  monetizationEnabled: boolean;
  deletion: { requestedAt: string; deletesAt: string } | null;
}

interface Quota {
  monthlyTokenLimit: number | null;
  monthlyRequestLimit: number | null;
  resetDay: number;
}
```

`quota` is `null` when you have not set one, so usage is unlimited. `deletion` is set when someone has asked to delete the tenant from the dashboard; `deletesAt` is when that happens, and it can be cancelled until then.

## Next [#next]

- [Usage and quotas](/platform/usage-and-quotas)
- [Usage reference](/sdk/typescript/usage)
- [Monetization](/platform/monetization)
