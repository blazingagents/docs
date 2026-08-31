---
title: Skills
description: Manage Agent-owned Skills, supporting files, archives, and copies.
---

# Skills

## Overview [#overview]

Skills are Agent-owned directories with a required root `SKILL.md`. Every
operation is scoped by both the authenticated Tenant and the Agent in the
path. Postgres stores Skill metadata and R2 stores the authoritative files
beneath the internal Tenant- and Agent-scoped key. Skill files are independent
of Workspaces. At runtime,
`/.ba-agents/{agentId}/skills/{skillId}/{relativePath}` is a virtual `read`
locator, not an exposed R2 key or mounted file. JSON Skill responses include
metadata plus the current file inventory.

## Endpoints [#endpoints]

### POST /v1/agents/:agentId/skills [#create-skill]

Creates a Skill from root Markdown and returns its file inventory.

#### Request

Requires JSON with `path: "SKILL.md"` and frontmatter-bearing `content`.

#### Response

Returns `201 Created` with an `application/json` Skill detail.

Response schema: `skillResponseSchema`.

SDK: [TypeScript](/sdk/typescript/skills#create) /
[Python](/sdk/python/skills#create).

#### Errors

`400 validation_failed`; `404 agent_not_found`; `409 skill_name_conflict`.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/$AGENT_ID/skills" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"path":"SKILL.md","content":"---\nname: deploy\ndescription: Deploy the application.\n---\n"}'
```

### POST /v1/agents/:agentId/skills/upload [#upload-skill]

Imports a complete Skill archive and returns its file inventory.

#### Request

Requires multipart form fields `type` (`zip`, `tar`, or `tar.gz`) and `file`.

#### Response

Returns `201 Created` with an `application/json` Skill detail.

Response schema: `skillResponseSchema`.

SDK: [TypeScript](/sdk/typescript/skills#upload) /
[Python](/sdk/python/skills#upload).

#### Errors

`400 validation_failed`; `404 agent_not_found`; `409 skill_name_conflict`.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/$AGENT_ID/skills/upload" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --form "type=tar.gz" \
  --form "file=@skill.tar.gz"
```

### GET /v1/agents/:agentId/skills [#list-skills]

Lists an Agent's Skills in a cursor-paginated response.

#### Request

Accepts opaque `cursor` and `limit` from 1 through 100.

#### Response

Returns `200 OK` with an `application/json` cursor-paginated list.

Response schema: `skillsListResponseSchema`.

SDK: [TypeScript](/sdk/typescript/skills#list) /
[Python](/sdk/python/skills#list).

#### Errors

`400 validation_failed`; `404 agent_not_found`.

#### cURL

```bash
curl --get "$BLAZING_AGENTS_BASE_URL/v1/agents/$AGENT_ID/skills" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --data-urlencode "limit=50"
```

### GET /v1/agents/:agentId/skills/:skillId [#get-skill]

Returns a Skill's metadata and current file inventory.

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

Deletes a Skill and all its files.

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

### GET /v1/agents/:agentId/skills/:skillId/files/* [#get-skill-file]

Downloads the raw bytes of a Skill file.

#### Request

Requires valid Agent and Skill IDs plus a non-empty file path.

#### Response

Returns `200 OK` with `Content-Type: application/octet-stream` and raw bytes.

SDK: [TypeScript](/sdk/typescript/skills#get-file) /
[Python](/sdk/python/skills#read-file).

#### Errors

`400 validation_failed`; `404 skill_not_found`.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/$AGENT_ID/skills/$SKILL_ID/files/assets/icon.bin" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --output icon.bin
```

### PUT /v1/agents/:agentId/skills/:skillId/files/* [#put-skill-file]

Creates or replaces a Skill file from raw bytes.

#### Request

The body is the exact file content. Replacing `SKILL.md` reparses its
frontmatter and preserves the Skill ID.

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
  "$BLAZING_AGENTS_BASE_URL/v1/agents/$AGENT_ID/skills/$SKILL_ID/files/scripts/deploy.sh" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --data-binary "@deploy.sh"
```

### DELETE /v1/agents/:agentId/skills/:skillId/files/* [#delete-skill-file]

Deletes a supporting Skill file while protecting root `SKILL.md`.

#### Request

Requires a non-root, safe relative file path.

#### Response

Returns `200 OK` with an `application/json` updated Skill detail.

Response schema: `skillResponseSchema`.

SDK: [TypeScript](/sdk/typescript/skills#delete-file) /
[Python](/sdk/python/skills#delete-file).

#### Errors

`400 validation_failed`; `400 invalid_request` when deleting root `SKILL.md`;
`404 skill_not_found`. Deleting an absent supporting file is idempotent.

#### cURL

```bash
curl --request DELETE \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/$AGENT_ID/skills/$SKILL_ID/files/scripts/deploy.sh" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/skills/:skillId/copies [#copy-skill]

Copies a Skill independently to each destination Agent and returns per-destination results.

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

## Related [#related]

- [TypeScript SDK Skills](/sdk/typescript/skills)
- [Python SDK Skills](/sdk/python/skills)
- [Agents](/api-reference/rest-api/agents)
