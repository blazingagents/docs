---
title: Skills
description: Create, upload, edit, copy, and delete an agent's skills with the Rust SDK.
---

# Skills

`client.agent(agent_id).skills()` manages one agent's skills: instruction packs with a `SKILL.md` frontmatter file and any supporting files.

Examples receive a `client: blazing_agents::Client`. Every call also takes the `with_timeout`, `without_timeout`, `with_header`, and `with_client_request_id` transport options.

In a route that serves a signed-in end user, call these methods on the [scoped client](/sdk/rust/client#for-user) from `client.for_user()`, which reaches only the skills of that user's agents; another user's agent fails with `not_found`. The tenant client reaches every agent and is for your backend's administration.

```rust
let skill = client
    .agent("ag_0123456789abcdef")
    .skills()
    .create(
        "SKILL.md",
        "---\nname: refund-policy\ndescription: Answer refund questions.\n---\n\nQuote the matching rule.\n",
    )
    .await?;
println!("{} {}", skill.id, skill.name);
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create a skill from its `SKILL.md` | [`SkillDetail`](#skill-and-skilldetail) |
| [`upload()`](#upload) | Create a skill from an archive | [`SkillDetail`](#skill-and-skilldetail) |
| [`list()`](#list) | List the agent's skills | [`Page<Skill>`](#skill-and-skilldetail) |
| [`get()`](#get) | Get one skill with its files | [`SkillDetail`](#skill-and-skilldetail) |
| [`delete()`](#delete) | Permanently delete a skill | `()` |
| [`read_file()`](#read-file) | Stream one file | `Download` |
| [`replace_file()`](#replace-file) | Create or replace one file | [`SkillDetail`](#skill-and-skilldetail) |
| [`delete_file()`](#delete-file) | Delete one file | [`SkillDetail`](#skill-and-skilldetail) |
| [`copy()`](#copy) | Copy the skill to other agents | `Vec<SkillCopyResult>` |

## Methods [#methods]

### `create()` [#create]

Creates a skill from its `SKILL.md`. `path` must be `SKILL.md`, and `content` must start with YAML frontmatter that sets `name` and `description`.

```rust
let skill = client
    .agent("ag_0123456789abcdef")
    .skills()
    .create(
        "SKILL.md",
        "---\nname: refund-policy\ndescription: Answer refund questions.\n---\n\nQuote the matching rule.\n",
    )
    .await?;
```

**Signature:** `create(path: impl Into<String>, content: impl Into<String>) -> Call<CreateSkill>`

Awaiting returns [`SkillDetail`](#skill-and-skilldetail). Fails with `Error::Api` whose code is [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`skill_invalid_markdown`](/api-reference/protocols/errors#skill_invalid_markdown), [`skill_name_conflict`](/api-reference/protocols/errors#skill_name_conflict), [`skill_limit_reached`](/api-reference/protocols/errors#skill_limit_reached), or [`not_found`](/api-reference/protocols/errors#not_found) when the agent does not exist.

### `upload()` [#upload]

Creates a skill from an archive that contains `SKILL.md` at its root.

```rust
use blazing_agents::files::Upload;
use blazing_agents::skills::ArchiveType;

let skill = client
    .agent("ag_0123456789abcdef")
    .skills()
    .upload(ArchiveType::TarGz, Upload::file("refund-policy.tar.gz").await?)
    .await?;
```

**Signature:** `upload(archive_type: ArchiveType, archive: Upload) -> Call<UploadSkill>`

`ArchiveType` is `Zip`, `Tar`, or `TarGz`. The part's file name defaults to `skill.<archive type>` such as `skill.tar.gz`; set `Upload::file_name` to send another.

Awaiting returns [`SkillDetail`](#skill-and-skilldetail). Fails with `validation_failed`, [`skill_invalid_archive`](/api-reference/protocols/errors#skill_invalid_archive), `skill_invalid_markdown`, `skill_name_conflict`, `skill_limit_reached`, [`skill_too_many_files`](/api-reference/protocols/errors#skill_too_many_files), or [`skill_uncompressed_too_large`](/api-reference/protocols/errors#skill_uncompressed_too_large), and `not_found` when the agent does not exist.

### `list()` [#list]

Lists the agent's skills, newest first, without their files.

```rust
let user = client.for_user("user_0123456789abcdef")?;
let page = user.agent("ag_0123456789abcdef").skills().list().await?;
for skill in &page.data {
    println!("{} {}", skill.id, skill.name);
}
```

**Signature:** `list() -> Call<ListSkills>`

| Setter | Type | Description |
| --- | --- | --- |
| `limit` | `u8` | Page size, within the [skill page limit](/api-reference/protocols/service-limits#skill-page) |

Awaiting returns [`Page<Skill>`](#skill-and-skilldetail); `.items()` and `.pages()` walk every page lazily. Fails with `validation_failed`, [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor), or `not_found` when the agent does not exist.

### `get()` [#get]

Gets one skill, with its files.

```rust
let skill = client
    .agent("ag_0123456789abcdef")
    .skills()
    .get("skill_0123456789abcdef")
    .await?;
```

**Signature:** `get(skill_id: impl Into<SkillId>) -> Call<GetSkill>`

Awaiting returns [`SkillDetail`](#skill-and-skilldetail). Fails with `validation_failed` or [`skill_not_found`](/api-reference/protocols/errors#skill_not_found).

### `delete()` [#delete]

Permanently deletes a skill and all its files.

```rust
client
    .agent("ag_0123456789abcdef")
    .skills()
    .delete("skill_0123456789abcdef")
    .await?;
```

**Signature:** `delete(skill_id: impl Into<SkillId>) -> Call<DeleteSkill>`

Fails with `validation_failed` or `skill_not_found`.

### `read_file()` [#read-file]

Streams one file of a skill. `path` is relative to the skill's root, such as `policy.md` or `scripts/refund.sh`.

```rust
let file = client
    .agent("ag_0123456789abcdef")
    .skills()
    .read_file("skill_0123456789abcdef", "policy.md")
    .await?;
let bytes = file.bytes().await?;
```

**Signature:** `read_file(skill_id: impl Into<SkillId>, path: impl Into<String>) -> Call<GetSkillFile>`

Awaiting returns a `Download`. Read it to memory with `bytes()`, or pull chunks off it as a `Stream` of `Result<Bytes>`; `content_type()`, `content_length()`, and `meta()` describe the response, and dropping it closes the connection. Fails with `validation_failed` or `skill_not_found`.

### `replace_file()` [#replace-file]

Creates or replaces the file at `path` and returns the updated skill. Replacing `SKILL.md` rereads its frontmatter, so the skill's `name`, `description`, and `metadata` follow it.

```rust
use blazing_agents::files::Upload;

let skill = client
    .agent("ag_0123456789abcdef")
    .skills()
    .replace_file(
        "skill_0123456789abcdef",
        "policy.md",
        Upload::file("policy.md").await?,
    )
    .await?;
```

**Signature:** `replace_file(skill_id: impl Into<SkillId>, path: impl Into<String>, content: Upload) -> Call<PutSkillFile>`

Awaiting returns [`SkillDetail`](#skill-and-skilldetail). Fails with `validation_failed`, `skill_invalid_markdown`, `skill_name_conflict`, [`skill_too_many_files`](/api-reference/protocols/errors#skill_too_many_files), [`skill_uncompressed_too_large`](/api-reference/protocols/errors#skill_uncompressed_too_large), or `skill_not_found`.

### `delete_file()` [#delete-file]

Deletes the file at `path` and returns the updated skill. Deleting a file that does not exist succeeds. `SKILL.md` cannot be deleted; delete the skill instead.

```rust
let skill = client
    .agent("ag_0123456789abcdef")
    .skills()
    .delete_file("skill_0123456789abcdef", "policy.md")
    .await?;
```

**Signature:** `delete_file(skill_id: impl Into<SkillId>, path: impl Into<String>) -> Call<DeleteSkillFile>`

Awaiting returns [`SkillDetail`](#skill-and-skilldetail). Fails with [`invalid_request`](/api-reference/protocols/errors#invalid_request), `validation_failed`, or `skill_not_found`.

### `copy()` [#copy]

Copies the skill, with all its files, to each agent in `agent_ids`, each listed once, within the [copy destination limit](/api-reference/protocols/service-limits#skill-copy). Each copy is a new skill with its own ID.

```rust
let results = client
    .agent("ag_0123456789abcdef")
    .skills()
    .copy("skill_0123456789abcdef", ["ag_abcdef0123456789"])
    .await?;
```

**Signature:** `copy(skill_id: impl Into<SkillId>, agent_ids: impl IntoIterator<Item = impl Into<AgentId>>) -> Call<CopySkill>`

Awaiting returns `Vec<SkillCopyResult>` in request order. A `Created` result carries the destination `agent_id` and the new `SkillDetail`; a `Failed` result carries the `agent_id` and a `SkillCopyError` with `code`, `message`, and `details`, so one bad destination does not fail the call. The call itself fails only with `validation_failed` or `skill_not_found`.

## Response models [#response-models]

### `Skill` and `SkillDetail` [#skill-and-skilldetail]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `SkillId` | Skill ID (`skill_...`) |
| `tenant_id` | `TenantId` | Your tenant ID |
| `agent_id` | `AgentId` | The agent that owns the skill |
| `name` | `String` | Name from `SKILL.md` frontmatter |
| `description` | `String` | What the skill does, from the frontmatter |
| `metadata` | `Option<BTreeMap<String, String>>` | The frontmatter `metadata` map, if set |
| `files` | `Vec<SkillFile>` | Only on `SkillDetail`: the skill's files, each with `path` and `size_bytes` |
| `created_at`, `updated_at` | `Timestamp` | Timestamps |

## Errors [#errors]

| Code | Meaning |
| --- | --- |
| `skill_not_found` | The skill does not belong to this agent |
| `skill_invalid_markdown` | `SKILL.md` frontmatter is missing or invalid |
| `skill_invalid_archive` | The archive is invalid or contains unsafe paths |
| `skill_name_conflict` | The agent already has a skill with that name |
| `skill_limit_reached` | The agent already has 100 skills |
| `skill_too_many_files` | The skill would have more files than the [skill bundle limit](/api-reference/protocols/service-limits#skill-bundle) allows |
| `skill_uncompressed_too_large` | The skill would exceed the [skill bundle size limit](/api-reference/protocols/service-limits#skill-bundle) |

## Next [#next]

- [Skills guide](/agents/skills)
- [Agents](/sdk/rust/agents)
