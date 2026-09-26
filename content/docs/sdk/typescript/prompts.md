---
title: Prompts
description: Save reusable prompt templates with variables and manage them with the TypeScript SDK.
---

# Prompts

`client.prompts` saves prompt templates you reuse across turns. Write `{{variable}}` placeholders in the template, then run it by passing its `promptId` and `variables` to `chat()`, `completion()`, or `object()`. To learn when a saved prompt helps, read [Prompts](/agents/prompts).

```typescript
const prompt = await client.prompts.create({
  name: "Release note",
  template: "Write a release note for {{feature}}.",
});

const result = await client.completion({
  agentId,
  promptId: prompt.id,
  variables: { feature: "faster search" },
});
console.log(await result.text);
```

Every method takes one input object and accepts an optional `abortSignal`.

## Templates [#templates]

- Variable names match `[A-Za-z_][A-Za-z0-9_]*`. A template has up to 10 different variables and 10,240 characters.
- Blazing Agents reads the variables from the template and returns them in `variables`.
- When you run a prompt, pass every variable and no others, or the turn fails with `prompt_variable_missing` or `prompt_variable_unknown`.
- Only the filled-in text is saved in the session, so editing or deleting a prompt later does not change past conversations.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Save a prompt | `PromptResponse` |
| [`list()`](#list) | List prompts | `PromptsResponse` |
| [`get()`](#get) | Read one prompt | `PromptResponse` |
| [`update()`](#update) | Change a prompt | `PromptResponse` |
| [`delete()`](#delete) | Delete a prompt | `void` |

## Methods [#methods]

### `create()` [#create]

Saves a prompt template.

**Signature:** `create(input: CreatePromptBody & ResourceRequestOptions): Promise<PromptResponse>`

```typescript
const prompt = await client.prompts.create({
  name: "Release note",
  template: "Write a release note for {{feature}} aimed at {{audience}}.",
  agentId,
});
```

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `name` | `string` | yes | — | 1 to 80 characters, unique in your tenant |
| `template` | `string` | yes | — | The template text |
| `agentId` | `string \| null` | no | `null` | Agent to link it to, for your own grouping |
| `userId` | `string` | no | `""` | The end user it belongs to; cannot change later |
| `metadata` | `Record<string, unknown>` | no | `{}` | Your labels |

Deleting the linked agent also deletes the prompt. Your tenant can hold up to 100 prompts. Returns [`PromptResponse`](#promptresponse). Errors: `validation_failed`, `prompt_name_conflict`, `prompt_limit_reached`, and `not_found` when the agent does not exist.

### `list()` [#list]

Lists your prompts, most recently updated first.

**Signature:** `list(input?: { userId?: string; agentId?: string } & ResourceRequestOptions): Promise<PromptsResponse>`

```typescript
const { prompts } = await client.prompts.list({ agentId });
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `userId` | `string` | no | Only this end user's prompts; `""` for tenant-level ones |
| `agentId` | `string` | no | Only prompts linked to this agent |

The result is not paginated. Returns `{ prompts: PromptResponse[] }`.

### `get()` [#get]

Reads one prompt.

**Signature:** `get(input: { promptId: string } & ResourceRequestOptions): Promise<PromptResponse>`

```typescript
const prompt = await client.prompts.get({ promptId });
console.log(prompt.variables);
```

Returns [`PromptResponse`](#promptresponse). Errors: `validation_failed`, `not_found`.

### `update()` [#update]

Changes a prompt's name, template, agent link, or metadata.

**Signature:** `update(input: UpdatePromptBody & { promptId: string } & ResourceRequestOptions): Promise<PromptResponse>`

```typescript
const prompt = await client.prompts.update({
  promptId,
  template: "Summarize {{feature}} for {{audience}}.",
});
```

Takes `promptId` plus any of `name`, `template`, `agentId`, and `metadata`, with at least one. Fields you leave out stay as they are; `metadata` replaces all metadata, and `agentId: null` removes the link. `userId` cannot change. The next turn that uses the prompt gets the new template.

Returns [`PromptResponse`](#promptresponse). Errors: `validation_failed`, `prompt_name_conflict`, `not_found`.

### `delete()` [#delete]

Deletes a prompt for good.

**Signature:** `delete(input: { promptId: string } & ResourceRequestOptions): Promise<void>`

```typescript
await client.prompts.delete({ promptId });
```

Errors: `validation_failed`, `not_found`.

## Response types [#response-types]

### `PromptResponse` [#promptresponse]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Prompt ID (`prompt_…`) |
| `tenantId` | `string` | Your tenant ID |
| `agentId` | `string \| null` | Linked agent, or `null` |
| `name` | `string` | Prompt name |
| `template` | `string` | The template text |
| `variables` | `string[]` | Variable names, in the order they first appear |
| `userId` | `string` | The end user it belongs to, or `""` |
| `metadata` | `Record<string, unknown>` | Your labels |
| `createdAt` | `string` | ISO 8601 timestamp |
| `updatedAt` | `string` | ISO 8601 timestamp |

`PromptsResponse` is `{ prompts: PromptResponse[] }`.

## Errors [#errors]

Failures throw [`BlazingAgentsError`](/sdk/typescript/client#errors). The prompt codes:

| Code | Meaning |
| --- | --- |
| `prompt_name_conflict` | Another prompt has this name |
| `prompt_limit_reached` | Your tenant already has 100 prompts |
| `prompt_variable_missing` | A turn left out one of the prompt's variables |
| `prompt_variable_unknown` | A turn passed a variable the template does not use |

## Next [#next]

- [Prompts](/agents/prompts)
- [Client generation methods](/sdk/typescript/client#generation-methods)
