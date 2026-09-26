---
title: Task runs
description: Start a task in the background, check on it later, read the agent's answer, or cancel it.
---

# Task runs

Start a task, return right away, and pick up the result later. Each run executes the task's agent in the background and keeps its own status and transcript, so a web request never has to wait for a long job.

## Start a run [#start-a-run]

Pass an idempotency key so a retried request returns the same run instead of starting a second one. Set `TASK_ID` to a [task](/automation/tasks) you created.

```typescript tab="TypeScript"
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});
const taskId = process.env.TASK_ID!;

const { runId } = await client.tasks.createRun({
  taskId,
  idempotencyKey: "weekly-report:2026-07-20",
});
console.log(runId);
```

```python tab="Python"
import os

from blazing_agents import BlazingAgents

client = BlazingAgents()
task_id = os.environ["TASK_ID"]

run_id = client.tasks.submit(task_id, idempotency_key="weekly-report:2026-07-20").run_id
print(run_id)
```

You see a `tr_...` run ID. Save it with the task ID, then return. Build the key from something stable about the job, such as the week it covers. A task runs one job at a time, so starting a run with a different key while another is active returns `task_active_run_exists`.

## Check on it later [#check-on-it-later]

From a later request, a scheduled job, or a worker, read the run's status and transcript in one call:

```typescript tab="TypeScript"
const run = await client.tasks.runMessages({ taskId, runId });
if (run.status === "queued" || run.status === "running") {
  console.log("Still working. Check again later.");
} else {
  const answer = run.data.findLast((message) => message.role === "assistant");
  console.log(run.status, answer?.parts);
}
```

```python tab="Python"
run = client.tasks.run_messages(task_id, run_id)
if run.status in ("queued", "running"):
    print("Still working. Check again later.")
else:
    answer = next((m for m in reversed(run.data) if m.role == "assistant"), None)
    print(run.status, answer.parts if answer else None)
```

When the run is done, you see its final status and the agent's last answer. A run moves from `queued` to `running`, then ends in one of four final statuses:

| Status | Meaning |
| --- | --- |
| `succeeded` | The agent finished. Its last assistant message is the result. |
| `failed` | Something went wrong. Read `error`, but treat it as sensitive and redact it before you log it. |
| `canceled` | You cancelled the run before it finished. |
| `blocked` | The agent did not run because a quota, subscription, or usage credit check failed. It is not a failure. See [usage and quotas](/platform/usage-and-quotas). |

Each run that executes gets a fresh [session](/platform/sessions-and-turns), so the transcript holds only this run. A run blocked before its session was created has an empty transcript. Use `client.tasks.getRun()` when you need the run's timestamps, session ID, or the agent version it used.

## Cancel a run [#cancel-a-run]

```typescript tab="TypeScript"
await client.tasks.cancelRun({ taskId, runId });
```

```python tab="Python"
client.tasks.cancel_run(task_id, run_id)
```

Cancelling asks the run to stop at its next safe point. Keep checking until you see a final status. The run may finish first, so handle `succeeded` as well as `canceled`. Cancelling a run that already finished does nothing and returns no error.

## Production notes [#production-notes]

- A run's turn executes at most once. If the platform restarts mid-run, an unfinished run ends as `failed` instead of repeating model or tool calls. Check for side effects before you start the work again.
- No one can approve a tool call during a run. See [tool approvals in tasks](/automation/tasks#tool-approvals-in-tasks).
- Alert when a run stays `queued` or `running` longer than you expect, or does not finish after you cancel it.
- A `blocked` run frees the task, so its next scheduled time can run once the quota or plan allows.

## Next [#next]

- [Run a task on a schedule](/automation/schedules).
- [Limits and reliability](/platform/limits-and-reliability) for retries and error handling.
- [`tasks.runMessages()`](/sdk/typescript/tasks#run-messages) for paging long transcripts.
