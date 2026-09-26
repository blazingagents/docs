---
title: Tasks
description: Run agent work in the background, on demand or on a schedule.
---

# Tasks

## Overview [#overview]

A task is a saved prompt for an agent that runs in the background, on demand or on a schedule. Each run gets its own record and transcript, so you can check on it later. Use tasks for reports, syncs, and other work nobody waits on.

## Tool approval policy [#tool-approval-policy]

Task runs follow the agent version's `approvalInTasks` policy. Nobody is
there to approve a tool call during a run, so calls that need manual approval,
or that automatic review escalates to a person, are denied. The agent is told
which actions were blocked and keeps going with what it is allowed to do. If a
run ends up waiting for a person anyway, it fails. See
[Tool approvals](/agents/tools/tool-approvals).

## Endpoints [#endpoints]

### GET /v1/tasks [#list-tasks]

List tasks.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | query |  | `ag_…` ID. |
| `userId` | string | query |  |  |
| `cursor` | string \| null | query |  |  |
| `limit` | integer | query |  | 1–200. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. A page of tasks.

Response schema: `TaskList`.

```json
{
  "data": [
    {
      "id": "tk_1234567890ABCDEF",
      "tenantId": "ten_1234567890ABCDEF",
      "agentId": "ag_1234567890ABCDEF",
      "agentVersion": 1,
      "name": "string",
      "prompt": "string",
      "schedule": {
        "kind": "once",
        "config": {
          "at": "2026-07-10T10:00:00Z"
        }
      },
      "enabled": true,
      "activeRunId": "tr_1234567890ABCDEF",
      "latestRunId": "tr_1234567890ABCDEF",
      "userId": "string",
      "metadata": {},
      "deletedAt": "2026-07-10T10:00:00Z",
      "createdAt": "2026-07-10T10:00:00Z",
      "updatedAt": "2026-07-10T10:00:00Z",
      "latestRun": {
        "id": "tr_1234567890ABCDEF",
        "status": "queued",
        "finishedAt": "2026-07-10T10:00:00Z"
      }
    }
  ],
  "nextCursor": "string"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/tasks" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/tasks [#create-task]

Create a task.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | body | required | `ag_…` ID. |
| `agentVersion` | integer \| null | body |  | 1–2147483647. Defaults to `null`. |
| `name` | string | body | required | 1–80 characters. |
| `prompt` | string | body | required | 1–6000 characters. |
| `schedule` | object \| null | body |  | Defaults to `null`. |
| `enabled` | boolean | body |  | Defaults to `true`. |
| `submit` | boolean | body |  | Defaults to `false`. |
| `userId` | string | body |  | Defaults to `""`. |
| `metadata` | object | body |  | Defaults to `{}`. |

#### Response

Returns `201 Created` as `application/json`. The created task.

Response schema: `CreatedTask`.

```json
{
  "task": {
    "id": "tk_1234567890ABCDEF",
    "tenantId": "ten_1234567890ABCDEF",
    "agentId": "ag_1234567890ABCDEF",
    "agentVersion": 1,
    "name": "string",
    "prompt": "string",
    "schedule": {
      "kind": "once",
      "config": {
        "at": "2026-07-10T10:00:00Z"
      }
    },
    "enabled": true,
    "activeRunId": "tr_1234567890ABCDEF",
    "latestRunId": "tr_1234567890ABCDEF",
    "userId": "string",
    "metadata": {},
    "deletedAt": "2026-07-10T10:00:00Z",
    "createdAt": "2026-07-10T10:00:00Z",
    "updatedAt": "2026-07-10T10:00:00Z"
  },
  "runId": "tr_1234567890ABCDEF"
}
```

Returns `202 Accepted` as `application/json`. The created task with its queued run id.

Response schema: `CreatedTask`.

```json
{
  "task": {
    "id": "tk_1234567890ABCDEF",
    "tenantId": "ten_1234567890ABCDEF",
    "agentId": "ag_1234567890ABCDEF",
    "agentVersion": 1,
    "name": "string",
    "prompt": "string",
    "schedule": {
      "kind": "once",
      "config": {
        "at": "2026-07-10T10:00:00Z"
      }
    },
    "enabled": true,
    "activeRunId": "tr_1234567890ABCDEF",
    "latestRunId": "tr_1234567890ABCDEF",
    "userId": "string",
    "metadata": {},
    "deletedAt": "2026-07-10T10:00:00Z",
    "createdAt": "2026-07-10T10:00:00Z",
    "updatedAt": "2026-07-10T10:00:00Z"
  },
  "runId": "tr_1234567890ABCDEF"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/tasks" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"agentId":"ag_1234567890ABCDEF","name":"string","prompt":"string"}'
```

### GET /v1/tasks/:taskId [#get-task]

Get a task.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `taskId` | string | path | required | `tk_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The task.

Response schema: `Task`.

```json
{
  "id": "tk_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "agentVersion": 1,
  "name": "string",
  "prompt": "string",
  "schedule": {
    "kind": "once",
    "config": {
      "at": "2026-07-10T10:00:00Z"
    }
  },
  "enabled": true,
  "activeRunId": "tr_1234567890ABCDEF",
  "latestRunId": "tr_1234567890ABCDEF",
  "userId": "string",
  "metadata": {},
  "deletedAt": "2026-07-10T10:00:00Z",
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PATCH /v1/tasks/:taskId [#update-task]

Update a task.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `taskId` | string | path | required | `tk_…` ID. |
| `agentVersion` | integer \| null | body |  | 1–2147483647. |
| `name` | string | body |  | 1–80 characters. |
| `prompt` | string | body |  | 1–6000 characters. |
| `schedule` | object \| null | body |  |  |
| `enabled` | boolean | body |  |  |
| `metadata` | object | body |  |  |

#### Response

Returns `200 OK` as `application/json`. The updated task.

Response schema: `Task`.

```json
{
  "id": "tk_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "agentVersion": 1,
  "name": "string",
  "prompt": "string",
  "schedule": {
    "kind": "once",
    "config": {
      "at": "2026-07-10T10:00:00Z"
    }
  },
  "enabled": true,
  "activeRunId": "tr_1234567890ABCDEF",
  "latestRunId": "tr_1234567890ABCDEF",
  "userId": "string",
  "metadata": {},
  "deletedAt": "2026-07-10T10:00:00Z",
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"agentVersion":1}'
```

### DELETE /v1/tasks/:taskId [#delete-task]

Delete a task.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `taskId` | string | path | required | `tk_…` ID. |

#### Response

Returns `204 No Content`. Deleted.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Tasks and schedules](/automation/tasks) to plan background work.
- [Task runs API](/api-reference/rest-api/task-runs) to start and watch runs.
