---
title: Sessions
description: Page Sessions and transcripts, decide Tool approvals, and join durable continuations.
---

# Sessions

`client.sessions` reads and deletes stored Sessions and handles Tool approvals. Start or resume a Session with [`client.chat()`](/sdk/python/client#chat).

## Overview [#overview]

All arguments are keyword-only. `list()` returns one `SessionsPage`; `iter()` lazily requests subsequent pages. The asynchronous resource has the same method names: await request methods, use `async for` with `iter()`, and await `join_tool_approval_continuation()` before consuming its `AsyncByteStream`.

Session and transcript pages use opaque cursors and accept `limit` values from 1–200, defaulting to 50. For transcripts, `cursor` walks backward and `after` polls forward; do not pass both. Every response is a Pydantic model whose snake-case fields retain unknown server fields.

Tool approval authorizes one exact proposed Tool call. A decision creates a durable continuation on the same Session. Closing its byte stream detaches only that reader; it does not cancel admitted work. Rejoin with the same continuation ID to replay persisted bytes and follow the continuation to terminal state.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`list()`](#list) | Return one Session page | `SessionsPage` |
| [`iter()`](#iter) | Lazily iterate Sessions | `Iterator[Session]` |
| [`messages()`](#messages) | Page or poll the transcript | `SessionMessagesPage` |
| [`tool_approvals()`](#tool-approvals) | List proposed Tool calls | `ToolApprovals` |
| [`decide_tool_approval()`](#decide-tool-approval) | Approve or deny one call | `ToolApprovalDecision` |
| [`join_tool_approval_continuation()`](#join-tool-approval-continuation) | Join its durable Turn stream | `ByteStream` |
| [`delete()`](#delete) | Permanently delete a Session | `None` |

## Methods [#methods]

### `list()` [#list]

**Signature:** `client.sessions.list(*, agent_id: str, user_id=OMITTED, cursor=OMITTED, limit=OMITTED, extra_headers=None, timeout=OMITTED) -> SessionsPage`

Lists an Agent's Sessions by most recent update. `user_id=""` selects Tenant-level Sessions; omission includes every Attribution value. An unknown or foreign Agent returns an empty page.

```python
page = client.sessions.list(agent_id=agent_id, user_id="", limit=25)
if page.next_cursor is not None:
    page = client.sessions.list(
        agent_id=agent_id, cursor=page.next_cursor, limit=25
    )
```

Raises `BlazingAgentsAPIError` with `validation_failed` or `invalid_cursor`; transport failures use the documented connection and timeout exception classes. See [List Sessions](/api-reference/rest-api/sessions#list-sessions).

### `iter()` [#iter]

**Signature:** `client.sessions.iter(*, agent_id: str, user_id=OMITTED, cursor=OMITTED, limit=OMITTED, extra_headers=None, timeout=OMITTED) -> Iterator[Session]`

Lazily calls `list()` until `next_cursor` is `None`. `cursor` may resume at a saved page boundary and `limit` applies to every request. Iteration is one-owner and may raise the same errors as `list()` on any page.

```python
for session in client.sessions.iter(agent_id=agent_id, limit=100):
    print(session.id, session.message_count)

async for session in async_client.sessions.iter(agent_id=agent_id):
    print(session.id)
```

### `messages()` [#messages]

**Signature:** `client.sessions.messages(*, agent_id: str, session_id: str, cursor=OMITTED, after=OMITTED, limit=OMITTED, extra_headers=None, timeout=OMITTED) -> SessionMessagesPage`

Returns stored messages. A backward page is selected newest-first while its `data` is chronological. Save `latest_cursor` and pass it as `after` to poll appended messages; use `next_cursor` as the next forward `after` cursor when more data is available.

```python
page = client.sessions.messages(
    agent_id=agent_id, session_id=session_id, limit=50
)
newer = client.sessions.messages(
    agent_id=agent_id,
    session_id=session_id,
    after=page.latest_cursor,
) if page.latest_cursor is not None else None
```

Raises `validation_failed` when `cursor` and `after` are combined, `invalid_cursor` for an unusable cursor, or `not_found` for an unavailable Session. See [List Session messages](/api-reference/rest-api/sessions#list-session-messages).

### `tool_approvals()` [#tool-approvals]

**Signature:** `client.sessions.tool_approvals(*, agent_id: str, session_id: str, extra_headers=None, timeout=OMITTED) -> ToolApprovals`

Returns durable approval records without claiming or deciding them. Each record exposes `approval_id`, `tool_call_id`, `tool_name`, exact proposed `input`, `decision`, and optional `reason`. `continuation` is present after a decision created one.

Raises `validation_failed` or `not_found`. See [List Tool approvals](/api-reference/rest-api/sessions#list-tool-approvals).

### `decide_tool_approval()` [#decide-tool-approval]

**Signature:** `client.sessions.decide_tool_approval(*, agent_id: str, session_id: str, approval_id: str, approved: bool, reason=OMITTED, extra_headers=None, timeout=OMITTED) -> ToolApprovalDecision`

Approves or denies exactly one pending Tool call. `reason`, when supplied, must be non-empty and at most 1,000 characters. Repeating the same decision is idempotent; reversing it raises `tool_approval_decision_conflict`. The result contains `continuation_id` and current state: `waiting`, `queued`, `running`, `succeeded`, or `failed`.

```python
approvals = client.sessions.tool_approvals(
    agent_id=agent_id, session_id=session_id
)
pending = next(item for item in approvals.data if item.decision == "pending")
decision = client.sessions.decide_tool_approval(
    agent_id=agent_id,
    session_id=session_id,
    approval_id=pending.approval_id,
    approved=True,
    reason="Reviewed by the operator.",
)
```

Also raises `validation_failed` and `not_found`. Approval never bypasses Tenant scope or product invariants. See [Decide a Tool approval](/api-reference/rest-api/sessions#decide-tool-approval).

### `join_tool_approval_continuation()` [#join-tool-approval-continuation]

**Signature:** `client.sessions.join_tool_approval_continuation(*, agent_id: str, session_id: str, continuation_id: str, extra_headers=None, timeout=OMITTED) -> ByteStream`

Returns a one-owner, byte-preserving AI SDK SSE stream. Persisted bytes replay before live or terminal output. Consume it in a context manager; exhaustion closes it automatically and `close()` supports early detachment.

```python
with client.sessions.join_tool_approval_continuation(
    agent_id=agent_id,
    session_id=session_id,
    continuation_id=decision.continuation_id,
) as stream:
    for chunk in stream:
        relay(chunk)

stream = await async_client.sessions.join_tool_approval_continuation(
    agent_id=agent_id,
    session_id=session_id,
    continuation_id=decision.continuation_id,
)
async with stream:
    async for chunk in stream:
        await relay_async(chunk)
```

Closing or canceling the reader does not cancel the admitted durable continuation. `session_busy` applies while sibling decisions leave it `waiting`; `not_found` covers unavailable state. Request failures raise API, connection, or timeout errors, and consumption can raise `BlazingAgentsStreamError`. See [Join a Tool-approval continuation](/api-reference/rest-api/sessions#join-tool-approval-continuation).

### `delete()` [#delete]

**Signature:** `client.sessions.delete(*, agent_id: str, session_id: str, delete_artifacts: bool, extra_headers=None, timeout=OMITTED) -> None`

Permanently deletes a Session and transcript. Active continuations in `waiting`, `queued`, or `running` cause `session_busy`; pending approvals without a continuation do not. Raises `validation_failed` or `not_found` otherwise.

```python
client.sessions.delete(agent_id=agent_id, session_id=session_id, delete_artifacts=False)
await async_client.sessions.delete(agent_id=agent_id, session_id=session_id, delete_artifacts=False)
```

See [Delete a Session](/api-reference/rest-api/sessions#delete-session).

## Response models [#response-models]

`SessionsPage.data` contains `Session` models with `id`, nullable `agent_version` Pin, `message_count`, `last_message_preview`, Attribution, metadata, and timestamps. `SessionMessagesPage` contains `data`, `next_cursor`, and `latest_cursor`; each `SessionMessage` retains its `id`, role, parts, metadata, and unknown fields.

`ToolApprovals.data` contains `ToolApproval` models. Its optional `continuation` has `id` and `state`; `ToolApprovalDecision` has `continuation_id` and `state`. Response state strings remain forward-compatible rather than closed Python literals.

## Related [#related]

- [Sessions and Turns](/platform/sessions-and-turns)
- [Tool approvals](/agents/tools/tool-approvals)
- [Pagination and filtering](/api-reference/protocols/pagination-and-filtering)
- [Python generation](/sdk/python/client#chat)
