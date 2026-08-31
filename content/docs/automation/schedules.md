---
title: Schedules
description: Run Tasks once, at fixed intervals, or from calendar-based cron expressions.
---

# Schedules

Use a schedule when a Task should run from a clock instead of an interactive request. A schedule belongs to the Task definition; each accepted fire creates a separate [Task run](/automation/task-runs).

## Outcome [#outcome]

You will create an interval Task, verify its persisted schedule, and observe a
run created by a scheduled fire.

## Before you begin [#before-you-begin]

You need an enabled [Agent](/agents/agents), its `agentId`, a
backend SDK `client`, and the Task instruction. Review
[Tasks](/automation/tasks) and decide whether
the Task should follow the latest Agent Version or a
[Version Pin](/agents/versions-and-lifecycle).

## Choose a schedule [#choose-a-schedule]

| Kind | Required configuration | Use when |
| --- | --- | --- |
| `once` | `at`: ISO 8601 timestamp with an offset | Work should be attempted once at a known instant. |
| `interval` | `everyMs`: integer of at least 60,000 | Work should repeat on creation-anchored elapsed-time boundaries. |
| `cron` | five-field numeric `expression`; optional IANA `timezone` and nonnegative `staggerMs` | Work should follow calendar boundaries in a named timezone. |

## Create a scheduled Task [#create-a-scheduled-task]

Pass a schedule with the Task definition. The Task response exposes the
stored schedule, not a next-fire timestamp.

```typescript
const expectedSchedule = {
  kind: "interval" as const,
  config: { everyMs: 60_000 },
};
const { task } = await client.tasks.create({
  agentId,
  name: "Refresh operations summary",
  prompt: "Refresh the operations summary.",
  schedule: expectedSchedule,
});
const stored = await client.tasks.get(task.id);
if (JSON.stringify(stored.schedule) !== JSON.stringify(expectedSchedule)) {
  throw new Error("The persisted schedule does not match");
}
let runs = await client.tasks.listRuns(task.id);
for (let attempt = 0; attempt < 70 && runs.data.length === 0; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  runs = await client.tasks.listRuns(task.id);
}
if (!runs.data[0]) throw new Error("No scheduled run was observed");
console.log(runs.data[0].status);
```

## Configure one-time, interval, and cron schedules [#configure-one-time-interval-and-cron-schedules]

One-time timestamps must include an offset:

```typescript
const schedule = {
  kind: "once" as const,
  config: { at: "2026-08-15T09:00:00+01:00" },
};
```

Intervals use milliseconds and cannot be shorter than 60 seconds:

```typescript
const schedule = {
  kind: "interval" as const,
  config: { everyMs: 15 * 60_000 },
};
```

Cron uses five numeric fields. The timezone defaults to `UTC` when
omitted; otherwise supply a canonical IANA name. `staggerMs` is an
optional maximum deterministic delay for spreading Task starts.

```typescript
const schedule = {
  kind: "cron" as const,
  config: {
    expression: "0 9 * * 1-5",
    timezone: "Europe/London",
    staggerMs: 30_000,
  },
};
```

## Verify the next run [#verify-the-next-run]

The final lines of the primary example compare the exact persisted
schedule and bound how long they wait for a run. A new run begins as
`queued`; it may already be `running` or terminal by the time the list
request returns. `listRuns` is the supported way to observe the run after
a fire is accepted.

## Change or pause a schedule [#change-or-pause-a-schedule]

Call `tasks.update(taskId, { schedule })` to replace the schedule, or pass
`schedule: null` to make the Task on-demand. Pass `enabled: false` to remove
the active schedule while retaining the definition; `enabled: true` schedules
its current configuration again. Schedule and enabled mutations use a new
generation so stale fires cannot create runs.

Disabling the Agent does not mutate its Tasks. Scheduled fires are skipped
without Task-run rows while the Agent is disabled, and the next eligible
recurring fire can run after the Agent is enabled. A skipped one-time fire is
not replayed merely because the Agent is enabled later.

## Production notes [#production-notes]

- Cron fires use their configured timezone. The optional stagger is stable for
  one Task and clamped inside the current cron window.
- At most one run per Task is active. An overlapping scheduled fire is skipped;
  interval scheduling still advances to its next creation-anchored boundary.
- Cron scheduling disables automatic backfill. Intervals select the next
  strictly future creation-anchored boundary, so missed interval boundaries do
  not produce a burst of catch-up runs.
- An overdue one-time schedule is started immediately when synchronization or
  reconciliation recovers it. Do not treat this as a general catch-up
  guarantee.
- Product state is fenced by a schedule generation and reconciled with durable
  scheduler state. This supports recovery without promising exactly-once
  execution. See [Limits and reliability](/platform/limits-and-reliability).

## Related concepts [#related-concepts]

- [Tasks](/automation/tasks)
- [Task runs](/automation/task-runs)
- [Agents](/agents/agents)
- [Versions and lifecycle](/agents/versions-and-lifecycle)
- [Limits and reliability](/platform/limits-and-reliability)

## SDK and REST reference [#sdk-and-rest-reference]

See [`tasks.create`](/sdk/typescript/tasks#create),
[`tasks.get`](/sdk/typescript/tasks#get),
[`tasks.update`](/sdk/typescript/tasks#update), and
[`tasks.listRuns`](/sdk/typescript/tasks#list-runs). The matching
REST operations are [create Task](/api-reference/rest-api/tasks#create-task),
[get Task](/api-reference/rest-api/tasks#get-task),
[update Task](/api-reference/rest-api/tasks#update-task), and
[list Task runs](/api-reference/rest-api/task-runs#list-task-runs).

Python equivalents: [`tasks.create()`](/sdk/python/tasks#create),
[`tasks.get()`](/sdk/python/tasks#get),
[`tasks.update()`](/sdk/python/tasks#update), and
[`tasks.list_runs()`](/sdk/python/tasks#list-runs).
