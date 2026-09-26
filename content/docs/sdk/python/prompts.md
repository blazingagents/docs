---
title: Prompts
description: Save reusable message templates and run them with variables, using the Python SDK.
---

# Prompts

`client.prompts` saves message templates with `{{variable}}` placeholders, so your code sends a prompt ID and values instead of building the text each time. You can change a template without redeploying the code that uses it.

Examples assume `client = BlazingAgents()` and an `agent_id`. Every method also accepts `extra_headers` and `timeout`. On `AsyncBlazingAgents`, await the same method names.

```python
prompt = client.prompts.create(
    name="Release summary",
    template="Summarize {{version}} for {{audience}}.",
)
result = client.completion(
    agent_id=agent_id,
    prompt_id=prompt.id,
    variables={"version": "2.4", "audience": "developers"},
)
print(prompt.variables, str(result))
```

## Templates and variables [#templates-and-variables]

Write placeholders as `{{name}}`. Names are trimmed and must look like identifiers. The prompt's `variables` field lists each name once, in the order it first appears. A template holds up to 10 variables and 10 KiB of text.

To run a prompt, pass `prompt_id` and `variables` to [`chat()`](/sdk/python/client#chat), [`completion()`](/sdk/python/client#completion), or [`object()`](/sdk/python/client#object) instead of a literal message or prompt. Supply exactly the names in `variables`: a missing one raises `prompt_variable_missing` and an extra one raises `prompt_variable_unknown`. Only the filled-in text is stored in the session, so editing or deleting the prompt later does not change past transcripts.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Save a prompt | `Prompt` |
| [`list()`](#list) | List prompts | `Prompts` |
| [`get()`](#get) | Get one prompt | `Prompt` |
| [`update()`](#update) | Change a prompt | `Prompt` |
| [`delete()`](#delete) | Delete a prompt | `None` |

## Methods [#methods]

### `create()` [#create]

Saves a prompt template.

```python
prompt = client.prompts.create(
    name="Onboarding welcome",
    template="Welcome {{customer}} and explain {{feature}}.",
    agent_id=agent_id,
    user_id="customer_123",
)
```

**Signature:** `create(*, name: str, template: str, agent_id=..., user_id=..., metadata=...) -> Prompt`

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | `str` | required | 1 to 80 characters, unique in your tenant |
| `template` | `str` | required | Text with `{{variable}}` placeholders |
| `agent_id` | `str \| None` | `None` | Link the prompt to one agent. Deleting that agent deletes the prompt |
| `user_id` | `str` | `""` | End user; `""` means tenant level. Fixed after creation |
| `metadata` | `dict[str, object]` | `{}` | Your own data |

Returns [`Prompt`](#prompt). Raises `APIStatusError` with `validation_failed`, `prompt_name_conflict`, `prompt_limit_reached` (100 prompts per tenant), or `not_found` for an unknown `agent_id`.

### `list()` [#list]

Lists your prompts.

```python
prompts = client.prompts.list(agent_id=agent_id).prompts
```

**Signature:** `list(*, agent_id=..., user_id=...) -> Prompts`

Omit both filters for every prompt. `user_id=""` returns tenant-level prompts. With both filters you get prompts that match both. Returns `Prompts`, whose `prompts` field is `list[Prompt]`. The list is not paginated.

### `get()` [#get]

Gets one prompt.

```python
prompt = client.prompts.get(prompt_id=prompt.id)
```

**Signature:** `get(*, prompt_id: str) -> Prompt`

Returns [`Prompt`](#prompt). Raises `validation_failed` or `not_found`.

### `update()` [#update]

Changes a prompt's name, template, agent link, or metadata.

```python
prompt = client.prompts.update(
    prompt_id=prompt.id,
    template="Summarize {{version}} for {{audience}} in a {{tone}} tone.",
)
```

**Signature:** `update(*, prompt_id: str, agent_id=..., name=..., template=..., metadata=...) -> Prompt`

Omitted parameters keep their current value. A new `template` recomputes `variables`. `agent_id=None` removes the agent link. `metadata` replaces the current value completely. Calling `update()` with nothing to change raises `ValueError` before any request.

Returns [`Prompt`](#prompt). Raises `validation_failed`, `prompt_name_conflict`, or `not_found`.

### `delete()` [#delete]

Permanently deletes a prompt. Past transcripts keep the text it produced.

```python
client.prompts.delete(prompt_id=prompt.id)
```

**Signature:** `delete(*, prompt_id: str) -> None`

Raises `validation_failed` or `not_found`.

## Response models [#response-models]

### `Prompt` [#prompt]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `str` | Prompt ID (`prompt_...`) |
| `tenant_id` | `str` | Your tenant ID |
| `name` | `str` | Name |
| `template` | `str` | Template text |
| `variables` | `list[str]` | Placeholder names, in first-seen order |
| `agent_id` | `str \| None` | Linked agent, or `None` |
| `user_id` | `str` | End user, or `""` for tenant level |
| `metadata` | `dict[str, object]` | Your own data |
| `created_at`, `updated_at` | `datetime` | Timestamps |

## Next [#next]

- [Prompts guide](/agents/prompts)
- [Client generation methods](/sdk/python/client#generation-methods)
- [Agents](/sdk/python/agents)
