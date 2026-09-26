---
title: Skills
description: Manage Agent-owned Skills, supporting files, archives, and copies.
---

# Skills

## Overview [#overview]

Skills teach an agent how to do a specific job. Each skill is a folder of files
that belongs to one agent and must have a `SKILL.md` at its root. Create a
skill from Markdown or upload an archive, then edit, copy, or delete its files.
Every request is scoped to your tenant and to the agent in the path.

Skill files are separate from the agent's workspace. During a turn, the agent
reads them at `/.ba-agents/{agentId}/skills/{skillId}/{relativePath}` with its
`read` tool; that path is not a real file in the workspace. JSON skill
responses include the skill's metadata and its current list of files.

## Endpoints [#endpoints]

### POST /v1/agents/:agentId/skills [#create-skill]

Creates a skill from a `SKILL.md` document and returns its file list.

#### Request

Requires JSON with `path: "SKILL.md"` and `content` that starts with frontmatter.

#### Response

Returns `201 Created` with an `application/json` Skill detail.

Response schema: `skillResponseSchema`.

SDK: [TypeScript](/sdk/typescript/skills#create) /
[Python](/sdk/python/skills#create).

#### Errors

`400 validation_failed`; `404 not_found` for a missing agent; `409 skill_name_conflict`.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/$AGENT_ID/skills" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"path":"SKILL.md","content":"---\nname: deploy\ndescription: Deploy the application.\n---\n"}'
```

### POST /v1/agents/:agentId/skills/upload [#upload-skill]

Imports a whole skill from an archive and returns its file list.

#### Request

Requires multipart form fields `type` (`zip`, `tar`, or `tar.gz`) and `file`.

#### Response

Returns `201 Created` with an `application/json` Skill detail.

Response schema: `skillResponseSchema`.

SDK: [TypeScript](/sdk/typescript/skills#upload) /
[Python](/sdk/python/skills#upload).

#### Errors

`400 validation_failed`; `404 not_found` for a missing agent; `409 skill_name_conflict`.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/$AGENT_ID/skills/upload" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --form "type=tar.gz" \
  --form "file=@skill.tar.gz"
```

### GET /v1/agents/:agentId/skills [#list-skills]

Lists an agent's skills, one page at a time.

#### Request

Accepts opaque `cursor` and `limit` from 1 through 100.

#### Response

Returns `200 OK` with an `application/json` cursor-paginated list.

Response schema: `skillsListResponseSchema`.

SDK: [TypeScript](/sdk/typescript/skills#list) /
[Python](/sdk/python/skills#list).

#### Errors

`400 validation_failed`; `404 not_found` for a missing agent.

#### cURL

```bash
curl --get "$BLAZING_AGENTS_BASE_URL/v1/agents/$AGENT_ID/skills" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --data-urlencode "limit=50"
```

### GET /v1/agents/:agentId/skills/:skillId [#get-skill]

Returns a skill's metadata and current file list.

#### Request

Requires valid Agent and Skill IDs.

#### Response

Returns `200 OK` with an `application/json` Skill detail.

Response schema: `skillResponseSchema`.

SDK: [TypeScript](/sdk/typescript/skills#get) /
[Python](/sdk/python/skills#get).

#### Errors

`400 validation_failed`; `404 skill_not_found`.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/$AGENT_ID/skills/$SKILL_ID" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### DELETE /v1/agents/:agentId/skills/:skillId [#delete-skill]

Deletes a skill and all its files.

#### Request

Requires valid Agent and Skill IDs.

#### Response

Returns `204 No Content` with an empty body.

SDK: [TypeScript](/sdk/typescript/skills#delete) /
[Python](/sdk/python/skills#delete).

#### Errors

`400 validation_failed`; `404 skill_not_found`.

#### cURL

```bash
curl --request DELETE \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/$AGENT_ID/skills/$SKILL_ID" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/agents/:agentId/skills/:skillId/files?path=\<path\> [#get-skill-file]

Downloads the raw bytes of a skill file.

#### Request

Requires valid Agent and Skill IDs plus the `path` query parameter naming a
non-empty file path, for example `?path=assets/icon.bin`.

#### Response

Returns `200 OK` with `Content-Type: application/octet-stream` and raw bytes.

SDK: [TypeScript](/sdk/typescript/skills#get-file) /
[Python](/sdk/python/skills#read-file).

#### Errors

`400 validation_failed`; `404 skill_not_found`.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/$AGENT_ID/skills/$SKILL_ID/files?path=assets/icon.bin" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --output icon.bin
```

### PUT /v1/agents/:agentId/skills/:skillId/files?path=\<path\> [#put-skill-file]

Creates or replaces a skill file from raw bytes.

#### Request

The `path` query parameter names the target file and the body is the exact
file content. Replacing `SKILL.md` rereads its frontmatter and keeps the skill
ID.

#### Response

Returns `200 OK` with an `application/json` updated Skill detail.

Response schema: `skillResponseSchema`.

SDK: [TypeScript](/sdk/typescript/skills#put-file) /
[Python](/sdk/python/skills#replace-file).

#### Errors

`400 validation_failed`; `404 skill_not_found`; `409 skill_name_conflict`.

#### cURL

```bash
curl --request PUT \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/$AGENT_ID/skills/$SKILL_ID/files?path=scripts/deploy.sh" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --data-binary "@deploy.sh"
```

### DELETE /v1/agents/:agentId/skills/:skillId/files?path=\<path\> [#delete-skill-file]

Deletes a supporting file. The root `SKILL.md` cannot be deleted.

#### Request

The `path` query parameter names a relative file path other than the root `SKILL.md`.

#### Response

Returns `200 OK` with an `application/json` updated Skill detail.

Response schema: `skillResponseSchema`.

SDK: [TypeScript](/sdk/typescript/skills#delete-file) /
[Python](/sdk/python/skills#delete-file).

#### Errors

`400 validation_failed`; `400 invalid_request` when deleting root `SKILL.md`;
`404 skill_not_found`. Deleting a file that does not exist succeeds.

#### cURL

```bash
curl --request DELETE \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/$AGENT_ID/skills/$SKILL_ID/files?path=scripts/deploy.sh" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/skills/:skillId/copies [#copy-skill]

Copies a skill to each destination agent and returns a result for each one.

#### Request

Requires JSON containing one or more unique destination `agentIds`.

#### Response

Returns `200 OK` with an `application/json` ordered result per destination;
each result is `created` or `failed`.

Response schema: `skillCopyResultsSchema`.

SDK: [TypeScript](/sdk/typescript/skills#copy) /
[Python](/sdk/python/skills#copy).

#### Errors

`400 validation_failed`; `404 skill_not_found`.

#### cURL

```bash
curl --request POST \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/$AGENT_ID/skills/$SKILL_ID/copies" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"agentIds":["ag_1234567890ABCDEF"]}'
```

## Next [#next]

- [Skills](/agents/skills) to write a skill your agent can use.
- [Service limits](/api-reference/protocols/service-limits#skill-bundle) for size and file limits.
