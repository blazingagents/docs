---
title: Sessions
description: List conversations, read transcripts, approve tool calls, and delete sessions with the Python SDK.
---

# Sessions

`client.sessions` reads and deletes the conversations Blazing Agents stores for you, and lets you approve or deny tool calls an agent is waiting on. You start and continue a session with [`client.chat()`](/sdk/python/client#chat).

Examples assume `client = BlazingAgents()` with `agent_id` and `session_id` from an earlier chat. Every method also accepts `extra_headers` and `timeout`. On `AsyncBlazingAgents`, await the same method names and use `async for` with `iter()`.

```python
page = client.sessions.list(agent_id=agent_id, limit=10)
for session in page.data:
    print(session.id, session.message_count, session.last_message_preview)
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`list()`](#list) | Get one page of an agent's sessions | `SessionsPage` |
| [`iter()`](#iter) | Iterate every session of an agent | `Iterator[Session]` |
| [`list_latest()`](#list-latest) | Get recent sessions across agents | `LatestSessionsPage` |
| [`get()`](#get) | Read saved session configuration | `SessionResponse` |
| [`messages()`](#messages) | Read or poll the transcript | `SessionMessagesPage` |
| [`tool_approvals()`](#tool-approvals) | List proposed tool calls | `ToolApprovals` |
| [`decide_tool_approval()`](#decide-tool-approval) | Approve or deny one call | `ToolApprovalDecision` |
| [`join_tool_approval_continuation()`](#join-tool-approval-continuation) | Stream the agent's work after a decision | `ByteStream` |
| [`delete()`](#delete) | Permanently delete a session | `None` |
| [`submit_input()`](#submit-input) | Send a message to queue or steer | `SessionInputResponse` |
| [`inputs()`](#inputs) | List waiting inputs and the session's activity | `SessionInputsPage` |
| [`promote_input()`](#promote-input) | Steer a queued input into the running turn | `SessionInputResponse` |
| [`delete_input()`](#delete-input) | Withdraw a waiting input | `SessionInputResponse` |
| [`stop()`](#stop) | Stop a turn and wait until it has stopped | `SessionStopResponse` |
| [`resume_inputs()`](#resume-inputs) | Let a paused queue run again | `SessionActivityResponse` |

## Methods [#methods]

### `list()` [#list]

Gets one page of an agent's sessions, most recently updated first.

```python
page = client.sessions.list(agent_id=agent_id, user_id="customer_123", limit=25)
if page.next_cursor is not None:
    page = client.sessions.list(agent_id=agent_id, cursor=page.next_cursor, limit=25)
```

**Signature:** `list(*, agent_id: str, user_id=..., cursor=..., limit=...) -> SessionsPage`

`user_id` keeps only one end user's sessions, and `""` keeps tenant-level ones; omit it to include all. `limit` is 1 to 200 and defaults to 50. An unknown agent returns an empty page.

Returns `SessionsPage` with `data: list[Session]` and `next_cursor: str | None`. Raises `APIStatusError` with [`validation_failed`](/api-reference/protocols/errors#validation_failed) or [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor).

### `iter()` [#iter]

Iterates every session of an agent, fetching pages as you go.

```python
for session in client.sessions.iter(agent_id=agent_id):
    print(session.id, session.updated_at)
```

**Signature:** `iter(*, agent_id: str, user_id=..., cursor=..., limit=...) -> Iterator[Session]`

Takes the same parameters as [`list()`](#list); `cursor` resumes from a saved page. No request is sent until you start iterating. On the async client, use `async for` directly on `iter(...)`.

### `list_latest()` [#list-latest]

Gets the most recently updated sessions across all your agents. Use it to build an inbox.

```python
inbox = client.sessions.list_latest(user_id="customer_123", by_agent=True, limit=25)
for session in inbox.data:
    print(session.agent_id, session.last_message_preview)
```

**Signature:** `list_latest(*, user_id=..., cursor=..., limit=..., by_agent: bool | None = None) -> LatestSessionsPage`

By default one agent can appear several times. `by_agent=True` returns at most one session per agent, its latest. `user_id` limits the result to one end user's sessions.

Returns `LatestSessionsPage`. Each item has the [`Session`](#session) fields plus the agent's `agent_id`, current `model`, `thinking_level`, and `status` (`"active"` or `"disabled"`). Disabled agents are included. Raises `validation_failed` or `invalid_cursor`.

### `get()` [#get]

Reads the session and the agent configuration saved at its first turn.

```python
session = client.sessions.get(agent_id=agent_id, session_id=session_id)
print(session.agent_config.model)
```

**Signature:** `get(agent_id: str, session_id: str) -> SessionResponse`

`SessionResponse` adds required `agent_config` to the session summary. Lists remain compact, and message pages contain only transcript messages. Raises `validation_failed` or `not_found`.

### `messages()` [#messages]

Reads a session's transcript, or polls it for new messages.

```python
page = client.sessions.messages(agent_id=agent_id, session_id=session_id, limit=50)
for message in page.data:
    print(message.role, [part.type for part in message.parts])

if page.latest_cursor is not None:
    newer = client.sessions.messages(
        agent_id=agent_id,
        session_id=session_id,
        after=page.latest_cursor,
    )
```

**Signature:** `messages(*, agent_id: str, session_id: str, cursor=..., after=..., limit=...) -> SessionMessagesPage`

Without a cursor you get the newest messages, in chronological order. To page further back, pass `next_cursor` as `cursor`. To poll for new messages, save `latest_cursor` and pass it as `after`; when a forward page has more, pass its `next_cursor` as the next `after`. Do not pass both `cursor` and `after`. `limit` is 1 to 200 and defaults to 50. `after` does not return the assistant message that a tool approval decision or continuation updated in place. While a tool part is `approval-requested` or `approval-responded`, reload the newest page without a cursor.

Returns `SessionMessagesPage` with `data: list[SessionMessage]`, `next_cursor`, and `latest_cursor`. Raises `validation_failed` when you combine `cursor` and `after`, `invalid_cursor`, or [`not_found`](/api-reference/protocols/errors#not_found).

### `tool_approvals()` [#tool-approvals]

Lists the tool calls in a session that are waiting for your decision.

```python
approvals = client.sessions.tool_approvals(agent_id=agent_id, session_id=session_id)
pending = [item for item in approvals.data if item.decision == "pending"]
```

**Signature:** `tool_approvals(*, agent_id: str, session_id: str) -> ToolApprovals`

An agent waits for approval when its `approval_in_chat` policy marks a tool as needing review. See [tool approvals](/agents/tools/tool-approvals) for the policy options. Once you decide a call, the list shows every call in that round, with its decision, until the agent's continuation finishes. Listing does not decide or claim anything.

Returns [`ToolApprovals`](#toolapprovals). Raises `validation_failed` or `not_found`.

### `decide_tool_approval()` [#decide-tool-approval]

Approves or denies one pending tool call.

```python
decision = client.sessions.decide_tool_approval(
    agent_id=agent_id,
    session_id=session_id,
    approval_id=pending[0].approval_id,
    approved=True,
    reason="Reviewed by the operator.",
)
```

**Signature:** `decide_tool_approval(*, agent_id: str, session_id: str, approval_id: str, approved: bool, reason=...) -> ToolApprovalDecision`

`reason` is optional; when given it must be 1 to 1,000 characters. Sending the same decision again is harmless. Reversing a decision raises [`tool_approval_decision_conflict`](/api-reference/protocols/errors#tool_approval_decision_conflict).

Your decision lets the agent continue in the same session. Returns `ToolApprovalDecision` with `continuation_id` and its `state`: `"waiting"`, `"queued"`, `"running"`, `"succeeded"`, or `"failed"`. When the agent proposed several calls at once, the continuation stays `"waiting"` until you decide all of them. Also raises `validation_failed` or `not_found`.

### `join_tool_approval_continuation()` [#join-tool-approval-continuation]

Streams the agent's work after your decision, in the same AI SDK SSE format as `chat()`.

```python
with client.sessions.join_tool_approval_continuation(
    agent_id=agent_id,
    session_id=session_id,
    continuation_id=decision.continuation_id,
) as stream:
    for chunk in stream:
        print(chunk.decode(), end="")
```

**Signature:** `join_tool_approval_continuation(*, agent_id: str, session_id: str, continuation_id: str) -> ByteStream`

The stream replays saved output, then follows live output to the end. It removes private backend function events without executing handlers. Closing the stream only stops your reader, and you can join again with the same ID.

A queued continuation that needs backend functions waits for an executor. Call [`resume_chat()`](/sdk/python/client#resume-chat) with your handlers to start it. With the async client, call `stream = await client.sessions.join_tool_approval_continuation(...)`, then use `async with stream` and `async for`.

Raises [`session_busy`](/api-reference/protocols/errors#session_busy) while the continuation is still `"waiting"` for other decisions, or `not_found`. Reading the stream can raise `StreamError`.

### `delete()` [#delete]

Permanently deletes a session and its transcript.

```python
client.sessions.delete(agent_id=agent_id, session_id=session_id, delete_artifacts=False)
```

**Signature:** `delete(*, agent_id: str, session_id: str, delete_artifacts: bool) -> None`

`delete_artifacts` is required: `True` also deletes artifacts published in the session, and `False` keeps them. Raises `session_busy` while a continuation is waiting, queued, or running; pending approvals alone do not block deletion. Also raises `validation_failed` or `not_found`.

### `submit_input()` [#submit-input]

Sends a user message to an existing session without waiting for the running turn. Blazing Agents saves it before the call returns. See [send while the agent is working](/platform/sessions-and-turns#send-while-the-agent-is-working).

```python
import uuid

request_id = str(uuid.uuid4())
result = client.sessions.submit_input(
    agent_id=agent_id,
    session_id=session_id,
    request_id=request_id,
    message={
        "id": str(uuid.uuid4()),
        "role": "user",
        "parts": [{"type": "text", "text": "Please also compare costs."}],
    },
    when_busy="queue",
)
print(result.data.state, result.activity.state)
```

**Signature:** `submit_input(*, agent_id: str, session_id: str, request_id: str, message: Mapping[str, object], when_busy=...) -> SessionInputResponse`

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `request_id` | `str` | required | Your ID for this input, 1 to 128 characters, other than `.` or `..` |
| `message` | `Mapping[str, object]` | required | A user message with text and image parts |
| `when_busy` | `"queue"` or `"steer"` | `"queue"` | Wait for the next turn, or join the running one |

A queued input, or any input sent to an idle session, waits until you call [`client.run_inputs()`](/sdk/python/client#run-inputs). Resending the same `request_id` with the same message and `when_busy` returns the same input, so retry with the original values after a timeout. Raises `validation_failed`, `not_found`, or [`input_idempotency_conflict`](/api-reference/protocols/errors#input_idempotency_conflict) when the `request_id` or message ID was already used for different content.

### `inputs()` [#inputs]

Lists the session's inputs in the order they arrived, with the session's current activity.

```python
page = client.sessions.inputs(agent_id=agent_id, session_id=session_id)
waiting = [item for item in page.data if item.state in ("accepted", "delivered")]
print(page.activity.state, len(waiting))
```

**Signature:** `inputs(*, agent_id: str, session_id: str, include_completed=..., cursor=..., limit=...) -> SessionInputsPage`

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `include_completed` | `bool` | `False` | Also return `committed` and `cancelled` inputs |
| `cursor` | `str` | none | `next_cursor` from the previous page |
| `limit` | `int` | `100` | 1 to 200 per page |

Without `include_completed`, you get `accepted`, `delivered`, `consumed`, and `uncertain` inputs. To watch for changes, call it again without a cursor; the cursor only pages through a long list. Raises `validation_failed`, `invalid_cursor`, or `not_found`.

### `promote_input()` [#promote-input]

Turns a queued input into a steering message, keeping its place in the order.

```python
result = client.sessions.promote_input(
    agent_id=agent_id, session_id=session_id, request_id=request_id
)
```

**Signature:** `promote_input(*, agent_id: str, session_id: str, request_id: str) -> SessionInputResponse`

Promoting an input that already steers returns it unchanged. If no turn can take it now, it waits for the next one. Promoting does not skip a pending tool approval. A `request_id` of `.` or `..` raises `ValueError` before any request is sent. Raises `not_found`, or [`input_not_pending`](/api-reference/protocols/errors#input_not_pending) once a turn has picked the input up.

### `delete_input()` [#delete-input]

Withdraws an input that is still waiting.

```python
result = client.sessions.delete_input(
    agent_id=agent_id, session_id=session_id, request_id=request_id
)
```

**Signature:** `delete_input(*, agent_id: str, session_id: str, request_id: str) -> SessionInputResponse`

The input comes back `cancelled` with `reason == "deleted"`. Deleting it again returns the same result. It stays in `inputs(include_completed=True)`, and its `request_id` cannot be reused for a different message. A `request_id` of `.` or `..` raises `ValueError` before any request is sent. Raises `not_found`, or `input_not_pending` when a turn picked it up first.

### `stop()` [#stop]

Stops one turn and returns once it has fully stopped and its usage is recorded.

```python
activity = client.sessions.inputs(agent_id=agent_id, session_id=session_id).activity
if activity.turn_id is not None and activity.state == "running":
    stopped = client.sessions.stop(
        agent_id=agent_id, session_id=session_id, turn_id=activity.turn_id
    )
    print(stopped.activity.state)
```

**Signature:** `stop(*, agent_id: str, session_id: str, turn_id: str) -> SessionStopResponse`

Take `turn_id` from the session's activity. Stopping a turn that already ended succeeds, and never stops a later turn. Waiting inputs stay queued until you call [`client.run_inputs()`](/sdk/python/client#run-inputs). Raises `validation_failed`, `not_found` for a turn that is not this session's, or `session_busy` while a tool approval waits.

### `resume_inputs()` [#resume-inputs]

Lets the waiting queue run again after a failed turn paused it.

```python
result = client.sessions.resume_inputs(agent_id=agent_id, session_id=session_id)
```

**Signature:** `resume_inputs(*, agent_id: str, session_id: str) -> SessionActivityResponse`

It starts no turn, so call [`client.run_inputs()`](/sdk/python/client#run-inputs) next. `uncertain` inputs never run again. It does not clear a `function_executor_required` pause; pass your functions to `client.run_inputs()` for that. Raises `not_found`, or `session_busy` while a tool approval waits.

## Response models [#response-models]

### `Session` [#session]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `str` | Session ID (`ss_...`) |
| `message_count` | `int` | Number of stored messages |
| `last_message_preview` | `str \| None` | Short preview of the last message |
| `user_id` | `str` | End user, or `""` for tenant level |
| `metadata` | `dict[str, object]` | Your own data |
| `created_at`, `updated_at` | `datetime` | Timestamps |

A `SessionMessage` has `id`, `role` (`"system"`, `"user"`, or `"assistant"`), `parts`, and `metadata`. Each part has a `type` and keeps the rest of its fields as extra model data.

### `ToolApprovals` [#toolapprovals]

`data` is a list of `ToolApproval`. `continuation` holds the session's unfinished continuation (`id` and `state`), or `None` when there is none.

| `ToolApproval` field | Type | Description |
| --- | --- | --- |
| `approval_id` | `str` | ID to pass to `decide_tool_approval()` |
| `tool_call_id` | `str` | The model's tool call ID |
| `tool_name` | `str` | Tool name |
| `tool` | `ToolReference \| None` | Built-in tool, or MCP tool with its `connection_id` |
| `input` | `object` | Exact arguments the agent proposed |
| `decision` | `str` | `"pending"`, `"approved"`, or `"denied"` |
| `reason` | `str \| None` | Reason given with the decision |
| `assistant_message_id` | `str \| None` | Message that proposed the call |
| `created_at`, `decided_at` | `datetime \| None` | Timestamps |

### `SessionInput` [#sessioninput]

`SessionInputResponse` has `data: SessionInput` and `activity: SessionActivity`. `SessionInputsPage` has `data: list[SessionInput]`, `next_cursor`, and `activity`. `SessionStopResponse` has `stopped_turn_id` and `activity`. `SessionActivityResponse` has `activity` only.

| `SessionInput` field | Type | Description |
| --- | --- | --- |
| `request_id` | `str` | Your ID for the input |
| `sequence` | `int` | Place in the order; never changes |
| `message` | `SessionInputMessage` | The message you sent, with `id`, `role` (always `"user"`), `parts`, and `metadata` |
| `mode` | `str` | `"queue"` or `"steer"` |
| `state` | `str` | `"accepted"`, `"delivered"`, `"consumed"`, `"committed"`, `"cancelled"`, or `"uncertain"` |
| `turn_id` | `str \| None` | The turn that took the input |
| `consumed_at` | `datetime \| None` | When the agent read it, even if the turn later stopped or failed |
| `reason` | `str \| None` | `"stopped"`, `"failed"`, `"owner_lost"`, or `"deleted"` |
| `created_at`, `updated_at` | `datetime` | Timestamps |

| `SessionActivity` field | Type | Description |
| --- | --- | --- |
| `state` | `str` | `"idle"`, `"running"`, `"stopping"`, `"approval"`, or `"paused"` |
| `turn_id` | `str \| None` | The running or paused turn |
| `reason` | `str \| None` | `"failed"`, `"owner_lost"`, or `"function_executor_required"` |

See [what each state means](/platform/sessions-and-turns#show-progress-and-recover-after-a-reload).

## Next [#next]

- [Sessions and turns](/platform/sessions-and-turns)
- [Tool approvals](/agents/tools/tool-approvals)
- [Client generation methods](/sdk/python/client#chat)
