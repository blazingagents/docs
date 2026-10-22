---
title: Sessions
description: List conversations, read transcripts, approve tool calls, and delete sessions with the Rust SDK.
---

# Sessions

`client.sessions()` lists and manages the conversations your agents hold. Turns are sent with [`chat()`](/sdk/rust/client#chat); this page covers everything around them.

Examples receive a `client: blazing_agents::Client`. Every call also takes the `with_timeout`, `without_timeout`, `with_header`, and `with_client_request_id` transport options.

```rust
let page = client
    .sessions()
    .list("ag_0123456789abcdef")
    .await?;
for session in &page.data {
    println!("{} {}", session.id, session.message_count);
}
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`list()`](#list) | List an agent's sessions | [`Page<Session>`](#session) |
| [`list_latest()`](#list-latest) | List sessions across your agents | [`Page<LatestSession>`](#session) |
| [`get()`](#get) | Get a session and its saved configuration | [`SessionDetail`](#session) |
| [`messages()`](#messages) | Read the transcript | `MessagesPage` |
| [`tool_approvals()`](#tool-approvals) | List pending tool approvals | [`ToolApprovalList`](#toolapprovals) |
| [`delete()`](#delete) | Permanently delete a session | `()` |
| [`submit_input()`](#submit-input) | Steer a message into a running turn | [`SubmittedInput`](#sessioninput) |
| [`inputs()`](#inputs) | List steer receipts | [`InputsPage`](#sessioninput) |
| [`stop()`](#stop) | Stop a running turn | [`StoppedTurn`](#sessioninput) |
| [`fork()`](#fork) | Fork a session at a message | [`SessionDetail`](#session) |

## Methods [#methods]

### `list()` [#list]

Lists an agent's sessions, most recently updated first. An unknown agent returns an empty page.

```rust
let page = client
    .sessions()
    .list("ag_0123456789abcdef")
    .user_id("customer_123")
    .limit(50)
    .await?;
```

**Signature:** `list(agent_id: impl Into<AgentId>) -> Call<ListSessions>`

| Setter | Type | Description |
| --- | --- | --- |
| `user_id` | `impl Into<String>` | Only this end user's sessions; `""` selects sessions without an end user |
| `limit` | `u8` | Page size, 1 to 200; defaults to 50 |

Awaiting returns [`Page<Session>`](#session); `.items()` and `.pages()` walk every page lazily. Fails with `Error::Api` whose code is `validation_failed` or [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor).

### `list_latest()` [#list-latest]

Lists the most recently updated sessions across all your agents, including sessions of disabled agents.

```rust
let page = client.sessions().list_latest().by_agent(true).await?;
```

**Signature:** `list_latest() -> Call<ListLatestSessions>`

| Setter | Type | Description |
| --- | --- | --- |
| `user_id` | `impl Into<String>` | Only this end user's sessions; `""` selects sessions without an end user |
| `by_agent` | `bool` | `true` returns at most one session per agent: its latest. Defaults to `false` |
| `limit` | `u8` | Page size, 1 to 200; defaults to 50 |

Awaiting returns [`Page<LatestSession>`](#session): the `Session` fields plus `agent_id`, the agent's current `model`, `thinking_level`, and `status`. Fails with `validation_failed` or `invalid_cursor`.

### `get()` [#get]

Gets one session and the agent configuration saved for its first turn. Later agent edits do not change it.

```rust
let session = client
    .sessions()
    .get("ag_0123456789abcdef", "ss_0123456789abcdef")
    .await?;
```

**Signature:** `get(agent_id: impl Into<AgentId>, session_id: impl Into<SessionId>) -> Call<GetSession>`

Awaiting returns [`SessionDetail`](#session): the `Session` fields plus `agent_config` and `forked_from`. Fails with `validation_failed` or [`not_found`](/api-reference/protocols/errors#not_found).

### `messages()` [#messages]

Lists a session's messages: without a position, the newest page in chronological order.

```rust
let page = client
    .sessions()
    .messages("ag_0123456789abcdef", "ss_0123456789abcdef")
    .await?;
for message in &page.data {
    println!("{} {}", message.role, message.id);
}
```

**Signature:** `messages(agent_id: impl Into<AgentId>, session_id: impl Into<SessionId>) -> Call<ListSessionMessages>`

| Setter | Type | Description |
| --- | --- | --- |
| `after` | `Cursor` | Returns messages added after a saved `latest_cursor`, to poll a live transcript |
| `limit` | `u8` | Page size, 1 to 200; defaults to 50 |

Pass `next_cursor` to `.cursor()` to walk further back. `after` polls forward; it replaces any `.cursor()`, and a later `.cursor()` keeps the forward direction, so `.items()` resumed from a saved forward cursor keeps polling forward. Each `UiMessage` has `id`, `role`, `branchable`, untyped `parts` (`UiPart.kind` plus `fields`), `metadata`, and `extra` for fields this version does not model. Fails with `validation_failed` when you combine `.cursor()` and `after`, `invalid_cursor`, or `not_found`.

### `tool_approvals()` [#tool-approvals]

Lists a session's pending tool approvals. Send the round's decisions with [`continue_chat()`](/sdk/rust/client#continue-chat).

```rust
let approvals = client
    .sessions()
    .tool_approvals("ag_0123456789abcdef", "ss_0123456789abcdef")
    .await?;
for approval in &approvals.data {
    println!("{} {}", approval.approval_id, approval.tool_name);
}
```

**Signature:** `tool_approvals(agent_id: impl Into<AgentId>, session_id: impl Into<SessionId>) -> Call<ListToolApprovals>`

Awaiting returns [`ToolApprovalList`](#toolapprovals) with `data` (`Vec<ToolApproval>`, each with `approval_id`, `tool_name`, `tool_call_id`, `input`, `decision` (`sessions::ToolApprovalStatus`, the decision so far), and optional `tool`, `assistant_message_id`, `created_at`, `decided_at`, `reason`) and `continuation`, the session's unfinished continuation if any. Fails with `validation_failed` or `not_found`.

### `delete()` [#delete]

Permanently deletes a session and its transcript and, with `delete_artifacts`, its artifacts.

```rust
client
    .sessions()
    .delete("ag_0123456789abcdef", "ss_0123456789abcdef", false)
    .await?;
```

**Signature:** `delete(agent_id: impl Into<AgentId>, session_id: impl Into<SessionId>, delete_artifacts: bool) -> Call<DeleteSession>`

Fails with [`session_busy`](/api-reference/protocols/errors#session_busy) while a turn is running or an approval continuation is still open, `validation_failed`, or `not_found`.

### `submit_input()` [#submit-input]

Steers a message into the running turn. Reuse `request_id` when retrying: resending it with the same message returns the same receipt.

```rust
use blazing_agents::messages::UserMessage;

let submitted = client
    .sessions()
    .submit_input(
        "ag_0123456789abcdef",
        "ss_0123456789abcdef",
        "steer-1",
        UserMessage::text("Also check the error rate."),
    )
    .await?;
```

**Signature:** `submit_input(agent_id: impl Into<AgentId>, session_id: impl Into<SessionId>, request_id: impl Into<String>, message: UserMessage) -> Call<SubmitSessionInput>`

Fails with [`steer_not_available`](/api-reference/protocols/errors#steer_not_available) when no turn is running or can take one; send the message later as an ordinary [`chat()`](/sdk/rust/client#chat) message. Awaiting returns [`SubmittedInput`](#sessioninput) with the `input` receipt and the session's `activity`. Also fails with `validation_failed`, `not_found`, or [`input_idempotency_conflict`](/api-reference/protocols/errors#input_idempotency_conflict) when the `request_id` or message ID was already used for different content.

### `inputs()` [#inputs]

Lists a session's steer receipts in arrival order, with the session's current `activity`.

```rust
let page = client
    .sessions()
    .inputs("ag_0123456789abcdef", "ss_0123456789abcdef")
    .include_completed(true)
    .await?;
```

**Signature:** `inputs(agent_id: impl Into<AgentId>, session_id: impl Into<SessionId>) -> Call<ListSessionInputs>`

| Setter | Type | Description |
| --- | --- | --- |
| `include_completed` | `bool` | Also returns `InputState::Committed` and `InputState::NotPlaced` receipts. Defaults to `false`, which returns only `InputState::Accepted` receipts |
| `limit` | `u8` | Page size, 1 to 200; defaults to 100 |

Each `SessionInput` has `request_id`, `sequence`, `message`, `state`, `turn_id`, timestamps, and `reason`. [What each state means](#sessioninput) says when to wait and when to resend. Fails with `validation_failed` or `not_found`.

### `stop()` [#stop]

Records a stop for a running turn and returns at once; the turn's own stream keeps running until it ends. Retrying with the same `turn_id` never stops a later turn.

```rust
let stopped = client
    .sessions()
    .stop(
        "ag_0123456789abcdef",
        "ss_0123456789abcdef",
        "turn_0123456789abcdef",
    )
    .await?;
```

**Signature:** `stop(agent_id: impl Into<AgentId>, session_id: impl Into<SessionId>, turn_id: impl Into<TurnId>) -> Call<StopSessionTurn>`

The `turn_id` comes from `ChatStream::turn_id()`. Awaiting returns [`StoppedTurn`](#sessioninput) with `stopped_turn_id` and the session's `activity`. Fails with `validation_failed` or `not_found`.

### `fork()` [#fork]

Forks a session at `message_id`, which must name a saved assistant reply: one `branchable` `UiMessage` in the transcript. The idle child copies the conversation up to and including that message and inherits the source's configuration, user label, and metadata.

```rust
let child = client
    .sessions()
    .fork(
        "ag_0123456789abcdef",
        "ss_0123456789abcdef",
        "message-1",
        "fork-attempt-1",
    )
    .await?;
```

**Signature:** `fork(agent_id: impl Into<AgentId>, session_id: impl Into<SessionId>, message_id: impl Into<String>, idempotency_key: impl Into<String>) -> Call<ForkSession>`

Reuse `idempotency_key` (1 to 200 characters) when retrying: a replay returns the same child. Awaiting returns [`SessionDetail`](#session). Errors: [`idempotency_conflict`](/api-reference/protocols/errors#idempotency_conflict) (409) for the same key with another message, [`session_fork_unavailable`](/api-reference/protocols/errors#session_fork_unavailable) (409) for a removed or ineligible reply, [`session_fork_deleted`](/api-reference/protocols/errors#session_fork_deleted) (410) for a replay whose child was deleted, and [`not_found`](/api-reference/protocols/errors#not_found) (404) for a missing or inaccessible source or agent. Also fails with `validation_failed`.

## Response models [#response-models]

### `Session` [#session]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `SessionId` | Session ID (`ss_...`) |
| `message_count` | `u64` | Number of stored messages |
| `last_message_preview` | `Option<String>` | Short preview of the last message |
| `user_id` | `String` | End user, or `""` for tenant level |
| `metadata` | `Metadata` | Your own data |
| `created_at`, `updated_at` | `Timestamp` | Timestamps |

A `UiMessage` has `id`, `role` (`MessageRole::System`, `User`, or `Assistant`), `branchable`, untyped `parts`, `metadata`, and `extra` for fields this version does not model. Each `UiPart` has a `kind` such as `"text"` or `"tool-bash"` plus `fields` for the rest.

`SessionDetail` adds `agent_config` (`AgentConfig`, the saved configuration) and `forked_from` (the source `session_id` and `message_id`, `None` for an ordinary session). `LatestSession` adds `agent_id`, `model`, `thinking_level`, and `status`.

### `ToolApprovalList` [#toolapprovals]

`data` is a `Vec<ToolApproval>`. `continuation` holds the session's unfinished continuation (`id` and `state`, a `ContinuationState` of `Waiting`, `Running`, `Succeeded`, or `Failed`), or `None` when there is none.

| `ToolApproval` field | Type | Description |
| --- | --- | --- |
| `approval_id` | `ApprovalId` | ID to pass in a decision to `continue_chat()` |
| `tool_call_id` | `String` | The model's tool call ID |
| `tool_name` | `String` | Tool name |
| `tool` | `Option<ToolReference>` | Built-in tool, or MCP tool with its `connection_id` |
| `input` | `serde_json::Map<String, serde_json::Value>` | Exact arguments the agent proposed |
| `decision` | `sessions::ToolApprovalStatus` | `Pending`, `Approved`, or `Denied` |
| `reason` | `Option<String>` | Reason given with the decision |
| `assistant_message_id` | `Option<String>` | Message that proposed the call |
| `created_at`, `decided_at` | `Option<Timestamp>` | Timestamps |

### `SessionInput` [#sessioninput]

`SubmittedInput` has `input` (a `SessionInput`) and `activity` (a `SessionActivity`). `InputsPage` has `data` (a `Vec<SessionInput>`), `next_cursor`, and `activity`. `StoppedTurn` has `stopped_turn_id` and `activity`.

| `SessionInput` field | Type | Description |
| --- | --- | --- |
| `request_id` | `String` | Your ID for the steer |
| `sequence` | `u64` | Place in the arrival order; never changes |
| `message` | `UserMessage` | The message you sent |
| `state` | `InputState` | `Accepted`, `Committed`, or `NotPlaced` |
| `turn_id` | `TurnId` | The turn the steer was bound to |
| `reason` | `Option<InputReason>` | `Stopped`, `Failed`, `OwnerLost`, or `TurnFinished` |
| `created_at`, `updated_at` | `Timestamp` | Timestamps |

| `SessionActivity` field | Type | Description |
| --- | --- | --- |
| `state` | `ActivityState` | `Idle`, `Running`, `Stopping`, or `Approval` |
| `turn_id` | `Option<TurnId>` | The running turn, when there is one |

- `InputState::Accepted`: saved for the running turn, which may still read and save it. Keep waiting.
- `InputState::Committed`: saved in the history. Nothing more to do.
- `InputState::NotPlaced`: not saved, because the turn ended or Blazing Agents lost it first. `reason` says which. Send it again as an ordinary [`chat()`](/sdk/rust/client#chat) message. If the turn read it and then failed, resending may repeat its tool calls, as any resend can.

## Next [#next]

- [Sessions and turns](/platform/sessions-and-turns)
- [Client](/sdk/rust/client)
- [Agents](/sdk/rust/agents)
