---
title: Task runs
description: Start, inspect, poll, and cancel Task runs.
---

# Task runs

## Overview [#overview]

Task runs are durable executions of Task definitions. Use these endpoints to enqueue on-demand work, poll its lifecycle and transcript, or request cooperative cancellation.

## Endpoints [#endpoints]

### POST /v1/tasks/:taskId/runs [#create-task-run]

Enqueues an immediate Task run. An optional idempotency key reuses the existing run.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), JSON, and a `tk_…` `taskId` path parameter. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `taskId`        | yes      | Task ID (`tk_…`).                         |

| Body field       | Type   | Required | Description                         |
| ---------------- | ------ | -------- | ----------------------------------- |
| `idempotencyKey` | string | no       | Non-empty tenant-defined replay key |

Send `{}` when no key is needed. There are no query parameters.

#### Response

Returns `202 Accepted`.

Response schema: [`createTaskRunResponseSchema`](/api-reference/protocols/objects-and-schemas#create-task-run-response).

```json
{ "runId": "tr_1234567890ABCDEF" }
```

The run begins as `queued` and the API immediately enqueues its deterministic
DBOS workflow. Repeating an idempotent request attaches to the same logical
run. A low-frequency repair path recovers the cross-database case where the
product row committed before DBOS enqueue succeeded. Poll
[Get a Task run](/api-reference/rest-api/task-runs#get-task-run).

#### Errors

`400 validation_failed` for invalid input; `409 task_active_run_exists` when another run is active. `404 not_found` applies to a missing Task; `404 agent_version_not_found` rejects a missing pin, and `409 agent_disabled` rejects a disabled Agent. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST \
  "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF/runs" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"idempotencyKey":"daily-summary-2026-07-10"}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/tasks#create-run) / [Python](/sdk/python/tasks#submit). See [Tasks and schedules](/automation/tasks) and [Run a background Task](/automation/tasks).

### GET /v1/tasks/:taskId/runs [#list-task-runs]

Lists a Task's runs newest first with cursor pagination.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a `tk_…` `taskId`. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `taskId`        | yes      | Task ID (`tk_…`).                         |

| Query parameter | Type    | Default | Description   |
| --------------- | ------- | ------- | ------------- |
| `cursor`        | string  | —       | Opaque cursor |
| `limit`         | integer | 50      | 1–200         |

#### Response

Returns `200 OK` with `{ data, nextCursor }`. Each item is a complete [Task run object](/api-reference/protocols/objects-and-schemas#task-run).

Response schema: [`taskRunsListResponseSchema`](/api-reference/protocols/objects-and-schemas#task-runs-list-response).

```json
{
  "data": [
    {
      "id": "tr_1234567890ABCDEF",
      "taskId": "tk_1234567890ABCDEF",
      "tenantId": "ten_1234567890ABCDEF",
      "agentId": "ag_1234567890ABCDEF",
      "agentVersion": 3,
      "sessionId": "ss_1234567890ABCDEF",
      "turnId": "turn_1234567890ABCDEF",
      "status": "succeeded",
      "error": null,
      "userId": "",
      "metadata": {},
      "startedAt": "2026-07-10T10:00:01Z",
      "finishedAt": "2026-07-10T10:03:00Z",
      "cancelRequestedAt": null,
      "canceledAt": null,
      "createdAt": "2026-07-10T10:00:00Z",
      "updatedAt": "2026-07-10T10:03:00Z"
    }
  ],
  "nextCursor": null
}
```

`turnId` remains `null` until execution passes Turn admission. A blocked run
has no Turn ID.

#### Errors

`400 validation_failed` for a malformed Task ID or limit; `400 invalid_cursor`
for an opaque cursor that cannot be decoded. `404 not_found` applies when the
Task is missing, foreign, or deleted. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --get \
  "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF/runs" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --data-urlencode "limit=50"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/tasks#list-runs) / [Python](/sdk/python/tasks#list-runs). See [Tasks and schedules](/automation/tasks) and [Run a background Task](/automation/tasks).

### GET /v1/tasks/:taskId/runs/:runId [#get-task-run]

Retrieves durable Task run state without restarting execution.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), a `tk_…` `taskId`, and a `tr_…` `runId`. There are no query or body parameters. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `taskId`        | yes      | Task ID (`tk_…`).                         |
| Path     | `runId`         | yes      | Task run ID (`tr_…`).                     |

#### Response

Returns `200 OK` with a complete [Task run object](/api-reference/protocols/objects-and-schemas#task-run). `sessionId` remains `null` until the worker attaches a fresh Session. `error` is populated for a failed run.

Response schema: [`taskRunResponseSchema`](/api-reference/protocols/objects-and-schemas#task-run-response).

```json
{
  "id": "tr_1234567890ABCDEF",
  "taskId": "tk_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "agentVersion": 3,
  "sessionId": null,
  "turnId": null,
  "status": "queued",
  "error": null,
  "userId": "",
  "metadata": {},
  "startedAt": null,
  "finishedAt": null,
  "cancelRequestedAt": null,
  "canceledAt": null,
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

Run status follows this lifecycle:

| Status      | Meaning                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------- |
| `queued`    | Accepted and waiting for the durable worker; cancellation can finish it before execution.                            |
| `running`   | The worker claimed the run and may have attached its fresh Session.                                                  |
| `blocked`   | Terminal expected admission denial from quota, subscription, or Usage-credit checks; `error` explains the denial.   |
| `succeeded` | Terminal successful completion.                                                                                      |
| `failed`    | Terminal configuration, execution, or infrastructure failure; `error` describes the failure.                          |
| `canceled`  | Terminal cooperative cancellation, whether observed while queued or running.                                         |

Every terminal status sets `finishedAt` and releases the Task's active-run slot. `blocked` is distinct from `failed`: an expected admission denial is a soft block rather than an execution fault.

When the recorded Agent Version is unconfigured, the run fails before quota or execution state with `error: "provider_required"`; `sessionId` and `turnId` remain `null`. A historical Version Pin whose Provider has since been deleted fails the same way with `error: "provider_not_found"`. These values use the existing `status` and `error` fields returned by both the REST API and SDKs.

#### Errors

`400 validation_failed` for malformed IDs. `404 not_found` when the Task or run is missing, foreign, or mismatched. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl \
  "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF/runs/tr_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/tasks#get-run) / [Python](/sdk/python/tasks#get-run). See [Tasks and schedules](/automation/tasks) and [Run a background Task](/automation/tasks).

### GET /v1/tasks/:taskId/runs/:runId/messages [#list-task-run-messages]

Lists a Task run's Session transcript. It returns an empty page until a Session exists.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), a `tk_…` `taskId`, and a `tr_…` `runId`. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `taskId`        | yes      | Task ID (`tk_…`).                         |
| Path     | `runId`         | yes      | Task run ID (`tr_…`).                     |

| Query parameter | Type    | Default | Description                       |
| --------------- | ------- | ------- | --------------------------------- |
| `cursor`        | string  | —       | Walk backward to older messages   |
| `after`         | string  | —       | Poll forward after `latestCursor` |
| `limit`         | integer | 50      | 1–200                             |

`cursor` and `after` are mutually exclusive.

#### Response

Returns `200 OK` with `{ data, nextCursor, latestCursor }`, the same shape and ordering as [List Session messages](/api-reference/rest-api/sessions#list-session-messages).

Response schema: [`taskRunMessagesResponseSchema`](/api-reference/protocols/objects-and-schemas#task-run-messages-response).

```json
{
  "data": [
    {
      "id": "msg_1",
      "role": "assistant",
      "parts": [{ "type": "text", "text": "Summary complete." }]
    }
  ],
  "nextCursor": null,
  "latestCursor": "eyJzZXEiOjF9"
}
```

Save `latestCursor` from each response and pass it as `after` to poll only messages appended later. An empty forward page can still be followed by another poll while the run is non-terminal.

#### Errors

`400 validation_failed` for malformed IDs, limits, or incompatible cursor
directions; `400 invalid_cursor` for an opaque cursor that cannot be decoded.
`404 not_found` applies to a missing or foreign Task or run. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --get \
  "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF/runs/tr_1234567890ABCDEF/messages" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --data-urlencode "after=eyJzZXEiOjF9" \
  --data-urlencode "limit=50"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/tasks#run-messages) / [Python](/sdk/python/tasks#run-messages). See [Tasks and schedules](/automation/tasks) and [Run a background Task](/automation/tasks).

### POST /v1/tasks/:taskId/runs/:runId/cancel [#cancel-task-run]

Requests cooperative cancellation of an active Task run. The transition occurs asynchronously.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), a `tk_…` `taskId`, and a `tr_…` `runId`. There are no query or body parameters. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `taskId`        | yes      | Task ID (`tk_…`).                         |
| Path     | `runId`         | yes      | Task run ID (`tr_…`).                     |

#### Response

Returns `204 No Content` with an empty body after an owned Task is found. A missing or foreign run, a run belonging to another Task, a non-active run, and a terminal run are deliberately non-enumerating no-ops.

#### Errors

`400 validation_failed` for malformed Task or run IDs. `404 not_found` when the Task is missing, foreign, or deleted. Standard authentication and service errors also apply. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST \
  "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF/runs/tr_1234567890ABCDEF/cancel" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

Poll [Get a Task run](/api-reference/rest-api/task-runs#get-task-run) for the resulting status.

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/tasks#cancel-run) / [Python](/sdk/python/tasks#cancel-run). See [Tasks and schedules](/automation/tasks) and [Run a background Task](/automation/tasks).

## Related [#related]

- [TypeScript SDK](/sdk/typescript)
- [Objects and schemas](/api-reference/protocols/objects-and-schemas)
- [Errors](/api-reference/protocols/errors)
