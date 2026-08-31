---
title: Task runs
description: Submit, inspect, cancel, and diagnose one durable background execution.
---

# Task runs

A Task run is one durable execution of a [Task](/automation/tasks). Use an on-demand run when an Agent should complete work asynchronously without waiting on an interactive request.

## Outcome [#outcome]

You will obtain a terminal Task run and its final assistant message. The main
path expects `succeeded`; production code must also handle `blocked`, `failed`,
and `canceled`.

## Before you begin [#before-you-begin]

You need an enabled Agent, its `agentId`, a configured backend SDK `client`, and
a fixed instruction for the Task. Review [Tasks](/automation/tasks),
[Sessions and Turns](/platform/sessions-and-turns), and
[Versions and lifecycle](/agents/versions-and-lifecycle).

## Create an on-demand Task [#create-an-on-demand-task]

Create the Task with `agentId`, `name`, and `prompt`. Omitting `schedule`
stores `null`; `enabled`, `submit`, `userId`, `metadata`, and
`agentVersion` default to `true`, `false`, `""`, `{}`, and `null`. A null
`agentVersion` resolves the Agent's latest Version when each run is
enqueued. Set a Version number to Pin future runs of this Task.

## Submit an idempotent run [#submit-an-idempotent-run]

Pass a stable, Task-scoped business key to `createRun`. Repeating the same
key for the same tenant and Task resolves to the same run ID. A different
submission while that Task has a queued or running run is rejected because
only one run can be active.

## Inspect completion later [#inspect-completion-later]

Persist the submitted Task and run IDs, then return. A later request, scheduled
job, or worker invocation reads one snapshot with `getRun`. If it is still
`queued` or `running`, end that invocation and check again later. `blocked`,
`succeeded`, `failed`, and `canceled` are terminal.

## Read the transcript [#read-the-transcript]

Every executing run receives a fresh Session. `runMessages` returns its
`UIMessage` transcript; the final response is the last message whose role
is `assistant`. A run blocked before Session creation has an empty
transcript.

Treat `run.error` as an untrusted, potentially sensitive arbitrary error
message. Redact it before logging or sharing; do not interpolate it into a
newly thrown error.

## Cancel an active run [#cancel-an-active-run]

To exercise cancellation, submit a fresh run and immediately request
cancellation while the run can still be active. Missing,
mismatched, already terminal, and repeated cancellations are no-op `204`
responses for an owned Task.

```typescript
const cancelInput = { idempotencyKey: `weekly-report-cancel:${weekStart}` };
const cancellation = await client.tasks.createRun(task.id, cancelInput);
await client.tasks.cancelRun(task.id, cancellation.runId);

// From a later request, scheduled job, or worker invocation:
const cancellationState = await client.tasks.getRun(task.id, cancellation.runId);
console.log(cancellationState.status);
```

Cancellation can race normal completion; branch on the terminal status
you observe instead of assuming `canceled`.

## Verify the terminal state [#verify-the-terminal-state]

```typescript
const { task } = await client.tasks.create({
  agentId,
  name: "Build weekly report",
  prompt: "Build the weekly report and summarize the result.",
});
const { runId } = await client.tasks.createRun(task.id, {
  idempotencyKey: `weekly-report:${weekStart}`,
});
// Persist task.id and runId, then return to the caller.
```

From a later request, scheduled job, or worker invocation, load the persisted
IDs and inspect one durable snapshot:

```typescript
const run = await client.tasks.getRun(taskId, runId);
if (run.status === "queued" || run.status === "running") {
  console.log("Task is still active; check again in a later invocation.");
} else {
  const messages = await client.tasks.runMessages(taskId, runId);
  const finalResponse = messages.data.findLast(
    (message) => message.role === "assistant",
  );
  if (run.status !== "succeeded" || !finalResponse) {
    throw new Error(`Task verification failed with status ${run.status}`);
  }
  console.log(finalResponse.parts);
}
```

The later check proves that the documented terminal state and at least one
assistant transcript message are both observable without propagating the
raw run error.

## Production notes [#production-notes]

- Keep idempotency keys stable across client retries. Task creation and
  `submit: true` are not idempotent; create the Task first, then use
  `createRun` when submission deduplication matters.
- Task execution is at-most-once. Recovery returns a recorded completed
  outcome without rerunning the Turn; an interrupted claimed Turn is finalized
  as failed rather than replaying model or Tool effects.
- Updating `agentVersion` changes the Pin for future runs. `null` restores
  latest-Version resolution; each run records the Version it actually used.
- A Task is preflighted before Session creation and checked again at the normal
  Turn gate. Quota denial ends as `blocked`, not `failed`.
- Read [Limits and reliability](/platform/limits-and-reliability)
  and [Usage and quotas](/platform/usage-and-quotas) before setting
  retry and alert policy.

## Related concepts [#related-concepts]

- [Tasks](/automation/tasks)
- [Schedules](/automation/schedules)
- [Sessions and Turns](/platform/sessions-and-turns)
- [Versions and lifecycle](/agents/versions-and-lifecycle)
- [Usage and quotas](/platform/usage-and-quotas)
- [Limits and reliability](/platform/limits-and-reliability)

## SDK and REST reference [#sdk-and-rest-reference]

See the TypeScript SDK operations for
[`create`](/sdk/typescript/tasks#create),
[`createRun`](/sdk/typescript/tasks#create-run),
[`getRun`](/sdk/typescript/tasks#get-run),
[`runMessages`](/sdk/typescript/tasks#run-messages), and
[`cancelRun`](/sdk/typescript/tasks#cancel-run). The matching REST
contracts are [Tasks](/api-reference/rest-api/tasks#create-task),
[create Task run](/api-reference/rest-api/task-runs#create-task-run),
[get Task run](/api-reference/rest-api/task-runs#get-task-run),
[list Task run messages](/api-reference/rest-api/task-runs#list-task-run-messages),
and [cancel Task run](/api-reference/rest-api/task-runs#cancel-task-run).

Python equivalents: [`create()`](/sdk/python/tasks#create),
[`submit()`](/sdk/python/tasks#submit),
[`get_run()`](/sdk/python/tasks#get-run),
[`run_messages()`](/sdk/python/tasks#run-messages), and
[`cancel_run()`](/sdk/python/tasks#cancel-run).
