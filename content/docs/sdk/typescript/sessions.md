---
title: Sessions
description: List Sessions, page transcripts, and complete Tool approval continuations.
---

# Sessions

`client.sessions` reads and deletes stored Sessions and handles pending Tool approvals. Create or resume a Session with [`client.chat()`](/sdk/typescript/client#chat), not this resource.

## Overview [#overview]

Session and transcript lists use opaque cursors. Both list limits default to 50 and accept 1–200. Transcript `cursor` walks older pages; `after` polls forward from `latestCursor`. Do not pass both.

Tool approval decisions are scoped to one exact Tool call. A decision produces a durable continuation: join it to replay persisted chunks and follow the resumed Turn to terminal state. Calling `toResponse()` consumes the returned stream.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`list()`](#list) | List an Agent's Sessions | `SessionsListResponse` |
| [`messages()`](#messages) | Page or poll a Session transcript | `SessionMessagesResponse` |
| [`delete()`](#delete) | Permanently delete a Session | `void` |
| [`toolApprovals()`](#tool-approvals) | List pending and decided Tool calls | `ToolApprovalsResponse` |
| [`decideToolApproval()`](#decide-tool-approval) | Approve or deny one Tool call | `ToolApprovalDecisionResponse` |
| [`joinToolApprovalContinuation()`](#join-tool-approval-continuation) | Stream a durable approval continuation | `TerminalStreamResult` |

## Methods [#methods]

### `list()` [#list]

Lists an Agent's Sessions by most recent update. An unknown or out-of-Tenant Agent ID returns an empty page.

**Signature:** `list(agentId: string, options?: SessionsListOptions): Promise<SessionsListResponse>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |
| `options.cursor` | `string` | no | Opaque `nextCursor` from the previous page |
| `options.limit` | `number` | no | Page size, 1–200; defaults to 50 |
| `options.userId` | `string` | no | End-user Attribution filter; pass `""` for Tenant-level Sessions and omit for all |

```typescript
const page = await client.sessions.list(agentId, {
  limit: 25,
  userId: "customer_123",
});

if (page.nextCursor) {
  await client.sessions.list(agentId, { cursor: page.nextCursor, limit: 25 });
}
```

Returns [`SessionsListResponse`](#sessionslistresponse). Raises `validation_failed` for malformed parameters or `invalid_cursor` for an invalid opaque cursor. See [`GET /v1/agents/:agentId/sessions`](/api-reference/rest-api/sessions#list-sessions).

### `messages()` [#messages]

Lists stored AI SDK-compatible messages. Backward pages are newest-first, with messages chronological within each page.

**Signature:** `messages(agentId: string, sessionId: string, options?: SessionMessagesOptions): Promise<SessionMessagesResponse>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |
| `sessionId` | `string` | yes | Session ID (`ss_…`) |
| `options.cursor` | `string` | no | Walk backward to older messages |
| `options.after` | `string` | no | Poll forward from an earlier `latestCursor` |
| `options.limit` | `number` | no | Page size, 1–200; defaults to 50 |

```typescript
const page = await client.sessions.messages(agentId, sessionId, {
  limit: 25,
});

const newer = page.latestCursor
  ? await client.sessions.messages(agentId, sessionId, {
      after: page.latestCursor,
      limit: 25,
    })
  : null;
```

Returns [`SessionMessagesResponse`](#sessionmessagesresponse). `cursor` and `after` are mutually exclusive. Raises `validation_failed`, `invalid_cursor`, or `not_found` for a missing, foreign, or deleted Session. See [`GET /v1/agents/:agentId/sessions/:sessionId/messages`](/api-reference/rest-api/sessions#list-session-messages).

### `delete()` [#delete]

Permanently deletes a Session and its stored history, with an explicit choice
to preserve or delete its Artifacts.

**Signature:** `delete(agentId: string, sessionId: string, deleteArtifacts: boolean): Promise<void>`

```typescript
await client.sessions.delete(agentId, sessionId, false);
```

Returns `void`. Raises `validation_failed` for malformed IDs or `not_found` when the Session is missing, foreign, or already deleted. See [`DELETE /v1/agents/:agentId/sessions/:sessionId`](/api-reference/rest-api/sessions#delete-session).

### `toolApprovals()` [#tool-approvals]

Lists pending and decided Tool calls for a Session. Listing does not claim, approve, or deny a call.

**Signature:** `toolApprovals(agentId: string, sessionId: string): Promise<ToolApprovalsResponse>`

```typescript
const approvals = await client.sessions.toolApprovals(agentId, sessionId);
const pending = approvals.data.filter((item) => item.decision === "pending");
```

Returns [`ToolApprovalsResponse`](#toolapprovalsresponse). Raises `validation_failed` for malformed IDs or `not_found` when the Session is unavailable. See [`GET /v1/agents/:agentId/sessions/:sessionId/tool-approvals`](/api-reference/rest-api/sessions#list-tool-approvals).

### `decideToolApproval()` [#decide-tool-approval]

Approves or denies one pending Tool call. The decision authorizes only that exact call and does not bypass Tenant or product invariants.

**Signature:** `decideToolApproval(agentId: string, sessionId: string, approvalId: string, decision: DecideToolApprovalBody, options?: { signal?: AbortSignal }): Promise<ToolApprovalDecisionResponse>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |
| `sessionId` | `string` | yes | Session ID (`ss_…`) |
| `approvalId` | `string` | yes | Approval ID returned by `toolApprovals()` |
| `decision.approved` | `boolean` | yes | `true` to approve or `false` to deny |
| `decision.reason` | `string` | no | Non-empty reason, up to 1,000 characters |
| `options.signal` | `AbortSignal` | no | Aborts the decision request |

```typescript
const decision = await client.sessions.decideToolApproval(
  agentId,
  sessionId,
  approvalId,
  { approved: true, reason: "The requested file is safe to read." },
);
```

Returns [`ToolApprovalDecisionResponse`](#toolapprovaldecisionresponse). Raises `validation_failed`, `not_found`, or `tool_approval_decision_conflict` when the call was already decided. An aborted request throws `request_aborted`. See [`POST /v1/agents/:agentId/sessions/:sessionId/tool-approvals/:approvalId`](/api-reference/rest-api/sessions#decide-tool-approval).

### `joinToolApprovalContinuation()` [#join-tool-approval-continuation]

Joins the durable continuation created by an approval decision. Persisted chunks replay before the SDK follows live work or returns terminal state.

**Signature:** `joinToolApprovalContinuation(agentId: string, sessionId: string, continuationId: string, options?: { signal?: AbortSignal }): Promise<TerminalStreamResult>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |
| `sessionId` | `string` | yes | Session ID (`ss_…`) |
| `continuationId` | `string` | yes | Continuation ID returned by `decideToolApproval()` |
| `options.signal` | `AbortSignal` | no | Aborts joining or consuming the stream |

```typescript
const continuation = await client.sessions.joinToolApprovalContinuation(
  agentId,
  sessionId,
  decision.continuationId,
);

const response = continuation.toResponse();
const text = await response.text();
```

Returns [`TerminalStreamResult`](#terminalstreamresult). Raises `session_busy` only while approvals are still waiting for decisions, or `not_found` for unavailable state. Request failures can throw `request_aborted` or `network_error`; malformed SSE can throw `stream_error`, and later Turn failures arrive as stream error chunks. See [`GET /v1/agents/:agentId/sessions/:sessionId/tool-approval-continuations/:continuationId`](/api-reference/rest-api/sessions#join-tool-approval-continuation).

## Response types [#response-types]

### `SessionsListResponse` [#sessionslistresponse]

```typescript
interface SessionsListResponse {
  data: SessionListItem[];
  nextCursor: string | null;
}

interface SessionListItem {
  id: string;
  agentVersion: number | null;
  messageCount: number;
  lastMessagePreview: string | null;
  userId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

`agentVersion` is the configured immutable Version Pin, or `null` for an unpinned Session. Timestamps are ISO 8601 strings.

### `SessionMessagesResponse` [#sessionmessagesresponse]

```typescript
interface SessionMessagesResponse {
  data: SessionMessage[];
  nextCursor: string | null;
  latestCursor: string | null;
}

interface SessionMessage {
  id: string;
  role: "system" | "user" | "assistant";
  parts: Array<{ type: string; [key: string]: unknown }>;
  metadata?: unknown;
  [key: string]: unknown;
}
```

Pass `nextCursor` back as `cursor` to continue in the current direction. A non-empty page supplies `latestCursor` so a poller can later pass it as `after`.

### `ToolApprovalsResponse` [#toolapprovalsresponse]

```typescript
type ToolApprovalDecision = "pending" | "approved" | "denied";
type ToolApprovalContinuationState =
  | "waiting"
  | "queued"
  | "running"
  | "succeeded"
  | "failed";
type JSONValue =
  | null
  | boolean
  | number
  | string
  | JSONValue[]
  | { [key: string]: JSONValue };

interface ToolApprovalState {
  approvalId: string;
  decision: ToolApprovalDecision;
  input: JSONValue;
  reason: string | null;
  toolCallId: string;
  toolName: string;
}

interface ToolApprovalsResponse {
  data: ToolApprovalState[];
  continuation: {
    id: string;
    state: ToolApprovalContinuationState;
  } | null;
}
```

`input` is the exact JSON input proposed for the Tool call. Review it before deciding.

### `ToolApprovalDecisionResponse` [#toolapprovaldecisionresponse]

```typescript
interface ToolApprovalDecisionResponse {
  continuationId: string;
  state: ToolApprovalContinuationState;
}
```

### `TerminalStreamResult` [#terminalstreamresult]

```typescript
interface TerminalStreamResult {
  requestId?: string;
  toResponse(): Response;
}
```

`toResponse()` is a one-shot relay of the AI SDK UI-message SSE stream.

## Errors [#errors]

SDK request failures throw `BlazingAgentsError`. Branch on its stable `code`, not its message.

| Code | Applies to | Action |
| --- | --- | --- |
| `validation_failed` | All ID-based methods and invalid options | Correct the indicated input |
| `invalid_cursor` | `list()`, `messages()` | Restart pagination from a known cursor |
| `not_found` | Session and approval operations | Check the Agent, Session, approval, or continuation |
| `tool_approval_decision_conflict` | `decideToolApproval()` | Refresh approvals; the call was already decided |
| `session_busy` | `joinToolApprovalContinuation()` | Decide every waiting approval before joining |
| `request_aborted` | Decision and continuation requests | Handle the caller's abort |
| `network_error` | Any request | Retry according to application policy |
| `stream_error` | Continuation stream parsing | Treat the continuation stream as failed |

Starting an approval continuation for a disabled Agent can fail with `agent_disabled`. See [SDK errors](/api-reference/protocols/errors).

## End-to-end workflow [#end-to-end-workflow]

Create a Session, inspect its transcript, review one pending Tool call, decide it, and join the continuation:

```typescript
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});
const agentId = "ag_0123456789abcdef";

const chat = await client.chat({
  agentId,
  message: {
    id: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: "Inspect the project files." }],
  },
});
const sessionId = await chat.sessionId;
await chat.toResponse().text();

const transcript = await client.sessions.messages(agentId, sessionId);
const approvals = await client.sessions.toolApprovals(agentId, sessionId);
const pending = approvals.data.find((item) => item.decision === "pending");

if (pending) {
  console.log({ tool: pending.toolName, input: pending.input });

  const decision = await client.sessions.decideToolApproval(
    agentId,
    sessionId,
    pending.approvalId,
    { approved: true, reason: "Reviewed by the application." },
  );
  const continuation =
    await client.sessions.joinToolApprovalContinuation(
      agentId,
      sessionId,
      decision.continuationId,
    );
  await continuation.toResponse().text();
}

console.log({
  messages: transcript.data.length,
  latestCursor: transcript.latestCursor,
});
```

## Related [#related]

- [Sessions and Turns](/platform/sessions-and-turns)
- [Tool approvals](/agents/tools/tool-approvals)
- [Build a chat endpoint](/platform/sessions-and-turns)
- [REST Sessions](/api-reference/rest-api/sessions)
- [Pagination and filtering](/api-reference/protocols/pagination-and-filtering)
