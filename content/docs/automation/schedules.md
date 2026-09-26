---
title: Schedules
description: Run a task once at a set time, every few minutes, or on a cron in your timezone.
---

# Schedules

Run a task on a clock instead of from your code: every weekday morning, every 15 minutes, or once next Friday. Add a schedule to a [task](/automation/tasks) and Blazing Agents starts each [task run](/automation/task-runs) for you.

## Create a scheduled task [#create-a-scheduled-task]

This task runs at 9:00 London time every weekday. Set `AGENT_ID` to an agent with a provider and model, such as the one from the [quickstart](/getting-started/quickstart).

```typescript tab="TypeScript"
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});

const { task } = await client.tasks.create({
  agentId: process.env.AGENT_ID!,
  name: "Morning summary",
  prompt: "Summarize yesterday's support tickets.",
  schedule: {
    kind: "cron",
    config: { expression: "0 9 * * 1-5", timezone: "Europe/London" },
  },
});
console.log(task.id, task.schedule);
```

```python tab="Python"
import os

from blazing_agents import BlazingAgents

client = BlazingAgents()

task = client.tasks.create(
    agent_id=os.environ["AGENT_ID"],
    name="Morning summary",
    prompt="Summarize yesterday's support tickets.",
    schedule={
        "kind": "cron",
        "config": {"expression": "0 9 * * 1-5", "timezone": "Europe/London"},
    },
).task
print(task.id, task.schedule)
```

You see the task ID and the saved schedule. At each scheduled time a new run appears in `client.tasks.listRuns({ taskId })` (`client.tasks.list_runs(task_id)` in Python). Read its result the same way as any [task run](/automation/task-runs#check-on-it-later).

## Choose a schedule [#choose-a-schedule]

| Kind | Config | Use it when |
| --- | --- | --- |
| `once` | `at`: an ISO 8601 time with an offset, such as `2026-08-15T09:00:00+01:00` | The work should run once at a known time. |
| `interval` | `everyMs`: milliseconds, at least `60000` | The work should repeat every so often, counted from when you created the schedule. |
| `cron` | `expression`: five numeric fields. Optional `timezone` (an IANA name, default `UTC`) and `staggerMs` | The work should follow the calendar, such as weekdays at 9:00. |

For example, `{ kind: "interval", config: { everyMs: 15 * 60_000 } }` runs every 15 minutes. In Python, use `every_ms` and `stagger_ms`.

`staggerMs` delays each cron run by up to that many milliseconds. Each task gets its own fixed delay within that limit, so many tasks that share a cron time do not all start at once.

## Change or pause a schedule [#change-or-pause-a-schedule]

- Replace the schedule with `client.tasks.update({ taskId, schedule })`, or pass `schedule: null` to make the task on-demand only.
- Pass `enabled: false` to pause scheduled runs and keep the schedule. Pass `enabled: true` to resume it.

After a change, runs that were due under the old schedule no longer start.

If you disable the task's agent, scheduled times pass without creating runs. Recurring schedules pick up at their next time once you enable the agent again. A one-time schedule whose time passed while the agent was disabled does not run later.

## What to expect [#what-to-expect]

- **One run at a time.** If a run is still active when the next time arrives, that time is skipped.
- **No catch-up.** Missed cron and interval times are skipped, not run in a burst later. Intervals continue at their next regular time.
- **Late one-time runs.** A one-time schedule that was missed because of a platform delay may start as soon as the platform recovers.
- **Blocked runs.** If your quota is exhausted, a scheduled run ends as `blocked` and the next scheduled time tries again. See [usage and quotas](/platform/usage-and-quotas).

## Next [#next]

- [Task runs](/automation/task-runs) to read results and cancel runs.
- [`tasks.update()`](/sdk/typescript/tasks#update) for every schedule field.
