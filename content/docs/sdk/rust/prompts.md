---
title: Prompts
description: Save reusable message templates and run them with variables, using the Rust SDK.
---

# Prompts

`client.prompts()` saves reusable message templates. Run one through the generation methods with `SavedPrompt`.

Examples receive a `client: blazing_agents::Client`. Every call also takes the `with_timeout`, `without_timeout`, `with_header`, and `with_client_request_id` transport options.

In a route that serves a signed-in end user, call these methods on the [scoped client](/sdk/rust/client#for-user) from `client.for_user()`, which returns only that user's prompts. The tenant client sees every user's prompts and is for your backend's administration. A turn on a `UserClient` can run only that user's saved prompts; a tenant-level prompt fails with `not_found` there.

```rust
use blazing_agents::generation::SavedPrompt;

let user = client.for_user("user_0123456789abcdef")?;
let prompt = user
    .prompts()
    .create("Greeting", "Greet {{name}} in one sentence.")
    .await?;
let answer = user
    .completion(
        "ag_0123456789abcdef",
        SavedPrompt::new(&prompt.id).var("name", "Ada"),
    )
    .await?;
println!("{answer}");
```

## Templates and variables [#templates-and-variables]

A template is text with `{{variable}}` placeholders, within the [prompt field limits](/api-reference/protocols/service-limits#prompt-fields). The created prompt lists the placeholder names in `variables`, in first-seen order. `SavedPrompt::new(id).var(name, value)` supplies the values when you run it; missing or unknown variables fail with `prompt_variable_missing` or `prompt_variable_unknown`.

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

Saves a prompt. `name` is within the [prompt field limits](/api-reference/protocols/service-limits#prompt-fields), and prompts can share one.

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
| `user_id` | `impl Into<String>` | The end user the prompt belongs to; a `UserClient` sets its own user. Fixed after creation |
| `metadata` | `Metadata` | Your own data |

Awaiting returns [`Prompt`](#prompt). Fails with `Error::Api` whose code is [`validation_failed`](/api-reference/protocols/errors#validation_failed) or [`not_found`](/api-reference/protocols/errors#not_found).

### `list()` [#list]

Lists prompts, newest first. Without filters the tenant client returns every prompt, and a `UserClient` returns every prompt of its user.

```rust
let user = client.for_user("user_0123456789abcdef")?;
let page = user
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
| `limit` | `u8` | Page size, within the [prompt page limit](/api-reference/protocols/service-limits#prompt-page) |

Awaiting returns [`Page<Prompt>`](#prompt); `.items()` and `.pages()` walk every page lazily. Fails with `validation_failed`, [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor), or `not_found` when a `UserClient` filters by an agent it does not own.

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
| `name(name)` | A new display name, within the [prompt field limits](/api-reference/protocols/service-limits#prompt-fields) |
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
