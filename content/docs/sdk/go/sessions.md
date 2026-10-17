---
title: Sessions
description: List conversations, read transcripts, approve tool calls, and delete sessions with the Go SDK.
---

# Sessions

`client.Sessions` lists and manages the conversations your agents hold. Turns are sent with [`Chat.Send`](/sdk/go/client#chat); this page covers everything around them.

Examples are function bodies that receive `ctx context.Context`, `client *ba.Client`, `agentID ba.AgentID`, and `sessionID ba.SessionID`, and return an `error`. Every method also takes the per-call options `ba.WithRequestTimeout`, `ba.WithRequestHeader`, `ba.WithClientRequestID`, and `ba.CaptureResponse`.

```go
page, err := client.Sessions.List(ctx, agentID, ba.ListSessionsParams{})
if err != nil {
	return err
}
for _, session := range page.Data {
	fmt.Println(session.ID, session.MessageCount)
}
return nil
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`List`](#list), `All` | List an agent's sessions | [`*Page[SessionSummary]`](#session) |
| [`ListLatest`](#list-latest), `AllLatest` | List sessions across your agents | [`*Page[LatestSession]`](#session) |
| [`Get`](#get) | Get a session and its saved configuration | [`*Session`](#session) |
| [`ListMessages`](#messages), `AllMessages` | Read the transcript | `*SessionMessageList` |
| [`ListToolApprovals`](#tool-approvals) | List pending tool approvals | [`*ToolApprovalList`](#toolapprovals) |
| [`Delete`](#delete) | Permanently delete a session | `error` |
| [`SubmitInput`](#submit-input) | Steer a message into a running turn | [`*SubmitInputResult`](#sessioninput) |
| [`ListInputs`](#inputs), `AllInputs` | List steer receipts | [`*SessionInputList`](#sessioninput) |
| [`Stop`](#stop) | Stop a running turn | [`*StopResult`](#sessioninput) |
| [`Fork`](#fork) | Fork a session at a message | [`*Session`](#session) |

## Methods [#methods]

### `List` [#list]

Lists an agent's sessions, most recently updated first. An unknown agent returns an empty page.

```go
page, err := client.Sessions.List(ctx, agentID, ba.ListSessionsParams{
	UserID: new("customer_123"),
	Limit:  new(50),
})
if err != nil {
	return err
}
fmt.Println(len(page.Data))
return nil
```

**Signature:** `func (s *SessionsService) List(ctx context.Context, agentID AgentID, params ListSessionsParams, opts ...RequestOption) (*Page[SessionSummary], error)`

| Field | Type | Description |
| --- | --- | --- |
| `UserID` | `*string` | Only this end user's sessions; `new("")` selects sessions without an end user |
| `Cursor` | `*string` | The `NextCursor` of the previous page |
| `Limit` | `*int` | Page size, 1 to 200; defaults to 50 |

Returns [`*ba.Page[SessionSummary]`](#session); `All` walks every page lazily. Fails with `*ba.APIError` whose `Code` is `validation_failed` or [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor).

### `ListLatest` [#list-latest]

Lists the most recently updated sessions across all your agents, including sessions of disabled agents.

```go
page, err := client.Sessions.ListLatest(ctx, ba.ListLatestSessionsParams{ByAgent: new(true)})
if err != nil {
	return err
}
for _, session := range page.Data {
	fmt.Println(session.AgentID, session.ID)
}
return nil
```

**Signature:** `func (s *SessionsService) ListLatest(ctx context.Context, params ListLatestSessionsParams, opts ...RequestOption) (*Page[LatestSession], error)`

| Field | Type | Description |
| --- | --- | --- |
| `UserID` | `*string` | Only this end user's sessions; `new("")` selects sessions without an end user |
| `ByAgent` | `*bool` | `true` returns at most one session per agent: its latest. Defaults to `false` |
| `Cursor` | `*string` | The `NextCursor` of the previous page |
| `Limit` | `*int` | Page size, 1 to 200; defaults to 50 |

Returns [`*ba.Page[LatestSession]`](#session): the `SessionSummary` fields plus `AgentID`, the agent's current `Model`, `ThinkingLevel`, and `Status`. `AllLatest` walks every page lazily. Fails with `validation_failed` or `invalid_cursor`.

### `Get` [#get]

Gets one session and the agent configuration saved for its first turn. Later agent edits do not change it.

```go
session, err := client.Sessions.Get(ctx, agentID, sessionID)
if err != nil {
	return err
}
fmt.Println(session.AgentConfig.Instructions)
return nil
```

**Signature:** `func (s *SessionsService) Get(ctx context.Context, agentID AgentID, sessionID SessionID, opts ...RequestOption) (*Session, error)`

Returns [`*ba.Session`](#session): the `SessionSummary` fields plus `AgentConfig` and `ForkedFrom`. Fails with `validation_failed` or [`not_found`](/api-reference/protocols/errors#not_found).

### `ListMessages` [#messages]

Lists a session's messages: without a position, the newest page in chronological order.

```go
page, err := client.Sessions.ListMessages(ctx, agentID, sessionID, ba.ListSessionMessagesParams{})
if err != nil {
	return err
}
for _, message := range page.Data {
	fmt.Println(message.Role, message.ID)
}
return nil
```

**Signature:** `func (s *SessionsService) ListMessages(ctx context.Context, agentID AgentID, sessionID SessionID, params ListSessionMessagesParams, opts ...RequestOption) (*SessionMessageList, error)`

| Field | Type | Description |
| --- | --- | --- |
| `Cursor` | `*string` | A `NextCursor`, to walk further back |
| `After` | `*string` | Returns messages added after a saved `LatestCursor`, to poll a live transcript |
| `Limit` | `*int` | Page size, 1 to 200; defaults to 50 |

Returns a `*ba.SessionMessageList` with `Data`, `NextCursor`, and `LatestCursor`. Set `Cursor` or `After`, not both; setting both fails client-side with `*ba.ArgumentError`. `AllMessages` keeps the direction you start with: started with `After`, it polls forward page by page. Each `ba.Message` has `ID`, `Role`, `Branchable`, `Parts` as raw JSON (`[]json.RawMessage`), and `Metadata`. Fails with `validation_failed`, `invalid_cursor`, or `not_found`.

### `ListToolApprovals` [#tool-approvals]

Lists a session's pending tool approvals. Send the round's decisions with [`Chat.Continue`](/sdk/go/client#continue-chat).

```go
approvals, err := client.Sessions.ListToolApprovals(ctx, agentID, sessionID)
if err != nil {
	return err
}
for _, approval := range approvals.Data {
	fmt.Println(approval.ApprovalID, approval.ToolName)
}
return nil
```

**Signature:** `func (s *SessionsService) ListToolApprovals(ctx context.Context, agentID AgentID, sessionID SessionID, opts ...RequestOption) (*ToolApprovalList, error)`

Returns [`*ba.ToolApprovalList`](#toolapprovals) with `Data` (`[]ba.ToolApproval`) and `Continuation`, the session's unfinished continuation if any. Fails with `validation_failed` or `not_found`.

### `Delete` [#delete]

Permanently deletes a session and its transcript and, with `DeleteArtifacts`, its artifacts.

```go
return client.Sessions.Delete(ctx, agentID, sessionID, ba.DeleteSessionParams{DeleteArtifacts: false})
```

**Signature:** `func (s *SessionsService) Delete(ctx context.Context, agentID AgentID, sessionID SessionID, params DeleteSessionParams, opts ...RequestOption) error`

`DeleteArtifacts` is always sent. Fails with [`session_busy`](/api-reference/protocols/errors#session_busy) while a turn is running or an approval continuation is still open, `validation_failed`, or `not_found`.

### `SubmitInput` [#submit-input]

Steers a message into the running turn. Reuse `RequestID` when retrying: resending it with the same message returns the same receipt.

```go
submitted, err := client.Sessions.SubmitInput(ctx, agentID, sessionID, ba.SubmitSessionInputParams{
	RequestID: "steer-1",
	Message:   ba.TextMessage("Also check the error rate."),
})
if err != nil {
	return err
}
fmt.Println(submitted.Input.State, submitted.Activity.State)
return nil
```

**Signature:** `func (s *SessionsService) SubmitInput(ctx context.Context, agentID AgentID, sessionID SessionID, params SubmitSessionInputParams, opts ...RequestOption) (*SubmitInputResult, error)`

Fails with [`steer_not_available`](/api-reference/protocols/errors#steer_not_available) when no turn is running or can take one; send the message later as an ordinary [`Chat.Send`](/sdk/go/client#chat) message. Returns [`*ba.SubmitInputResult`](#sessioninput) with the `Input` receipt and the session's `Activity`. Also fails with `validation_failed`, `not_found`, or [`input_idempotency_conflict`](/api-reference/protocols/errors#input_idempotency_conflict) when the `RequestID` or message ID was already used for different content.

### `ListInputs` [#inputs]

Lists a session's steer receipts in arrival order, with the session's current `Activity`.

```go
page, err := client.Sessions.ListInputs(ctx, agentID, sessionID, ba.ListSessionInputsParams{
	IncludeCompleted: new(true),
})
if err != nil {
	return err
}
fmt.Println(len(page.Data), page.Activity.State)
return nil
```

**Signature:** `func (s *SessionsService) ListInputs(ctx context.Context, agentID AgentID, sessionID SessionID, params ListSessionInputsParams, opts ...RequestOption) (*SessionInputList, error)`

| Field | Type | Description |
| --- | --- | --- |
| `IncludeCompleted` | `*bool` | Also returns committed and not-placed receipts. Defaults to `false` |
| `Cursor` | `*string` | The `NextCursor` of the previous page |
| `Limit` | `*int` | Page size, 1 to 200; defaults to 100 |

Each `ba.SessionInput` has `RequestID`, `Sequence`, `Message`, `State`, `TurnID`, timestamps, and `Reason`. A `not_placed` input never reached the agent and is safe to resend as a `Chat.Send` message; an `uncertain` one may have been read, so never resend it automatically. `AllInputs` walks every page lazily. Fails with `validation_failed` or `not_found`.

### `Stop` [#stop]

Records a stop for a running turn and returns at once; the turn's own stream keeps running until it ends. Retrying with the same `TurnID` never stops a later turn.

```go
stopped, err := client.Sessions.Stop(ctx, agentID, sessionID, ba.StopSessionTurnParams{
	TurnID: "turn_0123456789abcdef",
})
if err != nil {
	return err
}
fmt.Println(stopped.StoppedTurnID, stopped.Activity.State)
return nil
```

**Signature:** `func (s *SessionsService) Stop(ctx context.Context, agentID AgentID, sessionID SessionID, params StopSessionTurnParams, opts ...RequestOption) (*StopResult, error)`

The `TurnID` comes from `(*ChatStream).TurnID()`. Returns [`*ba.StopResult`](#sessioninput) with `StoppedTurnID` and the session's `Activity`. Fails with `validation_failed` or `not_found`.

### `Fork` [#fork]

Forks a session at `MessageID`, which must name a saved assistant reply: one `Branchable` `ba.Message` in the transcript. The idle child copies the conversation up to and including that message and inherits the source's configuration, user label, and metadata.

```go
child, err := client.Sessions.Fork(ctx, agentID, sessionID, ba.ForkSessionParams{
	MessageID:      "message-1",
	IdempotencyKey: "fork-attempt-1",
})
if err != nil {
	return err
}
fmt.Println(child.ID)
return nil
```

**Signature:** `func (s *SessionsService) Fork(ctx context.Context, agentID AgentID, sessionID SessionID, params ForkSessionParams, opts ...RequestOption) (*Session, error)`

Reuse `IdempotencyKey` (1 to 200 characters) when retrying: a replay returns the same child, with status 200 instead of 201 in `ba.CaptureResponse`. An empty key fails client-side with `*ba.ArgumentError`. Returns [`*ba.Session`](#session). Errors: [`idempotency_conflict`](/api-reference/protocols/errors#idempotency_conflict) (409) for the same key with another message, [`session_fork_unavailable`](/api-reference/protocols/errors#session_fork_unavailable) (409) for a removed or ineligible reply, [`session_fork_deleted`](/api-reference/protocols/errors#session_fork_deleted) (410) for a replay whose child was deleted, and [`not_found`](/api-reference/protocols/errors#not_found) (404) for a missing or inaccessible source or agent. Also fails with `validation_failed`.

## Response models [#response-models]

### `SessionSummary` and `Session` [#session]

| Field | Type | Description |
| --- | --- | --- |
| `ID` | `ba.SessionID` | Session ID (`ss_...`) |
| `MessageCount` | `int64` | Number of stored messages |
| `LastMessagePreview` | `*string` | Short preview of the last message |
| `UserID` | `string` | End user, or `""` for tenant level |
| `Metadata` | `ba.Metadata` | Your own data |
| `CreatedAt`, `UpdatedAt` | `time.Time` | Timestamps |

A `ba.Message` has `ID`, `Role` (`ba.MessageRoleSystem`, `ba.MessageRoleUser`, or `ba.MessageRoleAssistant`), `Branchable`, `Parts`, and `Metadata`. Each part is the raw JSON object with a `type` such as `"text"` or `"tool-bash"`, so decode the parts you need into your own types.

`ba.Session` adds `AgentConfig` (a `ba.AgentConfig`, the saved configuration) and `ForkedFrom` (the source `SessionID` and `MessageID`, nil for an ordinary session). `ba.LatestSession` adds `AgentID`, `Model`, `ThinkingLevel`, and `Status`.

### `ToolApprovalList` [#toolapprovals]

`Data` is a `[]ba.ToolApproval`. `Continuation` holds the session's unfinished continuation (`ID` and `State`: `waiting`, `running`, `succeeded`, or `failed`), or nil when there is none.

| `ToolApproval` field | Type | Description |
| --- | --- | --- |
| `ApprovalID` | `ba.ApprovalID` | ID to pass in a decision to `Chat.Continue` |
| `ToolCallID` | `string` | The model's tool call ID |
| `ToolName` | `string` | Tool name |
| `Tool` | `ba.ToolReference` | Built-in, MCP, or function tool, or nil |
| `Input` | `ba.Metadata` | Exact arguments the agent proposed |
| `Decision` | string enum | `pending`, `approved`, or `denied` |
| `Reason` | `*string` | Reason given with the decision |
| `AssistantMessageID` | `*string` | Message that proposed the call |
| `CreatedAt`, `DecidedAt` | `*time.Time` | Timestamps |

### `SessionInput` [#sessioninput]

`ba.SubmitInputResult` has `Input` (a `ba.SessionInput`) and `Activity` (a `ba.SessionActivity`). `ba.SessionInputList` has `Data` (a `[]ba.SessionInput`), `NextCursor`, and `Activity`. `ba.StopResult` has `StoppedTurnID` and `Activity`.

| `SessionInput` field | Type | Description |
| --- | --- | --- |
| `RequestID` | `string` | Your ID for the steer |
| `Sequence` | `int64` | Place in the arrival order; never changes |
| `Message` | `ba.UserMessage` | The message you sent |
| `State` | string enum | `accepted`, `delivered`, `committed`, `not_placed`, or `uncertain` |
| `TurnID` | `ba.TurnID` | The turn the steer was bound to |
| `Reason` | string enum, or nil | `stopped`, `failed`, `owner_lost`, or `turn_finished` |
| `CreatedAt`, `UpdatedAt` | `time.Time` | Timestamps |

| `SessionActivity` field | Type | Description |
| --- | --- | --- |
| `State` | string enum | `idle`, `running`, `stopping`, or `approval` |
| `TurnID` | `*ba.TurnID` | The running turn, when there is one |

A `committed` input is saved in the history; a `not_placed` input is safe to send as an ordinary `Chat.Send` message; an `uncertain` input means the agent may have read it, so never resend it automatically.

## Next [#next]

- [Sessions and turns](/platform/sessions-and-turns)
- [Client](/sdk/go/client)
- [Agents](/sdk/go/agents)
