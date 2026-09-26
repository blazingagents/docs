---
title: Tasks
description: Run agent work in the background, on demand or on a schedule.
---

# Tasks

## Tool approval policy [#tool-approval-policy]

Task runs follow the agent version's `approvalInTasks` policy. Nobody is
there to approve a tool call during a run, so calls that need manual approval,
or that automatic review escalates to a person, are denied. The agent is told
which actions were blocked and keeps going with what it is allowed to do. If a
run ends up waiting for a person anyway, it fails. See
[Tool approvals](/agents/tools/tool-approvals).

## Overview [#overview]

A task is a saved prompt for an agent that runs in the background, on demand or on a schedule. Each run gets its own record and transcript, so you can check on it later. Use tasks for reports, syncs, and other work nobody waits on.

## Endpoints [#endpoints]

### POST /v1/tasks [#create-task]

Creates a task to run on demand or on a schedule.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and JSON. There are no path or query parameters. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |

| Body field     | Type            | Required | Default |
| -------------- | --------------- | -------- | ------- |
| `agentId`      | string          | yes      | none       |
| `agentVersion` | integer \| null | no       | `null`  |
| `name`         | string          | yes      | none       |
| `prompt`       | string          | yes      | none       |
| `schedule`     | object \| null  | no       | `null`  |
| `enabled`      | boolean         | no       | `true`  |
| `submit`       | boolean         | no       | `false` |
| `userId`       | string          | no       | `""`    |
| `metadata`     | object          | no       | `{}`    |

