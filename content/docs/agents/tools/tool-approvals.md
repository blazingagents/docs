---
title: Tool approvals
description: Review durable Tool input, decide it safely, and join the resulting continuation Turn.
---

# Tool approvals

Tool approval pauses sensitive execution until a human approves or denies the exact proposed call. Use it when an application must place a durable human decision between an Agent's proposal and Tool execution.

## When a Tool needs approval [#when-a-tool-needs-approval]

The Agent emits an approval request in its assistant message, and the platform commits both that message and a server-owned approval record. The record includes `approvalId`, `toolCallId`, `toolName`, and the proposed `input`; the browser does not reconstruct it from model-authored prose.

`client.sessions.toolApprovals` exposes an undecided record with `decision: "pending"`. Tool execution remains paused until every sibling approval attached to that assistant message has a decision.

## Approval and continuation lifecycle [#approval-and-continuation-lifecycle]

Approval decisions and continuation state are separate public fields:

| Resource | Public states | Transition |
| --- | --- | --- |
| Approval `decision` | `pending`, `approved`, `denied` | `pending` becomes the application's durable approve or deny decision |
| Continuation `state` | `waiting`, `queued`, `running`, `succeeded`, `failed` | `waiting` lasts until sibling decisions finish; then one continuation queues, runs a new Turn, and settles terminally |

An approved call may execute in the continuation; a denied call produces a denied Tool result without that side effect. Both decisions can allow the Agent to continue and produce a response.

## List and decide an approval [#list-and-decide-an-approval]

List approvals for the Session and display the stored Tool name and input to the decision maker. Submit only `approved` and an optional non-empty `reason`; the decision response returns `continuationId` and its current `state`.

```typescript
const pending = await client.sessions.toolApprovals(agentId, sessionId);
const approval = pending.data.find((item) => item.decision === "pending");
if (!approval) {
  throw new Error("No pending Tool approval");
}

console.log(approval.toolName, approval.input);
const decision = await client.sessions.decideToolApproval(
  agentId,
  sessionId,
  approval.approvalId,
  { approved: true, reason: "Reviewed by the operator" }
);

if (!(["waiting", "queued"] as string[]).includes(decision.state)) {
  throw new Error(`Unexpected continuation state: ${decision.state}`);
}
if (decision.state === "waiting") {
  throw new Error("Decide the remaining sibling approvals before joining");
}

const continuation = await client.sessions.joinToolApprovalContinuation(
  agentId,
  sessionId,
  decision.continuationId
);
await continuation.toResponse().text();
```

The loop fully consumes the continuation stream through its terminal result.

## Join the continuation Turn [#join-the-continuation-turn]

The continuation is a new metered Turn on the same Session. Joining returns AI SDK UI-message SSE from durable, ordered chunks; a later join can replay those chunks, including after the first client disconnects. A `waiting` continuation cannot be joined and returns `session_busy`.

The continuation uses the Session's Attribution and Version resolution. Its successful Tool results and assistant response update the transcript; its usage is recorded separately from the Turn that requested approval.

## Idempotency, concurrency, and failure [#idempotency-concurrency-and-failure]

Repeating the same decision is idempotent and returns the existing continuation identity and current state. Reversing an existing decision returns a `409` conflict. A single database transition queues the continuation after the last sibling decision, and a claim prevents two workers from executing it.

Approval `decision` uses `pending`, `approved`, or `denied`; continuation `state` uses `waiting`, `queued`, `running`, `succeeded`, or `failed`. New Session Turns and regeneration return `session_busy` while any decision is `pending` or a continuation is `waiting`, `queued`, or `running`. Deletion checks only active continuations, so it is busy for `waiting`, `queued`, or `running`, but not for pending decisions before a continuation exists.

A running worker renews a durable lease; loss or expiry terminalizes the continuation as `failed` without replaying an already attempted Tool. Runtime, persistence, or terminal stream failures also produce `failed` state and durable error output where possible.

Canceling or aborting a join detaches that reader; it does not reconstruct or authorize another execution. Rejoin with the same continuation ID to read persisted progress and its terminal outcome.

## Security boundary [#security-boundary]

The Tenant application must authenticate and authorize the human who makes the decision. Show that person the durable `toolName` and `input`, and submit the decision against its scoped Session and approval ID. Never interpret model-authored text, browser-mutated input, or a generic confirmation click as approval.

Approval authorizes only that exact Tool call. Tenant scope and product invariants are checked again before execution, so approval cannot bypass them. See [Tools](/agents/tools) and [security and credentials](/platform/security-and-credentials).

## Related concepts [#related-concepts]

- [Built-in Tools](/agents/tools/built-in-tools)
- [MCP Tools](/agents/tools/mcp-tools)
- [Sessions and Turns](/platform/sessions-and-turns)
- [BA Assist](/cli/assist)

## Reference [#reference]

- Session Tool-approval objects: [TypeScript](/sdk/typescript/sessions#tool-approvals) and [Python](/sdk/python/sessions#tool-approvals)
- HTTP operations and wire contracts: [API reference](/api-reference)
