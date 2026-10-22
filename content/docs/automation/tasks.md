---
title: Tasks
description: Save a job for an agent to run in the background, then start it on demand or on a schedule.
---

# Tasks

Save a job once and let your agent run it whenever you need, with no user waiting. A task holds the agent, the instruction, and optionally a schedule. Each time it runs, you get a separate [task run](/automation/task-runs) with its own status and transcript.

## Create a task [#create-a-task]

Set `AGENT_ID` to an agent with a provider and model, such as the one from the [quickstart](/getting-started/quickstart).

```typescript tab="TypeScript"
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});

const { task } = await client.tasks.create({
  agentId: process.env.AGENT_ID!,
  name: "Weekly report",
  prompt: "Build the weekly report and summarize the result.",
  userId: "app:user-42",
});
console.log(task.id, task.schedule);
```

```python tab="Python"
import os

from blazing_agents import BlazingAgents

client = BlazingAgents()

task = client.tasks.create(
    agent_id=os.environ["AGENT_ID"],
    name="Weekly report",
    prompt="Build the weekly report and summarize the result.",
    user_id="app:user-42",
).task
print(task.id, task.schedule)
```

```rust tab="Rust"
use blazing_agents::Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::from_env()?;

    let created = client
        .tasks()
        .create(
            std::env::var("AGENT_ID")?,
            "Weekly report",
            "Build the weekly report and summarize the result.",
        )
        .user_id("app:user-42")
        .await?;
    println!("{} {:?}", created.task.id, created.task.schedule);
    Ok(())
}
```

```go tab="Go"
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	ba "github.com/blazingagents/golang-sdk"
)

func main() {
	ctx := context.Background()
	client, err := ba.NewClient()
	if err != nil {
		log.Fatal(err)
	}

	created, err := client.Tasks.Create(ctx, ba.CreateTaskParams{
		AgentID: ba.AgentID(os.Getenv("AGENT_ID")),
		Name:    "Weekly report",
		Prompt:  "Build the weekly report and summarize the result.",
		UserID:  new("app:user-42"),
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(created.Task.ID, created.Task.Schedule)
}
```

You see `tk_... null` (`None` in Python, `<nil>` in Go). With no schedule, the task runs only when you [start a run](/automation/task-runs). Add a [schedule](/automation/schedules) to run it on a clock instead.

## What a task controls [#what-a-task-controls]

- **Agent and instruction.** Every run sends the same `prompt` to the same agent.
- **Configuration.** Each run saves the agent's current configuration when queued. Editing the agent changes future runs. Read `agentConfig` with `tasks.getRun()`, including before a session exists.
- **Schedule and enabled state.** A schedule starts runs automatically. Setting `enabled: false` pauses scheduled runs, but you can still start a run yourself.
- **User label.** The task's `userId` and `metadata` carry over to every run, its session, its usage, and its artifacts. See [tenancy and attribution](/platform/tenancy-and-attribution).

The task also shows its current active run and latest run, so you can see what is happening without listing every run. For every field and default, see [`tasks.create()`](/sdk/typescript/tasks#create).

## Tool approvals in tasks [#tool-approvals-in-tasks]

No one is present to approve a tool call during a task. Each run saves the agent's `approvalInTasks` policy when queued. A tool call that would need a person is denied, and the agent is told so it can continue with other work. If a run still ends up waiting for a person, it fails. See [tool approvals](/agents/tools/tool-approvals).

## Change or delete a task [#change-or-delete-a-task]

Changes apply to future runs only. A run that is already queued or running keeps the settings it saved when queued. The `agentId` and `userId` cannot change after creation.

Deleting a task removes it and its schedule. While a run is queued or running, the delete fails with [`task_active_run_exists`](/api-reference/protocols/errors#task_active_run_exists) (HTTP 409). [Cancel the run](/automation/task-runs#cancel-a-run), wait until it reaches a final status, then delete the task. Deleting does not undo anything earlier runs did, such as files written or messages sent.

## Production notes [#production-notes]

- Creating a task with `submit: true` also starts a run. Pass `idempotencyKey` to `tasks.create()` (`idempotency_key` in Python, `.idempotency_key()` in Rust, `IdempotencyKey` in Go) if your backend may retry the request.
- For end-user requests, derive a scoped client from the verified user ID with [`forUser()`](/sdk/typescript/client#for-user) in TypeScript, [`for_user()`](/sdk/python/client#for-user) in Python, [`for_user()`](/sdk/rust/client#for-user) in Rust, or [`ForUser()`](/sdk/go/client#for-user) in Go. The API checks ownership before it reads, changes, or runs a task.

## Next [#next]

- [Start and check a task run](/automation/task-runs).
- [Run a task on a schedule](/automation/schedules).
