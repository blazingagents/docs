---
title: Skills
description: Create, upload, inspect, iterate, edit, copy, and delete Agent-owned Skills with the Python SDK.
---

# Skills

`client.agent(agent_id).skills` manages reusable capability directories owned
by one Agent. Select the Agent once, then create, inspect, copy, or edit its
Skills without repeating the owner ID. Postgres stores each Skill's metadata
and R2 stores its authoritative files; no Workspace Container is initialized.
The asynchronous client exposes the same scoped shape and operation names.
Await request methods and use `async for` for lazy iteration.

## Overview [#overview]

A Skill requires root `SKILL.md` frontmatter with `name` and `description`.
Its indexed metadata inherits the Agent's Attribution. Supporting files use
safe relative paths. Skills are current resources outside Agent Versions;
copying creates an independent Skill for each destination Agent.

Lists use opaque cursor pagination. Uploads accept bytes, paths, and open
binary files. The SDK opens and closes filesystem paths itself, but never
closes caller-owned file objects. Every request accepts
`extra_headers: Mapping[str, str] | None` and the exported `Timeout` type
(`float | httpx.Timeout | None`).

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create a Skill from `SKILL.md` | `SkillDetail` |
| [`upload()`](#upload) | Import a complete archive | `SkillDetail` |
| [`list()`](#list) | Read one Skill page | `SkillsPage` |
| [`iter()`](#iter) | Lazily iterate Skill pages | `Iterator[Skill]` |
| [`get()`](#get) | Retrieve metadata and files | `SkillDetail` |
| [`delete()`](#delete) | Delete a Skill and its files | `None` |
| [`read_file()`](#read-file) | Read exact file bytes | `bytes` |
| [`replace_file()`](#replace-file) | Create or replace one file | `SkillDetail` |
| [`delete_file()`](#delete-file) | Delete one supporting file | `SkillDetail` |
| [`copy()`](#copy) | Copy independently to destination Agents | `list[SkillCopyResult]` |

## Methods [#methods]

### `create()` [#create]

**Signature:** `create(*, path: Literal["SKILL.md"], content: str, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> SkillDetail`

Creates a one-file Skill for an Agent. `path` must be exactly `"SKILL.md"`;
any other value raises `ValueError` before a request is sent. The API validates
and indexes the frontmatter atomically.

```python
skills = client.agent(agent.id).skills
skill = skills.create(
    path="SKILL.md",
    content=(
        "---\n"
        "name: release-notes\n"
        "description: Draft release notes.\n"
        "---\n"
        "# Release notes\n"
    ),
)
```

Returns [`SkillDetail`](#skill-and-skilldetail). Server failures include
`validation_failed`, `agent_not_found`, `skill_invalid_markdown`,
`skill_name_conflict`, and `skill_limit_reached`. See
[`POST /v1/agents/:agentId/skills`](/api-reference/rest-api/skills#create-skill).

### `upload()` [#upload]

**Signature:** `upload(*, archive_type: SkillArchiveType, file: UploadFile, filename: str | None = None, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> SkillDetail`

Imports a complete `zip`, `tar`, or `tar.gz` archive with `SKILL.md` at its
root. `file` accepts `bytes`, a string or `PathLike` filesystem path, or an
open binary file. The SDK closes only files that it opens for a supplied path;
caller-owned file objects stay open. A path supplies its own name, and a file
object uses `.name` when available. `filename` overrides either one; bytes and
unnamed file objects otherwise use `skill.<archive_type>`.

```python
from pathlib import Path

skills = client.agent(agent.id).skills
skill = skills.upload(
    archive_type="tar.gz",
    file=Path("release-notes.tar.gz"),
)
```

Returns [`SkillDetail`](#skill-and-skilldetail). An unsupported archive type
raises `ValueError`. Server failures include `validation_failed`,
`agent_not_found`, `skill_invalid_archive`, `skill_invalid_markdown`,
`skill_name_conflict`, `skill_limit_reached`, `skill_too_many_files`, and
`skill_uncompressed_too_large`. See
[`POST .../skills/upload`](/api-reference/rest-api/skills#upload-skill).

### `list()` [#list]

**Signature:** `list(*, cursor: str = ..., limit: int = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> SkillsPage`

Returns one page for the owning Agent. `limit` defaults to 50 and accepts 1
through 100. `cursor` is the opaque `next_cursor` from a prior page.

```python
skills = client.agent(agent.id).skills
page = skills.list(limit=50)
if page.next_cursor is not None:
    next_page = skills.list(cursor=page.next_cursor)
```

The page contains `data: list[Skill]` and `next_cursor: str | None`. Server
failures include `validation_failed`, `invalid_cursor`, and `agent_not_found`.
See [`GET /v1/agents/:agentId/skills`](/api-reference/rest-api/skills#list-skills).

### `iter()` [#iter]

**Signature:** `iter(*, cursor: str = ..., limit: int = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Iterator[Skill]`

Returns a lazy iterator. No request is made until iteration starts; later pages
are requested only when needed.

```python
for skill in client.agent(agent.id).skills.iter(limit=50):
    print(skill.name)

# AsyncBlazingAgents uses the same name.
async_skills = async_client.agent(agent.id).skills
async for skill in async_skills.iter(limit=50):
    print(skill.name)
```

The asynchronous return is `AsyncIterator[Skill]`; do not `await` the iterator
factory. Page requests can raise the same errors as [`list()`](#list).

### `get()` [#get]

**Signature:** `get(*, skill_id: str, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> SkillDetail`

Retrieves indexed metadata and the current file inventory. Server failures
include `validation_failed` and `skill_not_found`. See
[`GET /v1/agents/:agentId/skills/:skillId`](/api-reference/rest-api/skills#get-skill).

### `delete()` [#delete]

**Signature:** `delete(*, skill_id: str, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> None`

Permanently deletes the Skill resource and all R2-backed files. There is no
detach step. Returns `None`; failures include `validation_failed` and
`skill_not_found`. See
[`DELETE /v1/agents/:agentId/skills/:skillId`](/api-reference/rest-api/skills#delete-skill).

### `read_file()` [#read-file]

**Signature:** `read_file(*, skill_id: str, path: str, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> bytes`

Reads exact bytes without text decoding. `path` is a non-empty safe relative
path beneath the Skill directory, including `"SKILL.md"`.

```python
skills = client.agent(agent.id).skills
script = skills.read_file(
    skill_id=skill.id,
    path="scripts/deploy.sh",
)
```

Server failures include `validation_failed` and `skill_not_found`. See
[`GET .../files/*`](/api-reference/rest-api/skills#get-skill-file).

### `replace_file()` [#replace-file]

**Signature:** `replace_file(*, skill_id: str, path: str, content: bytes, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> SkillDetail`

Creates or replaces one file from exact `bytes`. Replacing `SKILL.md`
validates its frontmatter and atomically refreshes indexed metadata while
preserving the Skill ID.

```python
skills = client.agent(agent.id).skills
skill = skills.replace_file(
    skill_id=skill.id,
    path="scripts/deploy.sh",
    content=b"#!/bin/sh\nset -eu\n",
)
```

Returns the updated [`SkillDetail`](#skill-and-skilldetail). Failures include
`validation_failed`, `skill_not_found`, `skill_invalid_markdown`,
`skill_name_conflict`, `skill_too_many_files`, and
`skill_uncompressed_too_large`. See
[`PUT .../files/*`](/api-reference/rest-api/skills#put-skill-file).

### `delete_file()` [#delete-file]

**Signature:** `delete_file(*, skill_id: str, path: str, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> SkillDetail`

Deletes a supporting file and returns the updated inventory. Deleting an
absent supporting file is idempotent; root `SKILL.md` cannot be deleted.
Failures include `invalid_request`, `validation_failed`, and
`skill_not_found`. See
[`DELETE .../files/*`](/api-reference/rest-api/skills#delete-skill-file).

### `copy()` [#copy]

**Signature:** `copy(*, skill_id: str, destination_agent_ids: Sequence[str], extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> list[SkillCopyResult]`

Copies the source Skill independently to 1 through 30 unique destination
Agents. Results preserve destination order. A destination failure does not
roll back successful copies and appears as a `"failed"` result instead of
raising the whole request.

```python
skills = client.agent(agent.id).skills
results = skills.copy(
    skill_id=skill.id,
    destination_agent_ids=[destination_agent.id],
)
for result in results:
    if result.status == "created":
        print(result.skill.id)
    else:
        print(result.error.code)
```

Request-level failures include `validation_failed` and `skill_not_found`. See
[`POST .../copies`](/api-reference/rest-api/skills#copy-skill).

## Response types [#response-types]

### `Skill` and `SkillDetail` [#skill-and-skilldetail]

| Field | Type | Detail only | Description |
| --- | --- | --- | --- |
| `id` | `str` | no | Skill ID (`skill_…`) |
| `tenant_id` | `str` | no | Owning Tenant ID |
| `agent_id` | `str` | no | Owner Agent ID |
| `name` | `str` | no | Indexed frontmatter name |
| `description` | `str` | no | Indexed frontmatter description |
| `metadata` | `dict[str, str] \| None` | no | Optional indexed frontmatter metadata |
| `created_at` | `datetime` | no | Time created |
| `updated_at` | `datetime` | no | Time last updated |
| `files` | `list[SkillFile]` | yes | Current path and byte-size inventory |

`SkillFile` contains `path: str` and `size_bytes: int`. `SkillsPage` contains
`data: list[Skill]` and `next_cursor: str | None`.

Each copy result is either `SkillCopyCreated` with `status == "created"` and a
`skill`, or `SkillCopyFailed` with `status == "failed"` and an `error` holding
`code`, `message`, and optional `details`. Responses are strict Pydantic v2
models that retain unknown server fields.

## Errors [#errors]

Request failures raise subclasses of `BlazingAgentsError`. Branch on stable
`code`, not the message.

| Code | Meaning |
| --- | --- |
| `skill_not_found` | The Skill is unavailable under the supplied Agent |
| `skill_invalid_markdown` | `SKILL.md` frontmatter is missing or invalid |
| `skill_invalid_archive` | Archive format or contents are invalid or unsafe |
| `skill_name_conflict` | The Agent already owns a Skill with that name |
| `skill_limit_reached` | The Agent already has 100 Skills |
| `skill_too_many_files` | The Skill would exceed 100 files |
| `skill_uncompressed_too_large` | The Skill would exceed 10 MiB |
| `invalid_cursor` | The list cursor is unusable |
| `validation_failed` | IDs, paths, options, or bodies are invalid |

See [Python errors](/sdk/python/client#errors).

## Related [#related]

- [REST Skills](/api-reference/rest-api/skills)
- [Skills capability](/agents/skills)
- [Create an Agent Skill](/agents/skills)
- [Workspaces](/sdk/python/workspaces)
