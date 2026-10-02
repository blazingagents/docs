---
title: Tasks
description: Run agent work in the background, on demand or on a schedule.
---

## Overview [#overview]

A task is a saved prompt for an agent that runs in the background, on demand or on a schedule. Each run gets its own record and transcript, so you can check on it later. Use tasks for reports, syncs, and other work nobody waits on.

Pass `idempotencyKey` when creating a task that your backend may retry. Repeating the same request with the same key returns the current task definition and original initial run ID. A different request, or a retry after deleting the task, returns `idempotency_conflict`.

## Tool approval policy [#tool-approval-policy]

Task runs follow the configuration saved when queued, including its `approvalInTasks` policy. Nobody is
there to approve a tool call during a run, so calls that need manual approval,
or that automatic review escalates to a person, are denied. The agent is told
which actions were blocked and keeps going with what it is allowed to do. If a
run ends up waiting for a person anyway, it fails. See
[Tool approvals](/agents/tools/tool-approvals).

## Next [#next]

- [Tasks and schedules](/automation/tasks) to plan background work.
- [Task runs API](/api-reference/rest-api/task-runs) to start and watch runs.
