---
title: Tasks
description: Create background tasks and schedules, start runs, read their results, and cancel them with the TypeScript SDK.
---

# Tasks

`client.tasks` runs an agent in the background with no user present. A task saves a prompt for one agent; each run executes it once in a fresh session. Start runs yourself or give the task a schedule. To decide between tasks and chat, and to design a schedule, read [Tasks](/automation/tasks) and [Schedules](/automation/schedules).

```typescript
const { task, runId } = await client.tasks.create({
  agentId,
  name: "Release summary",
  prompt: "Summarize the release queue.",
  submit: true,
});

// Later, from any request or worker:
const run = await client.tasks.getRun({ taskId: task.id, runId: runId! });
console.log(run.status);
```

Every method takes one input object and accepts an optional `abortSignal`.

## Runs [#runs]

A task has at most one active run at a time. A run moves from `queued` to `running`, then ends as `succeeded`, `failed`, `canceled`, or `blocked`. `blocked` means the run was not allowed to start, for example because a quota ran out; `error` says why.

Runs use the agent's `approvalInTasks` policy. Nobody is there to approve a call, so tool calls that would need a person are denied and the agent is told so. See [tool approvals](/agents/tools/tool-approvals).

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create a task, and optionally its first run | `CreateTaskResponse` |
| [`list()`](#list) | List tasks | `TasksListResponse` |
| [`get()`](#get) | Read one task | `TaskResponse` |
| [`update()`](#update) | Change a task | `TaskResponse` |
| [`delete()`](#delete) | Delete a task | `void` |
| [`createRun()`](#create-run) | Start a run now | `CreateTaskRunResponse` |
| [`listRuns()`](#list-runs) | List a task's runs | `TaskRunsListResponse` |
| [`getRun()`](#get-run) | Read one run's status | `TaskRunResponse` |
| [`runMessages()`](#run-messages) | Read a run's messages | `TaskRunMessagesResponse` |
| [`cancelRun()`](#cancel-run) | Ask a run to stop | `void` |

## Methods [#methods]

### `create()` [#create]

Creates a task that runs on demand or on a schedule.

**Signature:** `create(input: CreateTaskBody & ResourceRequestOptions): Promise<CreateTaskResponse>`

```typescript
const { task } = await client.tasks.create({
  agentId,
  name: "Weekday summary",
  prompt: "Summarize open support cases.",
  schedule: {
    kind: "cron",
    config: { expression: "0 9 * * 1-5", timezone: "Europe/London" },
  },
});
```

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `agentId` | `string` | yes | none | The agent that runs it; cannot change later |
| `name` | `string` | yes | none | 1 to 80 characters |
| `prompt` | `string` | yes | none | The instruction each run sends, up to 6,000 characters |
| `schedule` | `TaskScheduleInput \| null` | no | `null` | When to run; `null` runs only on demand. See [schedule types](#schedule-types) |
| `enabled` | `boolean` | no | `true` | Whether the schedule fires |
| `submit` | `boolean` | no | `false` | Also start a run right away |
| `idempotencyKey` | `string` | no | none | Reuse the same task and initial run when a create request is retried |
| `agentVersion` | `number \| null` | no | `null` | Agent version to pin; `null` uses the current version at each run |
| `userId` | `string` | no | `""` | The end user it runs for; cannot change later |
| `metadata` | `Record<string, unknown>` | no | `{}` | Your labels, copied onto each run |

Without `idempotencyKey`, calling `create()` twice creates two tasks. With a key, retrying the same request returns the same task ID, its current definition, and the original initial run ID. Reusing a key with different task fields or after deleting the task returns `idempotency_conflict`. Returns [`CreateTaskResponse`](#createtaskresponse). Errors: [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`agent_version_not_found`](/api-reference/protocols/errors#agent_version_not_found), [`admin_agent_managed`](/api-reference/protocols/errors#admin_agent_managed), and [`agent_disabled`](/api-reference/protocols/errors#agent_disabled) when `submit` is `true`.

### `list()` [#list]

Lists your tasks with each one's latest run.

**Signature:** `list(input?: TasksListOptions): Promise<TasksListResponse>`

```typescript
const { data } = await client.tasks.list({ agentId });
for (const task of data) console.log(task.name, task.latestRun?.status);
```

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `agentId` | `string` | no | none | Only this agent's tasks |
| `userId` | `string` | no | none | Only this end user's tasks; `""` for tenant-level ones |
| `limit` | `number` | no | `50` | 1 to 200 per page |
| `cursor` | `string` | no | none | `nextCursor` from the previous page |

Returns [`TasksListResponse`](#taskslistresponse). Errors: `validation_failed`, [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor).

### `get()` [#get]

Reads one task.

**Signature:** `get(input: { taskId: string } & ResourceRequestOptions): Promise<TaskResponse>`

```typescript
const task = await client.tasks.get({ taskId });
```

Returns [`TaskResponse`](#taskresponse). Errors: `validation_failed`, [`not_found`](/api-reference/protocols/errors#not_found).

### `update()` [#update]

Changes a task's name, prompt, schedule, version pin, or metadata, or pauses its schedule.

**Signature:** `update(input: UpdateTaskBody & { taskId: string } & ResourceRequestOptions): Promise<TaskResponse>`

```typescript
const task = await client.tasks.update({ taskId, enabled: false });
```

Takes `taskId` plus any of `name`, `prompt`, `schedule`, `enabled`, `agentVersion`, and `metadata`, with at least one. Fields you leave out stay as they are. `schedule: null` makes the task on-demand, and `agentVersion: null` goes back to the current version. `agentId` and `userId` cannot change, and runs that already exist keep their settings.

Returns [`TaskResponse`](#taskresponse). Errors: `validation_failed`, `not_found`, `agent_version_not_found`, `admin_agent_managed`.

### `delete()` [#delete]

Deletes a task and stops its schedule. Past runs and their sessions stay readable.

**Signature:** `delete(input: { taskId: string } & ResourceRequestOptions): Promise<void>`

```typescript
await client.tasks.delete({ taskId });
```

Fails with [`task_active_run_exists`](/api-reference/protocols/errors#task_active_run_exists) while a run is active; cancel it first. Errors: `validation_failed`, `not_found`, `task_active_run_exists`.

### `createRun()` [#create-run]

Starts a run now and returns its ID without waiting for it.

**Signature:** `createRun(input: CreateTaskRunBody & { taskId: string } & ResourceRequestOptions): Promise<CreateTaskRunResponse>`

```typescript
const { runId } = await client.tasks.createRun({
  taskId,
  idempotencyKey: "release-summary-2026-09-26",
});
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `taskId` | `string` | yes | Task ID (`tk_…`) |
| `idempotencyKey` | `string` | no | Your key for this run; retrying with the same key returns the same run |

Returns `{ runId: string }`. Save it and check the run later with [`getRun()`](#get-run). Errors: `validation_failed`, `not_found`, `task_active_run_exists`, `agent_version_not_found`, `agent_disabled`.

### `listRuns()` [#list-runs]

Lists a task's runs, newest first.

**Signature:** `listRuns(input: { taskId: string } & TaskRunsListOptions): Promise<TaskRunsListResponse>`

```typescript
const { data } = await client.tasks.listRuns({ taskId, limit: 10 });
```

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `limit` | `number` | no | `50` | 1 to 200 per page |
| `cursor` | `string` | no | none | `nextCursor` from the previous page |

Returns [`TaskRunsListResponse`](#taskrunresponse). Errors: `validation_failed`, `invalid_cursor`, `not_found`.

### `getRun()` [#get-run]

Reads one run's status.

**Signature:** `getRun(input: { taskId: string; runId: string } & ResourceRequestOptions): Promise<TaskRunResponse>`

```typescript
const run = await client.tasks.getRun({ taskId, runId });
if (run.status === "queued" || run.status === "running") {
  console.log("Still working; check again later.");
} else {
  console.log(run.status, run.error);
}
```

Returns [`TaskRunResponse`](#taskrunresponse). `sessionId` is `null` until the run starts. Errors: `validation_failed`, `not_found`.

### `runMessages()` [#run-messages]

Reads the messages from a run's session, the same way [`sessions.messages()`](/sdk/typescript/sessions#messages) does.

**Signature:** `runMessages(input: { taskId: string; runId: string } & TaskRunMessagesOptions): Promise<TaskRunMessagesResponse>`

```typescript
const page = await client.tasks.runMessages({ taskId, runId });
const newer = page.latestCursor
  ? await client.tasks.runMessages({ taskId, runId, after: page.latestCursor })
  : null;
```

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `limit` | `number` | no | `50` | 1 to 200 per page |
| `cursor` | `string` | no | none | Go back to older messages |
| `after` | `string` | no | none | Fetch messages added since an earlier `latestCursor` |

A run that has not started returns an empty page. Do not pass `cursor` and `after` together. Returns [`TaskRunMessagesResponse`](#taskrunmessagesresponse). Errors: `validation_failed`, `invalid_cursor`, `not_found`.

### `cancelRun()` [#cancel-run]

Asks a run to stop and returns without waiting.

**Signature:** `cancelRun(input: { taskId: string; runId: string } & ResourceRequestOptions): Promise<void>`

```typescript
await client.tasks.cancelRun({ taskId, runId });
```

The run stops at its next safe point; poll [`getRun()`](#get-run) until its status is `canceled` or another final state. Cancelling a run that already finished, or a run ID the task does not have, does nothing. Errors: `validation_failed`, and `not_found` when the task does not exist.

## Response types [#response-types]

### `TaskResponse` [#taskresponse]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Task ID (`tk_…`) |
| `tenantId` | `string` | Your tenant ID |
| `agentId` | `string` | The agent that runs it |
| `agentVersion` | `number \| null` | Pinned version, or `null` for current |
| `name` | `string` | Task name |
| `prompt` | `string` | The instruction |
| `schedule` | `TaskScheduleInput \| null` | Schedule, or `null` for on-demand |
| `enabled` | `boolean` | Whether the schedule fires |
| `activeRunId` | `string \| null` | The run in progress |
| `latestRunId` | `string \| null` | The most recent run |
| `userId` | `string` | The end user, or `""` |
| `metadata` | `Record<string, unknown>` | Your labels |
| `deletedAt` | `string \| null` | When it was deleted |
| `createdAt`, `updatedAt` | `string` | ISO 8601 timestamps |

### `CreateTaskResponse` [#createtaskresponse]

```typescript
interface CreateTaskResponse {
  task: TaskResponse;
  runId: string | null;
}
```

`runId` is set only when you passed `submit: true`.

### `TasksListResponse` [#taskslistresponse]

```typescript
interface TasksListResponse {
  data: Array<
    TaskResponse & {
      latestRun: { id: string; status: TaskRunStatus; finishedAt: string | null } | null;
    }
  >;
  nextCursor: string | null;
}
```

### `TaskRunResponse` [#taskrunresponse]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Run ID (`tr_…`) |
| `taskId`, `tenantId`, `agentId` | `string` | Owning task, tenant, and agent |
| `agentVersion` | `number` | The agent version the run uses |
| `sessionId` | `string \| null` | The run's session, once started |
| `turnId` | `string \| null` | The turn in your usage records, once started |
| `status` | `TaskRunStatus` | Where the run is |
| `error` | `string \| null` | Why it failed or was blocked |
| `userId` | `string` | The task's end user when the run was created |
| `metadata` | `Record<string, unknown>` | The task's metadata when the run was created |
| `startedAt`, `finishedAt` | `string \| null` | When it started and ended |
| `cancelRequestedAt`, `canceledAt` | `string \| null` | When cancellation was asked for and done |
| `createdAt`, `updatedAt` | `string` | ISO 8601 timestamps |

```typescript
type TaskRunStatus = "queued" | "running" | "blocked" | "succeeded" | "failed" | "canceled";

interface TaskRunsListResponse {
  data: TaskRunResponse[];
  nextCursor: string | null;
}
```

### `TaskRunMessagesResponse` [#taskrunmessagesresponse]

```typescript
interface TaskRunMessagesResponse {
  data: SessionMessage[];
  nextCursor: string | null;
  latestCursor: string | null;
}
```

`SessionMessage` is described in the [sessions reference](/sdk/typescript/sessions#sessionmessagesresponse).

## Schedule types [#schedule-types]

```typescript
type TaskScheduleInput =
  | { kind: "once"; config: { at: string } }
  | { kind: "interval"; config: { everyMs: number } }
  | { kind: "cron"; config: { expression: string; timezone?: string; staggerMs?: number } };
```

- `once`: runs at `at`, an ISO 8601 timestamp with an offset.
- `interval`: runs every `everyMs` milliseconds, at least 60,000.
- `cron`: a five-field numeric cron expression, such as `"0 9 * * 1-5"`. `timezone` is an IANA name and defaults to `"UTC"`. `staggerMs` adds a delay of up to that many milliseconds.

A scheduled fire is skipped while another run of the task is active or the agent is disabled. See [Schedules](/automation/schedules).

## Errors [#errors]

Failures throw [`BlazingAgentsError`](/sdk/typescript/client#errors). The task codes:

| Code | Meaning |
| --- | --- |
| `task_active_run_exists` | A run is already active; wait or cancel it |
| `idempotency_conflict` | A create key was reused with different task fields |
| `agent_version_not_found` | The pinned agent version does not exist |
| `agent_disabled` | The agent is disabled, so no run can start |
| `admin_agent_managed` | The [admin agent](/agents/agents#the-admin-agent) cannot run tasks |

## Next [#next]

- [Tasks](/automation/tasks)
- [Schedules](/automation/schedules)
- [Sessions reference](/sdk/typescript/sessions)
