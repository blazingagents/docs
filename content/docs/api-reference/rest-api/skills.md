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

Lists the agent's skills, newest first, without their file lists. Pass `nextCursor` as `cursor` to get the next page.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `cursor` | string | query |  | `nextCursor` from the previous page. Leave it out for the first page. |
| `limit` | integer | query |  | Maximum number of skills to return. 1–100. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. A page of skills.

Response schema: `SkillList`.

```json
{
  "data": [
    {
      "id": "skill_6Wd2Lq8RtY4nBk7P",
      "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
      "agentId": "ag_4kP9sT2vXq7LmN3a",
      "name": "refund-policy",
      "description": "Answer refund questions using the current refund policy.",
      "metadata": {
        "owner": "support"
      },
      "createdAt": "2026-07-10T10:00:00.000Z",
      "updatedAt": "2026-07-10T10:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/skills" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/skills [#create-skill]

Create a skill.

Creates a skill on the agent from a `SKILL.md` document and returns it with its file list. The frontmatter's `name` must be unique among the agent's skills. An agent can have up to 100 skills.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `path` | string | body | required | Always `SKILL.md`. |
| `content` | string | body | required | The `SKILL.md` document. It must start with YAML frontmatter that sets `name` and `description`. |

#### Response

Returns `201 Created` as `application/json`. The created skill.

Response schema: `Skill`.

```json
{
  "id": "skill_6Wd2Lq8RtY4nBk7P",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "agentId": "ag_4kP9sT2vXq7LmN3a",
  "name": "refund-policy",
  "description": "Answer refund questions using the current refund policy.",
  "metadata": {
    "owner": "support"
  },
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z",
  "files": [
    {
      "path": "SKILL.md",
      "sizeBytes": 168
    }
  ]
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`skill_invalid_markdown`](/api-reference/protocols/errors#skill_invalid_markdown), [`skill_limit_reached`](/api-reference/protocols/errors#skill_limit_reached) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`skill_name_conflict`](/api-reference/protocols/errors#skill_name_conflict) | The request conflicts with the resource's current state |
| `413` | [`skill_uncompressed_too_large`](/api-reference/protocols/errors#skill_uncompressed_too_large) | The request body is too large |
| `503` | [`service_unavailable`](/api-reference/protocols/errors#service_unavailable) | The service is temporarily unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/skills" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"path":"SKILL.md","content":"---\nname: refund-policy\ndescription: Answer refund questions using the current refund policy.\n---\n\nCheck the order date, then quote the matching rule from `policy.md`.\n"}'
```

### POST /v1/agents/:agentId/skills/upload [#upload-skill]

Upload a skill archive.

Creates a skill on the agent from a `zip`, `tar`, or `tar.gz` archive and returns it with its file list. Set `type` to the archive's format. The archive must contain `SKILL.md` at its root, and its frontmatter's `name` must be unique among the agent's skills. An archive can be up to 10 MiB and hold up to 100 files totalling up to 10 MiB unpacked, without links or special files. An agent can have up to 100 skills.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a multipart form body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `type` | string | form | required | Format of the archive in `file`. One of `zip`, `tar`, `tar.gz`. |
| `file` | file | form | required | The skill archive. It must contain `SKILL.md` at its root. |

#### Response

Returns `201 Created` as `application/json`. The created skill.

Response schema: `Skill`.

```json
{
  "id": "skill_6Wd2Lq8RtY4nBk7P",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "agentId": "ag_4kP9sT2vXq7LmN3a",
  "name": "refund-policy",
  "description": "Answer refund questions using the current refund policy.",
  "metadata": {
    "owner": "support"
  },
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z",
  "files": [
    {
      "path": "SKILL.md",
      "sizeBytes": 168
    },
    {
      "path": "policy.md",
      "sizeBytes": 2048
    }
  ]
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`skill_invalid_archive`](/api-reference/protocols/errors#skill_invalid_archive), [`skill_invalid_markdown`](/api-reference/protocols/errors#skill_invalid_markdown), [`skill_too_many_files`](/api-reference/protocols/errors#skill_too_many_files), [`skill_limit_reached`](/api-reference/protocols/errors#skill_limit_reached) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`skill_name_conflict`](/api-reference/protocols/errors#skill_name_conflict) | The request conflicts with the resource's current state |
| `413` | [`skill_uncompressed_too_large`](/api-reference/protocols/errors#skill_uncompressed_too_large) | The request body is too large |
| `503` | [`service_unavailable`](/api-reference/protocols/errors#service_unavailable) | The service is temporarily unavailable |

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

Returns a skill with its current file list.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `skillId` | string | path | required | ID of the skill. |

#### Response

Returns `200 OK` as `application/json`. The skill.

Response schema: `Skill`.

```json
{
  "id": "skill_6Wd2Lq8RtY4nBk7P",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "agentId": "ag_4kP9sT2vXq7LmN3a",
  "name": "refund-policy",
  "description": "Answer refund questions using the current refund policy.",
  "metadata": {
    "owner": "support"
  },
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z",
  "files": [
    {
      "path": "SKILL.md",
      "sizeBytes": 168
    },
    {
      "path": "policy.md",
      "sizeBytes": 2048
    }
  ]
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found), [`skill_not_found`](/api-reference/protocols/errors#skill_not_found) | The resource was not found |
| `503` | [`service_unavailable`](/api-reference/protocols/errors#service_unavailable) | The service is temporarily unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/skills/skill_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### DELETE /v1/agents/:agentId/skills/:skillId [#delete-skill]

Delete a skill.

Permanently deletes a skill and all its files. You cannot delete an agent's last skill while one of its approval policies has an override for the `activate_skill` tool, or for the `read` tool when the agent lacks the `workspace` tool group. Remove the override first.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `skillId` | string | path | required | ID of the skill. |

#### Response

Returns `204 No Content`. The skill was deleted.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found), [`skill_not_found`](/api-reference/protocols/errors#skill_not_found) | The resource was not found |
| `503` | [`service_unavailable`](/api-reference/protocols/errors#service_unavailable) | The service is temporarily unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/skills/skill_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/agents/:agentId/skills/:skillId/files [#get-skill-file]

Read a skill file.

Returns the raw bytes of the skill file at `path` as `application/octet-stream`.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `skillId` | string | path | required | ID of the skill. |
| `path` | string | query | required | The file's path relative to the skill's root, such as `policy.md` or `scripts/refund.sh`. |

#### Response

Returns `200 OK` as `application/octet-stream`. The file's raw bytes.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found), [`skill_not_found`](/api-reference/protocols/errors#skill_not_found) | The resource was not found |
| `503` | [`service_unavailable`](/api-reference/protocols/errors#service_unavailable) | The service is temporarily unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/skills/skill_1234567890ABCDEF/files?path=policy.md" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --output file
```

### PUT /v1/agents/:agentId/skills/:skillId/files [#put-skill-file]

Write a skill file.

Creates or replaces the skill file at `path` with the raw request body and returns the updated skill. Replacing `SKILL.md` rereads its frontmatter, so the skill's `name`, `description`, and `metadata` follow it; the skill keeps its ID, and the new `name` must be unique among the agent's skills. A skill can hold up to 100 files totalling up to 10 MiB.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a binary body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `skillId` | string | path | required | ID of the skill. |
| `path` | string | query | required | The file's path relative to the skill's root, such as `policy.md` or `scripts/refund.sh`. |
| `(body)` | file | body | required | Raw `application/octet-stream` request body. |

#### Response

Returns `200 OK` as `application/json`. The updated skill.

Response schema: `Skill`.

```json
{
  "id": "skill_6Wd2Lq8RtY4nBk7P",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "agentId": "ag_4kP9sT2vXq7LmN3a",
  "name": "refund-policy",
  "description": "Answer refund questions using the current refund policy.",
  "metadata": {
    "owner": "support"
  },
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z",
  "files": [
    {
      "path": "SKILL.md",
      "sizeBytes": 168
    },
    {
      "path": "policy.md",
      "sizeBytes": 2048
    }
  ]
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`skill_invalid_markdown`](/api-reference/protocols/errors#skill_invalid_markdown), [`skill_too_many_files`](/api-reference/protocols/errors#skill_too_many_files) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found), [`skill_not_found`](/api-reference/protocols/errors#skill_not_found) | The resource was not found |
| `409` | [`skill_name_conflict`](/api-reference/protocols/errors#skill_name_conflict) | The request conflicts with the resource's current state |
| `413` | [`skill_uncompressed_too_large`](/api-reference/protocols/errors#skill_uncompressed_too_large) | The request body is too large |
| `503` | [`service_unavailable`](/api-reference/protocols/errors#service_unavailable) | The service is temporarily unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PUT "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/skills/skill_1234567890ABCDEF/files?path=policy.md" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --data-binary "@./file"
```

### DELETE /v1/agents/:agentId/skills/:skillId/files [#delete-skill-file]

Delete a skill file.

Deletes the skill file at `path` and returns the updated skill. Deleting a file that does not exist succeeds. You cannot delete the root `SKILL.md`; delete the skill instead.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `skillId` | string | path | required | ID of the skill. |
| `path` | string | query | required | The file's path relative to the skill's root, such as `policy.md` or `scripts/refund.sh`. |

#### Response

Returns `200 OK` as `application/json`. The updated skill.

Response schema: `Skill`.

```json
{
  "id": "skill_6Wd2Lq8RtY4nBk7P",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "agentId": "ag_4kP9sT2vXq7LmN3a",
  "name": "refund-policy",
  "description": "Answer refund questions using the current refund policy.",
  "metadata": {
    "owner": "support"
  },
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z",
  "files": [
    {
      "path": "SKILL.md",
      "sizeBytes": 168
    }
  ]
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`invalid_request`](/api-reference/protocols/errors#invalid_request) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found), [`skill_not_found`](/api-reference/protocols/errors#skill_not_found) | The resource was not found |
| `503` | [`service_unavailable`](/api-reference/protocols/errors#service_unavailable) | The service is temporarily unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/skills/skill_1234567890ABCDEF/files?path=policy.md" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/skills/:skillId/copies [#copy-skill]

Copy a skill to other agents.

Copies a skill, with all its files, to each agent in `agentIds`. Each copy is a new skill with its own ID. The response has one result per destination, in request order: `created` with the new skill, or `failed` with an error such as `skill_name_conflict` or `skill_limit_reached`. One failed destination does not stop the others.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `skillId` | string | path | required | ID of the skill. |
| `agentIds` | string[] | body | required | IDs of the agents to copy the skill to, each listed once. Send 1 to 30. |

#### Response

Returns `200 OK` as `application/json`. One result per destination agent.

Response schema: `SkillCopyResultList`.

```json
[
  {
    "agentId": "ag_9Xm3Fp7KdR2vHs5T",
    "status": "created",
    "skill": {
      "id": "skill_1Nc5Gv9JwZ3hQe8M",
      "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
      "agentId": "ag_9Xm3Fp7KdR2vHs5T",
      "name": "refund-policy",
      "description": "Answer refund questions using the current refund policy.",
      "metadata": {
        "owner": "support"
      },
      "createdAt": "2026-07-10T10:00:00.000Z",
      "updatedAt": "2026-07-10T10:00:00.000Z",
      "files": [
        {
          "path": "SKILL.md",
          "sizeBytes": 168
        },
        {
          "path": "policy.md",
          "sizeBytes": 2048
        }
      ]
    }
  },
  {
    "agentId": "ag_2Bt6Yh4MsW8kLc1V",
    "status": "failed",
    "error": {
      "code": "skill_name_conflict",
      "message": "Skill name already exists for this Agent"
    }
  }
]
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found), [`skill_not_found`](/api-reference/protocols/errors#skill_not_found) | The resource was not found |
| `503` | [`service_unavailable`](/api-reference/protocols/errors#service_unavailable) | The service is temporarily unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/skills/skill_1234567890ABCDEF/copies" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"agentIds":["ag_9Xm3Fp7KdR2vHs5T","ag_2Bt6Yh4MsW8kLc1V"]}'
```

## Next [#next]

- [Skills](/agents/skills) to write a skill your agent can use.
- [Service limits](/api-reference/protocols/service-limits#skill-bundle) for size and file limits.
