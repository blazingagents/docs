---
title: Tasks
description: Manage asynchronous Tasks, schedules, Task runs, transcripts, and cancellation.
---

# Tasks

`client.tasks` manages reusable asynchronous Agent instructions and their executions. A Task is a definition; every run has independent durable lifecycle state and receives a fresh Session when execution starts.

## Overview [#overview]

Tasks can be on-demand (`schedule: null`) or scheduled once, at an interval, or by a five-field numeric cron expression. `agentVersion: null` follows the Agent's current Version; an integer pins a Version. Task `agentId`, `userId`, and each run's inherited Attribution are immutable.

Only one run per Task can be active. Runs move from `queued` to `running`, then to terminal `blocked`, `succeeded`, `failed`, or `canceled`. Cancellation is cooperative. Task, run, and transcript lists default to 50 items and accept 1–200.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create a Task, optionally submitting its first run | `CreateTaskResponse` |
| [`list()`](#list) | List non-deleted Tasks | `TasksListResponse` |
| [`get()`](#get) | Retrieve one Task | `TaskResponse` |
| [`update()`](#update) | Change mutable Task configuration | `TaskResponse` |
| [`delete()`](#delete) | Soft-delete an inactive Task | `void` |
| [`createRun()`](#create-run) | Enqueue an immediate run | `CreateTaskRunResponse` |
| [`listRuns()`](#list-runs) | List a Task's runs | `TaskRunsListResponse` |
| [`getRun()`](#get-run) | Retrieve durable run state | `TaskRunResponse` |
| [`runMessages()`](#run-messages) | Read or poll a run's Session transcript | `TaskRunMessagesResponse` |
| [`cancelRun()`](#cancel-run) | Request cooperative cancellation | `void` |

## Methods [#methods]

### `create()` [#create]

Creates an on-demand or scheduled Task. `submit: true` also enqueues an initial run, but Task creation itself is not idempotent.

**Signature:** `create(body: CreateTaskBody): Promise<CreateTaskResponse>`

| Body field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `agentId` | `string` | yes | — | Executing Agent ID (`ag_…`) |
| `name` | `string` | yes | — | Name, 1–80 characters |
| `prompt` | `string` | yes | — | Fixed instruction, 1–6,000 characters |
| `agentVersion` | `number \| null` | no | `null` | Version Pin or current Version |
| `schedule` | `TaskScheduleInput \| null` | no | `null` | Schedule or on-demand |
| `enabled` | `boolean` | no | `true` | Whether scheduled fires may run |
| `submit` | `boolean` | no | `false` | Enqueue an initial run |
| `userId` | `string` | no | `""` | Immutable Attribution |
| `metadata` | `Record<string, unknown>` | no | `{}` | Task metadata copied into each run at enqueue |

```typescript
const { task, runId } = await client.tasks.create({
  agentId,
  name: "Daily summary",
  prompt: "Summarize open support cases.",
  schedule: {
    kind: "cron",
    config: {
      expression: "0 9 * * 1-5",
      timezone: "Europe/London",
    },
  },
});
```

Returns [`CreateTaskResponse`](#createtaskresponse). Raises `validation_failed`, `agent_version_not_found`, or `admin_agent_managed`; `agent_disabled` can reject immediate submission. See [`POST /v1/tasks`](/api-reference/rest-api/tasks#create-task).

### `list()` [#list]

Lists non-deleted Tasks with compact latest-run state.

**Signature:** `list(options?: TasksListOptions): Promise<TasksListResponse>`

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | no | Restrict to one Agent |
| `userId` | `string` | no | Exact Attribution filter; `""` selects Tenant-level Tasks |
| `cursor` | `string` | no | Opaque cursor from `nextCursor` |
| `limit` | `number` | no | Page size, default 50 and maximum 200 |

```typescript
const page = await client.tasks.list({ agentId, userId: "", limit: 25 });
```

Returns [`TasksListResponse`](#taskslistresponse). Raises `validation_failed` for invalid filters or `invalid_cursor` for an unusable cursor. See [`GET /v1/tasks`](/api-reference/rest-api/tasks#list-tasks).

### `get()` [#get]

Retrieves one non-deleted Task without triggering it.

**Signature:** `get(taskId: string): Promise<TaskResponse>`

```typescript
const task = await client.tasks.get(taskId);
```

Returns [`TaskResponse`](#taskresponse). Raises `validation_failed` for a malformed ID or `not_found` when the Task is unavailable. See [`GET /v1/tasks/:taskId`](/api-reference/rest-api/tasks#get-task).

### `update()` [#update]

Changes one or more mutable fields. Pass `schedule: null` to make the Task on-demand or `agentVersion: null` to follow the Agent's current Version.

**Signature:** `update(taskId: string, body: UpdateTaskBody): Promise<TaskResponse>`

| Body field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | no | Replacement name |
| `prompt` | `string` | no | Replacement instruction |
| `agentVersion` | `number \| null` | no | Replacement or cleared Version Pin |
| `schedule` | `TaskScheduleInput \| null` | no | Replacement schedule or on-demand |
| `enabled` | `boolean` | no | Scheduling switch |
| `metadata` | `Record<string, unknown>` | no | Replacement metadata for future runs |

At least one field is required. `agentId`, `userId`, and existing run facts cannot change.

```typescript
const task = await client.tasks.update(taskId, {
  enabled: false,
  metadata: { pausedBy: "ops" },
});
```

Returns [`TaskResponse`](#taskresponse). Raises `validation_failed`, `not_found`, `agent_version_not_found`, or `admin_agent_managed`. See [`PATCH /v1/tasks/:taskId`](/api-reference/rest-api/tasks#update-task).

### `delete()` [#delete]

Soft-deletes a Task while preserving its existing runs and Sessions.

**Signature:** `delete(taskId: string): Promise<void>`

```typescript
await client.tasks.delete(taskId);
```

Returns `void`. Raises `validation_failed`, `not_found`, or `task_active_run_exists` while a run is active. See [`DELETE /v1/tasks/:taskId`](/api-reference/rest-api/tasks#delete-task).

### `createRun()` [#create-run]

Enqueues an immediate run. An idempotency key makes retries for this Task resolve to the same logical run; omitting the body sends `{}`.

**Signature:** `createRun(taskId: string, body?: CreateTaskRunBody): Promise<CreateTaskRunResponse>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `taskId` | `string` | yes | Task ID (`tk_…`) |
| `body.idempotencyKey` | `string` | no | Non-empty caller-defined replay key |

```typescript
const { runId } = await client.tasks.createRun(taskId, {
  idempotencyKey: "daily-summary-2026-08-02",
});
```

Returns immediately with `{ runId: string }`. Persist `runId`, then use `getRun()` and `runMessages()` from a later request, process, or worker. Raises `validation_failed`, `not_found`, `task_active_run_exists`, `agent_version_not_found`, or `agent_disabled`. See [`POST .../runs`](/api-reference/rest-api/task-runs#create-task-run).

### `listRuns()` [#list-runs]

Lists a Task's runs newest first.

**Signature:** `listRuns(taskId: string, options?: TaskRunsListOptions): Promise<TaskRunsListResponse>`

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `cursor` | `string` | no | Opaque cursor from `nextCursor` |
| `limit` | `number` | no | Page size, default 50 and maximum 200 |

```typescript
const page = await client.tasks.listRuns(taskId, { limit: 25 });
```

Returns [`TaskRunsListResponse`](#taskrunslistresponse). Raises `validation_failed`, `invalid_cursor`, or `not_found`. See [`GET .../runs`](/api-reference/rest-api/task-runs#list-task-runs).

### `getRun()` [#get-run]

Retrieves durable state for one run. `sessionId` remains `null` until execution attaches its fresh Session.

**Signature:** `getRun(taskId: string, runId: string): Promise<TaskRunResponse>`

```typescript
const run = await client.tasks.getRun(taskId, runId);
```

Returns [`TaskRunResponse`](#taskrunresponse). Raises `validation_failed` for malformed IDs or `not_found` for a missing, foreign, or mismatched Task/run pair. See [`GET .../runs/:runId`](/api-reference/rest-api/task-runs#get-task-run).

### `runMessages()` [#run-messages]

Reads a run's Session transcript. A queued run without a Session returns an empty page. Use `cursor` to walk backward or `after` to poll forward, never both.

**Signature:** `runMessages(taskId: string, runId: string, options?: TaskRunMessagesOptions): Promise<TaskRunMessagesResponse>`

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `cursor` | `string` | no | Walk backward to older messages |
| `after` | `string` | no | Poll messages after a prior `latestCursor` |
| `limit` | `number` | no | Page size, default 50 and maximum 200 |

```typescript
const transcript = await client.tasks.runMessages(taskId, runId, {
  after: latestCursor,
  limit: 50,
});
```

Returns [`TaskRunMessagesResponse`](#taskrunmessagesresponse). Raises `validation_failed` for invalid IDs/options, `invalid_cursor` for an unusable cursor, or `not_found` for a missing Task/run pair. See [`GET .../messages`](/api-reference/rest-api/task-runs#list-task-run-messages).

### `cancelRun()` [#cancel-run]

Requests cooperative cancellation and returns before the state transition finishes. Poll `getRun()` for the result. Missing, mismatched, and terminal runs are deliberately non-enumerating no-ops after an owned Task is found.

**Signature:** `cancelRun(taskId: string, runId: string): Promise<void>`

```typescript
await client.tasks.cancelRun(taskId, runId);
```

Returns `void`. Raises `validation_failed` for malformed IDs or `not_found` when the Task itself is unavailable. See [`POST .../cancel`](/api-reference/rest-api/task-runs#cancel-task-run).

## Response types [#response-types]

### `TaskResponse` [#taskresponse]

`TaskResponse` is the Task object itself, not a wrapper.

| Field | Type | Description |
| --- | --- | --- |
| `id`, `tenantId`, `agentId` | `string` | Task and ownership IDs |
| `agentVersion` | `number \| null` | Version Pin or current Version |
| `name`, `prompt` | `string` | Definition fields |
| `schedule` | `TaskScheduleInput \| null` | Schedule or on-demand |
| `enabled` | `boolean` | Scheduled-fire switch |
| `activeRunId`, `latestRunId` | `string \| null` | Active and latest run IDs |
| `userId` | `string` | Immutable Attribution |
| `metadata` | `Record<string, unknown>` | Task metadata |
| `deletedAt` | `string \| null` | Soft-deletion timestamp |
| `createdAt`, `updatedAt` | `string` | ISO 8601 timestamps |

### `CreateTaskResponse` [#createtaskresponse]

```typescript
interface CreateTaskResponse {
  task: TaskResponse;
  runId: string | null;
}
```

`runId` is non-null only when `submit: true`.

### `TasksListResponse` [#taskslistresponse]

```typescript
interface TasksListResponse {
  data: Array<
    TaskResponse & {
      latestRun: {
        id: string;
        status: TaskRunStatus;
        finishedAt: string | null;
      } | null;
    }
  >;
  nextCursor: string | null;
}
```

### `TaskRunResponse` [#taskrunresponse]

| Field | Type | Description |
| --- | --- | --- |
| `id`, `taskId`, `tenantId`, `agentId` | `string` | Run and ownership IDs |
| `agentVersion` | `number` | Version selected at enqueue |
| `sessionId` | `string \| null` | Fresh execution Session |
| `turnId` | `string \| null` | Separate metered Turn ID after admission; `null` while queued or blocked |
| `status` | `TaskRunStatus` | Durable lifecycle state |
| `error` | `string \| null` | Failure or block explanation |
| `userId` | `string` | Attribution inherited at enqueue |
| `metadata` | `Record<string, unknown>` | Metadata inherited at enqueue |
| `startedAt`, `finishedAt` | `string \| null` | Execution timestamps |
| `cancelRequestedAt`, `canceledAt` | `string \| null` | Cancellation timestamps |
| `createdAt`, `updatedAt` | `string` | ISO 8601 timestamps |

```typescript
type TaskRunStatus =
  | "queued"
  | "running"
  | "blocked"
  | "succeeded"
  | "failed"
  | "canceled";

interface TaskRunsListResponse {
  data: TaskRunResponse[];
  nextCursor: string | null;
}
```

`queued` and `running` are active. Every other status is terminal; `blocked` represents an expected admission denial, such as quota exhaustion, a missing required subscription, or insufficient Usage credit, rather than an execution failure.

### `TaskRunMessagesResponse` [#taskrunmessagesresponse]

```typescript
interface TaskRunMessagesResponse {
  data: SessionMessage[];
  nextCursor: string | null;
  latestCursor: string | null;
}
```

Save `latestCursor` and pass it as `after` to request only appended messages. See the canonical [Task schemas](/api-reference/protocols/objects-and-schemas#task).

## Schedule types [#schedule-types]

```typescript
type TaskScheduleInput =
  | { kind: "once"; config: { at: string } }
  | { kind: "interval"; config: { everyMs: number } }
  | {
      kind: "cron";
      config: {
        expression: string;
        timezone?: string;
        staggerMs?: number;
      };
    };
```

`at` is an ISO 8601 timestamp, intervals are at least 60 seconds, cron expressions contain five numeric fields, `timezone` defaults to `"UTC"`, and `staggerMs` is non-negative.

## Errors [#errors]

SDK request failures throw `BlazingAgentsError`. Branch on its stable `code`, not its message.

| Code | Common methods | Action |
| --- | --- | --- |
| `validation_failed` | All methods | Correct IDs, fields, schedule, list options, or mutually exclusive cursors |
| `invalid_cursor` | List and transcript methods | Restart without the stale or malformed cursor |
| `not_found` | ID-based methods | Check Task/run ownership and deletion state |
| `task_active_run_exists` | `createRun()`, `delete()` | Wait for or cancel the active run |
| `agent_version_not_found` | `create()`, `update()`, `createRun()` | Select an available Version Pin |
| `agent_disabled` | Immediate submission and `createRun()` | Enable the Agent before enqueueing |
| `admin_agent_managed` | `create()`, `update()` | Use a non-Admin Agent |

Cancellation deliberately does not reveal a missing or terminal run. Authentication, transport, malformed-response, and service failures can also throw. See [SDK errors](/api-reference/protocols/errors).

## End-to-end workflow [#end-to-end-workflow]

Create an on-demand Task, enqueue one idempotent run, persist its identifiers,
and return to the caller:

```typescript
import { BlazingAgents } from "@blazing-agents/sdk";

const client = new BlazingAgents({ apiKey: process.env.BLAZING_AGENTS_API_KEY! });
const agentId = "ag_0123456789abcdef";

const { task } = await client.tasks.create({
  agentId,
  name: "Release summary",
  prompt: "Summarize the release queue.",
});

const { runId } = await client.tasks.createRun(task.id, {
  idempotencyKey: "release-summary-2026-08-02",
});

// Persist task.id and runId before this request ends.
```

From a later request, scheduled job, or worker invocation, load the persisted
IDs and inspect one durable snapshot. If the run is active, end the invocation
and let the caller or scheduler check again later:

```typescript
const run = await client.tasks.getRun(taskId, runId);
if (run.status === "queued" || run.status === "running") {
  console.log("Task is still active; check again in a later invocation.");
} else {
  const transcript = await client.tasks.runMessages(taskId, runId);
  for (const message of transcript.data) console.log(message);
  console.log(run.status, run.error);
}
```

## Related [#related]

- [Tasks and schedules](/automation/tasks)
- [Run a background Task](/automation/tasks)
- [Schedule recurring work](/automation/schedules)
- [REST Tasks](/api-reference/rest-api/tasks)
- [REST Task runs](/api-reference/rest-api/task-runs)
