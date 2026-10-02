---
title: Skills
description: Create, upload, edit, copy, and delete an agent's skills with the Python SDK.
---

# Skills

`client.agent(agent_id).skills` manages the skills one agent owns. A skill is a folder of instructions and supporting files, led by a `SKILL.md`, that the agent loads when a task calls for it. Select the agent once, then work with its skills without repeating the ID. Saved agent configuration does not copy skill files. Existing sessions use current skill content.

Examples assume `client = BlazingAgents()` and an existing `agent`. Every method also accepts `extra_headers` and `timeout`. On `AsyncBlazingAgents`, `client.agent(agent_id).skills` has the same method names; await them and use `async for` with `iter()`.

```python
skills = client.agent(agent.id).skills
skill = skills.create(
    path="SKILL.md",
    content=(
        "---\n"
        "name: release-notes\n"
        "description: Draft release notes from merged pull requests.\n"
        "---\n"
        "# Release notes\n"
        "Group changes by feature, fix, and breaking change.\n"
    ),
)
print(skill.id, skill.name)
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create a skill from a `SKILL.md` | `SkillDetail` |
| [`upload()`](#upload) | Import a skill archive | `SkillDetail` |
| [`list()`](#list) | Get one page of skills | `SkillsPage` |
| [`iter()`](#iter) | Iterate every skill | `Iterator[Skill]` |
| [`get()`](#get) | Get a skill and its file list | `SkillDetail` |
| [`delete()`](#delete) | Delete a skill and its files | `None` |
| [`read_file()`](#read-file) | Read one file's bytes | `bytes` |
| [`replace_file()`](#replace-file) | Create or replace one file | `SkillDetail` |
| [`delete_file()`](#delete-file) | Delete one supporting file | `SkillDetail` |
| [`copy()`](#copy) | Copy a skill to other agents | `list[SkillCopyResult]` |

## Methods [#methods]

### `create()` [#create]

Creates a one-file skill from `SKILL.md` content.

```python
skill = client.agent(agent.id).skills.create(
    path="SKILL.md",
    content="---\nname: triage\ndescription: Sort incoming tickets.\n---\n# Triage\n",
)
```

**Signature:** `create(*, path: Literal["SKILL.md"], content: str) -> SkillDetail`

`path` must be `"SKILL.md"`; any other value raises `ValueError` before any request. The frontmatter needs a `name` (lowercase letters, digits, and hyphens, up to 64 characters, not `anthropic` or `claude`) and a `description` (up to 1,024 characters). The name must be unique among the agent's skills.

Returns [`SkillDetail`](#skill-and-skilldetail). Raises `APIStatusError` with [`validation_failed`](/api-reference/protocols/errors#validation_failed), `agent_not_found`, [`skill_invalid_markdown`](/api-reference/protocols/errors#skill_invalid_markdown), [`skill_name_conflict`](/api-reference/protocols/errors#skill_name_conflict), or [`skill_limit_reached`](/api-reference/protocols/errors#skill_limit_reached).

### `upload()` [#upload]

Imports a complete skill from a `zip`, `tar`, or `tar.gz` archive with `SKILL.md` at its root.

```python
from pathlib import Path

skill = client.agent(agent.id).skills.upload(
    archive_type="tar.gz",
    file=Path("release-notes.tar.gz"),
)
```

**Signature:** `upload(*, archive_type: SkillArchiveType, file: UploadFile, filename: str | None = None) -> SkillDetail`

`file` is bytes, a file path, or an open binary file. The SDK opens and closes paths itself and never closes a file object you pass. `filename` overrides the name taken from a path or file object; otherwise bytes are sent as `skill.<archive_type>`. An unsupported `archive_type` raises `ValueError`.

Returns [`SkillDetail`](#skill-and-skilldetail). Raises `validation_failed`, `agent_not_found`, [`skill_invalid_archive`](/api-reference/protocols/errors#skill_invalid_archive), `skill_invalid_markdown`, `skill_name_conflict`, `skill_limit_reached`, [`skill_too_many_files`](/api-reference/protocols/errors#skill_too_many_files), or [`skill_uncompressed_too_large`](/api-reference/protocols/errors#skill_uncompressed_too_large).

### `list()` [#list]

Gets one page of the agent's skills.

```python
page = client.agent(agent.id).skills.list(limit=50)
```

**Signature:** `list(*, cursor=..., limit=...) -> SkillsPage`

`limit` is 1 to 100 and defaults to 50. Pass the previous page's `next_cursor` as `cursor`. Returns `SkillsPage` with `data: list[Skill]` and `next_cursor: str | None`. Raises `validation_failed`, [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor), or `agent_not_found`.

### `iter()` [#iter]

Iterates every skill, fetching pages as you go.

```python
for skill in client.agent(agent.id).skills.iter():
    print(skill.name, skill.description)
