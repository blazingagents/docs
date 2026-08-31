---
title: Tasks
description: Define reusable background Agent work and control the configuration used by future runs.
---

# Tasks

A Task is persisted configuration for running an Agent asynchronously. It stores the Agent, instruction, optional Version Pin, attribution, enabled state, and optional schedule. The Task is a definition; each execution is a separate [Task run](/automation/task-runs).

## Task definition [#task-definition]

A Task has a `tk_…` ID and belongs to one Tenant and Agent. Its core fields are:

| Field | Purpose |
| --- | --- |
| `agentId` | Selects the Agent that executes the work. |
| `name` | Identifies the definition to operators. |
| `prompt` | Supplies the fixed instruction for every run. |
| `agentVersion` | Pins a Version, or remains `null` to resolve latest when a run is enqueued. |
| `userId` and `metadata` | Attribute resulting runs, Sessions, usage, and Artifacts. |
| `schedule` | Runs on demand when `null`, or delegates timing to [Schedules](/automation/schedules). |
| `enabled` | Allows scheduled fires; it does not prevent an explicit on-demand run. |

`activeRunId`, `latestRunId`, and recent terminal summaries expose execution state without turning the Task itself into an execution.

## Create an on-demand Task [#create-an-on-demand-task]

Create the definition first, then submit runs separately when idempotency matters:

```typescript
const { task } = await client.tasks.create({
  agentId,
  name: "Build weekly report",
  prompt: "Build the weekly report and summarize the result.",
  userId: "app:user-42",
  metadata: { accountId: "account-7" },
});

console.log(task.id, task.schedule); // tk_…, null
```

Omitting `schedule` creates an on-demand Task. `agentVersion` defaults to `null`, so each future run resolves the Agent's latest Version when it is enqueued. Set a Version number when repeatability matters.

## Update and delete a Task [#update-and-delete-a-task]

Mutable definition fields affect future runs only. Updating `agentVersion`, prompt, metadata, enabled state, or schedule does not rewrite an already admitted run. A queued or running run retains the Version and inputs captured when it was created.

Deleting a Task removes its reusable definition and scheduled execution. Inspect active state and apply your application's cancellation policy before deletion; do not assume deletion reverses external Tool or filesystem effects.

## Attribution and ownership [#attribution-and-ownership]

The Tenant credential owns every Task. `userId` is immutable attribution inherited by runs; it is not authorization. Resolve Task IDs through your backend's access rules before reading, updating, submitting, or deleting them. See [Tenancy and attribution](/platform/tenancy-and-attribution).

## Next steps [#next-steps]

- [Submit and inspect a Task run](/automation/task-runs).
- [Configure one-time or recurring schedules](/automation/schedules).
- [Understand usage and quotas](/platform/usage-and-quotas).
- [Design retries and recovery](/platform/limits-and-reliability).

## Reference [#reference]

- [TypeScript Tasks SDK](/sdk/typescript/tasks)
- [Python Tasks SDK](/sdk/python/tasks)
- [Tasks REST API](/api-reference/rest-api/tasks)
