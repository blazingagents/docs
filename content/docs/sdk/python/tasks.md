---
title: Tasks
description: Manage asynchronous Tasks, schedules, Task runs, transcripts, and cancellation.
---

# Tasks

`client.tasks` manages reusable asynchronous Agent instructions and their Task runs. A Task is definition state; each run has its own lifecycle, Turn identity, and fresh Session after execution is admitted.

## Overview [#overview]

All arguments are keyword-only except the leading `task_id` and `run_id` identifiers shown in signatures. `list()` and `list_runs()` return one Pydantic page; `iter()` and `iter_runs()` lazily paginate. Async clients keep the same operation names: await request methods and use `async for` for lazy iteration.

Task run states are active `queued` and `running`, followed by terminal `blocked`, `succeeded`, `failed`, or `canceled`. `blocked` is an expected admission denial, such as quota exhaustion, a missing required subscription, or insufficient Usage credit, not an execution failure. A run's `session_id` remains `None` until a fresh Session is attached, while `turn_id` is the separate metered Turn identity.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create a Task, optionally submit it | `TaskCreateResponse` |
| [`list()`](#list) | Return one Task page | `TasksPage` |
| [`iter()`](#iter) | Lazily iterate Tasks | `Iterator[TaskListItem]` |
| [`get()`](#get) | Retrieve a Task | `Task` |
| [`update()`](#update) | Change mutable definition fields | `Task` |
| [`delete()`](#delete) | Soft-delete an inactive Task | `None` |
| [`submit()`](#submit) | Enqueue an on-demand Task run | `TaskRunSubmission` |
| [`list_runs()`](#list-runs) | Return one run page | `TaskRunsPage` |
| [`iter_runs()`](#iter-runs) | Lazily iterate runs | `Iterator[TaskRun]` |
| [`get_run()`](#get-run) | Retrieve durable run state | `TaskRun` |
| [`run_messages()`](#run-messages) | Page or poll the run transcript | `TaskRunMessagesPage` |
| [`cancel_run()`](#cancel-run) | Request cooperative cancellation | `None` |

## Methods [#methods]

### `create()` [#create]

**Signature:** `client.tasks.create(*, agent_id: str, name: str, prompt: str, agent_version=OMITTED, schedule=OMITTED, enabled=OMITTED, submit=OMITTED, user_id=OMITTED, metadata=OMITTED, extra_headers=None, timeout=OMITTED) -> TaskCreateResponse`

Creates an on-demand or scheduled Task. `agent_version=None` follows the current Agent Version; a number Pins it. `schedule=None` means on demand. Supported schedule dictionaries are `once` with `at`, `interval` with `every_ms >= 60000`, and `cron` with a five-field expression, optional timezone (defaulting to `UTC`), and optional `stagger_ms`. `submit=True` also creates the first run but does not make Task creation idempotent.

```python
created = client.tasks.create(
    agent_id=agent_id,
    name="Daily summary",
    prompt="Summarize open support cases.",
    schedule={
        "kind": "cron",
        "config": {"expression": "0 9 * * 1-5", "timezone": "Europe/London"},
    },
)
task = created.task
```

Raises `validation_failed`, `agent_version_not_found`, `agent_disabled` for immediate submission, or `admin_agent_managed`. The result's `run_id` is non-`None` only when submitted. See [Create a Task](/api-reference/rest-api/tasks#create-task).

### `list()` [#list]

**Signature:** `client.tasks.list(*, agent_id=OMITTED, user_id=OMITTED, cursor=OMITTED, limit=OMITTED, extra_headers=None, timeout=OMITTED) -> TasksPage`

Returns non-deleted Tasks newest first. Filters are optional; `user_id=""` selects Tenant-level Attribution. Pages default to 50 and accept 1–200.

```python
page = client.tasks.list(agent_id=agent_id, user_id="", limit=25)
```

Raises `validation_failed` or `invalid_cursor`. See [List Tasks](/api-reference/rest-api/tasks#list-tasks).

### `iter()` [#iter]

**Signature:** `client.tasks.iter(*, agent_id=OMITTED, user_id=OMITTED, cursor=OMITTED, limit=OMITTED, extra_headers=None, timeout=OMITTED) -> Iterator[TaskListItem]`

Lazily calls `list()` through every `next_cursor`. It can start at a saved cursor and may raise list errors on any page.

```python
for task in client.tasks.iter(agent_id=agent_id):
    print(task.id, task.latest_run)

async for task in async_client.tasks.iter(agent_id=agent_id):
    print(task.id)
```

### `get()` [#get]

**Signature:** `client.tasks.get(task_id: str, *, extra_headers=None, timeout=OMITTED) -> Task`

Retrieves one non-deleted Task without submitting it. Raises `validation_failed` or `not_found`.

```python
task = client.tasks.get(task_id)
```

See [Get a Task](/api-reference/rest-api/tasks#get-task).

### `update()` [#update]

**Signature:** `client.tasks.update(task_id: str, *, agent_version=OMITTED, name=OMITTED, prompt=OMITTED, schedule=OMITTED, enabled=OMITTED, metadata=OMITTED, extra_headers=None, timeout=OMITTED) -> Task`

Updates at least one mutable field. Explicit `None` clears `agent_version` or `schedule`; omission leaves it unchanged. `agent_id`, `user_id`, and existing run facts are immutable. Supplying no field raises `ValueError` before a request.

```python
task = client.tasks.update(
    task_id, enabled=False, metadata={"paused_by": "ops"}
)
```

Request errors include `validation_failed`, `not_found`, `agent_version_not_found`, and `admin_agent_managed`. See [Update a Task](/api-reference/rest-api/tasks#update-task).

### `delete()` [#delete]

**Signature:** `client.tasks.delete(task_id: str, *, extra_headers=None, timeout=OMITTED) -> None`

Soft-deletes a Task while preserving existing Task runs and Sessions. Raises `validation_failed`, `not_found`, or `task_active_run_exists`.

```python
client.tasks.delete(task_id)
```

See [Delete a Task](/api-reference/rest-api/tasks#delete-task).

### `submit()` [#submit]

**Signature:** `client.tasks.submit(task_id: str, *, idempotency_key=OMITTED, extra_headers=None, timeout=OMITTED) -> TaskRunSubmission`

Enqueues an immediate Task run. A non-empty idempotency key is scoped to the Tenant and Task; retries return the same `run_id`, including while it is active. A different or absent key conflicts while another run is active.

```python
submission = client.tasks.submit(
    task_id, idempotency_key="daily-summary:2026-08-03"
)
run_id = submission.run_id
```

Raises `validation_failed`, `not_found`, `task_active_run_exists`, `agent_version_not_found`, or `agent_disabled`. See [Create a Task run](/api-reference/rest-api/task-runs#create-task-run).

### `list_runs()` [#list-runs]

**Signature:** `client.tasks.list_runs(task_id: str, *, cursor=OMITTED, limit=OMITTED, extra_headers=None, timeout=OMITTED) -> TaskRunsPage`

Lists one Task's runs newest first using opaque cursor pagination.

```python
page = client.tasks.list_runs(task_id, limit=25)
```

Raises `validation_failed`, `invalid_cursor`, or `not_found`. See [List Task runs](/api-reference/rest-api/task-runs#list-task-runs).

### `iter_runs()` [#iter-runs]

**Signature:** `client.tasks.iter_runs(task_id: str, *, cursor=OMITTED, limit=OMITTED, extra_headers=None, timeout=OMITTED) -> Iterator[TaskRun]`

Lazily calls `list_runs()` until `next_cursor` is `None`. Async consumers use the identical name with `async for`.

```python
for run in client.tasks.iter_runs(task_id):
    print(run.id, run.status)

async for run in async_client.tasks.iter_runs(task_id):
    print(run.id, run.status)
```

### `get_run()` [#get-run]

**Signature:** `client.tasks.get_run(task_id: str, run_id: str, *, extra_headers=None, timeout=OMITTED) -> TaskRun`

Retrieves durable state without restarting execution. `session_id` is `None` before Session attachment; `turn_id` is `None` while queued or before a Turn is admitted. Raises `validation_failed` or `not_found` for a missing, foreign, or mismatched pair.

```python
run = client.tasks.get_run(task_id, run_id)
```

See [Get a Task run](/api-reference/rest-api/task-runs#get-task-run).

### `run_messages()` [#run-messages]

**Signature:** `client.tasks.run_messages(task_id: str, run_id: str, *, cursor=OMITTED, after=OMITTED, limit=OMITTED, extra_headers=None, timeout=OMITTED) -> TaskRunMessagesPage`

Reads the fresh Session transcript, which persists incrementally during execution. Before a Session exists it returns an empty page. Use `cursor` to walk backward or `after` with a saved `latest_cursor` to poll forward, never both.

```python
messages = client.tasks.run_messages(task_id, run_id, limit=50)
if messages.latest_cursor is not None:
    newer = client.tasks.run_messages(
        task_id, run_id, after=messages.latest_cursor
    )
```

Raises `validation_failed`, `invalid_cursor`, or `not_found`. See [List Task-run messages](/api-reference/rest-api/task-runs#list-task-run-messages).

### `cancel_run()` [#cancel-run]

**Signature:** `client.tasks.cancel_run(task_id: str, run_id: str, *, extra_headers=None, timeout=OMITTED) -> None`

Requests cooperative cancellation and returns before the transition necessarily completes; poll `get_run()`. Missing, mismatched, and terminal runs are non-enumerating no-ops after an owned Task is found.

```python
client.tasks.cancel_run(task_id, run_id)
await async_client.tasks.cancel_run(task_id, run_id)
```

Raises `validation_failed` or `not_found` when the Task itself is unavailable. See [Cancel a Task run](/api-reference/rest-api/task-runs#cancel-task-run).

## Response models and lifecycle [#response-models-and-lifecycle]

`Task` exposes definition, schedule, immutable Attribution, active/latest run IDs, metadata, deletion, and timestamps. `TaskListItem` adds `latest_run`; pages expose `data` and `next_cursor`.

`TaskRun` exposes `id`, `task_id`, Tenant and Agent IDs, resolved `agent_version`, nullable `session_id` and `turn_id`, status, error, inherited Attribution and metadata, lifecycle timestamps, and cancellation timestamps. State fields are forward-compatible strings.

At most one run is active per Task. Scheduled overlaps are skipped without creating a run. Cancellation is cooperative. A blocked run may have no Session if preflight stopped it, or an empty attached Session if the ordinary Turn gate stopped it later.

## Related [#related]

- [Tasks and schedules](/automation/tasks)
- [REST Tasks](/api-reference/rest-api/tasks)
- [REST Task runs](/api-reference/rest-api/task-runs)
- [Python Sessions](/sdk/python/sessions)
