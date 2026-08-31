---
title: Prompts
description: Manage reusable Prompt templates and invoke them from generation helpers.
---

# Prompts

`client.prompts` manages tenant-owned named message templates. Variables are inferred from `{{variable}}` placeholders and supplied only when invoking the Prompt.

## Overview [#overview]

Prompt names are unique within a Tenant. A Prompt belongs either to the Tenant (`userId: ""`) or to an attributed End-user; Attribution is set at creation and cannot be changed. Metadata and template content remain mutable.

Templates may contain up to 10 variables. Variable names must match `[A-Za-z_][A-Za-z0-9_]*`. Updating a template recomputes the returned `variables` array. Prompt records are not retained in transcripts; only their rendered text enters a generation or Session transcript.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create a reusable Prompt | `PromptResponse` |
| [`list()`](#list) | List all or filter by exact `userId` | `PromptsResponse` |
| [`get()`](#get) | Retrieve one Prompt | `PromptResponse` |
| [`update()`](#update) | Change a Prompt's name, template, or metadata | `PromptResponse` |
| [`delete()`](#delete) | Permanently delete a Prompt | `void` |

## Methods [#methods]

### `create()` [#create]

Creates a Prompt and infers its variable names from the template.

**Signature:** `create(body: CreatePromptBody): Promise<PromptResponse>`

| Body field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | yes | Tenant-unique display name, 1–80 characters |
| `template` | `string` | yes | Non-empty template, up to 10,240 characters and 10 variables |
| `userId` | `string` | no | End-user Attribution; defaults to `""` |
| `metadata` | `Record<string, unknown>` | no | Mutable metadata; defaults to `{}` |

```typescript
const prompt = await client.prompts.create({
  name: "Release note",
  template: "Write a release note for {{feature}}.",
  userId: "user-42",
  metadata: { channel: "changelog" },
});
```

Returns [`PromptResponse`](#promptresponse). Raises `validation_failed` for invalid input, `prompt_name_conflict` for a duplicate name, or `prompt_limit_reached` at the Tenant cap. See [`POST /v1/prompts`](/api-reference/rest-api/prompts#create-prompt).

### `list()` [#list]

Lists Prompts by most recent update. Omit `userId` to list every Prompt or pass an exact value; `""` selects Tenant-level Prompts.

**Signature:** `list(userId?: string): Promise<PromptsResponse>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `userId` | `string` | no | Exact Attribution filter |

```typescript
const { prompts } = await client.prompts.list("user-42");
```

Returns `{ prompts: PromptResponse[] }`. Only standard authentication and service errors apply. See [`GET /v1/prompts`](/api-reference/rest-api/prompts#list-prompts).

### `get()` [#get]

Retrieves one Prompt by its `prompt_…` ID.

**Signature:** `get(promptId: string): Promise<PromptResponse>`

```typescript
const prompt = await client.prompts.get(promptId);
```

Returns [`PromptResponse`](#promptresponse). Raises `validation_failed` for a malformed ID or `not_found` when the Prompt is unavailable. See [`GET /v1/prompts/:promptId`](/api-reference/rest-api/prompts#get-prompt).

### `update()` [#update]

Changes a Prompt in place. Omitted fields remain unchanged, and `userId` cannot be updated.

**Signature:** `update(promptId: string, body: UpdatePromptBody): Promise<PromptResponse>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `promptId` | `string` | yes | Prompt ID (`prompt_…`) |
| `body.name` | `string` | no | New Tenant-unique name |
| `body.template` | `string` | no | New template; recomputes `variables` |
| `body.metadata` | `Record<string, unknown>` | no | Complete replacement metadata |

At least one body field is required.

```typescript
const prompt = await client.prompts.update(promptId, {
  template: "Summarize {{feature}} for the {{audience}}.",
});
```

Returns [`PromptResponse`](#promptresponse). Raises `validation_failed` for invalid or empty input, `prompt_name_conflict` for a duplicate name, or `not_found` when unavailable. See [`PATCH /v1/prompts/:promptId`](/api-reference/rest-api/prompts#update-prompt).

### `delete()` [#delete]

Permanently deletes a Prompt. Previously rendered transcripts remain unchanged.

**Signature:** `delete(promptId: string): Promise<void>`

```typescript
await client.prompts.delete(promptId);
```

Returns `void`. Raises `validation_failed` for a malformed ID or `not_found` when the Prompt is unavailable. See [`DELETE /v1/prompts/:promptId`](/api-reference/rest-api/prompts#delete-prompt).

## Response types [#response-types]

### `PromptResponse` [#promptresponse]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Prompt ID (`prompt_…`) |
| `tenantId` | `string` | Owning Tenant ID (`ten_…`) |
| `name` | `string` | Tenant-unique display name |
| `template` | `string` | Unrendered template |
| `variables` | `string[]` | Inferred, de-duplicated variable names in template order |
| `userId` | `string` | Immutable End-user Attribution; `""` means Tenant-level |
| `metadata` | `Record<string, unknown>` | Mutable metadata |
| `createdAt` | `string` | ISO 8601 creation timestamp |
| `updatedAt` | `string` | ISO 8601 update timestamp |

`PromptsResponse` is `{ prompts: PromptResponse[] }`. See the canonical [Prompt schemas](/api-reference/protocols/objects-and-schemas#prompt-response).

## Errors [#errors]

SDK request failures throw `BlazingAgentsError`. Branch on its stable `code`, not its message.

| Code | Applies to | Action |
| --- | --- | --- |
| `validation_failed` | All mutations and ID lookups | Correct the indicated input |
| `prompt_name_conflict` | `create()`, `update()` | Choose a unique name |
| `prompt_limit_reached` | `create()` | Delete an unused Prompt or raise the Tenant cap |
| `not_found` | `get()`, `update()`, `delete()` | Check that the Prompt exists in this Tenant |
| `prompt_variable_missing` | Prompt invocation | Supply every inferred variable |
| `prompt_variable_unknown` | Prompt invocation | Remove variables not declared by the template |

See [SDK errors](/api-reference/protocols/errors).

## End-to-end workflow [#end-to-end-workflow]

Create a Prompt, invoke it through a generation helper, update it, then delete it:

```typescript
import { BlazingAgents } from "@blazing-agents/sdk";

const client = new BlazingAgents({ apiKey: process.env.BLAZING_AGENTS_API_KEY! });

const prompt = await client.prompts.create({
  name: "Release note",
  template: "Write a release note for {{feature}}.",
});

const result = await client.completion({
  agentId: "ag_0123456789abcdef",
  promptId: prompt.id,
  variables: { feature: "faster search" },
});
console.log(await result.text);

await client.prompts.update(prompt.id, {
  metadata: { purpose: "release" },
});
await client.prompts.delete(prompt.id);
```

## Related [#related]

- [Prompts](/agents/prompts)
- [Generate structured output](/agents/output/structured-output)
- [REST Prompts](/api-reference/rest-api/prompts)
