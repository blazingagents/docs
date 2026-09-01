---
title: Skills
description: Create, upload, inspect, copy, and edit Agent-owned Skills.
---

# Skills

`client.agent(agentId).skills` manages Skills owned by one Agent. Select the
Agent once, then create, inspect, copy, or edit its Skills without repeating the
owner ID. A Skill is a directory whose required root `SKILL.md` supplies its
name and description; supporting files can contain arbitrary bytes. Postgres
stores its metadata and R2 stores its authoritative files independently of
Workspaces. Skill creation and management do not initialize the Agent's
Workspace or Sandbox Container.

## Overview [#overview]

Every operation is scoped by the authenticated Tenant and the Agent selected
with `client.agent(agentId)`. Skill IDs use the `skill_…` format. File paths
must be safe, non-empty relative paths without `.` or `..` segments.

An Agent can own up to 100 Skills. A Skill can contain up to 100 files and 10 MiB uncompressed. Creating or replacing `SKILL.md` reparses strict YAML frontmatter; a Skill's name must be unique within its Agent.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create a Skill from `SKILL.md` | `SkillDetail` |
| [`upload()`](#upload) | Import a Skill archive | `SkillDetail` |
| [`list()`](#list) | List an Agent's Skills | `SkillsListResponse` |
| [`get()`](#get) | Retrieve metadata and file inventory | `SkillDetail` |
| [`getFile()`](#get-file) | Download raw file bytes | `Uint8Array` |
| [`putFile()`](#put-file) | Create or replace a file | `SkillDetail` |
| [`deleteFile()`](#delete-file) | Delete a supporting file | `SkillDetail` |
| [`copy()`](#copy) | Copy a Skill to destination Agents | `SkillCopyResults` |
| [`delete()`](#delete) | Delete a Skill and all files | `void` |

## Methods [#methods]

### `create()` [#create]

Creates a Skill from root Markdown with valid frontmatter.

**Signature:** `create(input: CreateSkillBody): Promise<SkillDetail>`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `path` | `"SKILL.md"` | yes | Required root filename |
| `content` | `string` | yes | Markdown beginning with accepted YAML frontmatter |

```typescript
const skills = client.agent(agentId).skills;
const skill = await skills.create({
  path: "SKILL.md",
  content: "---\nname: deploy\ndescription: Deploy the application.\n---\n",
});
```

Returns [`SkillDetail`](#skilldetail). Raises `skill_invalid_markdown`, `skill_name_conflict`, `skill_limit_reached`, `validation_failed`, or `not_found` for an unavailable Agent. See [`POST /v1/agents/:agentId/skills`](/api-reference/rest-api/skills#create-skill).

### `upload()` [#upload]

Imports a complete `zip`, `tar`, or `tar.gz` archive.

**Signature:** `upload(input: { source: { file: Blob | Uint8Array; type: SkillArchiveType } }): Promise<SkillDetail>`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `source.file` | `Blob \| Uint8Array` | yes | Archive bytes, at most 10 MiB |
| `source.type` | `"zip" \| "tar" \| "tar.gz"` | yes | Archive format |

```typescript
const skills = client.agent(agentId).skills;
const skill = await skills.upload({
  source: { file: archiveBytes, type: "tar.gz" },
});
```

Returns [`SkillDetail`](#skilldetail). Raises `skill_invalid_archive`, `skill_invalid_markdown`, `skill_name_conflict`, `skill_limit_reached`, `skill_too_many_files`, or `skill_uncompressed_too_large`. See [`POST /v1/agents/:agentId/skills/upload`](/api-reference/rest-api/skills#upload-skill).

### `list()` [#list]

Lists one Agent's Skills with opaque cursor pagination.

**Signature:** `list(options?: SkillsListOptions): Promise<SkillsListResponse>`

| Input field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `cursor` | `string` | no | — | Opaque cursor from the previous page |
| `limit` | `number` | no | `50` | Page size from 1 through 100 |

```typescript
const skills = client.agent(agentId).skills;
const page = await skills.list({ limit: 50 });
```

Returns [`SkillsListResponse`](#skillslistresponse). Raises `validation_failed`, `invalid_cursor`, or `not_found` when the Agent is unavailable. See [`GET /v1/agents/:agentId/skills`](/api-reference/rest-api/skills#list-skills).

### `get()` [#get]

Retrieves a Skill's metadata and current file inventory.

**Signature:** `get(input: { skillId: string }): Promise<SkillDetail>`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `skillId` | `string` | yes | Skill ID (`skill_…`) |

```typescript
const skills = client.agent(agentId).skills;
const skill = await skills.get({ skillId });
```

Returns [`SkillDetail`](#skilldetail). Raises `validation_failed` or `skill_not_found`. See [`GET /v1/agents/:agentId/skills/:skillId`](/api-reference/rest-api/skills#get-skill).

### `getFile()` [#get-file]

Downloads a file without text decoding.

**Signature:** `getFile(input: { skillId: string; path: string }): Promise<Uint8Array>`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `skillId` | `string` | yes | Skill ID (`skill_…`) |
| `path` | `string` | yes | Safe relative path, including `SKILL.md` |

```typescript
const skills = client.agent(agentId).skills;
const bytes = await skills.getFile({
  skillId,
  path: "scripts/deploy.sh",
});
```

Returns raw `Uint8Array` bytes. Raises `validation_failed` or `skill_not_found`. See [`GET .../files/*`](/api-reference/rest-api/skills#get-skill-file).

### `putFile()` [#put-file]

Creates or replaces a file. Replacing `SKILL.md` updates the Skill metadata after validating its frontmatter.

**Signature:** `putFile(input: { skillId: string; path: string; content: Blob | string | Uint8Array }): Promise<SkillDetail>`

```typescript
const skills = client.agent(agentId).skills;
const skill = await skills.putFile({
  skillId,
  path: "scripts/deploy.sh",
  content: "#!/bin/sh\nset -eu\n",
});
```

Returns the updated [`SkillDetail`](#skilldetail). Raises `validation_failed`, `skill_not_found`, `skill_invalid_markdown`, `skill_name_conflict`, `skill_too_many_files`, or `skill_uncompressed_too_large`. See [`PUT .../files/*`](/api-reference/rest-api/skills#put-skill-file).

### `deleteFile()` [#delete-file]

Deletes a supporting file. Deleting an absent supporting file is idempotent; root `SKILL.md` cannot be deleted.

**Signature:** `deleteFile(input: { skillId: string; path: string }): Promise<SkillDetail>`

```typescript
const skills = client.agent(agentId).skills;
const skill = await skills.deleteFile({
  skillId,
  path: "scripts/deploy.sh",
});
```

Returns the updated [`SkillDetail`](#skilldetail). Raises `invalid_request` for root `SKILL.md`, `validation_failed`, or `skill_not_found`. See [`DELETE .../files/*`](/api-reference/rest-api/skills#delete-skill-file).

### `copy()` [#copy]

Copies a Skill independently to one or more destination Agents. Results preserve destination order; one failed destination does not reject successful copies.

**Signature:** `copy(input: { skillId: string; to: { agentIds: string[] } }): Promise<SkillCopyResults>`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `skillId` | `string` | yes | Source Skill ID |
| `to.agentIds` | `string[]` | yes | 1–30 unique destination Agent IDs |

```typescript
const skills = client.agent(agentId).skills;
const results = await skills.copy({
  skillId,
  to: { agentIds: [destinationAgentId] },
});
```

Returns [`SkillCopyResults`](#skillcopyresults). The request raises `validation_failed` or `skill_not_found`; destination-specific failures appear in the returned array. See [`POST .../copies`](/api-reference/rest-api/skills#copy-skill).

### `delete()` [#delete]

Deletes a Skill and all its files.

**Signature:** `delete(input: { skillId: string }): Promise<void>`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `skillId` | `string` | yes | Skill ID (`skill_…`) |

```typescript
const skills = client.agent(agentId).skills;
await skills.delete({ skillId });
```

Returns `void`. Raises `validation_failed` or `skill_not_found`. See [`DELETE /v1/agents/:agentId/skills/:skillId`](/api-reference/rest-api/skills#delete-skill).

## Response types [#response-types]

### `Skill` and `SkillDetail` [#skilldetail]

| Field | Type | Detail only | Description |
| --- | --- | --- | --- |
| `id` | `string` | no | Skill ID (`skill_…`) |
| `tenantId` | `string` | no | Owning Tenant ID |
| `agentId` | `string` | no | Owner Agent ID |
| `name` | `string` | no | Frontmatter name |
| `description` | `string` | no | Frontmatter description |
| `metadata` | `Record<string, string> \| undefined` | no | Optional frontmatter metadata |
| `createdAt` | `string` | no | ISO 8601 creation timestamp |
| `updatedAt` | `string` | no | ISO 8601 update timestamp |
| `files` | `{ path: string; sizeBytes: number }[]` | yes | Current file inventory |

`SkillsListResponse` contains `Skill` summaries; individual and mutation responses return `SkillDetail`.

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
      error: {
        code: string;
        message: string;
        details?: unknown;
      };
    };

type SkillCopyResults = SkillCopyResult[];
```

See the canonical [Skill schemas](/api-reference/protocols/objects-and-schemas).

## Errors [#errors]

SDK request failures throw `BlazingAgentsError`. Branch on its stable `code`, not its message.

| Code | Meaning |
| --- | --- |
| `skill_not_found` | The Skill is unavailable under the supplied Agent |
| `skill_invalid_markdown` | `SKILL.md` frontmatter is missing or invalid |
| `skill_invalid_archive` | The archive format or contents are unsafe or invalid |
| `skill_name_conflict` | The Agent already has a Skill with that name |
| `skill_limit_reached` | The Agent already has 100 Skills |
| `skill_too_many_files` | The Skill would exceed 100 files |
| `skill_uncompressed_too_large` | The Skill would exceed 10 MiB |
| `invalid_cursor` | A list cursor is unusable |
| `validation_failed` | IDs, paths, options, or bodies are invalid |

See [SDK errors](/api-reference/protocols/errors).

## End-to-end workflow [#end-to-end-workflow]

Create a Skill, add and read a supporting file, inspect it, and delete it:

```typescript
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({ apiKey: process.env.BLAZING_AGENTS_API_KEY! });
const skills = client.agent(agentId).skills;

const skill = await skills.create({
  path: "SKILL.md",
  content: "---\nname: deploy\ndescription: Deploy the application.\n---\n",
});

await skills.putFile({
  skillId: skill.id,
  path: "scripts/deploy.sh",
  content: "#!/bin/sh\nset -eu\n",
});

const bytes = await skills.getFile({
  skillId: skill.id,
  path: "scripts/deploy.sh",
});
console.log(new TextDecoder().decode(bytes));

const current = await skills.get({ skillId: skill.id });
console.log(current.files);

await skills.delete({ skillId: skill.id });
```

## Related [#related]

- [REST Skills](/api-reference/rest-api/skills)
- [Agents](/sdk/typescript/agents)
