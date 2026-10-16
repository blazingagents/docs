---
title: Tasks
description: Run agents in the background, on demand or on a schedule, and follow each run with the Rust SDK.
---

# Tasks

`client.tasks()` runs an agent's saved prompt in the background, on demand or on a schedule.

Examples receive a `client: blazing_agents::Client`. Every call also takes the `with_timeout`, `without_timeout`, `with_header`, and `with_client_request_id` transport options.

```rust
use blazing_agents::tasks::Schedule;

let created = client
    .tasks()
    .create(
        "ag_0123456789abcdef",
        "Daily support summary",
        "Summarize yesterday's open support cases.",
    )
    .schedule(Schedule::cron("0 9 * * 1-5").timezone("Europe/London"))
    .submit(true)
    .await?;
println!("{}", created.task.id);
```

## Runs and their status [#runs-and-their-status]

A task holds a prompt and an optional schedule. Each execution is a run with `status` `Queued`, `Running`, `Blocked`, `Succeeded`, `Failed`, or `Canceled`. Poll `get_run()` or `run_messages()` until the status is final.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create a task | [`CreatedTask`](#task) |
| [`list()`](#list) | List tasks | [`Page<TaskListItem>`](#task) |
| [`get()`](#get) | Get one task | [`Task`](#task) |
| [`update()`](#update) | Change a task | [`Task`](#task) |
| [`delete()`](#delete) | Delete a task | `()` |
| [`submit()`](#submit) | Start a run now | [`CreatedTaskRun`](#taskrun) |
| [`list_runs()`](#list-runs) | List a task's runs | [`Page<TaskRun>`](#taskrun) |
| [`get_run()`](#get-run) | Get one run | [`TaskRun`](#taskrun) |
| [`run_messages()`](#run-messages) | Read a run's transcript | `RunMessagesPage` |
| [`cancel_run()`](#cancel-run) | Ask a run to stop | `()` |

## Methods [#methods]

### `create()` [#create]

Creates a task. Without a schedule it runs only when you start it.

```rust
let created = client
    .tasks()
    .create("ag_0123456789abcdef", "Daily summary", "Summarize yesterday.")
    .await?;
```

**Signature:** `create(agent_id: impl Into<AgentId>, name: impl Into<String>, prompt: impl Into<String>) -> Call<CreateTask>`

| Setter | Type | Default | Description |
| --- | --- | --- | --- |
| `idempotency_key` | `impl Into<String>` | none | A repeated request with the same key returns the task instead of creating another |
| `schedule` | `Schedule` | none | When the task runs by itself |
| `enabled` | `bool` | `true` | Whether the schedule fires; a disabled task can still be started on demand |
| `submit` | `bool` | `false` | Starts the first run at once; `run_id` is then set |
| `user_id` | `impl Into<String>` | `""` | The end user the task belongs to, copied to every run. Fixed after creation |
| `metadata` | `Metadata` | `{}` | Your own data, copied to every run |

`Schedule` is `Schedule::once(timestamp)`, `Schedule::interval(every_ms)` (at least 60,000), or `Schedule::cron(expression)` with `.timezone(...)` (default `UTC`) and `.stagger_ms(...)`. A kind this version does not know decodes as `Schedule::Unrecognized`.

Awaiting returns [`CreatedTask`](#task) with `task` and `run_id` (`Some` only when `submit` started one). Reusing an `idempotency_key` with different task fields, or after deleting the task, fails with [`idempotency_conflict`](/api-reference/protocols/errors#idempotency_conflict). Also fails with `Error::Api` whose code is [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`not_found`](/api-reference/protocols/errors#not_found), or [`agent_disabled`](/api-reference/protocols/errors#agent_disabled) when `submit` starts a run on a disabled agent.

### `list()` [#list]

Lists tasks, most recently updated first. Each task's `latest_run` carries its most recent run's status.

```rust
let page = client
    .tasks()
    .list()
    .agent_id("ag_0123456789abcdef")
    .limit(50)
    .await?;
```

**Signature:** `list() -> Call<ListTasks>`

| Setter | Type | Description |
| --- | --- | --- |
| `agent_id` | `impl Into<AgentId>` | Only tasks for this agent |
| `user_id` | `impl Into<String>` | Only tasks for this end user; `""` selects tenant-level tasks |
| `limit` | `u8` | Page size, 1 to 200; defaults to 50 |

Awaiting returns [`Page<TaskListItem>`](#task); `.items()` and `.pages()` walk every page lazily. Fails with `validation_failed` or [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor).

### `get()` [#get]

Gets one task without running it.

```rust
let task = client.tasks().get("tk_0123456789abcdef").await?;
```

**Signature:** `get(task_id: impl Into<TaskId>) -> Call<GetTask>`

Awaiting returns [`Task`](#task). Fails with `validation_failed` or `not_found`.

### `update()` [#update]

Changes a task. Setters you do not call keep their values, and a run already in progress keeps the settings it started with. The agent and `user_id` cannot change.

```rust
let task = client
    .tasks()
    .update("tk_0123456789abcdef")
    .prompt("Summarize the last two days.")
    .await?;
```

**Signature:** `update(task_id: impl Into<TaskId>) -> Call<UpdateTask>`

| Setter | Description |
| --- | --- |
| `name(name)` | New display name, 1 to 80 characters |
| `prompt(prompt)` | New prompt, 1 to 6,000 characters |
| `schedule(schedule)` | A new schedule, replacing the current one |
| `clear_schedule()` | Removes the schedule; the task runs only when you start it |
| `enabled(enabled)` | Whether the schedule fires |
| `metadata(metadata)` | Replaces the metadata completely |

Awaiting returns [`Task`](#task). Fails with `validation_failed` or `not_found`.

### `delete()` [#delete]

Deletes a task and stops its schedule. Its past runs and their transcripts are kept. A task with a queued or running run cannot be deleted.

```rust
client.tasks().delete("tk_0123456789abcdef").await?;
```

**Signature:** `delete(task_id: impl Into<TaskId>) -> Call<DeleteTask>`

Fails with `validation_failed`, `not_found`, or [`task_active_run_exists`](/api-reference/protocols/errors#task_active_run_exists).

### `submit()` [#submit]

Starts a run of the task now, whether or not it has a schedule. A task runs one run at a time.

```rust
let run = client
    .tasks()
    .submit("tk_0123456789abcdef")
    .idempotency_key("manual-1")
    .await?;
println!("{}", run.run_id);
```

**Signature:** `submit(task_id: impl Into<TaskId>) -> Call<CreateTaskRun>`

The `idempotency_key` setter makes retries safe: repeating the request with the same key returns the same run. Awaiting returns [`CreatedTaskRun`](#taskrun) with `run_id`. Fails with `validation_failed`, `not_found`, or `task_active_run_exists` while another run is queued or running.

### `list_runs()` [#list-runs]

Lists a task's runs, newest first.

```rust
let page = client.tasks().list_runs("tk_0123456789abcdef").await?;
```

**Signature:** `list_runs(task_id: impl Into<TaskId>) -> Call<ListTaskRuns>`

The `limit` setter takes 1 to 200 runs per page, defaulting to 50. Awaiting returns [`Page<TaskRun>`](#taskrun); `.items()` and `.pages()` walk every page lazily. Fails with `validation_failed`, `invalid_cursor`, or `not_found`.

### `get_run()` [#get-run]

Gets one run's current state and the agent configuration captured when it was queued. Poll it until `status` is final.

```rust
let run = client
    .tasks()
    .get_run("tk_0123456789abcdef", "tr_0123456789abcdef")
    .await?;
println!("{}", run.status);
```

**Signature:** `get_run(task_id: impl Into<TaskId>, run_id: impl Into<TaskRunId>) -> Call<GetTaskRun>`

Awaiting returns [`TaskRun`](#taskrun). Fails with `validation_failed` or `not_found`.

### `run_messages()` [#run-messages]

Returns a run's transcript with the run's `status`, `error`, and `finished_at`, so one request says both what the agent said and whether the run is done. The page is empty until the run starts its session.

```rust
let page = client
    .tasks()
    .run_messages("tk_0123456789abcdef", "tr_0123456789abcdef")
    .await?;
for message in &page.data {
    println!("{}", message.role);
}
```

**Signature:** `run_messages(task_id: impl Into<TaskId>, run_id: impl Into<TaskRunId>) -> Call<ListTaskRunMessages>`

Pages walk backward with `.cursor()`; the `after` setter polls for messages newer than a saved `latest_cursor`. Use one or the other. `limit` is 1 to 200, defaulting to 50. Awaiting returns `RunMessagesPage`. Fails with `validation_failed`, `invalid_cursor`, or `not_found`.

### `cancel_run()` [#cancel-run]

Asks a queued or running run to stop; poll `get_run()` for its `TaskRunStatus::Canceled` status.

```rust
client
    .tasks()
    .cancel_run("tk_0123456789abcdef", "tr_0123456789abcdef")
    .await?;
```

**Signature:** `cancel_run(task_id: impl Into<TaskId>, run_id: impl Into<TaskRunId>) -> Call<CancelTaskRun>`

It succeeds whenever the task exists, even if the run is missing or already finished. Fails with `validation_failed` or `not_found`.

## Response models [#response-models]

### `Task` [#task]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `TaskId` | Task ID (`tk_...`) |
| `tenant_id` | `TenantId` | Your tenant ID |
| `agent_id` | `AgentId` | The agent that runs the task |
| `name` | `String` | Display name |
| `prompt` | `String` | The prompt every run receives |
| `schedule` | `Option<Schedule>` | When it runs by itself |
| `enabled` | `bool` | Whether the schedule fires |
| `active_run_id` | `Option<TaskRunId>` | The run in progress |
| `latest_run_id` | `Option<TaskRunId>` | The most recent run |
| `user_id` | `String` | End user, or `""` for tenant level |
| `metadata` | `Metadata` | Your own data |
| `next_fire_at` | `Option<Timestamp>` | When the schedule next starts a run |
| `deleted_at` | `Option<Timestamp>` | When it was deleted |
| `created_at`, `updated_at` | `Timestamp` | Timestamps |

`TaskListItem` is the same plus `latest_run: Option<LatestRun>` (`id`, `status`, `finished_at`).

### `TaskRun` [#taskrun]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `TaskRunId` | Run ID (`tr_...`) |
| `task_id`, `tenant_id`, `agent_id` | `TaskId`, `TenantId`, `AgentId` | What it belongs to |
| `agent_config` | `AgentConfig` | Configuration captured when queued |
| `session_id` | `Option<SessionId>` | The run's session, once started |
| `turn_id` | `Option<TurnId>` | The run's metered turn |
| `status` | `TaskRunStatus` | `Queued` through `Canceled` |
| `error` | `Option<String>` | Why a failed or blocked run did not complete |
| `user_id` | `String` | End user, copied from the task |
| `metadata` | `Metadata` | Your own data |
| `started_at`, `finished_at`, `cancel_requested_at`, `canceled_at`, `created_at`, `updated_at` | `Option<Timestamp>`, `Timestamp` | Lifecycle timestamps |

## Next [#next]

- [Tasks and schedules](/automation/tasks)
- [Agents](/sdk/rust/agents)
