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

Without a cursor you get the newest messages, in chronological order. To page further back, pass `next_cursor` as `cursor`. To poll for new messages, save `latest_cursor` and pass it as `after`; when a forward page has more, pass its `next_cursor` as the next `after`. Do not pass both `cursor` and `after`. `limit` is 1 to 200 and defaults to 50.

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

## Next [#next]

- [Sessions and turns](/platform/sessions-and-turns)
- [Tool approvals](/agents/tools/tool-approvals)
- [Client generation methods](/sdk/python/client#chat)
