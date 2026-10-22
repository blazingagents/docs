---
title: Limits and reliability
description: Retry safely, submit background work without duplicates, handle cancellation, and debug failures by symptom.
---

# Limits and reliability

Build an integration that survives lost responses, retries, and cancellations without doing the same work twice. This page covers what Blazing Agents guarantees, what your code must handle, and how to debug a failure from its error code.

## Submit a task run once [#submit-a-task-run-once]

Networks drop responses, so your code may retry a request that already worked. For background work, pass an idempotency key. Every retry with the same key returns the same run instead of starting a new one. Set `TASK_ID` to an existing [task](/automation/tasks).

```typescript tab="TypeScript"
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});
const taskId = process.env.TASK_ID!;
const idempotencyKey = "daily-report:2026-07-20";

const first = await client.tasks.createRun({ taskId, idempotencyKey });
const retry = await client.tasks.createRun({ taskId, idempotencyKey });
console.log(first.runId === retry.runId);
```

```python tab="Python"
import os

from blazing_agents import BlazingAgents

client = BlazingAgents()
task_id = os.environ["TASK_ID"]
idempotency_key = "daily-report:2026-07-20"

first = client.tasks.submit(task_id, idempotency_key=idempotency_key)
retry = client.tasks.submit(task_id, idempotency_key=idempotency_key)
print(first.run_id == retry.run_id)
```

```rust tab="Rust"
use blazing_agents::Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::from_env()?;
    let task_id = std::env::var("TASK_ID")?;
    let idempotency_key = "daily-report:2026-07-20";

    let first = client
        .tasks()
        .submit(&task_id)
        .idempotency_key(idempotency_key)
        .await?;
    let retry = client
        .tasks()
        .submit(&task_id)
        .idempotency_key(idempotency_key)
        .await?;
    println!("{}", first.run_id == retry.run_id);
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
	taskID := ba.TaskID(os.Getenv("TASK_ID"))
	params := ba.SubmitTaskParams{IdempotencyKey: new("daily-report:2026-07-20")}

	first, err := client.Tasks.Submit(ctx, taskID, params)
	if err != nil {
		log.Fatal(err)
	}
	retry, err := client.Tasks.Submit(ctx, taskID, params)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(first.RunID == retry.RunID)
}
```

