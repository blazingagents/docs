---
title: Task runs
description: Start a task run, watch its progress and transcript, and cancel it.
---

# Task runs

## Overview [#overview]

A task run is one execution of a task. Start a run on demand, poll its status and transcript while it works, and ask it to stop. Runs keep going if your connection drops.

## Tool approval policy [#tool-approval-policy]

Task runs follow the agent version's `approvalInTasks` policy. Nobody is
there to approve a tool call during a run, so calls that need manual approval,
or that automatic review escalates to a person, are denied. The agent is told
which actions were blocked and keeps going with what it is allowed to do. If a
run ends up waiting for a person anyway, it fails. See
[Tool approvals](/agents/tools/tool-approvals).

## Endpoints [#endpoints]

### GET /v1/tasks/:taskId/runs [#list-task-runs]

List a task's runs.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `taskId` | string | path | required | `tk_…` ID. |
| `cursor` | string | query |  |  |
| `limit` | integer | query |  | 1–200. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. A page of task runs.

Response schema: `TaskRunList`.

```json
{
  "data": [
    {
      "id": "tr_1234567890ABCDEF",
      "taskId": "tk_1234567890ABCDEF",
      "tenantId": "ten_1234567890ABCDEF",
      "agentId": "ag_1234567890ABCDEF",
      "agentVersion": 1,
      "sessionId": "ss_1234567890ABCDEF",
      "turnId": "turn_1234567890ABCDEF",
      "status": "queued",
      "error": "string",
      "userId": "string",
      "metadata": {},
      "startedAt": "2026-07-10T10:00:00Z",
      "finishedAt": "2026-07-10T10:00:00Z",
      "cancelRequestedAt": "2026-07-10T10:00:00Z",
      "canceledAt": "2026-07-10T10:00:00Z",
      "createdAt": "2026-07-10T10:00:00Z",
      "updatedAt": "2026-07-10T10:00:00Z"
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
curl "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF/runs" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/tasks/:taskId/runs [#create-task-run]

Enqueue a task run.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `taskId` | string | path | required | `tk_…` ID. |
| `idempotencyKey` | string | body |  |  |

#### Response

Returns `202 Accepted` as `application/json`. The queued run id.

Response schema: `CreatedTaskRun`.

```json
{
  "runId": "tr_1234567890ABCDEF"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |
| `409` |  | A run is already active for the task |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF/runs" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"idempotencyKey":"string"}'
```

### GET /v1/tasks/:taskId/runs/:runId [#get-task-run]

Get a task run.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `taskId` | string | path | required | `tk_…` ID. |
| `runId` | string | path | required | `tr_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The task run.

Response schema: `TaskRun`.

```json
{
  "id": "tr_1234567890ABCDEF",
  "taskId": "tk_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "agentVersion": 1,
  "sessionId": "ss_1234567890ABCDEF",
  "turnId": "turn_1234567890ABCDEF",
  "status": "queued",
  "error": "string",
  "userId": "string",
  "metadata": {},
  "startedAt": "2026-07-10T10:00:00Z",
  "finishedAt": "2026-07-10T10:00:00Z",
  "cancelRequestedAt": "2026-07-10T10:00:00Z",
  "canceledAt": "2026-07-10T10:00:00Z",
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
curl "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF/runs/tr_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/tasks/:taskId/runs/:runId/messages [#list-task-run-messages]

List a task run's session messages.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `taskId` | string | path | required | `tk_…` ID. |
| `runId` | string | path | required | `tr_…` ID. |
| `after` | string | query |  |  |
| `cursor` | string | query |  |  |
| `limit` | integer | query |  | 1–200. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. A page of session messages plus run state.

Response schema: `TaskRunMessageList`.

```json
{
  "data": [
    {
      "id": "string",
      "role": "system",
      "parts": [
        {
          "type": "string"
        }
      ],
      "metadata": {}
    }
  ],
  "nextCursor": "string",
  "latestCursor": "string",
  "error": "string",
  "finishedAt": "2026-07-10T10:00:00Z",
  "status": "queued"
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
curl "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF/runs/tr_1234567890ABCDEF/messages" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/tasks/:taskId/runs/:runId/cancel [#cancel-task-run]

Cancel a task run.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `taskId` | string | path | required | `tk_…` ID. |
| `runId` | string | path | required | `tr_…` ID. |

#### Response

Returns `204 No Content`. Cancellation requested.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF/runs/tr_1234567890ABCDEF/cancel" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Tasks and schedules](/automation/tasks) to plan background work.
- [Pagination and filtering](/api-reference/protocols/pagination-and-filtering) to poll a run's transcript.
