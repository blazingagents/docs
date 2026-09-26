---
title: Sessions
description: List sessions, load their messages, delete them, and answer tool approvals with the TypeScript SDK.
---

# Sessions

`client.sessions` reads the conversations Blazing Agents stores for you. Use it to show a user their past chats, reload a transcript, delete a conversation, and approve or deny a tool call the agent is waiting on. To start or continue a session, call [`client.chat()`](/sdk/typescript/client#chat). To learn how sessions and turns behave, read [Sessions and turns](/platform/sessions-and-turns).

```typescript
const { data: sessions } = await client.sessions.list({ agentId, userId: "user_123" });
const { data: messages } = await client.sessions.messages({
  agentId,
  sessionId: sessions[0].id,
});
```

Every method takes one input object and accepts an optional `abortSignal`.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`list()`](#list) | List one agent's sessions | `SessionsListResponse` |
| [`listLatest()`](#list-latest) | List recent sessions across agents | `LatestSessionsListResponse` |
| [`messages()`](#messages) | Load or poll a session's messages | `SessionMessagesResponse` |
| [`delete()`](#delete) | Delete a session for good | `void` |
| [`toolApprovals()`](#tool-approvals) | List the session's tool approvals | `ToolApprovalsResponse` |
| [`decideToolApproval()`](#decide-tool-approval) | Approve or deny one tool call | `ToolApprovalDecisionResponse` |
| [`joinToolApprovalContinuation()`](#join-tool-approval-continuation) | Stream the rest of the turn after approvals | `TerminalStreamResult` |

## Methods [#methods]

### `list()` [#list]

Lists one agent's sessions, most recently updated first.

**Signature:** `list(input: { agentId: string } & SessionsListOptions): Promise<SessionsListResponse>`

```typescript
const page = await client.sessions.list({ agentId, userId: "user_123", limit: 25 });
const next = page.nextCursor
  ? await client.sessions.list({ agentId, userId: "user_123", cursor: page.nextCursor })
  : null;
```

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `agentId` | `string` | yes | none | Agent ID (`ag_…`) |
| `userId` | `string` | no | none | Only this end user's sessions; `""` for tenant-level ones |
| `limit` | `number` | no | `50` | 1 to 200 per page |
| `cursor` | `string` | no | none | `nextCursor` from the previous page |

An agent ID that does not exist in your tenant returns an empty page. Returns [`SessionsListResponse`](#sessionslistresponse). Errors: `validation_failed`, `invalid_cursor`.

### `listLatest()` [#list-latest]

Lists the most recently updated sessions across all your agents.

**Signature:** `listLatest(input?: LatestSessionsListOptions): Promise<LatestSessionsListResponse>`

```typescript
const inbox = await client.sessions.listLatest({ userId: "user_123", byAgent: true });
for (const session of inbox.data) {
  console.log(session.agentId, session.lastMessagePreview);
}
```

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `byAgent` | `boolean` | no | `false` | Return at most one session per agent, its latest |
| `userId` | `string` | no | none | Only this end user's sessions; `""` for tenant-level ones |
| `limit` | `number` | no | `50` | 1 to 200 per page |
| `cursor` | `string` | no | none | `nextCursor` from the previous page |

Use `byAgent: true` to build an inbox with one row per agent, instead of calling `list()` for each agent. Sessions of disabled agents are included. Returns [`LatestSessionsListResponse`](#latestsessionslistresponse). Errors: `validation_failed`, `invalid_cursor`.

### `messages()` [#messages]

Loads a session's stored messages in the AI SDK `UIMessage` shape, so you can pass them to `useChat` as initial messages.

**Signature:** `messages(input: { agentId: string; sessionId: string } & SessionMessagesOptions): Promise<SessionMessagesResponse>`

```typescript
const page = await client.sessions.messages({ agentId, sessionId });

const older = page.nextCursor
  ? await client.sessions.messages({ agentId, sessionId, cursor: page.nextCursor })
  : null;

const newer = page.latestCursor
  ? await client.sessions.messages({ agentId, sessionId, after: page.latestCursor })
  : null;
```

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `agentId` | `string` | yes | none | Agent ID (`ag_…`) |
| `sessionId` | `string` | yes | none | Session ID (`ss_…`) |
| `limit` | `number` | no | `50` | 1 to 200 per page |
| `cursor` | `string` | no | none | Go back to older messages |
| `after` | `string` | no | none | Fetch messages added since an earlier `latestCursor` |

The first page holds the newest messages, in chronological order within the page. Pass `nextCursor` as `cursor` to go further back. Save `latestCursor` and pass it later as `after` to fetch only what is new. Do not pass `cursor` and `after` together.

Returns [`SessionMessagesResponse`](#sessionmessagesresponse). Errors: `validation_failed`, `invalid_cursor`, `not_found`.

### `delete()` [#delete]

Deletes a session and its messages for good. You choose whether its artifacts go too.

**Signature:** `delete(input: { agentId: string; sessionId: string; deleteArtifacts: boolean } & ResourceRequestOptions): Promise<void>`

```typescript
await client.sessions.delete({ agentId, sessionId, deleteArtifacts: false });
```

`deleteArtifacts: true` also deletes the files the agent published in this session; `false` keeps them. Errors: `validation_failed`, `not_found`.

### `toolApprovals()` [#tool-approvals]

Lists the tool calls in the session that need, or had, a decision. Listing changes nothing.

**Signature:** `toolApprovals(input: { agentId: string; sessionId: string } & ResourceRequestOptions): Promise<ToolApprovalsResponse>`

```typescript
const { data, continuation } = await client.sessions.toolApprovals({ agentId, sessionId });
const pending = data.filter((approval) => approval.decision === "pending");
```

Show each pending call's `toolName` and `input` to the person deciding. `continuation` tracks the turn that resumes once every call is decided. Returns [`ToolApprovalsResponse`](#toolapprovalsresponse). Errors: `validation_failed`, `not_found`.

### `decideToolApproval()` [#decide-tool-approval]

Approves or denies one pending tool call.

**Signature:** `decideToolApproval(input: DecideToolApprovalBody & { agentId: string; sessionId: string; approvalId: string } & ResourceRequestOptions): Promise<ToolApprovalDecisionResponse>`

```typescript
const decision = await client.sessions.decideToolApproval({
  agentId,
  sessionId,
  approvalId,
  approved: true,
  reason: "The requested file is safe to read.",
});
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |
| `sessionId` | `string` | yes | Session ID (`ss_…`) |
| `approvalId` | `string` | yes | `approvalId` from `toolApprovals()` |
| `approved` | `boolean` | yes | `true` to run the call, `false` to block it |
| `reason` | `string` | no | Why you decided, up to 1,000 characters |

The decision covers only that one call. When the last pending call is decided, Blazing Agents resumes the turn: approved calls run and denied calls return a denied result to the agent. Disconnecting from the stream does not stop it. Returns [`ToolApprovalDecisionResponse`](#toolapprovaldecisionresponse) with the `continuationId` to stream. Errors: `validation_failed`, `not_found`, `tool_approval_decision_conflict` (already decided).

### `joinToolApprovalContinuation()` [#join-tool-approval-continuation]

Streams the rest of the turn after its tool calls are decided, from the first chunk.

**Signature:** `joinToolApprovalContinuation(input: { agentId: string; sessionId: string; continuationId: string } & ResourceRequestOptions): Promise<TerminalStreamResult>`

```typescript
const continuation = await client.sessions.joinToolApprovalContinuation({
  agentId,
  sessionId,
  continuationId: decision.continuationId,
});

const response = continuation.toResponse(); // return this from your route
```

The stream uses the same format as `chat()`, and you can join it more than once: each join replays what was already produced, then follows the turn live until it ends. Read the body once per join, through `toResponse()` or `toStream()`.

Returns [`TerminalStreamResult`](#terminalstreamresult). Errors: `session_busy` while some calls still wait for a decision, `not_found`, and `stream_error` for a broken stream. A failure inside the resumed turn arrives as an `error` chunk in the stream.

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

`agentVersion` is the version the session is pinned to, or `null` when each turn uses the agent's current version.

### `LatestSessionsListResponse` [#latestsessionslistresponse]

```typescript
interface LatestSessionsListResponse {
  data: LatestSessionListItem[];
  nextCursor: string | null;
}

interface LatestSessionListItem extends SessionListItem {
  agentId: string;
  model: string | null;
  thinkingLevel: string | null;
  status: "active" | "disabled";
}
```

`model`, `thinkingLevel`, and `status` describe the agent as it is now, not the version the session is pinned to.

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
}
```

### `ToolApprovalsResponse` [#toolapprovalsresponse]

```typescript
interface ToolApprovalsResponse {
  data: ToolApprovalState[];
  continuation: { id: string; state: ToolApprovalContinuationState } | null;
}

interface ToolApprovalState {
  approvalId: string;
  toolCallId: string;
  toolName: string;
  input: JSONValue;
  decision: "pending" | "approved" | "denied";
  reason: string | null;
  tool?: ToolReference | null;
  assistantMessageId?: string;
  createdAt?: string;
  decidedAt?: string | null;
}

type ToolApprovalContinuationState = "waiting" | "queued" | "running" | "succeeded" | "failed";
```

`input` is the exact JSON the agent wants to pass to the tool. `tool` identifies it as a built-in or MCP tool when known. The package exports `ToolApprovalState`, `ToolApprovalsResponse`, and `ToolReference`.

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
  toResponse: () => Response;
  toStream: () => ReadableStream<Uint8Array>;
}
```

## Errors [#errors]

Failures throw [`BlazingAgentsError`](/sdk/typescript/client#errors). The codes you are most likely to handle:

| Code | Meaning |
| --- | --- |
| `invalid_cursor` | Start paging again without the cursor |
| `not_found` | No such session, approval, or continuation for this agent |
| `tool_approval_decision_conflict` | The call was already decided; reload the approvals |
| `session_busy` | Some calls still wait for a decision; decide them first |
| `agent_disabled` | The agent is disabled, so the turn cannot resume |

## Next [#next]

- [Sessions and turns](/platform/sessions-and-turns)
- [Tool approvals](/agents/tools/tool-approvals)
- [Build a chatbot](/getting-started/chatbot)
