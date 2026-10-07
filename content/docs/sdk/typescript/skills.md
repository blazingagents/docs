---
title: Skills
description: Create, upload, read, edit, copy, and delete an agent's skills with the TypeScript SDK.
---

# Skills

`client.agent({ agentId }).skills` manages the skills one agent owns. A skill is a folder with a `SKILL.md` file at its root and any supporting files, and the agent loads it only when a task calls for it. To learn how skills work and how to write one, read [Skills](/agents/skills).

```typescript
import { readFile } from "node:fs/promises";

const skills = client.agent({ agentId }).skills;
const skill = await skills.upload({
  source: { file: await readFile("release-notes.zip"), type: "zip" },
});
console.log(skill.name, skill.files);
```

Select the agent once, then call every method on the returned `skills` object. Each method takes one input object and accepts an optional `abortSignal`. Managing skills does not touch the agent's workspace.

## Limits [#limits]

- An agent can own up to 100 skills, and skill names are unique per agent.
- A skill holds up to 100 files and 10 MiB in total. An uploaded archive is at most 10 MiB.
- `SKILL.md` starts with YAML frontmatter. `name` (lowercase letters, digits, and single hyphens, up to 64 characters) and `description` (up to 1,024 characters) are required. `license`, `compatibility`, `metadata`, and `allowed-tools` are optional.
- File paths are relative, such as `scripts/deploy.sh`, without `.` or `..` segments.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create a skill from `SKILL.md` text | `SkillDetail` |
| [`upload()`](#upload) | Create a skill from an archive | `SkillDetail` |
| [`list()`](#list) | List the agent's skills | `SkillsListResponse` |
| [`get()`](#get) | Read a skill and its file list | `SkillDetail` |
| [`getFile()`](#get-file) | Download one file | `Uint8Array` |
| [`putFile()`](#put-file) | Add or replace one file | `SkillDetail` |
| [`deleteFile()`](#delete-file) | Delete one supporting file | `SkillDetail` |
| [`copy()`](#copy) | Copy a skill to other agents | `SkillCopyResults` |
| [`delete()`](#delete) | Delete a skill and its files | `void` |

## Methods [#methods]

### `create()` [#create]

Creates a skill from the text of its `SKILL.md`.

**Signature:** `create(input: CreateSkillBody & ResourceRequestOptions): Promise<SkillDetail>`

```typescript
const skill = await client.agent({ agentId }).skills.create({
  path: "SKILL.md",
  content: "---\nname: deploy\ndescription: Deploy the application.\n---\n\nRun scripts/deploy.sh.\n",
});
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `path` | `"SKILL.md"` | yes | Always `"SKILL.md"` |
| `content` | `string` | yes | The file text, starting with frontmatter |

Add supporting files afterwards with [`putFile()`](#put-file). Returns [`SkillDetail`](#skilldetail). Errors: [`skill_invalid_markdown`](/api-reference/protocols/errors#skill_invalid_markdown), [`skill_name_conflict`](/api-reference/protocols/errors#skill_name_conflict), [`skill_limit_reached`](/api-reference/protocols/errors#skill_limit_reached), [`validation_failed`](/api-reference/protocols/errors#validation_failed), and [`not_found`](/api-reference/protocols/errors#not_found) when the agent does not exist.

### `upload()` [#upload]

Creates a skill from a `zip`, `tar`, or `tar.gz` archive with `SKILL.md` at its root.

**Signature:** `upload(input: { source: { file: Blob | Uint8Array; type: SkillArchiveType } } & ResourceRequestOptions): Promise<SkillDetail>`

```typescript
import { readFile } from "node:fs/promises";

const skill = await client.agent({ agentId }).skills.upload({
  source: { file: await readFile("deploy.tar.gz"), type: "tar.gz" },
});
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `source.file` | `Blob \| Uint8Array` | yes | Archive bytes, at most 10 MiB |
| `source.type` | `"zip" \| "tar" \| "tar.gz"` | yes | Archive format |

Returns [`SkillDetail`](#skilldetail). Errors: `validation_failed`, [`skill_invalid_archive`](/api-reference/protocols/errors#skill_invalid_archive), `skill_invalid_markdown`, `skill_name_conflict`, `skill_limit_reached`, [`skill_too_many_files`](/api-reference/protocols/errors#skill_too_many_files), [`skill_uncompressed_too_large`](/api-reference/protocols/errors#skill_uncompressed_too_large), and `not_found` when the agent does not exist.

### `list()` [#list]

Lists the agent's skills.

**Signature:** `list(input?: SkillsListOptions): Promise<SkillsListResponse>`

```typescript
const { data, nextCursor } = await client.agent({ agentId }).skills.list();
```

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `limit` | `number` | no | `50` | 1 to 100 per page |
| `cursor` | `string` | no | none | `nextCursor` from the previous page |

Returns [`SkillsListResponse`](#skillslistresponse). Errors: `validation_failed`, [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor), `not_found`.

### `get()` [#get]

Reads a skill with its current file list.

**Signature:** `get(input: { skillId: string } & ResourceRequestOptions): Promise<SkillDetail>`

```typescript
const skill = await client.agent({ agentId }).skills.get({ skillId });
```

Returns [`SkillDetail`](#skilldetail). Errors: `validation_failed`, [`skill_not_found`](/api-reference/protocols/errors#skill_not_found).

### `getFile()` [#get-file]

Downloads one file as raw bytes.

**Signature:** `getFile(input: { path: string; skillId: string } & ResourceRequestOptions): Promise<Uint8Array>`

```typescript
const bytes = await client.agent({ agentId }).skills.getFile({
  skillId,
  path: "SKILL.md",
});
console.log(new TextDecoder().decode(bytes));
```

Returns a `Uint8Array`. Decode text files yourself. Errors: `validation_failed`, `skill_not_found`.

### `putFile()` [#put-file]

Adds a file, or replaces it if the path exists.

**Signature:** `putFile(input: { content: Blob | string | Uint8Array; path: string; skillId: string } & ResourceRequestOptions): Promise<SkillDetail>`

```typescript
const skill = await client.agent({ agentId }).skills.putFile({
  skillId,
  path: "scripts/deploy.sh",
  content: "#!/bin/sh\nset -eu\n",
});
```

Replacing `SKILL.md` also updates the skill's name and description from the new frontmatter. Returns the updated [`SkillDetail`](#skilldetail). Errors: `validation_failed`, `skill_not_found`, `skill_invalid_markdown`, `skill_name_conflict`, `skill_too_many_files`, `skill_uncompressed_too_large`.

### `deleteFile()` [#delete-file]

Deletes one supporting file. Deleting a path that does not exist succeeds.

**Signature:** `deleteFile(input: { path: string; skillId: string } & ResourceRequestOptions): Promise<SkillDetail>`

```typescript
const skill = await client.agent({ agentId }).skills.deleteFile({
  skillId,
  path: "scripts/deploy.sh",
});
```

You cannot delete `SKILL.md`; that fails with [`invalid_request`](/api-reference/protocols/errors#invalid_request). Delete the whole skill instead. Returns the updated [`SkillDetail`](#skilldetail). Errors: `invalid_request`, `validation_failed`, `skill_not_found`.

### `copy()` [#copy]

Copies a skill to other agents. Each copy is independent of the original.

**Signature:** `copy(input: { skillId: string; to: { agentIds: string[] } } & ResourceRequestOptions): Promise<SkillCopyResults>`

```typescript
const results = await client.agent({ agentId }).skills.copy({
  skillId,
  to: { agentIds: [otherAgentId] },
});
for (const result of results) {
  if (result.status === "failed") console.warn(result.agentId, result.error.code);
}
```

`to.agentIds` lists 1 to 30 different agents. One failed destination does not stop the others, so check each result. Results come back in the order you listed the agents. Returns [`SkillCopyResults`](#skillcopyresults). Errors for the whole call: `validation_failed`, `skill_not_found`.

### `delete()` [#delete]

Deletes a skill and all its files.

**Signature:** `delete(input: { skillId: string } & ResourceRequestOptions): Promise<void>`

```typescript
await client.agent({ agentId }).skills.delete({ skillId });
```

Errors: `validation_failed`, `skill_not_found`.

## Response types [#response-types]

### `Skill` and `SkillDetail` [#skilldetail]

| Field | Type | In `Skill` | Description |
| --- | --- | --- | --- |
| `id` | `string` | yes | Skill ID (`skill_…`) |
| `tenantId` | `string` | yes | Your tenant ID |
| `agentId` | `string` | yes | The agent that owns it |
| `name` | `string` | yes | Name from the frontmatter |
| `description` | `string` | yes | Description from the frontmatter |
| `metadata` | `Record<string, string> \| undefined` | yes | `metadata` from the frontmatter, if any |
| `createdAt` | `string` | yes | ISO 8601 timestamp |
| `updatedAt` | `string` | yes | ISO 8601 timestamp |
| `files` | `{ path: string; sizeBytes: number }[]` | no | Every file in the skill |

`list()` returns `Skill` summaries. Methods that return one skill return a `SkillDetail`, which adds `files`.

### `SkillsListResponse` [#skillslistresponse]

```typescript
interface SkillsListResponse {
  data: Skill[];
  nextCursor: string | null;
}
```

### `SkillCopyResults` [#skillcopyresults]

```typescript
type SkillCopyResult =
  | { agentId: string; status: "created"; skill: SkillDetail }
  | {
      agentId: string;
      status: "failed";
      error: { code: string; message: string; details?: unknown };
    };

type SkillCopyResults = SkillCopyResult[];
```

## Errors [#errors]

Failures throw [`BlazingAgentsError`](/sdk/typescript/client#errors). The skill-specific codes:

| Code | Meaning |
| --- | --- |
| `skill_not_found` | This agent has no such skill |
| `skill_invalid_markdown` | `SKILL.md` frontmatter is missing or invalid |
| `skill_invalid_archive` | The archive format or contents are invalid or unsafe |
| `skill_name_conflict` | The agent already has a skill with this name |
| `skill_limit_reached` | The agent already has 100 skills |
| `skill_too_many_files` | The skill would have more than 100 files |
| `skill_uncompressed_too_large` | The skill would be larger than 10 MiB |

## Next [#next]

- [Skills](/agents/skills)
- [Agents reference](/sdk/typescript/agents)
