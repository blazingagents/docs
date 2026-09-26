---
title: Tasks
description: Run agents in the background, on demand or on a schedule, and follow each run with the Python SDK.
---

# Tasks

`client.tasks` runs an agent in the background. A task is a saved prompt for one agent; each time it runs, on demand or on a schedule, you get a task run with its own status and transcript. Use tasks for work that should not block a request, such as nightly reports.

Examples assume `client = BlazingAgents()` and an `agent_id`. Every method also accepts `extra_headers` and `timeout`. On `AsyncBlazingAgents`, await the same method names and use `async for` with `iter()` and `iter_runs()`.

```python
created = client.tasks.create(
    agent_id=agent_id,
    name="Daily summary",
    prompt="Summarize yesterday's open support cases.",
    submit=True,
)
run = client.tasks.get_run(created.task.id, created.run_id)
print(run.status)
```

## Runs and their status [#runs-and-their-status]

A run moves from `"queued"` to `"running"`, then ends as `"succeeded"`, `"failed"`, `"canceled"`, or `"blocked"`. `"blocked"` means the run was not allowed to start, for example because your tenant's quota ran out; it is not an execution failure. A task has at most one active run at a time, and a scheduled run that would overlap an active one is skipped.

Each run gets a fresh session. `session_id` stays `None` until that session exists, and `turn_id` identifies the run's metered turn.