This prints `true`. Build the key from a stable business fact, such as the report date, and save it before you submit. A task runs one job at a time, so a submission with a different key while a run is active returns [`task_active_run_exists`](/api-reference/protocols/errors#task_active_run_exists) (HTTP `409`).

## Decide whether to retry [#decide-whether-to-retry]

The error code tells you what to fix. It does not tell you the retry is safe, so also ask whether the call could have had an effect.

- **Validation errors:** fix the request. Retrying it unchanged fails the same way.
- **[`unauthorized`](/api-reference/protocols/errors#unauthorized):** replace the API key.
- **[`not_found`](/api-reference/protocols/errors#not_found):** check the ID and whether the resource was deleted.
- **[`quota_exceeded`](/api-reference/protocols/errors#quota_exceeded):** wait for the quota window to reset, or raise the quota.
- **[`model_spending_limit_exceeded`](/api-reference/protocols/errors#model_spending_limit_exceeded):** do not retry automatically. Its `reason` is `exhausted`, so wait for the reset or raise the limit, or `unpriced`, so switch to a priced model or turn the limit off. See [handle a spending stop](/platform/usage-and-quotas#spending-limit-stops).
- **[`rate_limited`](/api-reference/protocols/errors#rate_limited):** more turns are running than your plan's [concurrent turn limit](/api-reference/protocols/service-limits#concurrent-turns), or you created agents, tasks, or workspaces faster than the [creation rate](/api-reference/protocols/service-limits#tenant-resource-creation-rate). Wait for the `Retry-After` header when it is present, otherwise retry with backoff.
- **[`session_turn_unresponsive`](/api-reference/protocols/errors#session_turn_unresponsive):** the session's previous turn stopped responding. Wait for the `Retry-After` header, which is at most a minute. Read the session's messages first, then send again under a new message ID.
- **Provider or [`internal`](/api-reference/protocols/errors#internal) errors:** retry only if the cause looks temporary and the call is safe to repeat.

Reads are safe to repeat. Creates and tool calls can take effect even when you never see the response. Use an idempotency key where one exists, and apply bounded retries with backoff, jitter, and an overall deadline.

## Errors during a stream [#errors-during-a-stream]

An error before the stream starts arrives as a normal API error with a code. Once a chat stream has started, errors arrive as `error` events inside the stream, and some output may already have been shown. For interactive chat, keep the user's draft and let them resend. See [stop and resend](/platform/sessions-and-turns#stop-and-resend).

A failure with a code first sends a `data-ba-error` event with the same `code`, `message`, and `details` an HTTP error would carry. A stream that is cut after it starts ends with that event, code `turn_interrupted`, and an `error` chunk instead of ending as if it finished. See [interruption events](/api-reference/protocols/streaming#interruption-events).

In TypeScript, a broken connection after streaming starts raises `stream_error`, an abort before the request is sent raises `request_aborted`, and other network failures raise `network_error`. In Python, these are `StreamError` and `APIConnectionError`.

## Cancellation and deadlines [#cancellation-and-deadlines]

Cancelling a task run asks it to stop. The run stops at its next safe point, so keep checking until it reaches a final status. A turn that reaches the [turn deadline](/api-reference/protocols/service-limits#turn-deadline) also stops, and a task run then ends as `failed`.

A workspace command or file operation that has already started may finish after cancellation. Files it changed, and effects on remote systems, stay in place. Plan to clean up or reverse external effects yourself.

## What Blazing Agents guarantees [#what-blazing-agents-guarantees]

A task run's turn executes at most once. If the platform restarts mid-run, a finished result is kept and reused. An unfinished turn ends as `failed` instead of running the model and tools a second time.

At most once is not exactly once for the outside world. If a run fails partway, a tool may already have sent an email or written a file. Check for those effects before you submit the work again.

## Limits and pagination [#limits-and-pagination]

Resource counts, text and upload sizes, schedule intervals, usage windows, and page sizes all have limits. Read the current values in [service limits](/api-reference/protocols/service-limits) rather than hard-coding them.

Lists return a `nextCursor`. Pass it back to the same call with the same filters to get the next page. Treat cursors as opaque strings, and do not reuse one with a different list.

## Troubleshoot by symptom [#troubleshoot-by-symptom]

| Symptom | Check | Fix |
| --- | --- | --- |
| `unauthorized` (HTTP `401`) | Your backend sends one valid key. | Create a new key in the dashboard, deploy it, then revoke the old one. |
| [`provider_required`](/api-reference/protocols/errors#provider_required) | The agent configuration saved for this work has a provider and model. | Set a provider and model on the agent. |
| [`model_not_found`](/api-reference/protocols/errors#model_not_found) or [`model_validation_unavailable`](/api-reference/protocols/errors#model_validation_unavailable) | The provider's current model list. | Pick a listed model. Create a new provider if the key, type, or base URL changed. |
| `stream_error` after output began | Whether any text arrived, and the request ID. | Retry only if the whole call is safe to repeat. |
| MCP connection test fails or shows `error` | The connection's status and test result. | Test, reconnect, or finish OAuth sign-in. See [MCP tools](/agents/tools/mcp-tools). |
| [`workspace_not_found`](/api-reference/protocols/errors#workspace_not_found) | The agent's workspace attachment, and with a [user-scoped client](/platform/tenancy-and-attribution#user-labels-and-user-scope), whether the workspace belongs to that user. | Attach a workspace before using workspace tools. For a scoped turn, give the user an agent and workspace of their own. |
| `not_found` from a user-scoped client | Whether the agent or session belongs to that user. | Create the user's own agent with the scoped client, and resume only that user's sessions. |
| Task run `failed` or `canceled` | The run and its transcript. | Submit a new run once repeating its effects is safe. |
| `quota_exceeded` or run `blocked` | The run's `errorCode`, which names the check that stopped it. | Fix that check, such as waiting for the quota reset or adding usage credit. See [quota and capacity outcomes](/platform/usage-and-quotas#quota-and-capacity-outcomes). |

When you replace a provider, saved sessions and queued or running task runs may still use the old one. Move current agents to the new provider first. See [rotate or remove a key](/agents/providers-and-models#rotate-or-remove-a-key) before removing the old provider.

## Log errors safely [#log-errors-safely]

Log the error code, request ID, HTTP status, and the IDs of the resources involved. Leave out credentials, prompts, message content, and tool data.

```typescript tab="TypeScript"
import { BlazingAgentsError } from "@blazingagents/sdk";

try {
  await client.tasks.get({ taskId });
} catch (error) {
  if (!BlazingAgentsError.isInstance(error)) throw error;
  console.error({
    code: error.code,
    requestId: error.requestId,
    status: error.status,
    taskId,
  });
}
```

```python tab="Python"
from blazing_agents import APIStatusError

try:
    client.tasks.get(task_id)
except APIStatusError as error:
    print({
        "code": error.code,
        "request_id": error.request_id,
        "status": error.status_code,
        "task_id": task_id,
    })
```

```rust tab="Rust"
use blazing_agents::error::Error;

let task_id = "tk_0123456789abcdef";
match client.tasks().get(task_id).await {
    Err(Error::Api(error)) => {
        println!(
            "{}",
            serde_json::json!({
                "code": error.code(),
                "request_id": error.request_id(),
                "status": error.status(),
                "task_id": task_id,
            })
        );
    }
    Err(error) => return Err(error.into()),
    Ok(_) => {}
}
```

```go tab="Go"
taskID := ba.TaskID("tk_0123456789abcdef")
_, err := client.Tasks.Get(ctx, taskID)
var apiErr *ba.APIError
if errors.As(err, &apiErr) {
	slog.Error("task lookup failed",
		"code", apiErr.Code,
		"requestId", apiErr.Meta.RequestID,
		"status", apiErr.Status,
		"taskId", taskID,
	)
	return nil
}
return err
```

Error messages and a task run's `error` field can contain sensitive text. Redact them before you log or share them.

## Production notes [#production-notes]

- Poll task runs until they reach `blocked`, `succeeded`, `failed`, or `canceled`.
- Alert when a run stays `queued` or `running` past your deadline, or does not finish after you cancel it.
- After a cancellation, timeout, or lost response, check for external effects and reverse them where needed.

## Next [#next]

- [Task runs](/automation/task-runs) to submit, check, and cancel background work.
- [Usage and quotas](/platform/usage-and-quotas) to understand `quota_exceeded` and `blocked`.
- [Errors](/api-reference/protocols/errors) for every error code.