Names are 1–80 characters; prompts are 1–6,000 characters. Schedules use the [Task schedule shapes](/api-reference/protocols/objects-and-schemas#task).

#### Response

Returns `201 Created` with the complete [Task object](/api-reference/protocols/objects-and-schemas#task) and the queued run ID, or `null` when `submit` is false.

Response schema: [`createTaskResponseSchema`](/api-reference/protocols/objects-and-schemas#create-task-response).

```json
{
  "task": {
    "id": "tk_1234567890ABCDEF",
    "tenantId": "ten_1234567890ABCDEF",
    "agentId": "ag_1234567890ABCDEF",
    "agentVersion": null,
    "name": "Daily summary",
    "prompt": "Summarize open support cases.",
    "schedule": {
      "kind": "cron",
      "config": { "expression": "0 9 * * 1-5", "timezone": "Europe/London" }
    },
    "enabled": true,
    "activeRunId": null,
    "latestRunId": null,
    "userId": "",
    "metadata": {},
    "deletedAt": null,
    "createdAt": "2026-07-10T10:00:00Z",
    "updatedAt": "2026-07-10T10:00:00Z"
  },
  "runId": null
}
```

#### Errors

`400 validation_failed` for invalid fields or schedule. `404 agent_version_not_found` for a missing pinned version, `409 agent_disabled` when an immediate run hits a disabled agent, and `409 admin_agent_managed` because the platform-managed `ba assist` agent cannot run tasks. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/tasks" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"agentId":"ag_1234567890ABCDEF","name":"Daily summary","prompt":"Summarize open support cases.","schedule":{"kind":"cron","config":{"expression":"0 9 * * 1-5","timezone":"Europe/London"}}}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/tasks#create) / [Python](/sdk/python/tasks#create). See [Tasks and schedules](/automation/tasks).

### GET /v1/tasks [#list-tasks]

Lists tasks with their latest run status, one page at a time.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |

| Query parameter | Type    | Default | Description                                 |
| --------------- | ------- | ------- | ------------------------------------------- |
| `agentId`       | string  | none       | Restrict to one Agent                       |
| `userId`        | string  | none       | Attribution filter; `""` means tenant-level |
| `cursor`        | string  | none       | Opaque cursor                               |
| `limit`         | integer | 50      | 1–200                                       |

#### Response

Returns `200 OK` with `{ data, nextCursor }`. Each `data` item is a complete [Task](/api-reference/protocols/objects-and-schemas#task) plus `latestRun: { id, status, finishedAt } | null`.

Response schema: [`tasksListResponseSchema`](/api-reference/protocols/objects-and-schemas#tasks-list-response).

```json
{
  "data": [
    {
      "id": "tk_1234567890ABCDEF",
      "tenantId": "ten_1234567890ABCDEF",
      "agentId": "ag_1234567890ABCDEF",
      "agentVersion": null,
      "name": "Daily summary",
      "prompt": "Summarize open support cases.",
      "schedule": null,
      "enabled": true,
      "activeRunId": null,
      "latestRunId": "tr_1234567890ABCDEF",
      "userId": "",
      "metadata": {},
      "deletedAt": null,
      "createdAt": "2026-07-10T10:00:00Z",
      "updatedAt": "2026-07-10T10:03:00Z",
      "latestRun": {
        "id": "tr_1234567890ABCDEF",
        "status": "succeeded",
        "finishedAt": "2026-07-10T10:03:00Z"
      }
    }
  ],
  "nextCursor": null
}
```

#### Errors

`400 validation_failed` for invalid filters or limits; `400 invalid_cursor`
for an opaque cursor that cannot be decoded. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --get "$BLAZING_AGENTS_BASE_URL/v1/tasks" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --data-urlencode "agentId=ag_1234567890ABCDEF" \
  --data-urlencode "limit=50"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/tasks#list) / [Python](/sdk/python/tasks#list). See [Tasks and schedules](/automation/tasks).

### GET /v1/tasks/:taskId [#get-task]

Retrieves a task without running it.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a `tk_…` `taskId` path parameter. There are no query or body parameters. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `taskId`        | yes      | Task ID (`tk_…`).                         |

#### Response

Returns `200 OK` with the complete [Task object](/api-reference/protocols/objects-and-schemas#task).

Response schema: [`taskResponseSchema`](/api-reference/protocols/objects-and-schemas#task-response).

```json
{
  "id": "tk_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "agentVersion": null,
  "name": "Daily summary",
  "prompt": "Summarize open support cases.",
  "schedule": null,
  "enabled": true,
  "activeRunId": null,
  "latestRunId": null,
  "userId": "",
  "metadata": {},
  "deletedAt": null,
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

`400 validation_failed` for a malformed ID. `404 not_found` when the Task is missing, foreign, or deleted. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/tasks#get) / [Python](/sdk/python/tasks#get). See [Tasks and schedules](/automation/tasks).

### PATCH /v1/tasks/:taskId [#update-task]

Updates a task. Schedule and enabled changes take effect for future runs.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), JSON, and a `tk_…` `taskId`. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `taskId`        | yes      | Task ID (`tk_…`).                         |

| Body field     | Type            | Required | Description                     |
| -------------- | --------------- | -------- | ------------------------------- |
| `name`         | string          | no       | New name                        |
| `agentVersion` | integer \| null | no       | Pin a Version or follow current |
| `prompt`       | string          | no       | New fixed instruction           |
| `schedule`     | object \| null  | no       | Replacement schedule or `null`  |
| `enabled`      | boolean         | no       | Scheduling switch               |
| `metadata`     | object          | no       | Replacement metadata            |

At least one field is required.

#### Response

Returns `200 OK` with the complete updated [Task object](/api-reference/protocols/objects-and-schemas#task).

Response schema: [`taskSchema`](/api-reference/protocols/objects-and-schemas#task).

#### Errors

`400 validation_failed` for invalid/empty fields or schedule. `404 not_found` applies to a missing Task; `404 agent_version_not_found` rejects a missing pin, and `409 admin_agent_managed` for the platform-managed `ba assist` agent. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request PATCH \
  "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"enabled":false,"metadata":{"pausedBy":"ops"}}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/tasks#update) / [Python](/sdk/python/tasks#update). See [Tasks and schedules](/automation/tasks).

### DELETE /v1/tasks/:taskId [#delete-task]

Deletes a task. Its past runs and sessions are kept.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a `tk_…` `taskId`. There are no query or body parameters. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `taskId`        | yes      | Task ID (`tk_…`).                         |

#### Response

Returns `204 No Content` with an empty body.

#### Errors

`400 validation_failed` for a malformed ID; `409 task_active_run_exists` while
a run is active. `404 not_found` applies when the Task is missing, foreign, or
already deleted. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request DELETE \
  "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/tasks#delete) / [Python](/sdk/python/tasks#delete). See [Tasks and schedules](/automation/tasks).

## Next [#next]

- [Tasks and schedules](/automation/tasks) to plan background work.
- [Task runs API](/api-reference/rest-api/task-runs) to start and watch runs.