Tasks never wait for a person. Under the agent's `approval_in_tasks` policy, a tool call that needs manual approval is denied, and the model is told so it can continue with other work. See [tool approvals](/agents/tools/tool-approvals).

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create a task, and optionally run it | `TaskCreateResponse` |
| [`list()`](#list) | Get one page of tasks | `TasksPage` |
| [`iter()`](#iter) | Iterate every task | `Iterator[TaskListItem]` |
| [`get()`](#get) | Get one task | `Task` |
| [`update()`](#update) | Change a task | `Task` |
| [`delete()`](#delete) | Delete a task | `None` |
| [`submit()`](#submit) | Start a run now | `TaskRunSubmission` |
| [`list_runs()`](#list-runs) | Get one page of runs | `TaskRunsPage` |
| [`iter_runs()`](#iter-runs) | Iterate every run | `Iterator[TaskRun]` |
| [`get_run()`](#get-run) | Get one run | `TaskRun` |
| [`run_messages()`](#run-messages) | Read or poll a run's transcript | `TaskRunMessagesPage` |
| [`cancel_run()`](#cancel-run) | Ask a run to stop | `None` |

## Methods [#methods]

### `create()` [#create]

Creates a task that runs on demand or on a schedule.

```python
created = client.tasks.create(
    agent_id=agent_id,
    name="Weekday digest",
    prompt="Summarize open support cases.",
    schedule={
        "kind": "cron",
        "config": {"expression": "0 9 * * 1-5", "timezone": "Europe/London"},
    },
)
task = created.task
```

**Signature:** `create(*, agent_id: str, name: str, prompt: str, agent_version=..., schedule=..., enabled=..., submit=..., user_id=..., metadata=...) -> TaskCreateResponse`

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `agent_id` | `str` | required | Agent that runs the task |
| `name` | `str` | required | 1 to 80 characters |
| `prompt` | `str` | required | Message sent to the agent, up to 6,000 characters |
| `agent_version` | `int \| None` | `None` | Pin a version; `None` always uses the latest |
| `schedule` | `TaskScheduleInput \| None` | `None` | When to run; `None` means on demand only |
| `enabled` | `bool` | `True` | Whether the schedule fires |
| `submit` | `bool` | `False` | Also start the first run now |
| `user_id` | `str` | `""` | End user; fixed after creation and copied to every run |
| `metadata` | `dict[str, object]` | `{}` | Your own data, copied to every run |

A schedule is one of:

| `kind` | `config` |
| --- | --- |
| `"once"` | `{"at": "2026-10-01T09:00:00+01:00"}`, an ISO datetime with an offset |
| `"interval"` | `{"every_ms": 3_600_000}`, at least `60000` |
| `"cron"` | `{"expression": "0 9 * * 1-5"}`, a five-field expression, with optional `"timezone"` (default `"UTC"`) and `"stagger_ms"` |

The SDK checks the schedule shape before sending and raises `TypeError` or `ValueError` for a malformed one. `submit=True` does not make creation safe to retry: retrying creates another task.

Returns `TaskCreateResponse` with `task` and `run_id`, which is set only when `submit=True`. Raises `APIStatusError` with `validation_failed`, `agent_version_not_found`, or `agent_disabled` when `submit=True` and the agent is disabled.

### `list()` [#list]

Gets one page of tasks, newest first.

```python
page = client.tasks.list(agent_id=agent_id, limit=25)
```

**Signature:** `list(*, agent_id=..., user_id=..., cursor=..., limit=...) -> TasksPage`

Both filters are optional; `user_id=""` returns tenant-level tasks. `limit` is 1 to 200 and defaults to 50. Returns `TasksPage` with `data: list[TaskListItem]` and `next_cursor`. Raises `validation_failed` or `invalid_cursor`.

### `iter()` [#iter]

Iterates every matching task, fetching pages as you go.

```python
for task in client.tasks.iter(agent_id=agent_id):
    print(task.name, task.latest_run.status if task.latest_run else None)
```

**Signature:** `iter(*, agent_id=..., user_id=..., cursor=..., limit=...) -> Iterator[TaskListItem]`

Takes the same parameters as [`list()`](#list). No request is sent until you start iterating.

### `get()` [#get]

Gets one task. This does not start a run.

```python
task = client.tasks.get(task.id)
```

**Signature:** `get(task_id: str) -> Task`

Returns [`Task`](#task). Raises `validation_failed` or `not_found`.

### `update()` [#update]

Changes a task's prompt, schedule, version pin, or other settings.

```python
task = client.tasks.update(task.id, enabled=False, metadata={"paused_by": "ops"})
```

**Signature:** `update(task_id: str, *, agent_version=..., name=..., prompt=..., schedule=..., enabled=..., metadata=...) -> Task`

Omitted parameters keep their current value. `agent_version=None` unpins the task, and `schedule=None` makes it on demand only. `agent_id` and `user_id` cannot change, and past runs are unaffected. Calling `update()` with nothing to change raises `ValueError` before any request.

Returns [`Task`](#task). Raises `validation_failed`, `not_found`, or `agent_version_not_found`.

### `delete()` [#delete]

Deletes a task. Its past runs and their sessions stay readable.

```python
client.tasks.delete(task.id)
```

**Signature:** `delete(task_id: str) -> None`

Raises `task_active_run_exists` while a run is queued or running, `validation_failed`, or `not_found`.

### `submit()` [#submit]

Starts a run now.

```python
submission = client.tasks.submit(task.id, idempotency_key="daily-summary:2026-10-01")
run_id = submission.run_id
```

**Signature:** `submit(task_id: str, *, idempotency_key=...) -> TaskRunSubmission`

With an `idempotency_key`, retrying with the same key returns the same `run_id` instead of starting another run. The key must not be blank. Without a key, or with a different one, a submit while another run is active raises `task_active_run_exists`.

Returns `TaskRunSubmission` with `run_id`. Also raises `validation_failed`, `not_found`, `agent_version_not_found`, or `agent_disabled`.

### `list_runs()` [#list-runs]

Gets one page of a task's runs, newest first.

```python
page = client.tasks.list_runs(task.id, limit=25)
```

**Signature:** `list_runs(task_id: str, *, cursor=..., limit=...) -> TaskRunsPage`

Returns `TaskRunsPage` with `data: list[TaskRun]` and `next_cursor`. Raises `validation_failed`, `invalid_cursor`, or `not_found`.

### `iter_runs()` [#iter-runs]

Iterates every run of a task, fetching pages as you go.

```python
for run in client.tasks.iter_runs(task.id):
    print(run.id, run.status)
```

**Signature:** `iter_runs(task_id: str, *, cursor=..., limit=...) -> Iterator[TaskRun]`

Takes the same parameters as [`list_runs()`](#list-runs). On the async client, use `async for` directly on `iter_runs(...)`.

### `get_run()` [#get-run]

Gets one run's current state.

```python
run = client.tasks.get_run(task.id, run_id)
if run.status == "failed":
    print(run.error)
```

**Signature:** `get_run(task_id: str, run_id: str) -> TaskRun`

Returns [`TaskRun`](#taskrun). Poll it until `status` is final. Raises `validation_failed` or `not_found`, including when the run belongs to another task.

### `run_messages()` [#run-messages]

Reads a run's transcript, or polls it for new messages.

```python
page = client.tasks.run_messages(task.id, run_id, limit=50)
if page.latest_cursor is not None:
    newer = client.tasks.run_messages(task.id, run_id, after=page.latest_cursor)
```

**Signature:** `run_messages(task_id: str, run_id: str, *, cursor=..., after=..., limit=...) -> TaskRunMessagesPage`

Works like [`sessions.messages()`](/sdk/python/sessions#messages): `cursor` pages backward, `after` polls forward, and you cannot pass both. The prompt appears when the run starts and the agent's answer when it ends. Before the run has a session, the page is empty.

Returns `TaskRunMessagesPage`: the messages page fields plus the run's `status`, `error`, and `finished_at`. Raises `validation_failed`, `invalid_cursor`, or `not_found`.

### `cancel_run()` [#cancel-run]

Asks a run to stop.

```python
client.tasks.cancel_run(task.id, run_id)
```

**Signature:** `cancel_run(task_id: str, run_id: str) -> None`

A queued run is canceled right away. A running one stops at its next safe point, so poll [`get_run()`](#get-run) to see `"canceled"`. Canceling a finished, missing, or mismatched run does nothing. Raises `validation_failed` or `not_found` only when the task itself is missing.

## Response models [#response-models]

### `Task` [#task]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `str` | Task ID (`tk_...`) |
| `tenant_id`, `agent_id` | `str` | Owner and agent |
| `name`, `prompt` | `str` | Name and prompt |
| `agent_version` | `int \| None` | Pinned version, or `None` for the latest |
| `schedule` | `TaskSchedule \| None` | Schedule, or `None` for on demand |
| `enabled` | `bool` | Whether the schedule fires |
| `active_run_id`, `latest_run_id` | `str \| None` | Current and most recent runs |
| `user_id` | `str` | End user, or `""` for tenant level |
| `metadata` | `dict[str, object]` | Your own data |
| `deleted_at` | `datetime \| None` | Deletion time |
| `created_at`, `updated_at` | `datetime` | Timestamps |

`TaskListItem` adds `latest_run`, with the latest run's `id`, `status`, and `finished_at`.

### `TaskRun` [#taskrun]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `str` | Run ID (`tr_...`) |
| `task_id`, `tenant_id`, `agent_id` | `str` | Owners |
| `agent_version` | `int` | Version the run used |
| `session_id` | `str \| None` | The run's session, once created |
| `turn_id` | `str \| None` | The run's metered turn, once started |
| `status` | `str` | `queued`, `running`, `blocked`, `succeeded`, `failed`, or `canceled` |
| `error` | `str \| None` | Failure reason |
| `user_id`, `metadata` | `str`, `dict[str, object]` | Copied from the task |
| `started_at`, `finished_at` | `datetime \| None` | Lifecycle times |
| `cancel_requested_at`, `canceled_at` | `datetime \| None` | Cancellation times |
| `created_at`, `updated_at` | `datetime` | Timestamps |

## Next [#next]

- [Tasks guide](/automation/tasks)
- [Schedules](/automation/schedules)
- [Task runs](/automation/task-runs)
