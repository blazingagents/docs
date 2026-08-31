---
title: Prompts
description: Create, inspect, update, and delete reusable message Prompts with the Python SDK.
---

# Prompts

`client.prompts` manages Tenant-owned named message templates. The asynchronous
client exposes the same operation names; await each method.

## Overview [#overview]

Prompt placeholders use `{{variable}}`. The server trims names inside braces,
requires identifier-shaped names, de-duplicates them in first-seen order, and
returns that inferred inventory as `variables`. At invocation, pass
`prompt_id` and all and only the inferred `variables` to `chat()`,
`completion()`, or an object-generation operation instead of literal input.
Only rendered text enters a Session transcript, so later edits and deletion do
not change history.

Every resource method is keyword-only and accepts
`extra_headers: Mapping[str, str] | None` and `timeout: Timeout`.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create a reusable Prompt | `Prompt` |
| [`list()`](#list) | List Prompts, optionally by Attribution | `Prompts` |
| [`get()`](#get) | Retrieve one Prompt | `Prompt` |
| [`update()`](#update) | Change mutable Prompt fields | `Prompt` |
| [`delete()`](#delete) | Permanently delete a Prompt | `None` |

## Methods [#methods]

### `create()` [#create]

**Signature:** `create(*, name: str, template: str, user_id: str = ..., metadata: dict[str, object] = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Prompt`

Creates a Prompt. Omitted `user_id` becomes `""` (Tenant-level Attribution)
and omitted metadata becomes `{}`. `user_id` is immutable.

```python
prompt = client.prompts.create(
    name="Release summary",
    template="Summarize {{version}} for {{audience}}.",
    user_id="user-42",
)
print(prompt.variables)
```

Server failures include `validation_failed`, `prompt_name_conflict`, and
`prompt_limit_reached`. See
[`POST /v1/prompts`](/api-reference/rest-api/prompts#create-prompt).

### `list()` [#list]

**Signature:** `list(*, user_id: str = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Prompts`

Returns the unpaginated `Prompts` model with `prompts: list[Prompt]`. Omit
`user_id` for every Prompt or pass an exact value; `""` selects Tenant-level
Prompts. See [`GET /v1/prompts`](/api-reference/rest-api/prompts#list-prompts).

### `get()` [#get]

**Signature:** `get(*, prompt_id: str, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Prompt`

Retrieves one Prompt by its `prompt_…` ID. Failures include
`validation_failed` and `not_found`. See
[`GET /v1/prompts/:promptId`](/api-reference/rest-api/prompts#get-prompt).

### `update()` [#update]

**Signature:** `update(*, prompt_id: str, name: str = ..., template: str = ..., metadata: dict[str, object] = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Prompt`

Changes any supplied mutable field. Omission leaves a field unchanged;
metadata is a complete replacement, and changing `template` recomputes
`variables`. Supplying no mutable field raises `ValueError` locally.

```python
prompt = client.prompts.update(
    prompt_id=prompt.id,
    template="Summarize {{version}} for {{audience}} in {{tone}} tone.",
    metadata={"purpose": "release"},
)
```

Server failures include `validation_failed`, `prompt_name_conflict`, and
`not_found`. See
[`PATCH /v1/prompts/:promptId`](/api-reference/rest-api/prompts#update-prompt).

### `delete()` [#delete]

**Signature:** `delete(*, prompt_id: str, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> None`

Permanently deletes the Prompt and returns `None`. Previously rendered
transcripts remain unchanged. See
[`DELETE /v1/prompts/:promptId`](/api-reference/rest-api/prompts#delete-prompt).

## Invocation [#invocation]

```python
result = client.completion(
    agent_id="ag_0123456789abcdef",
    prompt_id=prompt.id,
    variables={"version": "2.4", "audience": "developers", "tone": "direct"},
)
print(str(result))
```

Literal input and Prompt invocation are mutually exclusive. Missing variables
produce `prompt_variable_missing`; unknown variables produce
`prompt_variable_unknown`.

## Response model and errors [#response-model-and-errors]

`Prompt` exposes `id`, `tenant_id`, `name`, `template`, `variables`,
`user_id`, `metadata`, `created_at`, and `updated_at`. It is a Pydantic v2
model that preserves unknown server fields and carries a non-serialized
`_request_id`.

API failures raise `APIStatusError`; connection and timeout failures raise
`APIConnectionError` and `APITimeoutError`. Inspect the exception or response
model request ID for correlation. See [Client errors and response
observation](/sdk/python/client#errors).

## Related [#related]

- [Prompt capability](/agents/prompts)
- [Python generation](/sdk/python/client)
- [REST Prompts](/api-reference/rest-api/prompts)
- [TypeScript Prompts](/sdk/typescript/prompts)
