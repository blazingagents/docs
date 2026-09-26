---
title: Task runs
description: Start a task run, watch its progress and transcript, and cancel it.
---

# Task runs

## Tool approval policy [#tool-approval-policy]

Task runs follow the agent version's `approvalInTasks` policy. Nobody is
there to approve a tool call during a run, so calls that need manual approval,
or that automatic review escalates to a person, are denied. The agent is told
which actions were blocked and keeps going with what it is allowed to do. If a
run ends up waiting for a person anyway, it fails. See
[Tool approvals](/agents/tools/tool-approvals).

## Overview [#overview]

A task run is one execution of a task. Start a run on demand, poll its status and transcript while it works, and ask it to stop. Runs keep going if your connection drops.

## Endpoints [#endpoints]

### POST /v1/tasks/:taskId/runs [#create-task-run]

Queues a task run now. Send an idempotency key to get the same run back on a retry.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), JSON, and a `tk_…` `taskId` path parameter. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
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

The run starts as `queued`. Repeating a request with the same idempotency key
returns the same run. Poll
[Get a Task run](/api-reference/rest-api/task-runs#get-task-run) to follow it.

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

SDKs: [TypeScript](/sdk/typescript/tasks#create-run) / [Python](/sdk/python/tasks#submit). See [Tasks and schedules](/automation/tasks).

### GET /v1/tasks/:taskId/runs [#list-task-runs]

Lists a task's runs newest first, one page at a time.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a `tk_…` `taskId`. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `taskId`        | yes      | Task ID (`tk_…`).                         |

| Query parameter | Type    | Default | Description   |
| --------------- | ------- | ------- | ------------- |
| `cursor`        | string  | none       | Opaque cursor |
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

`turnId` stays `null` until the run's turn starts. A blocked run has no turn
ID.

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

SDKs: [TypeScript](/sdk/typescript/tasks#list-runs) / [Python](/sdk/python/tasks#list-runs). See [Tasks and schedules](/automation/tasks).

### GET /v1/tasks/:taskId/runs/:runId [#get-task-run]

Retrieves a task run's current state.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), a `tk_…` `taskId`, and a `tr_…` `runId`. There are no query or body parameters. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `taskId`        | yes      | Task ID (`tk_…`).                         |
| Path     | `runId`         | yes      | Task run ID (`tr_…`).                     |

#### Response

Returns `200 OK` with a complete [Task run object](/api-reference/protocols/objects-and-schemas#task-run). `sessionId` stays `null` until the run starts its session. `error` is populated for a failed run.

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
| `queued`    | Accepted and waiting to start; canceling now ends it before it runs.                                                 |
| `running`   | The run has started and may already have its session.                                                                |
| `blocked`   | Final. Not allowed to start by a quota, subscription, or usage-credit check; `error` says which.                    |
| `succeeded` | Final. Finished successfully.                                                                                        |
| `failed`    | Final. A configuration, execution, or platform failure; `error` describes it.                                        |
| `canceled`  | Final. Stopped by a cancel request, while queued or running.                                                         |

Every final status sets `finishedAt` and lets the task start another run. `blocked` is not `failed`: it means the run was not allowed to start, for example because a quota was reached, not that something broke.

If the run's agent version has no provider and model, the run fails before it starts with `error: "provider_required"`, and `sessionId` and `turnId` stay `null`. A pinned version whose provider was deleted fails the same way with `error: "provider_not_found"`.

#### Errors

`400 validation_failed` for malformed IDs. `404 not_found` when the Task or run is missing, foreign, or mismatched. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl \
  "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF/runs/tr_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/tasks#get-run) / [Python](/sdk/python/tasks#get-run). See [Tasks and schedules](/automation/tasks).

### GET /v1/tasks/:taskId/runs/:runId/messages [#list-task-run-messages]

Lists a task run's transcript. It returns an empty page until the run starts its session.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), a `tk_…` `taskId`, and a `tr_…` `runId`. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `taskId`        | yes      | Task ID (`tk_…`).                         |
| Path     | `runId`         | yes      | Task run ID (`tr_…`).                     |

| Query parameter | Type    | Default | Description                       |
| --------------- | ------- | ------- | --------------------------------- |
| `cursor`        | string  | none       | Walk backward to older messages   |
| `after`         | string  | none       | Poll forward after `latestCursor` |
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

Save `latestCursor` from each response and pass it as `after` to get only newer messages. While the run is still going, an empty page does not mean it is done; poll again.

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

SDKs: [TypeScript](/sdk/typescript/tasks#run-messages) / [Python](/sdk/python/tasks#run-messages). See [Tasks and schedules](/automation/tasks).

### POST /v1/tasks/:taskId/runs/:runId/cancel [#cancel-task-run]

Asks an active task run to stop. The run stops shortly after, not immediately.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), a `tk_…` `taskId`, and a `tr_…` `runId`. There are no query or body parameters. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `taskId`        | yes      | Task ID (`tk_…`).                         |
| Path     | `runId`         | yes      | Task run ID (`tr_…`).                     |

#### Response

Returns `204 No Content` with an empty body once the task is found. If the run is missing, belongs to another task or tenant, or has already finished, nothing happens and you still get `204`, so the response never reveals which runs exist.

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

SDKs: [TypeScript](/sdk/typescript/tasks#cancel-run) / [Python](/sdk/python/tasks#cancel-run). See [Tasks and schedules](/automation/tasks).

## Next [#next]

- [Tasks and schedules](/automation/tasks) to plan background work.
- [Pagination and filtering](/api-reference/protocols/pagination-and-filtering) to poll a run's transcript.
