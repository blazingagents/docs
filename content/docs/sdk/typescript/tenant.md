---
title: Tenant
description: Read and change your tenant's name, monthly quota, model spending limit, and billing switch with the TypeScript SDK.
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
| [`getSpendingLimit()`](#get-spending-limit) | Read the account's model spending limit | `SpendingLimitResponse` |
| [`updateSpendingLimit()`](#update-spending-limit) | Set or turn off the account's model spending limit | `SpendingLimitResponse` |

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

### `getSpendingLimit()` [#get-spending-limit]

Reads the account's model spending limit and the current period.

**Signature:** `getSpendingLimit(input?: ResourceRequestOptions): Promise<SpendingLimitResponse>`

```typescript
const { spendingLimit, period, nextResetAt } = await client.tenant.getSpendingLimit();
console.log(spendingLimit?.amountUsd, period?.availableUsd, nextResetAt);
```

Returns [`SpendingLimitResponse`](#spendinglimitresponse).

### `updateSpendingLimit()` [#update-spending-limit]

Sets the account's dollar allowance for model tokens, or turns it off with `spendingLimit: null`. The limit covers every agent.

**Signature:** `updateSpendingLimit(input: { spendingLimit: SpendingLimit | null } & ResourceRequestOptions): Promise<SpendingLimitResponse>`

```typescript
await client.tenant.updateSpendingLimit({
  spendingLimit: { amountUsd: 25, resetStartDate: "2026-10-01", resetInterval: "monthly" },
});
```

| `SpendingLimit` field | Type | Description |
| --- | --- | --- |
| `amountUsd` | `number` | Dollars per period, above zero |
| `resetStartDate` | `string` | UTC date (`YYYY-MM-DD`) that anchors the resets |
| `resetInterval` | `"daily" \| "weekly" \| "biweekly" \| "monthly"` | How often the allowance resets |

See [model spending limits](/platform/usage-and-quotas#model-spending-limits) for how resets, schedule changes, and stops work. A [user-scoped client](/sdk/typescript/client#for-user) gets [`forbidden`](/api-reference/protocols/errors#forbidden). Returns [`SpendingLimitResponse`](#spendinglimitresponse). Errors: [`validation_failed`](/api-reference/protocols/errors#validation_failed).

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

### `SpendingLimitResponse` [#spendinglimitresponse]

```typescript
interface SpendingLimitResponse {
  spendingLimit: SpendingLimit | null;
  period: {
    startsAt: string;
    endsAt: string;
    spentUsd: number;
    reservedUsd: number;
    availableUsd: number;
  } | null;
  nextResetAt: string | null;
}
```

`spendingLimit`, `period`, and `nextResetAt` are `null` while no limit is set. See [what the dollar fields mean](/platform/usage-and-quotas#spending-limit-costs).

## Next [#next]

- [Usage and quotas](/platform/usage-and-quotas)
- [Usage reference](/sdk/typescript/usage)
- [Monetization](/platform/monetization)
