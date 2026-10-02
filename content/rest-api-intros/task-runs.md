---
title: Task runs
description: Start a task run, watch its progress and transcript, and cancel it.
---

## Overview [#overview]

A task run is one execution of a task. Start a run on demand, poll its status and transcript while it works, and ask it to stop. Runs keep going if your connection drops.

## Tool approval policy [#tool-approval-policy]

Task runs follow the configuration saved when queued, including its `approvalInTasks` policy. Nobody is
there to approve a tool call during a run, so calls that need manual approval,
or that automatic review escalates to a person, are denied. The agent is told
which actions were blocked and keeps going with what it is allowed to do. If a
run ends up waiting for a person anyway, it fails. See
[Tool approvals](/agents/tools/tool-approvals).

## Next [#next]

- [Tasks and schedules](/automation/tasks) to plan background work.
- [Pagination and filtering](/api-reference/protocols/pagination-and-filtering) to poll a run's transcript.
