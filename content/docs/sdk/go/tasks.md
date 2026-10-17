---
title: Tasks
description: Run agents in the background, on demand or on a schedule, and follow each run with the Go SDK.
---

# Tasks

`client.Tasks` runs an agent's saved prompt in the background, on demand or on a schedule.

Examples are function bodies that receive `ctx context.Context`, `client *ba.Client`, `agentID ba.AgentID`, and `sessionID ba.SessionID`, and return an `error`. Every method also takes the per-call options `ba.WithRequestTimeout`, `ba.WithRequestHeader`, `ba.WithClientRequestID`, and `ba.CaptureResponse`.

```go
created, err := client.Tasks.Create(ctx, ba.CreateTaskParams{
	AgentID: agentID,
	Name:    "Daily support summary",
	Prompt:  "Summarize yesterday's open support cases.",
	Schedule: ba.Value[ba.Schedule](ba.ScheduleCron{
		Expression: "0 9 * * 1-5",
		Timezone:   new("Europe/London"),
	}),
	Submit: new(true),
})
if err != nil {
	return err
}
fmt.Println(created.Task.ID)
return nil
```

## Runs and their status [#runs-and-their-status]

A task holds a prompt and an optional schedule. Each execution is a run with `Status` `ba.TaskRunStatusQueued`, `ba.TaskRunStatusRunning`, `ba.TaskRunStatusBlocked`, `ba.TaskRunStatusSucceeded`, `ba.TaskRunStatusFailed`, or `ba.TaskRunStatusCanceled`. Poll `GetRun` or `ListRunMessages` until the status is final.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`Create`](#create) | Create a task | [`*CreatedTask`](#task) |
| [`List`](#list), `All` | List tasks | [`*Page[TaskListItem]`](#task) |
| [`Get`](#get) | Get one task | [`*Task`](#task) |
| [`Update`](#update) | Change a task | [`*Task`](#task) |
| [`Delete`](#delete) | Delete a task | `error` |
| [`Submit`](#submit) | Start a run now | [`*CreatedTaskRun`](#taskrun) |
| [`ListRuns`](#list-runs), `AllRuns` | List a task's runs | [`*Page[TaskRun]`](#taskrun) |
| [`GetRun`](#get-run) | Get one run | [`*TaskRun`](#taskrun) |
| [`ListRunMessages`](#run-messages), `AllRunMessages` | Read a run's transcript | `*TaskRunMessageList` |
| [`CancelRun`](#cancel-run) | Ask a run to stop | `error` |

## Methods [#methods]

### `Create` [#create]

Creates a task. Without a schedule it runs only when you start it.

```go
created, err := client.Tasks.Create(ctx, ba.CreateTaskParams{
	AgentID: agentID,
	Name:    "Daily summary",
	Prompt:  "Summarize yesterday.",
})
if err != nil {
	return err
}
fmt.Println(created.Task.ID)
return nil
```

**Signature:** `func (s *TasksService) Create(ctx context.Context, params CreateTaskParams, opts ...RequestOption) (*CreatedTask, error)`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `AgentID` | `ba.AgentID` | required | The agent that runs the task |
| `Name` | `string` | required | Display name, 1 to 80 characters |
| `Prompt` | `string` | required | The prompt every run receives, 1 to 6,000 characters |
| `IdempotencyKey` | `*string` | none | A repeated request with the same key returns the task instead of creating another |
| `Schedule` | `ba.Nullable[ba.Schedule]` | none | When the task runs by itself |
| `Enabled` | `*bool` | `true` | Whether the schedule fires; a disabled task can still be started on demand |
| `Submit` | `*bool` | `false` | Starts the first run at once; `RunID` is then set |
| `UserID` | `*string` | `""` | The end user the task belongs to, copied to every run. Fixed after creation |
| `Metadata` | `ba.Metadata` | `{}` | Your own data, copied to every run |

`ba.Schedule` is `ba.ScheduleOnce{At: t}`, `ba.ScheduleInterval{Every: d}` (at least one minute), or `ba.ScheduleCron{Expression: expr}` with an optional `Timezone` (default `UTC`) and `Stagger`. A kind this version does not know decodes as `ba.UnknownSchedule`, which is sent back unchanged. Go cannot infer the type argument from the field, so write it out: `ba.Value[ba.Schedule](ba.ScheduleInterval{Every: time.Hour})`.

Returns [`*ba.CreatedTask`](#task) with `Task` and `RunID` (set only when `Submit` started one). Reusing an `IdempotencyKey` with different task fields, or after deleting the task, fails with [`idempotency_conflict`](/api-reference/protocols/errors#idempotency_conflict). Also fails with `*ba.APIError` whose `Code` is [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`not_found`](/api-reference/protocols/errors#not_found), or [`agent_disabled`](/api-reference/protocols/errors#agent_disabled) when `Submit` starts a run on a disabled agent.

### `List` [#list]

Lists tasks, most recently updated first. Each task's `LatestRun` carries its most recent run's status.

```go
page, err := client.Tasks.List(ctx, ba.ListTasksParams{AgentID: &agentID, Limit: new(50)})
if err != nil {
	return err
}
fmt.Println(len(page.Data))
return nil
```

**Signature:** `func (s *TasksService) List(ctx context.Context, params ListTasksParams, opts ...RequestOption) (*Page[TaskListItem], error)`

| Field | Type | Description |
| --- | --- | --- |
| `AgentID` | `*ba.AgentID` | Only tasks for this agent |
| `UserID` | `*string` | Only tasks for this end user; `new("")` selects tenant-level tasks |
| `Cursor` | `*string` | The `NextCursor` of the previous page |
| `Limit` | `*int` | Page size, 1 to 200; defaults to 50 |

Returns [`*ba.Page[TaskListItem]`](#task); `All` walks every page lazily. Fails with `validation_failed` or [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor).

### `Get` [#get]

Gets one task without running it.

```go
task, err := client.Tasks.Get(ctx, "tk_0123456789abcdef")
if err != nil {
	return err
}
fmt.Println(task.Name)
return nil
```

**Signature:** `func (s *TasksService) Get(ctx context.Context, taskID TaskID, opts ...RequestOption) (*Task, error)`

Returns [`*ba.Task`](#task). Fails with `validation_failed` or `not_found`.

### `Update` [#update]

Changes a task. Fields you leave unset keep their values, and a run already in progress keeps the settings it started with. The agent and `UserID` cannot change.

```go
task, err := client.Tasks.Update(ctx, "tk_0123456789abcdef", ba.UpdateTaskParams{
	Prompt: new("Summarize the last two days."),
})
if err != nil {
	return err
}
fmt.Println(task.Prompt)
return nil
```

**Signature:** `func (s *TasksService) Update(ctx context.Context, taskID TaskID, params UpdateTaskParams, opts ...RequestOption) (*Task, error)`

| Field | Type | Description |
| --- | --- | --- |
| `Name` | `*string` | New display name, 1 to 80 characters |
| `Prompt` | `*string` | New prompt, 1 to 6,000 characters |
| `Schedule` | `ba.Nullable[ba.Schedule]` | `ba.Value[ba.Schedule](...)` replaces the schedule; `ba.Null[ba.Schedule]()` removes it, so the task runs only when you start it |
| `Enabled` | `*bool` | Whether the schedule fires |
| `Metadata` | `ba.Metadata` | Replaces the metadata completely |

Returns [`*ba.Task`](#task). Fails with `validation_failed` or `not_found`.

### `Delete` [#delete]

Deletes a task and stops its schedule. Its past runs and their transcripts are kept. A task with a queued or running run cannot be deleted.

```go
return client.Tasks.Delete(ctx, "tk_0123456789abcdef")
```

**Signature:** `func (s *TasksService) Delete(ctx context.Context, taskID TaskID, opts ...RequestOption) error`

Fails with `validation_failed`, `not_found`, or [`task_active_run_exists`](/api-reference/protocols/errors#task_active_run_exists).

### `Submit` [#submit]

Starts a run of the task now, whether or not it has a schedule. A task runs one run at a time.

```go
run, err := client.Tasks.Submit(ctx, "tk_0123456789abcdef", ba.SubmitTaskParams{
	IdempotencyKey: new("manual-1"),
})
if err != nil {
	return err
}
fmt.Println(run.RunID)
return nil
```

**Signature:** `func (s *TasksService) Submit(ctx context.Context, taskID TaskID, params SubmitTaskParams, opts ...RequestOption) (*CreatedTaskRun, error)`

The `IdempotencyKey` field makes retries safe: repeating the request with the same key returns the same run. Returns [`*ba.CreatedTaskRun`](#taskrun) with `RunID`. Fails with `validation_failed`, `not_found`, or `task_active_run_exists` while another run is queued or running.

### `ListRuns` [#list-runs]

Lists a task's runs, newest first.

```go
page, err := client.Tasks.ListRuns(ctx, "tk_0123456789abcdef", ba.ListTaskRunsParams{})
if err != nil {
	return err
}
fmt.Println(len(page.Data))
return nil
```

**Signature:** `func (s *TasksService) ListRuns(ctx context.Context, taskID TaskID, params ListTaskRunsParams, opts ...RequestOption) (*Page[TaskRun], error)`

`Limit` takes 1 to 200 runs per page, defaulting to 50, and `Cursor` resumes from a `NextCursor`. Returns [`*ba.Page[TaskRun]`](#taskrun); `AllRuns` walks every page lazily. Fails with `validation_failed`, `invalid_cursor`, or `not_found`.

### `GetRun` [#get-run]

Gets one run's current state and the agent configuration captured when it was queued. Poll it until `Status` is final.

```go
run, err := client.Tasks.GetRun(ctx, "tk_0123456789abcdef", "tr_0123456789abcdef")
if err != nil {
	return err
}
fmt.Println(run.Status)
return nil
```

**Signature:** `func (s *TasksService) GetRun(ctx context.Context, taskID TaskID, runID TaskRunID, opts ...RequestOption) (*TaskRun, error)`

Returns [`*ba.TaskRun`](#taskrun). Fails with `validation_failed` or `not_found`.

### `ListRunMessages` [#run-messages]

Returns a run's transcript with the run's `Status`, `Error`, and `FinishedAt`, so one request says both what the agent said and whether the run is done. The page is empty until the run starts its session.

```go
page, err := client.Tasks.ListRunMessages(ctx, "tk_0123456789abcdef", "tr_0123456789abcdef", ba.ListTaskRunMessagesParams{})
if err != nil {
	return err
}
for _, message := range page.Data {
	fmt.Println(message.Role)
}
return nil
```

**Signature:** `func (s *TasksService) ListRunMessages(ctx context.Context, taskID TaskID, runID TaskRunID, params ListTaskRunMessagesParams, opts ...RequestOption) (*TaskRunMessageList, error)`

`Cursor` walks backward through a `NextCursor`; `After` polls for messages newer than a saved `LatestCursor`. Set one or the other; both fail client-side with `*ba.ArgumentError`. `Limit` is 1 to 200, defaulting to 50. Returns a `*ba.TaskRunMessageList` with `Data`, `NextCursor`, `LatestCursor`, `Status`, `Error`, and `FinishedAt`. `AllRunMessages` keeps the direction you start with. Fails with `validation_failed`, `invalid_cursor`, or `not_found`.

### `CancelRun` [#cancel-run]

Asks a queued or running run to stop; poll `GetRun` for its `ba.TaskRunStatusCanceled` status.

```go
return client.Tasks.CancelRun(ctx, "tk_0123456789abcdef", "tr_0123456789abcdef")
```

**Signature:** `func (s *TasksService) CancelRun(ctx context.Context, taskID TaskID, runID TaskRunID, opts ...RequestOption) error`

It succeeds whenever the task exists, even if the run is missing or already finished. Fails with `validation_failed` or `not_found`.

## Response models [#response-models]

### `Task` [#task]

| Field | Type | Description |
| --- | --- | --- |
| `ID` | `ba.TaskID` | Task ID (`tk_...`) |
| `TenantID` | `ba.TenantID` | Your tenant ID |
| `AgentID` | `ba.AgentID` | The agent that runs the task |
| `Name` | `string` | Display name |
| `Prompt` | `string` | The prompt every run receives |
| `Schedule` | `ba.Schedule` | When it runs by itself, or nil |
| `Enabled` | `bool` | Whether the schedule fires |
| `ActiveRunID` | `*ba.TaskRunID` | The run in progress |
| `LatestRunID` | `*ba.TaskRunID` | The most recent run |
| `UserID` | `string` | End user, or `""` for tenant level |
| `Metadata` | `ba.Metadata` | Your own data |
| `NextFireAt` | `*time.Time` | When the schedule next starts a run |
| `DeletedAt` | `*time.Time` | When it was deleted |
| `CreatedAt`, `UpdatedAt` | `time.Time` | Timestamps |

`ba.TaskListItem` is the same plus `LatestRun`, a `*ba.TaskLatestRun` that is nil before the first run and otherwise holds its `ID`, `Status`, and `FinishedAt`.

### `TaskRun` [#taskrun]

| Field | Type | Description |
| --- | --- | --- |
| `ID` | `ba.TaskRunID` | Run ID (`tr_...`) |
| `TaskID`, `TenantID`, `AgentID` | `ba.TaskID`, `ba.TenantID`, `ba.AgentID` | What it belongs to |
| `AgentConfig` | `ba.AgentConfig` | Configuration captured when queued |
| `SessionID` | `*ba.SessionID` | The run's session, once started |
| `TurnID` | `*ba.TurnID` | The run's metered turn |
| `Status` | `ba.TaskRunStatus` | Queued through canceled |
| `Error` | `*string` | Why a failed or blocked run did not complete |
| `UserID` | `string` | End user, copied from the task |
| `Metadata` | `ba.Metadata` | Your own data |
| `StartedAt`, `FinishedAt`, `CancelRequestedAt`, `CanceledAt`, `CreatedAt`, `UpdatedAt` | `*time.Time`, `time.Time` | Lifecycle timestamps |

## Next [#next]

- [Tasks and schedules](/automation/tasks)
- [Agents](/sdk/go/agents)