```

**Signature:** `iter(*, cursor=..., limit=...) -> Iterator[Skill]`

No request is sent until you start iterating. On the async client, use `async for` directly on `iter(...)`; do not await it. Each page request can raise the same errors as [`list()`](#list).

### `get()` [#get]

Gets a skill with its current file list.

```python
skill = client.agent(agent.id).skills.get(skill_id=skill.id)
for file in skill.files:
    print(file.path, file.size_bytes)
```

**Signature:** `get(*, skill_id: str) -> SkillDetail`

Returns [`SkillDetail`](#skill-and-skilldetail). Raises `validation_failed` or [`skill_not_found`](/api-reference/protocols/errors#skill_not_found).

### `delete()` [#delete]

Permanently deletes a skill and all its files.

```python
client.agent(agent.id).skills.delete(skill_id=skill.id)
```

**Signature:** `delete(*, skill_id: str) -> None`

Raises `validation_failed` or `skill_not_found`.

### `read_file()` [#read-file]

Reads one file's exact bytes.

```python
script = client.agent(agent.id).skills.read_file(
    skill_id=skill.id,
    path="scripts/deploy.sh",
)
```

**Signature:** `read_file(*, skill_id: str, path: str) -> bytes`

`path` is a relative path inside the skill, such as `"SKILL.md"` or `"scripts/deploy.sh"`. Raises `validation_failed` or `skill_not_found`.

### `replace_file()` [#replace-file]

Creates or replaces one file.

```python
skill = client.agent(agent.id).skills.replace_file(
    skill_id=skill.id,
    path="scripts/deploy.sh",
    content=b"#!/bin/sh\nset -eu\n",
)
```

**Signature:** `replace_file(*, skill_id: str, path: str, content: bytes) -> SkillDetail`

Replacing `SKILL.md` re-reads its frontmatter and updates the skill's name and description; the skill ID stays the same.

Returns the updated [`SkillDetail`](#skill-and-skilldetail). Raises `validation_failed`, `skill_not_found`, `skill_invalid_markdown`, `skill_name_conflict`, `skill_too_many_files`, or `skill_uncompressed_too_large`.

### `delete_file()` [#delete-file]

Deletes one supporting file.

```python
skill = client.agent(agent.id).skills.delete_file(
    skill_id=skill.id,
    path="scripts/deploy.sh",
)
```

**Signature:** `delete_file(*, skill_id: str, path: str) -> SkillDetail`

Deleting a file that does not exist succeeds. You cannot delete `SKILL.md`. Returns the updated [`SkillDetail`](#skill-and-skilldetail). Raises [`invalid_request`](/api-reference/protocols/errors#invalid_request), `validation_failed`, or `skill_not_found`.

### `copy()` [#copy]

Copies a skill to other agents. Each copy is independent of the original.

```python
results = client.agent(agent.id).skills.copy(
    skill_id=skill.id,
    destination_agent_ids=["ag_0123456789abcdef"],
)
for result in results:
    if result.status == "created":
        print(result.agent_id, result.skill.id)
    else:
        print(result.agent_id, result.error.code)
```

**Signature:** `copy(*, skill_id: str, destination_agent_ids: Sequence[str]) -> list[SkillCopyResult]`

Pass 1 to 30 unique agent IDs. Results come back in the same order. A failed destination does not undo the others; it appears as a `"failed"` result instead of raising. The whole call raises only `validation_failed` or `skill_not_found`.

## Response types [#response-types]

### `Skill` and `SkillDetail` [#skill-and-skilldetail]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `str` | Skill ID (`skill_...`) |
| `tenant_id` | `str` | Your tenant ID |
| `agent_id` | `str` | Owning agent |
| `name` | `str` | Name from the frontmatter |
| `description` | `str` | Description from the frontmatter |
| `metadata` | `dict[str, str] \| None` | Optional `metadata` from the frontmatter |
| `created_at`, `updated_at` | `datetime` | Timestamps |
| `files` | `list[SkillFile]` | `SkillDetail` only: each file's `path` and `size_bytes` |

A copy result is either `SkillCopyCreated` (`status == "created"`, with `agent_id` and `skill`) or `SkillCopyFailed` (`status == "failed"`, with `agent_id` and an `error` holding `code`, `message`, and optional `details`).

## Errors [#errors]

| Code | Meaning |
| --- | --- |
| `skill_not_found` | The skill does not belong to this agent |
| `skill_invalid_markdown` | `SKILL.md` frontmatter is missing or invalid |
| `skill_invalid_archive` | The archive is invalid or contains unsafe paths |
| `skill_name_conflict` | The agent already has a skill with that name |
| `skill_limit_reached` | The agent already has 100 skills |
| `skill_too_many_files` | The skill would have more than 100 files |
| `skill_uncompressed_too_large` | The skill would exceed 10 MiB |

## Next [#next]

- [Skills guide](/agents/skills)
- [Workspaces](/sdk/python/workspaces)
- [Client errors](/sdk/python/client#errors)
