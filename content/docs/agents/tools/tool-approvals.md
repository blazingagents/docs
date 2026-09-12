---
title: Tool approvals
description: Review durable Tool input, decide it safely, and join the resulting continuation Turn.
---

# Tool approvals

Tool approval policies control whether an ordinary Agent executes, blocks, or reviews a proposed Tool call. Human review pauses execution until a person approves or denies that exact call.

## Approval policies [#approval-policies]

Ordinary Agents have separate versioned `approvalInChat` and `approvalInTasks`
policies. Interactive Sessions and stateless generations use `approvalInChat`;
Tasks use `approvalInTasks`. Both default to `{"default":"full","overrides":[]}`.
An exact Tool override wins over the default.

| Mode | Behavior |
| --- | --- |
| `full` | Execute without approval, subject to existing Tool availability and access. |
| `deny` | Block the call and return a denied Tool result. |
| `manual` | Request human review; block execution when human review is unavailable. |
| `auto` | Use the Agent's configured model to allow, deny, or escalate to a human. Review errors, invalid output, timeouts, and escalation without a human block execution. |

Configure policies with Agent create or PUT update. This REST body requires the
Workspace Tool group and an attached, discoverable MCP Connection:

```json
{
  "approvalInChat": {
    "default": "full",
    "overrides": [
      {"tool": {"type": "builtin", "name": "bash"}, "decision": "manual"},
      {"tool": {"type": "mcp", "connectionId": "mcp_0123456789abcdef", "name": "send_mail"}, "decision": "auto"}
    ]
  },
  "approvalInTasks": {
    "default": "deny",
    "overrides": [{"tool": {"type": "builtin", "name": "read"}, "decision": "full"}]
  }
}
```

Omitting a policy on update preserves it. Supplying a policy replaces that entire
policy: `default` is required, and omitted `overrides` or `overrides: []` clears
its overrides. Neither policy accepts null. Policy modes are distinct from stored
human approval decisions (`pending`, `approved`, `denied`).

Built-in references use catalog Tool names. MCP references use the original remote
Tool name and Connection ID, not a combined runtime name. Overrides must be unique
within each policy. New or changed MCP rules require live discovery of a same-Tenant
Connection attached to the Agent. Unchanged rules avoid repeated discovery;
unrelated Agent updates do not contact MCP servers. Remove or replace affected
rules when removing Tools or Connections. Validation identifies the rule with a
JSON-pointer path such as `/approvalInChat/overrides/0/tool`; MCP failures use the
existing lowercase error envelope and identify the Connection and remote Tool.
A missing rule target at runtime fails closed rather than silently dropping the rule.
Clear an `activate_skill` rule (or implicit Skill `read` rule without the Workspace
Tool group) before deleting the last Skill.

## Review availability [#review-availability]

Interactive Session requests have an API human-review path when the runner has
`TOOL_APPROVAL_SECRET` configured; a connected browser or built-in approval UI is
not required. Clients use the list, decide, and join lifecycle below.
Tasks and stateless generations have no human continuation path: `manual` and
escalated `auto` calls are denied immediately. Permitted work can continue, and
the model receives an explanation to report blocked actions and unfinished work.
A Task that unexpectedly produces a pending human approval fails instead of
completing successfully.

Automatic review receives Agent instructions, conversation, arguments, runtime
Tool name, and the original structured Tool identity, including MCP Connection ID
and remote name. It receives no Tool descriptions and treats the supplied context
as untrusted evidence. Review uses no Tools or retries, a 30-second deadline,
and a 512-token output budget. Review token usage contributes to Turn usage.


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
const pending = await client.sessions.toolApprovals({ agentId, sessionId });
const approval = pending.data.find((item) => item.decision === "pending");
if (!approval) {
  throw new Error("No pending Tool approval");
}

console.log(approval.toolName, approval.input);
const decision = await client.sessions.decideToolApproval({
  agentId,
  sessionId,
  approvalId: approval.approvalId,
  approved: true,
  reason: "Reviewed by the operator",
});

if (!(["waiting", "queued"] as string[]).includes(decision.state)) {
  throw new Error(`Unexpected continuation state: ${decision.state}`);
}
if (decision.state === "waiting") {
  throw new Error("Decide the remaining sibling approvals before joining");
}

const continuation = await client.sessions.joinToolApprovalContinuation({
  agentId,
  sessionId,
  continuationId: decision.continuationId,
});
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

## AI SDK client integration [#ai-sdk-client-integration]

Display the server-owned approval record and its exact input in your chat UI.
Read pending records through the BA Session list endpoint, submit the person's
`approved` decision to BA, then join the returned BA `continuationId` after all
sibling decisions are complete. Forward that continuation's UI-message SSE to
your AI SDK client and reconcile it with stored Session history. Continue consuming
the initial stream through its terminal result even when an approval request appears.
A generic `useChat` auto-send flow does not submit a BA decision or join its durable
continuation; keep these operations explicit in your application's transport.

The structured `tool` identifies the original Tool while `toolName` is its runtime
name. `assistantMessageId` correlates a record with Session history and Turn usage;
`createdAt` and `decidedAt` describe its lifecycle. These are optional response
metadata; `tool` and `decidedAt` can also be null. Admin Tool records use null
ordinary-policy references and retain their existing approval predicates.

Signed approvals bind the Tenant, Agent, Session, resolved Version, Workspace
attachment, MCP attachment/credentials, and Skill revision snapshot. Changing
that scope invalidates old signatures before execution.

## Related concepts [#related-concepts]

- [Built-in Tools](/agents/tools/built-in-tools)
- [MCP Tools](/agents/tools/mcp-tools)
- [Sessions and Turns](/platform/sessions-and-turns)
- [BA Assist](/cli/assist)

## Reference [#reference]

- Session Tool-approval objects: [TypeScript](/sdk/typescript/sessions#tool-approvals) and [Python](/sdk/python/sessions#tool-approvals)
- HTTP operations and wire contracts: [API reference](/api-reference)
