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

Lists a task's runs, newest first, one page at a time. Pass `nextCursor` as `cursor` to get the next page.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `taskId` | string | path | required | ID of the task. |
| `cursor` | string | query |  | `nextCursor` from the previous page. |
| `limit` | integer | query |  | Runs per page, 1 to 200. 1–200. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. A page of task runs.

Response schema: `TaskRunList`.

```json
{
  "data": [
    {
      "id": "tr_9Jd4Ks7NbV2xQm6P",
      "taskId": "tk_6Wq3Hn8ZpL2vRt5C",
      "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
      "agentId": "ag_4kP9sT2vXq7LmN3a",
      "agentVersion": 3,
      "sessionId": "ss_5Ty8Lr2GhW4nZc7F",
      "turnId": "turn_3Xp6Mv9QdB1sKe4H",
      "status": "succeeded",
      "error": null,
      "userId": "",
      "metadata": {
        "team": "support"
      },
      "startedAt": "2026-07-10T10:00:01.000Z",
      "finishedAt": "2026-07-10T10:03:00.000Z",
      "cancelRequestedAt": null,
      "canceledAt": null,
      "createdAt": "2026-07-10T10:00:00.000Z",
      "updatedAt": "2026-07-10T10:03:00.000Z"
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
curl "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF/runs" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/tasks/:taskId/runs [#create-task-run]

Start a task run.

Queues a run of the task now, whether or not it has a schedule. The run starts as `queued`; poll it to follow its progress. A task runs one run at a time, so this returns `409` while another run is queued or running. Send an `idempotencyKey` to make retries safe: repeating the request with the same key returns the same run. Send `{}` when you do not need a key.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `taskId` | string | path | required | ID of the task. |
| `idempotencyKey` | string | body |  | Your own key for this run. Retrying with the same key returns the same run instead of starting another. |

#### Response

Returns `202 Accepted` as `application/json`. The ID of the queued run.

Response schema: `CreatedTaskRun`.

```json
{
  "runId": "tr_9Jd4Ks7NbV2xQm6P"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found), [`agent_version_not_found`](/api-reference/protocols/errors#agent_version_not_found) | The resource was not found |
| `409` | [`task_active_run_exists`](/api-reference/protocols/errors#task_active_run_exists), [`agent_disabled`](/api-reference/protocols/errors#agent_disabled), [`tenant_deleting`](/api-reference/protocols/errors#tenant_deleting) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF/runs" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"idempotencyKey":"daily-support-summary-2026-07-10"}'
```

### GET /v1/tasks/:taskId/runs/:runId [#get-task-run]

Get a task run.

Returns a task run's current state. `status` moves from `queued` to `running` and ends as `succeeded`, `failed`, `canceled`, or `blocked`. `blocked` means the run was not allowed to start, for example because a quota was reached or usage credit ran out; `error` says why. `error` also describes a failed run. `sessionId` and `turnId` stay `null` until the run starts its session, and a run that fails before starting, such as one whose agent version has no provider and model, never gets them. Every final status sets `finishedAt` and lets the task start another run.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `taskId` | string | path | required | ID of the task. |
| `runId` | string | path | required | ID of the task run. |

#### Response

Returns `200 OK` as `application/json`. The task run.

Response schema: `TaskRun`.

```json
{
  "id": "tr_9Jd4Ks7NbV2xQm6P",
  "taskId": "tk_6Wq3Hn8ZpL2vRt5C",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "agentId": "ag_4kP9sT2vXq7LmN3a",
  "agentVersion": 3,
  "sessionId": "ss_5Ty8Lr2GhW4nZc7F",
  "turnId": "turn_3Xp6Mv9QdB1sKe4H",
  "status": "succeeded",
  "error": null,
  "userId": "",
  "metadata": {
    "team": "support"
  },
  "startedAt": "2026-07-10T10:00:01.000Z",
  "finishedAt": "2026-07-10T10:03:00.000Z",
  "cancelRequestedAt": null,
  "canceledAt": null,
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:03:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF/runs/tr_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/tasks/:taskId/runs/:runId/messages [#list-task-run-messages]

List a task run's messages.

Returns a task run's transcript with the run's `status`, `error`, and `finishedAt`, so one request tells you both what the agent said and whether the run is done. Pages come newest first, with messages in chronological order inside each page, the same as session messages. To follow a run as it works, save `latestCursor` and pass it as `after` to get only newer messages. Send `cursor` or `after`, not both. The page is empty until the run starts its session; while the run is still going, an empty page does not mean it is done.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `taskId` | string | path | required | ID of the task. |
| `runId` | string | path | required | ID of the task run. |
| `after` | string | query |  | `latestCursor` from an earlier response. Returns only messages newer than it. |
| `cursor` | string | query |  | `nextCursor` from the previous page. Walks back to older messages. |
| `limit` | integer | query |  | Messages per page, 1 to 200. 1–200. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. A page of messages with the run's state.

Response schema: `TaskRunMessageList`.

```json
{
  "data": [
    {
      "id": "msg_7Rk2Wq9TdN4vLb3X",
      "role": "assistant",
      "parts": [
        {
          "type": "text",
          "text": "Yesterday had 14 open cases. Two are overdue: a refund request and a login issue."
        }
      ]
    }
  ],
  "nextCursor": null,
  "latestCursor": "eyJzZXEiOjEyfQ",
  "status": "succeeded",
  "error": null,
  "finishedAt": "2026-07-10T10:03:00.000Z"
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
curl "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF/runs/tr_1234567890ABCDEF/messages" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/tasks/:taskId/runs/:runId/cancel [#cancel-task-run]

Cancel a task run.

Asks a queued or running task run to stop. A queued run ends before it starts; a running run stops shortly after, not immediately. Poll the run for its `canceled` status. You get `204` whenever the task exists, even if the run is missing or has already finished, so the response never reveals which runs exist.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `taskId` | string | path | required | ID of the task. |
| `runId` | string | path | required | ID of the task run. |

#### Response

Returns `204 No Content`. Cancellation was requested.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/tasks/tk_1234567890ABCDEF/runs/tr_1234567890ABCDEF/cancel" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Tasks and schedules](/automation/tasks) to plan background work.
- [Pagination and filtering](/api-reference/protocols/pagination-and-filtering) to poll a run's transcript.
