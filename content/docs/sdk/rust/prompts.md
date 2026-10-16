---
title: Prompts
description: Save reusable message templates and run them with variables, using the Rust SDK.
---

# Prompts

`client.prompts()` saves reusable message templates. Run one through the generation methods with `SavedPrompt`.

Examples receive a `client: blazing_agents::Client`. Every call also takes the `with_timeout`, `without_timeout`, `with_header`, and `with_client_request_id` transport options.

```rust
use blazing_agents::generation::SavedPrompt;

let prompt = client
    .prompts()
    .create("Greeting", "Greet {{name}} in one sentence.")
    .await?;
let answer = client
    .completion(
        "ag_0123456789abcdef",
        SavedPrompt::new(&prompt.id).var("name", "Ada"),
    )
    .await?;
println!("{answer}");
```

## Templates and variables [#templates-and-variables]

A template is text with `{{variable}}` placeholders: up to 10,240 characters and up to 10 variables. The created prompt lists the placeholder names in `variables`, in first-seen order. `SavedPrompt::new(id).var(name, value)` supplies the values when you run it; missing or unknown variables fail with `prompt_variable_missing` or `prompt_variable_unknown`.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Save a prompt | [`Prompt`](#prompt) |
| [`list()`](#list) | List prompts | [`Page<Prompt>`](#prompt) |
| [`get()`](#get) | Get one prompt | [`Prompt`](#prompt) |
| [`update()`](#update) | Change a prompt | [`Prompt`](#prompt) |
| [`delete()`](#delete) | Permanently delete a prompt | `()` |

## Methods [#methods]

### `create()` [#create]

Saves a prompt. `name` is 1 to 80 characters and prompts can share one.

```rust
let prompt = client
    .prompts()
    .create("Release summary", "Summarize {{version}} for {{audience}}.")
    .agent_id("ag_0123456789abcdef")
    .await?;
```

**Signature:** `create(name: impl Into<String>, template: impl Into<String>) -> Call<CreatePrompt>`

| Setter | Type | Description |
| --- | --- | --- |
| `agent_id` | `impl Into<AgentId>` | Links the prompt to an agent. Deleting that agent deletes the prompt |
| `user_id` | `impl Into<String>` | The end user the prompt belongs to. Fixed after creation |
| `metadata` | `Metadata` | Your own data |

Awaiting returns [`Prompt`](#prompt). Fails with `Error::Api` whose code is [`validation_failed`](/api-reference/protocols/errors#validation_failed) or [`not_found`](/api-reference/protocols/errors#not_found).

### `list()` [#list]

Lists prompts, newest first. Without filters it returns every prompt.

```rust
let page = client
    .prompts()
    .list()
    .agent_id("ag_0123456789abcdef")
    .await?;
```

**Signature:** `list() -> Call<ListPrompts>`

| Setter | Type | Description |
| --- | --- | --- |
| `user_id` | `impl Into<String>` | Only prompts of this end user; `""` selects tenant-level prompts |
| `agent_id` | `impl Into<AgentId>` | Only prompts linked to this agent |
| `limit` | `u8` | Page size, 1 to 100; defaults to 50 |

Awaiting returns [`Page<Prompt>`](#prompt); `.items()` and `.pages()` walk every page lazily. Fails with `validation_failed` or [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor).

### `get()` [#get]

Gets one prompt.

```rust
let prompt = client.prompts().get("prompt_0123456789abcdef").await?;
```

**Signature:** `get(prompt_id: impl Into<PromptId>) -> Call<GetPrompt>`

Awaiting returns [`Prompt`](#prompt). Fails with `validation_failed` or `not_found`.

### `update()` [#update]

Changes a prompt in place. Setters you do not call keep their values, and a new template recomputes `variables`.

```rust
let prompt = client
    .prompts()
    .update("prompt_0123456789abcdef")
    .template("Summarize {{version}} briefly.")
    .await?;
```

**Signature:** `update(prompt_id: impl Into<PromptId>) -> Call<UpdatePrompt>`

| Setter | Description |
| --- | --- |
| `agent_id(agent_id)` | Links the prompt to an agent |
| `clear_agent_id()` | Removes the agent link |
| `name(name)` | A new display name, 1 to 80 characters |
| `template(template)` | A new template; `variables` is recomputed |
| `metadata(metadata)` | Replaces the metadata completely |

Awaiting returns [`Prompt`](#prompt). Fails with `validation_failed` or `not_found`.

### `delete()` [#delete]

Permanently deletes a prompt. Transcripts keep the text it produced.

```rust
client.prompts().delete("prompt_0123456789abcdef").await?;
```

**Signature:** `delete(prompt_id: impl Into<PromptId>) -> Call<DeletePrompt>`

Fails with `validation_failed` or `not_found`.

## Response models [#response-models]

### `Prompt` [#prompt]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `PromptId` | Prompt ID (`prompt_...`) |
| `tenant_id` | `TenantId` | Your tenant ID |
| `agent_id` | `Option<AgentId>` | The linked agent, if any |
| `name` | `String` | Display name |
| `template` | `String` | The template text |
| `variables` | `Vec<String>` | The placeholder names, in first-seen order |
| `user_id` | `String` | End user, or `""` for tenant level |
| `metadata` | `Metadata` | Your own data |
| `created_at`, `updated_at` | `Timestamp` | Timestamps |

## Next [#next]

- [Prompts guide](/agents/prompts)
- [Client](/sdk/rust/client)
