---
title: Tasks
description: Run agent work in the background, on demand or on a schedule.
---

# Tasks

## Overview [#overview]

A task is a saved prompt for an agent that runs in the background, on demand or on a schedule. Each run gets its own record and transcript, so you can check on it later. Use tasks for reports, syncs, and other work nobody waits on.

Pass `idempotencyKey` when creating a task that your backend may retry. Repeating the same request with the same key returns the current task definition and original initial run ID. A different request, or a retry after deleting the task, returns `idempotency_conflict`.

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

Lists your tasks, most recently updated first, one page at a time. Each task includes `latestRun` with the status of its most recent run, or `null` if it has never run, and `nextFireAt` for its next scheduled fire, or `null` if none is pending. Filter by agent or by end user, and pass `nextCursor` as `cursor` to get the next page.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | query |  | Return only tasks for this agent. |
| `userId` | string | query |  | Return only tasks for this end user. An empty string returns tenant-level tasks. |
| `cursor` | string \| null | query |  | `nextCursor` from the previous page. |
| `limit` | integer | query |  | Tasks per page, 1 to 200. 1–200. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. A page of tasks.

Response schema: `TaskList`.

```json
{
  "data": [
    {
      "id": "tk_6Wq3Hn8ZpL2vRt5C",
      "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
      "agentId": "ag_4kP9sT2vXq7LmN3a",
      "agentVersion": null,
      "name": "Daily support summary",
      "prompt": "Summarize yesterday's open support cases and flag any that are overdue.",
      "schedule": {
        "kind": "cron",
        "config": {
          "expression": "0 9 * * 1-5",
          "timezone": "Europe/London"
        }
      },
      "enabled": true,
      "nextFireAt": null,
      "activeRunId": null,
      "latestRunId": "tr_9Jd4Ks7NbV2xQm6P",
      "userId": "",
      "metadata": {
        "team": "support"
      },
      "deletedAt": null,
      "createdAt": "2026-07-10T10:00:00.000Z",
      "updatedAt": "2026-07-10T10:03:00.000Z",
      "latestRun": {
        "id": "tr_9Jd4Ks7NbV2xQm6P",
        "status": "succeeded",
        "finishedAt": "2026-07-10T10:03:00.000Z"
      }
    }
  ],
  "nextCursor": null
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/tasks" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/tasks [#create-task]

Create a task.

Creates a task: a saved prompt your agent runs in the background. With a `schedule`, the task runs by itself; without one, it runs only when you start it. Send `submit: true` to start a run right away, which returns `202 Accepted` with the run's ID in `runId`; otherwise you get `201 Created` and `runId` is `null`. Send an `idempotencyKey` to retry safely. Matching retries return the current task definition and the original initial run ID. Changed requests or a deleted task return 409. Keys are separate for tenant-wide access and each scoped user. Without a key, each request creates another task. The platform-managed `ba assist` agent cannot run tasks.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `idempotencyKey` | string | body |  | Retry the same creation with this key to return the current task and its original initial run. Changed requests or deleted tasks return a conflict. |
| `agentId` | string | body | required | ID of the agent that runs the task. It cannot change later. |
| `agentVersion` | integer \| null | body |  | Agent version to run. `null` runs whatever version is current when each run starts. 1–2147483647. Defaults to `null`. |
| `name` | string | body | required | Display name, 1 to 80 characters. 1–80 characters. |
| `prompt` | string | body | required | The prompt the agent receives on every run, 1 to 6,000 characters. 1–6000 characters. |
| `schedule` | object \| null | body |  | When the task runs by itself: `once` at a time, every `everyMs` milliseconds (at least 60,000) for `interval`, or a five-field cron expression in an IANA timezone for `cron`. `null` means the task runs only when you start it. Defaults to `null`. |
| `enabled` | boolean | body |  | Whether the schedule fires. A disabled task can still be started on demand. Defaults to `true`. |
| `submit` | boolean | body |  | Start a run as soon as the task is created. Defaults to `false`. |
| `userId` | string | body |  | Your end user's ID, used for attribution. An empty string means a tenant-level task. It cannot change after creation. Defaults to `""`. |
| `metadata` | object | body |  | Your own key-value data, returned unchanged and copied to each run. Defaults to `{}`. |

#### Response

Returns `201 Created` as `application/json`. The created task.

Response schema: `CreatedTask`.

```json
{
  "task": {
    "id": "tk_6Wq3Hn8ZpL2vRt5C",
    "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
    "agentId": "ag_4kP9sT2vXq7LmN3a",
    "agentVersion": null,
    "name": "Daily support summary",
    "prompt": "Summarize yesterday's open support cases and flag any that are overdue.",
    "schedule": {
      "kind": "cron",
      "config": {
        "expression": "0 9 * * 1-5",
        "timezone": "Europe/London"
      }
    },
    "enabled": true,
    "nextFireAt": "2026-07-13T08:00:00.000Z",
    "activeRunId": null,
    "latestRunId": null,
    "userId": "",
    "metadata": {
      "team": "support"
    },
    "deletedAt": null,
    "createdAt": "2026-07-10T10:00:00.000Z",
    "updatedAt": "2026-07-10T10:00:00.000Z"
  },
  "runId": null
}
```

Returns `202 Accepted` as `application/json`. The created task and the ID of its queued run.

Response schema: `CreatedTask`.

```json
{
  "task": {
    "id": "tk_6Wq3Hn8ZpL2vRt5C",
    "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
    "agentId": "ag_4kP9sT2vXq7LmN3a",
    "agentVersion": null,
    "name": "Daily support summary",
    "prompt": "Summarize yesterday's open support cases and flag any that are overdue.",
    "schedule": null,
    "enabled": true,
    "nextFireAt": null,
    "activeRunId": "tr_9Jd4Ks7NbV2xQm6P",
    "latestRunId": "tr_9Jd4Ks7NbV2xQm6P",
    "userId": "",
    "metadata": {
      "team": "support"
    },
    "deletedAt": null,
    "createdAt": "2026-07-10T10:00:00.000Z",
    "updatedAt": "2026-07-10T10:00:00.000Z"
  },
  "runId": "tr_9Jd4Ks7NbV2xQm6P"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found), [`agent_version_not_found`](/api-reference/protocols/errors#agent_version_not_found) | The resource was not found |
| `409` | [`agent_disabled`](/api-reference/protocols/errors#agent_disabled), [`admin_agent_managed`](/api-reference/protocols/errors#admin_agent_managed), [`idempotency_conflict`](/api-reference/protocols/errors#idempotency_conflict) | The request conflicts with the resource's current state |
| `429` | [`rate_limited`](/api-reference/protocols/errors#rate_limited) | Too many requests |
| `503` | [`service_unavailable`](/api-reference/protocols/errors#service_unavailable) | The service is temporarily unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/tasks" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"agentId":"ag_4kP9sT2vXq7LmN3a","name":"Daily support summary","prompt":"Summarize yesterday'\''s open support cases and flag any that are overdue.","schedule":{"kind":"cron","config":{"expression":"0 9 * * 1-5","timezone":"Europe/London"}},"metadata":{"team":"support"}}'
```

### GET /v1/tasks/:taskId [#get-task]

Get a task.

Returns a task without running it. `activeRunId` is the run in progress, if any, and `latestRunId` is the most recent run.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `taskId` | string | path | required | ID of the task. |

#### Response

Returns `200 OK` as `application/json`. The task.

Response schema: `Task`.

```json
{
  "id": "tk_6Wq3Hn8ZpL2vRt5C",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "agentId": "ag_4kP9sT2vXq7LmN3a",
  "agentVersion": null,
  "name": "Daily support summary",
  "prompt": "Summarize yesterday's open support cases and flag any that are overdue.",
  "schedule": {
    "kind": "cron",
    "config": {
      "expression": "0 9 * * 1-5",
      "timezone": "Europe/London"
    }
  },
  "enabled": true,
  "nextFireAt": "2026-07-13T08:00:00.000Z",
  "activeRunId": null,
  "latestRunId": null,
  "userId": "",
  "metadata": {
    "team": "support"
  },
  "deletedAt": null,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PATCH /v1/tasks/:taskId [#update-task]

Update a task.

Updates a task. Send at least one field; fields you leave out keep their values. A run already in progress keeps the settings it started with. The agent and `userId` cannot change: to point a task at another agent, create a new task.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `taskId` | string | path | required | ID of the task. |
| `agentVersion` | integer \| null | body |  | Agent version to run. `null` runs whatever version is current when each run starts. 1–2147483647. |
| `name` | string | body |  | Display name, 1 to 80 characters. 1–80 characters. |
| `prompt` | string | body |  | The prompt the agent receives on every run, 1 to 6,000 characters. 1–6000 characters. |
| `schedule` | object \| null | body |  | When the task runs by itself: `once` at a time, every `everyMs` milliseconds (at least 60,000) for `interval`, or a five-field cron expression in an IANA timezone for `cron`. `null` means the task runs only when you start it. |
| `enabled` | boolean | body |  | Whether the schedule fires. A disabled task can still be started on demand. |
| `metadata` | object | body |  | Your own key-value data. Replaces the current metadata. |

#### Response

Returns `200 OK` as `application/json`. The updated task.

Response schema: `Task`.

```json
{
  "id": "tk_6Wq3Hn8ZpL2vRt5C",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "agentId": "ag_4kP9sT2vXq7LmN3a",
  "agentVersion": null,
  "name": "Daily support summary",
  "prompt": "Summarize yesterday's open support cases and flag any that are overdue.",
  "schedule": {
    "kind": "cron",
    "config": {
      "expression": "0 9 * * 1-5",
      "timezone": "Europe/London"
    }
  },
  "enabled": false,
  "nextFireAt": null,
  "activeRunId": null,
  "latestRunId": null,
  "userId": "",
  "metadata": {
    "team": "support",
    "pausedBy": "ops"
  },
  "deletedAt": null,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:15:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found), [`agent_version_not_found`](/api-reference/protocols/errors#agent_version_not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"enabled":false,"metadata":{"team":"support","pausedBy":"ops"}}'
```

### DELETE /v1/tasks/:taskId [#delete-task]

Delete a task.

Deletes a task and stops its schedule. Its past runs and their transcripts are kept. A task with a queued or running run cannot be deleted: wait for the run to finish or cancel it first. After deletion, the task ID returns `404` everywhere.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `taskId` | string | path | required | ID of the task. |

#### Response

Returns `204 No Content`. The task was deleted.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`task_active_run_exists`](/api-reference/protocols/errors#task_active_run_exists) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Tasks and schedules](/automation/tasks) to plan background work.
- [Task runs API](/api-reference/rest-api/task-runs) to start and watch runs.
