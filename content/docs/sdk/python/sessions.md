---
title: Sessions
description: List conversations, read transcripts, approve tool calls, and delete sessions with the Python SDK.
---

# Sessions

`client.sessions` reads and deletes the conversations Blazing Agents stores for you, lists the tool calls an agent is waiting on, and steers messages into a running turn. You start and continue a session with [`client.chat()`](/sdk/python/client#chat), and send approval decisions with [`client.continue_chat()`](/sdk/python/client#continue-chat).

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
| [`delete()`](#delete) | Permanently delete a session | `None` |
| [`submit_input()`](#submit-input) | Steer a message into the running turn | `SessionInputResponse` |
| [`inputs()`](#inputs) | List steer receipts and the session's activity | `SessionInputsPage` |
| [`stop()`](#stop) | Record a turn stop | `SessionStopResponse` |

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

An agent waits for approval when its `approval_in_chat` policy marks a tool as needing review. See [tool approvals](/agents/tools/tool-approvals) for the policy options. Once you decide a round, the list shows every call in that round, with its decision, until the continuation finishes. Listing does not decide or claim anything. To send the round's decisions and stream the rest of the turn, call [`client.continue_chat()`](/sdk/python/client#continue-chat).

Returns [`ToolApprovals`](#toolapprovals). Raises `validation_failed` or `not_found`.

### `delete()` [#delete]

Permanently deletes a session and its transcript.

```python
client.sessions.delete(agent_id=agent_id, session_id=session_id, delete_artifacts=False)
```

**Signature:** `delete(*, agent_id: str, session_id: str, delete_artifacts: bool) -> None`

`delete_artifacts` is required: `True` also deletes artifacts published in the session, and `False` keeps them. Raises `session_busy` while a turn is running or a recorded approval continuation is still open. Also raises `validation_failed` or `not_found`.

### `submit_input()` [#submit-input]

Steers one user message into the running turn. The agent reads it at its next step and answers in the same turn. See [steer a running turn](/platform/sessions-and-turns#steer-a-running-turn).

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
)
print(result.data.state, result.activity.state)
```

**Signature:** `submit_input(*, agent_id: str, session_id: str, request_id: str, message: Mapping[str, object]) -> SessionInputResponse`

| Parameter | Type | Description |
| --- | --- | --- |
| `request_id` | `str` | Your ID for this steer, 1 to 128 characters, other than `.` or `..` |
| `message` | `Mapping[str, object]` | A user message with text and image parts |

Resending the same `request_id` with the same message returns the same receipt, so retry with the original values after a timeout. A call that cannot steer, because no turn is running or can take one, raises [`steer_not_available`](/api-reference/protocols/errors#steer_not_available) and saves nothing; keep the message in your app's own queue and send it later as an ordinary `chat()` message. Raises `validation_failed`, `not_found`, or [`input_idempotency_conflict`](/api-reference/protocols/errors#input_idempotency_conflict) when the `request_id` or message ID was already used for different content.

### `inputs()` [#inputs]

Lists the session's steer receipts in the order they arrived, with the session's current activity.

```python
page = client.sessions.inputs(agent_id=agent_id, session_id=session_id)
pending = [item for item in page.data if item.state in ("accepted", "delivered")]
print(page.activity.state, len(pending))
```

**Signature:** `inputs(*, agent_id: str, session_id: str, include_completed=..., cursor=..., limit=...) -> SessionInputsPage`

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `include_completed` | `bool` | `False` | Also return `committed` and `not_placed` receipts |
| `cursor` | `str` | none | `next_cursor` from the previous page |
| `limit` | `int` | `100` | 1 to 200 per page |

Without `include_completed`, you get the pending `accepted` and `delivered` receipts plus any `uncertain` ones, so your app can show them to the user. To watch for changes, call it again without a cursor; the cursor only pages through a long list. `activity` reports `idle`, `running`, `stopping`, or `approval`, with the running `turn_id`. Raises `validation_failed`, `invalid_cursor`, or `not_found`.

### `stop()` [#stop]

Records a stop for one turn and returns right away. The turn's own stream keeps running until it settles.

```python
activity = client.sessions.inputs(agent_id=agent_id, session_id=session_id).activity
if activity.turn_id is not None and activity.state == "running":
    stopped = client.sessions.stop(
        agent_id=agent_id, session_id=session_id, turn_id=activity.turn_id
    )
    print(stopped.activity.state)
```

**Signature:** `stop(*, agent_id: str, session_id: str, turn_id: str) -> SessionStopResponse`

Take `turn_id` from the session's activity. Retrying with the same `turn_id` never stops a later turn. Raises `validation_failed`, or `not_found` for a turn that is not this session's.

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
| `approval_id` | `str` | ID to pass in a decision to `continue_chat()` |
| `tool_call_id` | `str` | The model's tool call ID |
| `tool_name` | `str` | Tool name |
| `tool` | `ToolReference \| None` | Built-in tool, or MCP tool with its `connection_id` |
| `input` | `object` | Exact arguments the agent proposed |
| `decision` | `str` | `"pending"`, `"approved"`, or `"denied"` |
| `reason` | `str \| None` | Reason given with the decision |
| `assistant_message_id` | `str \| None` | Message that proposed the call |
| `created_at`, `decided_at` | `datetime \| None` | Timestamps |

### `SessionInput` [#sessioninput]

`SessionInputResponse` has `data: SessionInput` and `activity: SessionActivity`. `SessionInputsPage` has `data: list[SessionInput]`, `next_cursor`, and `activity`. `SessionStopResponse` has `stopped_turn_id` and `activity`.

| `SessionInput` field | Type | Description |
| --- | --- | --- |
| `request_id` | `str` | Your ID for the steer |
| `sequence` | `int` | Place in the arrival order; never changes |
| `message` | `SessionInputMessage` | The message you sent, with `id`, `role` (always `"user"`), `parts`, and `metadata` |
| `state` | `str` | `"accepted"`, `"delivered"`, `"committed"`, `"not_placed"`, or `"uncertain"` |
| `turn_id` | `str` | The turn the steer was bound to |
| `reason` | `str \| None` | `"stopped"`, `"failed"`, `"owner_lost"`, or `"turn_finished"` |
| `created_at`, `updated_at` | `datetime` | Timestamps |

| `SessionActivity` field | Type | Description |
| --- | --- | --- |
| `state` | `str` | `"idle"`, `"running"`, `"stopping"`, or `"approval"` |
| `turn_id` | `str \| None` | The running turn, when there is one |

`committed` proves the message is in the history; `not_placed` is safe to send as an ordinary chat message; `uncertain` means the agent may have read it, so never resend it automatically. See [what each state means](/platform/sessions-and-turns#steer-receipts).

## Next [#next]

- [Sessions and turns](/platform/sessions-and-turns)
- [Tool approvals](/agents/tools/tool-approvals)
- [Client generation methods](/sdk/python/client#chat)
