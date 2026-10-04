---
title: Sessions
description: List sessions, load their messages, delete them, and answer tool approvals with the TypeScript SDK.
---

# Sessions

`client.sessions` reads the conversations Blazing Agents stores for you. Use it to show a user their past chats, reload a transcript, delete a conversation, approve or deny a tool call the agent is waiting on, and queue or steer messages while the agent works. To start or continue a session, call [`client.chat()`](/sdk/typescript/client#chat). To learn how sessions and turns behave, read [Sessions and turns](/platform/sessions-and-turns).

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
| [`get()`](#get) | Read one session and its saved `agentConfig` | `SessionResponse` |
| [`messages()`](#messages) | Load or poll a session's messages | `SessionMessagesResponse` |
| [`delete()`](#delete) | Delete a session for good | `void` |
| [`toolApprovals()`](#tool-approvals) | List the session's tool approvals | `ToolApprovalsResponse` |
| [`decideToolApproval()`](#decide-tool-approval) | Approve or deny one tool call | `ToolApprovalDecisionResponse` |
| [`joinToolApprovalContinuation()`](#join-tool-approval-continuation) | Stream the rest of the turn after approvals | `TerminalStreamResult` |
| [`submitInput()`](#submit-input) | Send a message to queue or steer | `SessionInputResponse` |
| [`inputs()`](#inputs) | List waiting inputs and the session's activity | `SessionInputsResponse` |
| [`promoteInput()`](#promote-input) | Steer a queued input into the running turn | `SessionInputResponse` |
| [`deleteInput()`](#delete-input) | Withdraw a waiting input | `SessionInputResponse` |
| [`stop()`](#stop) | Stop a turn and wait until it has stopped | `StopSessionResponse` |
| [`resumeInputs()`](#resume-inputs) | Run the queue again after a pause | `ResumeSessionInputsResponse` |
| [`joinInputTurn()`](#join-input-turn) | Stream a turn that runs queued inputs | `TerminalStreamResult` |
| [`runInputs()`](#run-inputs) | Run the queue with your backend functions attached | `TerminalStreamResult` |

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

Reads one session with the configuration saved at its first turn. Session lists remain compact, and message pages contain only transcript messages.

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

The first page holds the newest messages, in chronological order within the page. Pass `nextCursor` as `cursor` to go further back. Save `latestCursor` and pass it later as `after` to fetch only what is new. Do not pass `cursor` and `after` together.

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

The decision covers only that one call. When the last pending call is decided, Blazing Agents resumes the turn: approved calls run and denied calls return a denied result to the agent. Disconnecting from the stream does not stop it. Returns [`ToolApprovalDecisionResponse`](#toolapprovaldecisionresponse) with the `continuationId` to stream. Errors: `validation_failed`, `not_found`, [`tool_approval_decision_conflict`](/api-reference/protocols/errors#tool_approval_decision_conflict) (already decided).

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

Returns [`TerminalStreamResult`](#terminalstreamresult). Errors: [`session_busy`](/api-reference/protocols/errors#session_busy) while some calls still wait for a decision, `not_found`, and `stream_error` for a broken stream. A failure inside the resumed turn arrives as an `error` chunk in the stream.

### `submitInput()` [#submit-input]

Sends a user message to an existing session without waiting for the running turn. Blazing Agents saves it before the call returns. See [send while the agent is working](/platform/sessions-and-turns#send-while-the-agent-is-working).

**Signature:** `submitInput(input: { agentId: string; sessionId: string; requestId: string; message: UIMessage; whenBusy?: SessionInputMode } & ResourceRequestOptions): Promise<SessionInputResponse>`

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
  whenBusy: "queue",
});
```

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `agentId` | `string` | yes | none | Agent ID (`ag_…`) |
| `sessionId` | `string` | yes | none | Session ID (`ss_…`) |
| `requestId` | `string` | yes | none | Your ID for this input, 1 to 128 characters, other than `.` or `..` |
| `message` | `UIMessage` | yes | none | A user message with text and image parts |
| `whenBusy` | `"queue" \| "steer"` | no | `"queue"` | Wait for the next turn, or join the running one |

When the session is idle, the input starts a turn right away. Resending the same `requestId` with the same message and `whenBusy` returns the same input, so retry with the original values after a timeout. Returns [`SessionInputResponse`](#sessioninputresponse). Errors: `validation_failed`, `not_found`, [`input_idempotency_conflict`](/api-reference/protocols/errors#input_idempotency_conflict) when the `requestId` or `message.id` was already used for different content.

### `inputs()` [#inputs]

Lists the session's inputs in the order they arrived, with the session's current activity.

**Signature:** `inputs(input: { agentId: string; sessionId: string; includeCompleted?: boolean; limit?: number; cursor?: string } & ResourceRequestOptions): Promise<SessionInputsResponse>`

```typescript
const { data, activity } = await client.sessions.inputs({ agentId, sessionId });
const waiting = data.filter((input) => input.state === "accepted" || input.state === "delivered");
```

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `agentId` | `string` | yes | none | Agent ID (`ag_…`) |
| `sessionId` | `string` | yes | none | Session ID (`ss_…`) |
| `includeCompleted` | `boolean` | no | `false` | Also return `committed` and `cancelled` inputs |
| `limit` | `number` | no | `100` | 1 to 200 per page |
| `cursor` | `string` | no | none | `nextCursor` from the previous page |

Without `includeCompleted`, you get `accepted`, `delivered`, `consumed`, and `uncertain` inputs. To watch for changes, call it again without a cursor; the cursor only pages through a long list. Returns [`SessionInputsResponse`](#sessioninputsresponse). Errors: `validation_failed`, `invalid_cursor`, `not_found`.

### `promoteInput()` [#promote-input]

Turns a queued input into a steering message, keeping its place in the order.

**Signature:** `promoteInput(input: { agentId: string; sessionId: string; requestId: string } & ResourceRequestOptions): Promise<SessionInputResponse>`

```typescript
const { data: input } = await client.sessions.promoteInput({ agentId, sessionId, requestId });
```

Promoting an input that already steers returns it unchanged. If no turn can take it now, it waits for the next one. Promoting does not skip a pending tool approval. A `requestId` of `.` or `..` throws before any request is sent. Returns [`SessionInputResponse`](#sessioninputresponse). Errors: `not_found`, [`input_not_pending`](/api-reference/protocols/errors#input_not_pending) once a turn has picked the input up.

### `deleteInput()` [#delete-input]

Withdraws an input that is still waiting.

**Signature:** `deleteInput(input: { agentId: string; sessionId: string; requestId: string } & ResourceRequestOptions): Promise<SessionInputResponse>`

```typescript
const { data: input } = await client.sessions.deleteInput({ agentId, sessionId, requestId });
```

The input comes back `cancelled` with `reason: "deleted"`. Deleting it again returns the same result. It stays in `inputs({ includeCompleted: true })`, and its `requestId` cannot be reused for a different message. A `requestId` of `.` or `..` throws before any request is sent. Returns [`SessionInputResponse`](#sessioninputresponse). Errors: `not_found`, `input_not_pending` when a turn picked it up first.

### `stop()` [#stop]

Stops one turn and returns once it has fully stopped and its usage is recorded.

**Signature:** `stop(input: { agentId: string; sessionId: string; turnId: string } & ResourceRequestOptions): Promise<StopSessionResponse>`

```typescript
const { activity } = await client.sessions.inputs({ agentId, sessionId });
if (activity.turnId && activity.state === "running") {
  const stopped = await client.sessions.stop({ agentId, sessionId, turnId: activity.turnId });
  console.log(stopped.activity.state);
}
```

Take `turnId` from the session's activity. Stopping a turn that already ended succeeds, and never stops a later turn. The returned `activity` can show the next queued turn already running. Waiting inputs stay queued. Returns [`StopSessionResponse`](#stopsessionresponse). Errors: `validation_failed`, `not_found` for a turn that is not this session's, and `session_busy` while a tool approval waits.

### `resumeInputs()` [#resume-inputs]

Runs the waiting queue again after a failed turn paused it.

**Signature:** `resumeInputs(input: { agentId: string; sessionId: string } & ResourceRequestOptions): Promise<ResumeSessionInputsResponse>`

```typescript
const { activity } = await client.sessions.resumeInputs({ agentId, sessionId });
```

Calling it twice starts only one turn, and `uncertain` inputs never run again. With nothing waiting, the session goes `idle`. It does not clear a `function_executor_required` pause; use [`runInputs()`](#run-inputs) for that. Returns [`ResumeSessionInputsResponse`](#resumesessioninputsresponse). Errors: `not_found`, `session_busy` while a tool approval waits.

### `joinInputTurn()` [#join-input-turn]

Streams a turn that Blazing Agents started from queued inputs, from its first chunk.

**Signature:** `joinInputTurn(input: { agentId: string; sessionId: string; turnId: string; functions?: ChatFunctions } & ResourceRequestOptions): Promise<TerminalStreamResult>`

```typescript
const { activity } = await client.sessions.inputs({ agentId, sessionId });
if (activity.turnId && activity.state === "running") {
  const turn = await client.sessions.joinInputTurn({ agentId, sessionId, turnId: activity.turnId });
  const response = turn.toResponse(); // return this from your route
}
```

The stream uses the same format as `chat()`. Each join replays the turn from the beginning and then follows it live, so show the assistant message by its ID instead of appending it again. Joining never starts or restarts work, and closing the stream does not stop the turn; call [`stop()`](#stop) for that. Read the body once per join.

Without `functions`, you only watch the turn. If the turn uses your [backend functions](/agents/tools/backend-functions), pass the same `functions` to run their calls from your backend. Returns [`TerminalStreamResult`](#terminalstreamresult). Errors: `not_found` for a turn that did not start from queued inputs or is not this session's, and `stream_error` for a broken stream.

### `runInputs()` [#run-inputs]

Runs the waiting queue in one turn with your backend functions attached, and streams it.

**Signature:** `runInputs(input: { agentId: string; sessionId: string; functions?: ChatFunctions } & ResourceRequestOptions): Promise<TerminalStreamResult>`

```typescript
const { activity } = await client.sessions.inputs({ agentId, sessionId });
if (activity.reason === "function_executor_required") {
  const turn = await client.sessions.runInputs({ agentId, sessionId, functions });
  const response = turn.toResponse(); // return this from your route
}
```

After a turn that used your backend functions, queued inputs never run on their own; the session pauses with the reason `function_executor_required`. Call `runInputs()` with the same functions to run every waiting input, in order, as one turn. It sends no new message, and it never runs a batch that is already running. To stream a batch that already started, call [`joinInputTurn()`](#join-input-turn) with your functions. The pause comes back after that turn, so call it again for later queued work.

Returns [`TerminalStreamResult`](#terminalstreamresult). Errors: `not_found`, and `session_busy` when nothing is waiting, a turn is running, or a tool approval waits.

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

`SessionResponse` adds `agentConfig: AgentConfig` to a `SessionListItem`. It holds the saved settings for every turn in that session.

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
  mode: "queue" | "steer";
  state: SessionInputState;
  turnId: string | null;
  createdAt: string;
  updatedAt: string;
  consumedAt: string | null;
  reason: "stopped" | "failed" | "owner_lost" | "deleted" | null;
}

type SessionInputState = "accepted" | "delivered" | "consumed" | "committed" | "cancelled" | "uncertain";

interface SessionActivity {
  state: "idle" | "running" | "stopping" | "approval" | "paused";
  turnId: string | null;
  reason: "failed" | "owner_lost" | "function_executor_required" | null;
}
```

`sequence` is the input's place in the order and never changes. `turnId` is set once a turn takes the input. `consumedAt` is set once the agent has read it, even if the turn later stopped or failed. `owner_lost` means Blazing Agents lost the turn before it finished. Inputs the agent may already have read become `uncertain`, and Blazing Agents does not run them again. See [what each state means](/platform/sessions-and-turns#show-progress-and-recover-after-a-reload).

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

### `ResumeSessionInputsResponse` [#resumesessioninputsresponse]

```typescript
interface ResumeSessionInputsResponse {
  activity: SessionActivity;
}
```

The package exports these types and `SessionInputMode`. Their Zod schemas are in `@blazingagents/sdk/contracts`.

## Errors [#errors]

Failures throw [`BlazingAgentsError`](/sdk/typescript/client#errors). The codes you are most likely to handle:

| Code | Meaning |
| --- | --- |
| `invalid_cursor` | Start paging again without the cursor |
| `not_found` | No such session, approval, or continuation for this agent |
| `tool_approval_decision_conflict` | The call was already decided; reload the approvals |
| `session_busy` | Some calls still wait for a decision; decide them first |
| [`input_idempotency_conflict`](/api-reference/protocols/errors#input_idempotency_conflict) | The `requestId` or `message.id` was used for different content; retry with the original values |
| [`input_not_pending`](/api-reference/protocols/errors#input_not_pending) | A turn already took the input; reload `inputs()` |
| [`agent_disabled`](/api-reference/protocols/errors#agent_disabled) | The agent is disabled, so the turn cannot resume |

## Next [#next]

- [Sessions and turns](/platform/sessions-and-turns)
- [Tool approvals](/agents/tools/tool-approvals)
- [Build a chatbot](/getting-started/chatbot)
