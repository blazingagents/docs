---
title: Limits and reliability
description: Design for bounded operations, typed failures, idempotent submission, cancellation, and durable recovery.
---

# Limits and reliability

Blazing Agents enforces product bounds and durable execution controls, while the tenant's application remains responsible for safe retries and external side effects. Use these contracts to distinguish a platform guarantee from work your integration must reconcile.

## Product limits and pagination [#product-limits-and-pagination]

Resource counts, text and upload sizes, schedule intervals, usage windows, and page sizes are enforced by public schemas, services, and storage constraints. Use the canonical [service-limits table](/api-reference/protocols/service-limits) for current values instead of embedding them in application logic.

Unbounded lists use opaque keyset cursors. Pass a returned `nextCursor` back to the same operation with the same filters; do not decode it or reuse it across collections. Transcript polling also supports a forward `after` cursor. See [pagination and filtering](/api-reference/protocols/pagination-and-filtering) for operation-specific behavior.

## Failure and retry model [#failure-and-retry-model]

Validation failures are caller-fixable and should not be retried unchanged. `unauthorized` requires a valid replacement credential, `not_found` requires rechecking Tenant scope and lifecycle, and `quota_exceeded` should wait for a quota or window change. Retry provider or `internal` failures only after identifying a transient cause and only when the operation is safe to repeat.

Before a streaming response begins, REST failures use the normal typed error envelope. After a completion or object stream begins, transport or decoding failures surface as SDK `stream_error`; partial output may already have been observed. A caller abort before an HTTP exchange surfaces as `request_aborted`; another local fetch failure uses `network_error`. Chat streams carry native AI SDK error chunks after streaming starts.

Never infer retry safety from an error code alone. Read operations are generally repeatable, while creates and external Tool calls can have effects even when their response is lost. Use a documented idempotency field where one exists.

## Submit an idempotent Task run [#submit-an-idempotent-task-run]

Use one stable key for all retries of the same logical Task submission:

```typescript
import { BlazingAgents } from "@blazing-agents/sdk";

const apiKey = process.env.BLAZING_AGENTS_API_KEY;
if (!apiKey) throw new Error("BLAZING_AGENTS_API_KEY is required");

const client = new BlazingAgents({ apiKey });
const taskId = "tk_0123456789abcdef";
const idempotencyKey = "daily-report:2026-07-20";

const first = await client.tasks.createRun(taskId, { idempotencyKey });
const replay = await client.tasks.createRun(taskId, { idempotencyKey });

console.log(first.runId === replay.runId);
```

The expression prints `true`: the key deterministically selects one Task run identity, and a retry returns and re-enqueues that existing run rather than creating a duplicate. A Task can have only one active run, so choose a key per logical submission rather than reusing one for different work.

## Cancellation and deadlines [#cancellation-and-deadlines]

Task cancellation records intent and is cooperative. The worker observes it at a cancellation boundary and aborts the live Turn; callers should poll until the Task run reaches a terminal status. A worker deadline also aborts the Turn and records a failed outcome.

For a Workspace-backed Turn, cancellation or deadline stops new dispatch but does not claim that an already accepted native operation has stopped immediately. Each operation is bounded independently, Cloudflare owns Container lifecycle, and completed filesystem changes or remote Tool effects may remain.

## Durable recovery guarantees [#durable-recovery-guarantees]

DBOS durably records Task workflow progress, cleanup, and Sandbox deletion; it does not reserve Sandbox capacity around the Turn. Task Session events are committed incrementally behind the active-run fence. A product-side Turn claim prevents recovery from rerunning model, Tool, filesystem, Artifact, Session, or usage effects after an unfinished attempt: a recorded completed outcome is reused, while an unfinished claim becomes an interrupted failure.

These controls provide at-most-once Task Turn execution, not exactly-once external effects. Product-database and DBOS-system-database writes are not atomic; reconciliation repairs missed enqueue and scheduling work. Integrations must still reconcile ambiguous remote effects and use compensating actions where needed.

## Troubleshoot by symptom [#troubleshoot-by-symptom]

Start with a stable status or error code. Record request and resource IDs, never credentials or raw prompts, Tool input/output, message parts, or Workspace contents.

