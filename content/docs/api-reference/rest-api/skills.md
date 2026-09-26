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

### GET /v1/agents/:agentId/skills [#list-skills]

List an agent's skills.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `cursor` | string | query |  |  |
| `limit` | integer | query |  | 1–100. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. A page of skills.

Response schema: `SkillList`.

```json
{
  "data": [
    {
      "id": "skill_1234567890ABCDEF",
      "tenantId": "ten_1234567890ABCDEF",
      "agentId": "ag_1234567890ABCDEF",
      "name": "string",
      "description": "string",
      "metadata": {},
      "createdAt": "2026-07-10T10:00:00Z",
      "updatedAt": "2026-07-10T10:00:00Z"
    }
  ],
  "nextCursor": "string"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/skills" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/skills [#create-skill]

Create a skill.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `path` | string | body | required |  |
| `content` | string | body | required |  |

#### Response

Returns `201 Created` as `application/json`. The created skill.

Response schema: `Skill`.

```json
{
  "id": "skill_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "string",
  "description": "string",
  "metadata": {},
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z",
  "files": [
    {
      "path": "string",
      "sizeBytes": 0
    }
  ]
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |
| `409` | Skill name already exists |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/skills" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"path":"SKILL.md","content":"string"}'
```

### POST /v1/agents/:agentId/skills/upload [#upload-skill]

Upload a skill archive.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a multipart form body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `type` | string | form | required | One of `zip`, `tar`, `tar.gz`. |
| `file` | file | form | required |  |

#### Response

Returns `201 Created` as `application/json`. The created skill.

Response schema: `Skill`.

```json
{
  "id": "skill_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "string",
  "description": "string",
  "metadata": {},
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z",
  "files": [
    {
      "path": "string",
      "sizeBytes": 0
    }
  ]
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |
| `409` | Skill name already exists |
| `413` | Archive exceeds the size limit |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/skills/upload" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --form "type=zip" \
  --form "file=@./file"
```

### GET /v1/agents/:agentId/skills/:skillId [#get-skill]

Get a skill.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `skillId` | string | path | required | `skill_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The skill.

Response schema: `Skill`.

```json
{
  "id": "skill_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "string",
  "description": "string",
  "metadata": {},
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z",
  "files": [
    {
      "path": "string",
      "sizeBytes": 0
    }
  ]
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/skills/skill_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### DELETE /v1/agents/:agentId/skills/:skillId [#delete-skill]

Delete a skill.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `skillId` | string | path | required | `skill_…` ID. |

#### Response

Returns `204 No Content`. Deleted.

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/skills/skill_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/agents/:agentId/skills/:skillId/files [#get-skill-file]

Read a skill file.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `skillId` | string | path | required | `skill_…` ID. |
| `path` | string | query | required |  |

#### Response

Returns `200 OK` as `application/octet-stream`. The file's raw bytes.

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/skills/skill_1234567890ABCDEF/files?path=string" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --output file
```

### PUT /v1/agents/:agentId/skills/:skillId/files [#put-skill-file]

Write a skill file.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a binary body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `skillId` | string | path | required | `skill_…` ID. |
| `path` | string | query | required |  |
| `(body)` | file | body | required | Raw `application/octet-stream` request body. |

#### Response

Returns `200 OK` as `application/json`. The updated skill.

Response schema: `Skill`.

```json
{
  "id": "skill_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "string",
  "description": "string",
  "metadata": {},
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z",
  "files": [
    {
      "path": "string",
      "sizeBytes": 0
    }
  ]
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PUT "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/skills/skill_1234567890ABCDEF/files?path=string" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --data-binary "@./file"
```

### DELETE /v1/agents/:agentId/skills/:skillId/files [#delete-skill-file]

Delete a skill file.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `skillId` | string | path | required | `skill_…` ID. |
| `path` | string | query | required |  |

#### Response

Returns `200 OK` as `application/json`. The updated skill.

Response schema: `Skill`.

```json
{
  "id": "skill_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "name": "string",
  "description": "string",
  "metadata": {},
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z",
  "files": [
    {
      "path": "string",
      "sizeBytes": 0
    }
  ]
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/skills/skill_1234567890ABCDEF/files?path=string" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/skills/:skillId/copies [#copy-skill]

Copy a skill to other agents.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `skillId` | string | path | required | `skill_…` ID. |
| `agentIds` | string[] | body | required |  |

#### Response

Returns `200 OK` as `application/json`. The per-destination copy results.

Response schema: `SkillCopyResultList`.

```json
[
  {
    "agentId": "ag_1234567890ABCDEF",
    "status": "created",
    "skill": {
      "id": "skill_1234567890ABCDEF",
      "tenantId": "ten_1234567890ABCDEF",
      "agentId": "ag_1234567890ABCDEF",
      "name": "string",
      "description": "string",
      "metadata": {},
      "createdAt": "2026-07-10T10:00:00Z",
      "updatedAt": "2026-07-10T10:00:00Z",
      "files": [
        {
          "path": "string",
          "sizeBytes": 0
        }
      ]
    }
  }
]
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/skills/skill_1234567890ABCDEF/copies" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"agentIds":["ag_1234567890ABCDEF"]}'
```

## Next [#next]

- [Skills](/agents/skills) to write a skill your agent can use.
- [Service limits](/api-reference/protocols/service-limits#skill-bundle) for size and file limits.
