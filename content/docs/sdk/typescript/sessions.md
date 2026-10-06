---
title: Sessions
description: List sessions, load their messages, delete them, and answer tool approvals with the TypeScript SDK.
---

# Sessions

`client.sessions` reads the conversations Blazing Agents stores for you. Use it to show a user their past chats, reload a transcript, delete a conversation, list the tool calls an agent is waiting on, and steer messages into a running turn. To start or continue a session, call [`client.chat()`](/sdk/typescript/client#chat); to send approval decisions and continue the turn, call [`client.continueChat()`](/sdk/typescript/client#continue-chat). To learn how sessions and turns behave, read [Sessions and turns](/platform/sessions-and-turns).

```typescript
const { data: sessions } = await client.sessions.list({ agentId, userId: "user_123" });
const { data: messages } = await client.sessions.messages({
  agentId,
  sessionId: sessions[0].id,
});
```

Every method takes one input object and accepts an optional `abortSignal`. The session input methods check the format of `agentId`, `sessionId`, and `turnId`, and throw before any request is sent if one is malformed.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`list()`](#list) | List one agent's sessions | `SessionsListResponse` |
| [`listLatest()`](#list-latest) | List recent sessions across agents | `LatestSessionsListResponse` |
| [`get()`](#get) | Read one session and its saved `agentConfig` | `SessionResponse` |
| [`fork()`](#fork) | Copy a conversation through an accepted assistant reply | `SessionResponse` |
| [`messages()`](#messages) | Load or poll a session's messages | `SessionMessagesResponse` |
| [`delete()`](#delete) | Delete a session for good | `void` |
| [`toolApprovals()`](#tool-approvals) | List the session's tool approvals | `ToolApprovalsResponse` |
| [`submitInput()`](#submit-input) | Steer a message into the running turn | `SessionInputResponse` |
| [`inputs()`](#inputs) | List steer receipts and the session's activity | `SessionInputsResponse` |
| [`stop()`](#stop) | Record a turn stop | `StopSessionResponse` |

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

An agent ID that does not exist in your tenant returns an empty page. Returns [`SessionsListResponse`](#sessionslistresponse). Errors: [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor).

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

### `get()` [#get]

Reads one session with its saved configuration. Session lists remain compact, and message pages contain only transcript messages.

**Signature:** `get(input: { agentId: string; sessionId: string } & ResourceRequestOptions): Promise<SessionResponse>`

```typescript
const session = await client.sessions.get({ agentId, sessionId });
console.log(session.agentConfig.model);
```

Returns `SessionResponse`, the session summary plus required `agentConfig`. Errors: `validation_failed`, `not_found`.

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

The first page holds the newest messages, in chronological order within the page. Pass `nextCursor` as `cursor` to go further back. Save `latestCursor` and pass it later as `after` to fetch only what is new. Do not pass `cursor` and `after` together. `after` does not return the assistant message that a tool approval decision or continuation updated in place. While a tool part is `approval-requested` or `approval-responded`, reload the newest page without a cursor.

Returns [`SessionMessagesResponse`](#sessionmessagesresponse). Errors: `validation_failed`, `invalid_cursor`, [`not_found`](/api-reference/protocols/errors#not_found).

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

Show each pending call's `toolName` and `input` to the person deciding. `continuation` tracks the turn that resumes once every call is decided. To decide the whole round and stream the rest of the turn, call [`client.continueChat()`](/sdk/typescript/client#continue-chat). Returns [`ToolApprovalsResponse`](#toolapprovalsresponse). Errors: `validation_failed`, `not_found`.

### `submitInput()` [#submit-input]

Steers one user message into the running turn. The agent reads it at its next step and answers in the same turn. See [steer a running turn](/platform/sessions-and-turns#steer-a-running-turn).

**Signature:** `submitInput(input: { agentId: string; sessionId: string; requestId: string; message: UIMessage } & ResourceRequestOptions): Promise<SessionInputResponse>`

```typescript
const { data: input, activity } = await client.sessions.submitInput({
  agentId,
  sessionId,
  requestId,
  message: {
    id: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: "Please also compare costs." }],
  },
});
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |
| `sessionId` | `string` | yes | Session ID (`ss_…`) |
| `requestId` | `string` | yes | Your ID for this steer, 1 to 128 characters, other than `.` or `..` |
| `message` | `UIMessage` | yes | A user message with text and image parts |

Resending the same `requestId` with the same message returns the same receipt, so retry with the original values after a timeout. A call that cannot steer, because no turn is running or can take one, fails with [`steer_not_available`](/api-reference/protocols/errors#steer_not_available) and saves nothing; keep the message in your app's own queue and send it later as an ordinary `chat()` message. Returns [`SessionInputResponse`](#sessioninputresponse). Errors: `validation_failed`, `not_found`, [`input_idempotency_conflict`](/api-reference/protocols/errors#input_idempotency_conflict) when the `requestId` or `message.id` was already used for different content.

### `inputs()` [#inputs]

Lists the session's steer receipts in the order they arrived, with the session's current activity.

**Signature:** `inputs(input: { agentId: string; sessionId: string; includeCompleted?: boolean; limit?: number; cursor?: string } & ResourceRequestOptions): Promise<SessionInputsResponse>`

```typescript
const { data, activity } = await client.sessions.inputs({ agentId, sessionId });
const pending = data.filter((input) => input.state === "accepted" || input.state === "delivered");
```

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `agentId` | `string` | yes | none | Agent ID (`ag_…`) |
| `sessionId` | `string` | yes | none | Session ID (`ss_…`) |
| `includeCompleted` | `boolean` | no | `false` | Also return `committed` and `not_placed` receipts |
| `limit` | `number` | no | `100` | 1 to 200 per page |
| `cursor` | `string` | no | none | `nextCursor` from the previous page |

Without `includeCompleted`, you get the pending `accepted` and `delivered` receipts plus any `uncertain` ones, so your app can show them to the user. To watch for changes, call it again without a cursor; the cursor only pages through a long list. `activity` reports `idle`, `running`, `stopping`, or `approval`, with the running `turnId`. Returns [`SessionInputsResponse`](#sessioninputsresponse). Errors: `validation_failed`, `invalid_cursor`, `not_found`.

### `stop()` [#stop]

Records a stop for one turn and returns right away. The turn's own stream keeps running until it settles.

**Signature:** `stop(input: { agentId: string; sessionId: string; turnId: string } & ResourceRequestOptions): Promise<StopSessionResponse>`

```typescript
const { activity } = await client.sessions.inputs({ agentId, sessionId });
if (activity.turnId && activity.state === "running") {
  const stopped = await client.sessions.stop({ agentId, sessionId, turnId: activity.turnId });
  console.log(stopped.activity.state);
}
```

Take `turnId` from the session's activity. Retrying with the same `turnId` never stops a later turn. Returns [`StopSessionResponse`](#stopsessionresponse). Errors: `validation_failed`, and `not_found` for a turn that is not this session's.

### `fork()` [#fork]

Creates an idle child session through a selected accepted assistant message, including that reply.

**Signature:** `fork(input: { agentId: string; sessionId: string; messageId: string; idempotencyKey: string } & ResourceRequestOptions): Promise<SessionResponse>`

```typescript
const page = await client.sessions.messages({ agentId, sessionId });
const selected = page.data.find((message) => message.branchable);
if (!selected) throw new Error("Choose an accepted assistant reply first.");
const idempotencyKey = crypto.randomUUID();
const child = await client.sessions.fork({
  agentId, sessionId, messageId: selected.id, idempotencyKey,
});
console.log(child.id, child.forkedFrom);
```

Select a message whose top-level `branchable` is `true`. Streaming replies and pending approvals are ineligible. Eligibility comes from persisted transcript messages; live stream chunks need not carry `branchable`. A missing or not-yet-persisted reply is ineligible. An earlier accepted reply remains eligible while the source runs. The child inherits the source's saved configuration, user label, and metadata; workspace files and memories stay shared and live.

Use a nonblank idempotency key of at most 200 characters. Save it before sending and reuse the exact source, message, and key after a lost response. Creation returns HTTP `201`; identical replay returns HTTP `200` and the same child, even if the source was deleted. Forking runs no model or tool and creates no usage. Continue through `chat()` with the child's ID; later turns have normal usage.

Errors: `idempotency_conflict` (`409`) for the same key with another message, `session_fork_unavailable` (`409`) for a removed or ineligible reply, `session_fork_deleted` (`410`) for a replay whose child was deleted, and `not_found` (`404`) for a missing or inaccessible source or agent.

## Response types [#response-types]

### `SessionsListResponse` [#sessionslistresponse]

```typescript
interface SessionsListResponse {
  data: SessionListItem[];
  nextCursor: string | null;
}

interface SessionListItem {
  id: string;
  messageCount: number;
  lastMessagePreview: string | null;
  userId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

`SessionResponse` adds `agentConfig: AgentConfig` and required `forkedFrom: { sessionId: string; messageId: string } | null` to a `SessionListItem`. Ordinary sessions have `forkedFrom: null`; a child names its source and selected reply. Lists omit provenance. It holds the saved settings for every turn in that session.

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

`model`, `thinkingLevel`, and `status` describe the agent as it is now, while `agentConfig` on `get()` describes the session.

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
  branchable: boolean;
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

type ToolApprovalContinuationState = "waiting" | "running" | "succeeded" | "failed";
```

`input` is the exact JSON the agent wants to pass to the tool. `tool` identifies it as a built-in or MCP tool when known. The package exports `ToolApprovalState`, `ToolApprovalsResponse`, `ToolApprovalDecision`, and `ToolReference`.

### `SessionInputResponse` [#sessioninputresponse]

```typescript
interface SessionInputResponse {
  data: SessionInput;
  activity: SessionActivity;
}

interface SessionInput {
  requestId: string;
  sequence: number;
  message: SessionMessage;
  state: SessionInputState;
  turnId: string;
  createdAt: string;
  updatedAt: string;
  reason: "stopped" | "failed" | "owner_lost" | "turn_finished" | null;
}

type SessionInputState = "accepted" | "delivered" | "committed" | "not_placed" | "uncertain";

interface SessionActivity {
  state: "idle" | "running" | "stopping" | "approval";
  turnId: string | null;
}
```

`sequence` fixes the steer's arrival order and never changes. `turnId` names the turn the steer was bound to. `committed` proves the message is in the history; `not_placed` is safe to send as an ordinary chat message; `uncertain` means the agent may have read it, so never resend it automatically. `owner_lost` means Blazing Agents lost the turn before it finished. See [what each state means](/platform/sessions-and-turns#steer-receipts).

### `SessionInputsResponse` [#sessioninputsresponse]

```typescript
interface SessionInputsResponse {
  data: SessionInput[];
  nextCursor: string | null;
  activity: SessionActivity;
}
```

### `StopSessionResponse` [#stopsessionresponse]

```typescript
interface StopSessionResponse {
  stoppedTurnId: string;
  activity: SessionActivity;
}
```

The package exports these types and `ChatSteerConsumedEvent`, the provisional `data-ba-steer-consumed` chunk shape. Their Zod schemas are in `@blazingagents/sdk/contracts`.

## Errors [#errors]

Failures throw [`BlazingAgentsError`](/sdk/typescript/client#errors). The codes you are most likely to handle:

| Code | Meaning |
| --- | --- |
| `invalid_cursor` | Start paging again without the cursor |
| `not_found` | No such session or turn for this agent |
| `steer_not_available` | No turn can take the message now; keep it in your own queue |
| `tool_approval_decision_conflict` | The call was already decided differently; reload the approvals |
| `tool_approval_continuation_settled` | The approval round already finished; read the history |
| `session_busy` | A turn or approval continuation is in progress; wait for it |
| [`input_idempotency_conflict`](/api-reference/protocols/errors#input_idempotency_conflict) | The `requestId` or `message.id` was used for different content; retry with the original values |
| [`agent_disabled`](/api-reference/protocols/errors#agent_disabled) | The agent is disabled |

## Next [#next]

- [Sessions and turns](/platform/sessions-and-turns)
- [Tool approvals](/agents/tools/tool-approvals)
- [Build a chatbot](/getting-started/chatbot)