| Symptom | Check | Supported recovery |
| --- | --- | --- |
| HTTP `401` / `unauthorized` | Confirm the backend sent one Bearer credential without logging it. | Create and deploy a replacement key from the authenticated dashboard, then revoke the old key. |
| `provider_required` | Read the Agent and resolved Version's Provider/model pair. | Attach a complete Provider/model pair to the Agent. |
| `model_not_found` or `model_validation_unavailable` | List the Provider's current model catalog. | Select a current model; create a replacement Provider when its key, type, or base URL changes. |
| `stream_error` after output begins | Record the generation kind, whether deltas arrived, and request ID. | Await the final `text` or `object` promise and retry only if the whole operation is safe to repeat. |
| MCP test failure or connection `error` | Record connection ID, status, and sanitized test code. | Test, reconnect, or complete the OAuth connection flow described under [MCP Tools](/agents/tools/mcp-tools). |
| `workspace_not_found` | Read the Agent's current Workspace attachment. | Attach an owned Workspace before invoking Workspace Tools. |
| Task run `failed` or `canceled` | Read the run and transcript; redact the arbitrary `run.error`. | Submit a new run only after deciding its effects are safe to repeat. |
| `quota_exceeded` or run `blocked` | Compare settled usage with Tenant quota settings. | Wait for the reset window or deliberately update the quota policy. |

Provider replacement needs extra care because immutable Agent Versions may still refer to the old Provider. Create and validate the replacement, page every Agent Version and Task run, move current Agents, update Task Pins, let old-Version runs settle or cancel them, and replace pinned Sessions. Keep the old Provider until every historical Pin that must remain executable has moved; deleting it can break future resolution for old Task, Session, and explicit stateless Pins.

## Collect safe diagnostics [#collect-safe-diagnostics]

SDK errors expose a stable `code`, optional HTTP `status`, `details`, `param`, `requestId`, and response headers. Log only fields appropriate for correlation:

```typescript
import { BlazingAgentsError } from "@blazing-agents/sdk";

try {
  await client.tasks.get(taskId);
} catch (error) {
  if (!BlazingAgentsError.isInstance(error)) throw error;
  console.error({
    code: error.code,
    requestId: error.requestId,
    resourceId: taskId,
    status: error.status,
  });
}
```

Treat human-readable SDK messages and Task `run.error` values as untrusted and potentially sensitive. Redact them before logging or sharing.

## Production considerations [#production-considerations]

- Derive idempotency keys from stable business identities and persist them before submission.
- Apply bounded retry counts, exponential backoff, jitter, and an overall deadline appropriate to the operation.
- Poll Task runs until a terminal `blocked`, `succeeded`, `failed`, or `canceled` status, using forward transcript cursors when progress is needed.
- Record request IDs, Task and run IDs, error codes, and lifecycle timestamps without logging credentials.
- Alert when a Task run remains `queued` or `running` beyond the application's deadline, or does not reach a terminal state after cancellation.
- Reconcile or compensate for external Tool and filesystem effects after cancellation, timeout, or an ambiguous response.

See [Usage and quotas](/platform/usage-and-quotas), [Tasks](/automation/tasks), and [Task runs](/automation/task-runs) for their complete lifecycle semantics.

## Related concepts [#related-concepts]

- [Task runs](/automation/task-runs)
- [Usage and quotas](/platform/usage-and-quotas)
- [Security and credentials](/platform/security-and-credentials)

## Reference [#reference]

- [TypeScript SDK `createRun`](/sdk/typescript/tasks#create-run)
- [TypeScript SDK `getRun`](/sdk/typescript/tasks#get-run)
- [TypeScript SDK `cancelRun`](/sdk/typescript/tasks#cancel-run)
- [TypeScript SDK `runMessages`](/sdk/typescript/tasks#run-messages)
- [Python SDK `submit`](/sdk/python/tasks#submit)
- [Python SDK `get_run`](/sdk/python/tasks#get-run)
- [Python SDK `cancel_run`](/sdk/python/tasks#cancel-run)
- [Python SDK `run_messages`](/sdk/python/tasks#run-messages)
- [REST create Task run](/api-reference/rest-api/task-runs#create-task-run)
- [REST cancel Task run](/api-reference/rest-api/task-runs#cancel-task-run)
- [Errors](/api-reference/protocols/errors)
- [Pagination and filtering](/api-reference/protocols/pagination-and-filtering)
- [Service limits](/api-reference/protocols/service-limits)
