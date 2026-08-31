---
title: Tasks
description: Create and manage asynchronous Task definitions and schedules.
---

# Tasks

## Overview [#overview]

Tasks define reusable asynchronous Agent work with optional schedules. Use them for on-demand execution or recurring automation whose runs remain independently observable.

## Endpoints [#endpoints]

### POST /v1/tasks [#create-task]

Creates a Task for on-demand or scheduled execution.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and JSON. There are no path or query parameters. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |

| Body field     | Type            | Required | Default |
| -------------- | --------------- | -------- | ------- |
| `agentId`      | string          | yes      | —       |
| `agentVersion` | integer \| null | no       | `null`  |
| `name`         | string          | yes      | —       |
| `prompt`       | string          | yes      | —       |
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

`400 validation_failed` for invalid fields or schedule. `404 agent_version_not_found`, `409 agent_disabled`, and `409 admin_agent_managed` can reject the selected Agent Version or an immediate submission. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/tasks" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"agentId":"ag_1234567890ABCDEF","name":"Daily summary","prompt":"Summarize open support cases.","schedule":{"kind":"cron","config":{"expression":"0 9 * * 1-5","timezone":"Europe/London"}}}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/tasks#create) / [Python](/sdk/python/tasks#create). See [Tasks and schedules](/automation/tasks) and [Schedule recurring work](/automation/schedules).

### GET /v1/tasks [#list-tasks]

Lists non-deleted Tasks with latest run status and cursor pagination.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |

| Query parameter | Type    | Default | Description                                 |
| --------------- | ------- | ------- | ------------------------------------------- |
| `agentId`       | string  | —       | Restrict to one Agent                       |
| `userId`        | string  | —       | Attribution filter; `""` means tenant-level |
| `cursor`        | string  | —       | Opaque cursor                               |
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

SDKs: [TypeScript](/sdk/typescript/tasks#list) / [Python](/sdk/python/tasks#list). See [Tasks and schedules](/automation/tasks) and [Schedule recurring work](/automation/schedules).

### GET /v1/tasks/:taskId [#get-task]

Retrieves a non-deleted Task without triggering execution.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a `tk_…` `taskId` path parameter. There are no query or body parameters. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
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

SDKs: [TypeScript](/sdk/typescript/tasks#get) / [Python](/sdk/python/tasks#get). See [Tasks and schedules](/automation/tasks) and [Schedule recurring work](/automation/schedules).

### PATCH /v1/tasks/:taskId [#update-task]

Updates mutable Task fields. Schedule and enabled-state changes synchronize durably.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), JSON, and a `tk_…` `taskId`. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
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

`400 validation_failed` for invalid/empty fields or schedule. `404 not_found` applies to a missing Task; `404 agent_version_not_found` rejects a missing pin, and `409 admin_agent_managed` protects the Admin Agent. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request PATCH \
  "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"enabled":false,"metadata":{"pausedBy":"ops"}}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/tasks#update) / [Python](/sdk/python/tasks#update). See [Tasks and schedules](/automation/tasks) and [Schedule recurring work](/automation/schedules).

### DELETE /v1/tasks/:taskId [#delete-task]

Soft-deletes a Task while preserving existing runs and Sessions.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a `tk_…` `taskId`. There are no query or body parameters. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
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

SDKs: [TypeScript](/sdk/typescript/tasks#delete) / [Python](/sdk/python/tasks#delete). See [Tasks and schedules](/automation/tasks) and [Schedule recurring work](/automation/schedules).

## Related [#related]

- [TypeScript SDK](/sdk/typescript)
- [Objects and schemas](/api-reference/protocols/objects-and-schemas)
- [Errors](/api-reference/protocols/errors)
