---
title: Client
description: Configure the Go client, handle errors, and generate chat, text, and structured output.
---

# Client

`*ba.Client` is the entry point. You configure the key, timeouts, and headers once, then call resources and generation methods from it. Building a client makes no network request, but `ba.NewClient` fails with `ba.ErrMissingAPIKey` when it finds no API key.

## Construct a client [#construct-a-client]

`ba.NewClient` takes functional options. With none, it reads `BLAZING_AGENTS_API_KEY` and uses every default.

```go
client, err := ba.NewClient(
	ba.WithAPIKey(os.Getenv("BLAZING_AGENTS_API_KEY")),
	ba.WithBaseURL("https://api.blazingagents.com"),
	ba.WithTimeout(60*time.Second),
	ba.WithConnectTimeout(5*time.Second),
	ba.WithHeader("X-Team", "backend"),
	ba.WithObserver(func(observation ba.ResponseObservation) {
		fmt.Println(observation.Status, observation.Path)
	}),
)
if err != nil {
	return err
}
_ = client
return nil
```

| Option | Description |
| --- | --- |
| `WithAPIKey(key string)` | The tenant API key. Wins over `BLAZING_AGENTS_API_KEY` |
| `WithBaseURL(url string)` | The API base URL. Defaults to `https://api.blazingagents.com` |
| `WithTimeout(d time.Duration)` | The timeout for each call. Defaults to 60 seconds; `0` disables it |
| `WithConnectTimeout(d time.Duration)` | The TCP connect timeout of the default transport. Defaults to 10 seconds |
| `WithStreamIdleTimeout(d time.Duration)` | The longest gap allowed between reads of a stream or download. Off by default |
| `WithTransport(rt http.RoundTripper)` | Your own transport, for proxies, TLS settings, or tracing. It cannot be combined with `WithConnectTimeout` |
| `WithHeader(name, value string)` | A header sent on every request |
| `WithUserAgent(ua string)` | Text appended to the SDK's `User-Agent` |
| `WithObserver(fn func(ba.ResponseObservation))` | A function that sees every response |
| `WithLogger(l *slog.Logger)` | Receives the SDK's debug records. Discarded by default |

`ba.NewClient` returns an error that wraps one of these sentinels, and the message never contains the key:

| Sentinel | Happens when |
| --- | --- |
| `ba.ErrMissingAPIKey` | No key came from `WithAPIKey` or the environment |
| `ba.ErrInvalidAPIKey` | The key is not `ba_read_` or `ba_full_` followed by 40 letters and digits. The message names where the key came from |
| `ba.ErrInvalidBaseURL` | The base URL is not an absolute `http` or `https` URL, or it has a query or fragment |
| `ba.ErrInvalidHeader` | A `WithHeader` name or value is invalid, the name is one the SDK owns, or a `WithUserAgent` value is invalid |
| `ba.ErrConflictingOptions` | Both `WithConnectTimeout` and `WithTransport` were passed. Set dial timeouts on your own transport instead |

`WithHeader` headers go on every request, and `ba.WithRequestHeader` on a single call replaces a `WithHeader` header of the same name for that call.

The SDK owns eight headers: `Authorization`, `X-BA-User-Id`, `X-Request-Id`, `X-Client-Request-Id`, `Content-Type`, `Content-Length`, `Idempotency-Key`, and `Host`. It sets `Authorization` from your tenant API key and `Content-Type` from the request body. Passing an owned header to `WithHeader` fails `ba.NewClient`, and passing one to `ba.WithRequestHeader` fails that call before anything is sent. Names are compared without regard to case. To correlate requests with your own IDs, use `WithClientRequestID` instead.

A `*ba.Client` is safe for concurrent use. Copies made by `ForUser` and `WithClientRequestID` share its connection pool. There is no `Close`; drop the client when you are done.

The timeout covers the request and reading the response body. For a streaming response, and for `Completion` and `ba.Object`, which stream internally, it covers only the wait for headers; reading the stream is bounded by your context, `Close`, and the optional idle timeout. `ba.WithRequestTimeout` changes the timeout for one call, and `0` turns it off. Backend function claims and result submissions retry transient failures until the call's deadline. Other requests are not retried automatically.

### `WithClientRequestID` [#with-client-request-id]

**Signature:** `func (c *Client) WithClientRequestID(id string) (*Client, error)`

Returns a copy of the client that sends `X-Client-Request-Id` on every call, and `""` clears it. The original is unchanged, and `(*UserClient).WithClientRequestID` keeps the user scope. The ID must be printable ASCII without a leading or trailing space, or the call returns an error that wraps `ba.ErrInvalidHeader`. The per-call option `ba.WithClientRequestID(id)` sets it for one call and overrides the client's value.

```go
correlated, err := client.WithClientRequestID("checkout-attempt-42")
if err != nil {
	return err
}
agent, err := correlated.Agents.Get(ctx, agentID)
if err != nil {
	return err
}
fmt.Println(agent.Name)
return nil
```

### `ForUser` [#for-user]

**Signature:** `func (c *Client) ForUser(userID string) (*UserClient, error)`

Use `ForUser` in your backend after you authenticate an end user. It returns a `*ba.UserClient` that sends `X-BA-User-Id` on every request, and the API checks that user's ownership for reads and writes. It makes no network request.

```go
userClient, err := client.ForUser("verified_user_42")
if err != nil {
	return err
}
page, err := userClient.Agents.List(ctx, ba.ListAgentsParams{Limit: new(50)})
if err != nil {
	return err
}
fmt.Println(len(page.Data))
return nil
```

Pass the ID from the session your backend verified. Do not take it from a request body or query parameter. The ID must be 1 to 256 printable ASCII characters without a leading or trailing space, or `ForUser` returns an error that wraps `ba.ErrInvalidUserID`. You cannot set `X-BA-User-Id` yourself through headers.

A `*ba.UserClient` has `Agents`, `Artifacts`, `Memories`, `Prompts`, `Sessions`, `Skills`, `Tasks`, `Workspaces`, the [`Chat` and `Generation` services](#generation-methods), and `Usage` with `Get` and [`Sessions`](/sdk/go/usage#sessions). Tenant administration is missing at compile time: a `*ba.UserClient` has no `Providers`, `MCPConnections`, `ChatConnections`, `ChatDeliveries`, `Tenant`, `SpendingLimits`, or merchant fields, and its `Usage` has no `Overview` or `ForAgent`. Use the tenant client for those operations.

A request's `UserID` field labels the resource or turn. It does not grant access. On a scoped request, the API fills in a missing `userId` with the scoped ID and rejects a different one. Without `ForUser`, your API key keeps tenant-wide authority, even when a request contains a `UserID`.

## Response observation and request IDs [#response-observation-and-request-ids]

Pass `ba.WithObserver` to see every response the client receives, including API errors, malformed bodies, and stream handshakes. The function gets one `ba.ResponseObservation` per response:

| Field | Meaning |
| --- | --- |
| `OperationID` | The spec's `operationId` |
| `Method` | HTTP method |
| `Path` | Path without query parameters |
| `Status` | HTTP status |
| `Header` | Response headers, with submitted secrets redacted |
| `Duration` | Time from sending the request to receiving the headers |
| `RequestID` | Server request ID from `X-Request-Id`, or `""` |
| `ClientRequestID` | Your correlation ID, or `""` |

A panic inside the observer is recovered and discarded. A connection failure with no response produces no observation.

`ba.CaptureResponse(&meta)` on any call fills a `ba.ResponseMeta` with `OperationID`, `Status`, `Header`, `RequestID`, and `ClientRequestID` once the headers arrive, on success and on `*ba.APIError`. Streams and downloads expose the same `Meta()` before you read them: `(*ChatStream).Meta()`, `(*CompletionStream).Meta()`, `(*ObjectStream[T]).Meta()`, and `(*Download).Meta()`. Keep the request ID when you contact support. Each retry you make is a new attempt with a new request ID.

```go
var meta ba.ResponseMeta
agent, err := client.Agents.Get(ctx, agentID, ba.CaptureResponse(&meta))
if err != nil {
	return err
}
fmt.Println(meta.Status, meta.RequestID, agent.Name)
return nil
```

## Errors [#errors]

Every failed call returns an `error`. Use `errors.As` to read the type that describes it:

| Type | Happens when |
| --- | --- |
| `*ba.APIError` | The server returns an error status. Carries `Status`, `Code`, `Message`, `Details`, `Param`, `RetryAfter`, `Meta`, `Body`, and `BodyTruncated` |
| `*ba.ConnectionError` | The network fails before a complete response. Your own context cancellation or deadline also arrives as this type and is in its chain, so `errors.Is(err, context.Canceled)` works |
| `*ba.TimeoutError` | The SDK's timeout elapses. `errors.Is(err, context.DeadlineExceeded)` is true |
| `*ba.StreamError` | Reading, headers, a function-call event, or a backend function's claim or result fails after stream headers arrive. `Kind` and `Meta` describe it |
| `*ba.ObjectError` | Object generation produced truncated JSON, invalid JSON, or JSON that does not match the requested type. `Kind`, `Text`, and `Meta` describe it |
| `*ba.DecodeError` | A 2xx body does not match the response model |
| `*ba.CredentialEchoError` | A response echoed credential material back. The body is discarded |
| `*ba.ArgumentError` | A client-side argument the types could not rule out, such as a path parameter of `..`. Nothing is sent |

```go
agent, err := client.Agents.Get(ctx, agentID)
var apiErr *ba.APIError
switch {
case errors.As(err, &apiErr) && apiErr.Code == ba.ErrorCodeNotFound:
	fmt.Println("no such agent")
case errors.As(err, &apiErr):
	fmt.Println(apiErr.Code, apiErr.Message)
case err != nil:
	return err
default:
	fmt.Println(agent.Name)
}
return nil
```

A `*ba.APIError` prints as `blazingagents: getAgent: 404 not_found: Agent not found (request req_123)`, so logs show the operation, status, code, and request ID without extra work. Submitted credentials are redacted from its `Message`, `Details`, `Body`, and `Meta.Header`.

`ba.ErrorCode` is a string type with a constant for every documented code, such as `ba.ErrorCodeNotFound`. A code this version does not know compares as its own text. Branch on the code, not the message. Decide whether to retry from the operation, the status, and `RetryAfter`.

`StreamError.Kind` tells apart `ba.StreamRead`, `ba.StreamIncomplete`, `ba.StreamMissingSessionID`, `ba.StreamMalformedSessionID`, `ba.StreamMissingTurnID`, `ba.StreamMalformedTurnID`, `ba.StreamMalformedFunctionCall`, and `ba.StreamFunctionCall`. A read failure wraps its cause, so `errors.Is(err, ba.ErrStreamIdle)` and `errors.Is(err, ba.ErrStreamClosed)` work. `ObjectError.Kind` tells apart `ba.ObjectTruncated`, `ba.ObjectInvalidJSON`, and `ba.ObjectMismatch`.

## Logging and telemetry [#logging-and-telemetry]

The SDK sends no telemetry. Pass `ba.WithLogger` to receive its `log/slog` records: a debug record for every response with the operation, method, path, status, duration, request ID, and client request ID, and the backend function runner's records, such as a refused function call or a handler's error text. The SDK does not log credentials, headers, request bodies, schemas, or stream content.

Chats with backend functions run handlers on their own goroutines while you consume the stream.

## Generation methods [#generation-methods]

`client.Chat` has `Send`, `Regenerate`, and `Continue` for conversations that Blazing Agents stores as sessions. `client.Generation` has buffered and streaming forms of stateless text, and the generic functions `ba.Object` and `ba.StreamObject` produce structured output. Every call runs one metered turn.

Give `Send` one input: `ba.Messages(...)` with one or more `ba.UserMessage` values, or a `ba.SavedPrompt` for a saved prompt. `Regenerate` takes a `ba.UserMessage` or `ba.SavedPrompt`. The stateless methods take `ba.Text("...")` or a `ba.SavedPrompt`. `ba.SavedPrompt{ID: promptID, Variables: map[string]string{...}}` supplies the saved prompt's variables.

`ba.ChatParams`, `ba.RegenerateParams`, `ba.GenerateParams`, and `ba.ObjectParams[T]` have `UserID` and `Metadata` fields to attribute the turn; `ba.ChatParams`, `ba.RegenerateParams`, and `ba.ContinueParams` have a `Functions` field; `ba.ContinueParams` has only `Functions`. Every call takes the per-call options.

## Methods [#methods]

### `Chat.Send` [#chat]

**Signature:** `func (s *ChatService) Send(ctx context.Context, agentID AgentID, input ChatInput, params ChatParams, opts ...RequestOption) (*ChatStream, error)`

Sends a message in a session and returns a `*ba.ChatStream` of AI SDK SSE events. When you attach backend functions, the SDK consumes private callback events and yields the remaining events to your application.

```go
stream, err := client.Chat.Send(ctx, agentID, ba.Messages(ba.TextMessage("Hello")), ba.ChatParams{})
if err != nil {
	return err
}
defer stream.Close()
fmt.Println("session", stream.SessionID())
for event, err := range stream.Events() {
	if err != nil {
		return err
	}
	os.Stdout.Write(event)
}
return nil
```

With an empty `SessionID`, `Send` starts a new session. Its `ss_...` ID is available as `stream.SessionID()` before you read the body, and `stream.TurnID()` holds the running turn's ID for [`Sessions.Stop`](/sdk/go/sessions#stop). Pass the session ID on a later call to continue the conversation. The first turn saves the current agent configuration for every later turn.

| Field | Type | Description |
| --- | --- | --- |
| `SessionID` | `ba.SessionID` | Continue an existing session instead of starting one |
| `UserID` | `*string` | Attribute the turn to an end user |
| `Metadata` | `ba.Metadata` | Your own data, stored with the turn |
| `Functions` | `*ba.Functions` | Backend functions the agent may call during the turn |

`Events()` yields one complete event per iteration as a fresh byte slice. `WriteTo(w)` relays every remaining event to an `io.Writer` and flushes after each one, and `SetRelayHeaders(h)` sets the headers a browser `useChat` transport expects; together they relay a turn from an `http.Handler`.

`ba.TextMessage(text)` builds a text message with a random ID. `ba.NewUserMessage(id, first, rest...)` sets the ID and parts: `ba.TextPart{Text: ...}`, or `ba.FilePart{MediaType: ..., URL: ...}` to attach a file, such as an image, as a `data:` URL or a fetchable URL. Keep the message and resend it to retry safely. A batch sends several waiting messages in one turn, and each stays a separate user message in order:

```go
input := ba.Messages(ba.TextMessage("First"), ba.TextMessage("Second"))
stream, err := client.Chat.Send(ctx, agentID, input, ba.ChatParams{})
if err != nil {
	return err
}
defer stream.Close()
_, err = stream.WriteTo(os.Stdout)
return err
```

`ba.Messages` takes at least one message by its signature, so an empty batch cannot be built. A chat fails with `*ba.APIError` whose status is 409 and code is `message_id_conflict` if any message ID is already saved in the session's history. The entire batch is rejected before model or tool work, including when a reused ID has changed content. Regeneration is exempt. After an unknown response, read the history instead of automatically retrying. See [sessions and turns](/platform/sessions-and-turns#send-while-the-agent-is-working).

Keep consuming the stream while the chat runs. Function calls are dispatched as you read their events, so pausing iteration delays new calls. Running handlers do not block iteration.

### `Chat.Regenerate` [#regenerate]

**Signature:** `func (s *ChatService) Regenerate(ctx context.Context, agentID AgentID, sessionID SessionID, input RegenerateInput, params RegenerateParams, opts ...RequestOption) (*ChatStream, error)`

Generates the answer again in an existing session. The `MessageID` field cuts the history back to that message first.

```go
stream, err := client.Chat.Regenerate(ctx, agentID, sessionID, ba.TextMessage("Try again"), ba.RegenerateParams{
	MessageID: new("message-1"),
})
if err != nil {
	return err
}
defer stream.Close()
_, err = stream.WriteTo(os.Stdout)
return err
```

`ba.RegenerateParams` also has `UserID`, `Metadata`, and `Functions` fields. It returns a `*ba.ChatStream`, the same as `Send`.

### `ba.NewFunctions` [#functions]

**Signature:** `func NewFunctions(defs ...FunctionDef) (*Functions, error)`

Backend functions are handlers in your process that the agent can call during a chat turn. `ba.Function` derives the input schema from a Go struct with `ba.SchemaFor` and decodes the input into it; `ba.FunctionJSON` takes a hand-written JSON Schema and a handler that receives the raw `json.RawMessage`. The handler's returned value is sent to the agent as JSON.

A `ba.WithRequestHeader` or `ba.WithClientRequestID` on a chat call is forwarded to that call's backend function claim and result requests too. Those requests keep the client's timeout, not the chat call's.

```go
type RefundInput struct {
	OrderID string `json:"orderId" jsonschema:"The order to refund"`
}

functions, err := ba.NewFunctions(
	ba.Function("refund_order", "Refund one order.",
		func(ctx context.Context, call ba.FunctionCall, input RefundInput) (any, error) {
			_ = call.ID // the idempotency key for side effects
			return map[string]string{"refunded": input.OrderID}, nil
		}),
)
if err != nil {
	return err
}
_ = functions
return nil
```

`ba.NewFunctions` returns a `*ba.ArgumentError` for a name outside `^[A-Za-z][A-Za-z0-9_-]{0,63}$` or reserved for a built-in or MCP tool, a duplicate, more than 32 functions, an empty description, a non-object input schema, or definitions over 64 KiB.

The handler also gets a `ba.FunctionCall`: `ID` to make side effects idempotent across retries, `Name`, and `Deadline` for when the platform stops waiting. Its context is canceled at the deadline, when you close the stream, or when the chat call's context ends. Input that does not decode, a returned error, a panic, or a result that is not plain JSON becomes a sanitized tool error; the handler's own error text never reaches the agent. Results over 256 KiB become an invalid-result error.

Build one `*ba.Functions` value and attach it to every chat call with the `Functions` field; it is immutable and safe to share across goroutines. Claims and result submissions retry transient failures with the same body until the call's deadline. A permanent failure ends the stream with a `*ba.StreamError` whose `Kind` is `ba.StreamFunctionCall`. See [backend functions](/agents/tools/backend-functions).

### `Chat.Continue` [#continue-chat]

**Signature:** `func (s *ChatService) Continue(ctx context.Context, agentID AgentID, sessionID SessionID, decisions []ToolApprovalDecision, params ContinueParams, opts ...RequestOption) (*ChatStream, error)`

Records one complete tool approval round and streams the rest of the turn. Pass one decision for every call pending in the round: `ba.Approve(id)` or `ba.Deny(id, reason)`, where an empty reason sends none. Nothing runs until you make this call, and a closed continuation stream cannot be rejoined.

```go
stream, err := client.Chat.Continue(ctx, agentID, sessionID, []ba.ToolApprovalDecision{
	ba.Approve("apr_1"),
	ba.Deny("apr_2", "Too risky to run."),
}, ba.ContinueParams{})
if err != nil {
	return err
}
defer stream.Close()
_, err = stream.WriteTo(os.Stdout)
return err
```

Set `Functions` when the chat uses [backend functions](/agents/tools/backend-functions).

Repeating the same decisions is safe. A missing, duplicate, or mixed round fails with `validation_failed`; a changed decision fails with `tool_approval_decision_conflict`; a retry while the continuation runs fails with `session_busy`; and a finished round fails with `tool_approval_continuation_settled`. An empty `decisions` slice fails client-side with `*ba.ArgumentError`. See [tool approvals](/agents/tools/tool-approvals).

### `Generation.Completion` [#completion]

**Signature:** `func (s *GenerationService) Completion(ctx context.Context, agentID AgentID, prompt PromptInput, params GenerateParams, opts ...RequestOption) (string, error)`

Returns the complete text answer.

```go
answer, err := client.Generation.Completion(ctx, agentID, ba.Text("Summarize this request."), ba.GenerateParams{})
if err != nil {
	return err
}
fmt.Println(answer)
return nil
```

### `Generation.CompletionStream` [#completion-stream]

**Signature:** `func (s *GenerationService) CompletionStream(ctx context.Context, agentID AgentID, prompt PromptInput, params GenerateParams, opts ...RequestOption) (*CompletionStream, error)`

Returns a `*ba.CompletionStream`. `Deltas()` yields text deltas decoded as whole UTF-8 characters across chunk boundaries. `Text()` reads anything you have not consumed yet and returns the full text, including the deltas already yielded.

```go
stream, err := client.Generation.CompletionStream(ctx, agentID, ba.Text("Write a release note."), ba.GenerateParams{})
if err != nil {
	return err
}
defer stream.Close()
for delta, err := range stream.Deltas() {
	if err != nil {
		return err
	}
	fmt.Print(delta)
}
finalText, err := stream.Text()
if err != nil {
	return err
}
_ = finalText
return nil
```

### `ba.Object` [#object]

**Signature:** `func Object[T any](ctx context.Context, g *GenerationService, agentID AgentID, prompt PromptInput, params ObjectParams[T], opts ...RequestOption) (T, error)`

Returns structured output decoded into `T`. With a zero `Schema`, `ba.SchemaFor[T]()` builds the JSON Schema from `T` by reflection: exported fields, named by their `json` tags, required unless the field is a pointer or tagged `omitempty` or `omitzero`, no extra properties, and an optional `jsonschema:"..."` tag for each field's description. It covers strings, booleans, numbers, slices, arrays, string-keyed maps, `time.Time`, pointers, and `json.RawMessage` or `any`, and returns an error for embedded fields, recursive types, nesting deeper than 32, or any other kind. `ba.RawSchema[T](schema)` takes a hand-written schema instead, such as one with an `enum`; with `T` set to `map[string]any` you get the decoded JSON without further checks.

```go
type Summary struct {
	Title string   `json:"title"`
	Risks []string `json:"risks"`
}

summary, err := ba.Object(ctx, client.Generation, agentID, ba.Text("Summarize the release."), ba.ObjectParams[Summary]{})
if err != nil {
	return err
}
fmt.Println(summary.Title, summary.Risks)
return nil
```

### `ba.StreamObject` [#object-stream]

**Signature:** `func StreamObject[T any](ctx context.Context, g *GenerationService, agentID AgentID, prompt PromptInput, params ObjectParams[T], opts ...RequestOption) (*ObjectStream[T], error)`

Returns an `*ba.ObjectStream[T]` whose `Deltas()` yields raw JSON text. Nothing is validated until `Object()`, which reads any remaining data and decodes the complete text. Truncated, invalid, and mismatched output fail with a `*ba.ObjectError` of the matching `Kind`.

```go
type Summary struct {
	Title string   `json:"title"`
	Risks []string `json:"risks"`
}

stream, err := ba.StreamObject(ctx, client.Generation, agentID, ba.Text("Summarize the release."), ba.ObjectParams[Summary]{})
if err != nil {
	return err
}
defer stream.Close()
for delta, err := range stream.Deltas() {
	if err != nil {
		return err
	}
	fmt.Print(delta)
}
summary, err := stream.Object()
if err != nil {
	return err
}
fmt.Println(summary.Title)
return nil
```

## Stream ownership and failures [#stream-ownership-and-failures]

Read each chat, completion, and object stream from one goroutine. An iterator yields an error once and then ends; breaking out of the loop leaves the stream at the next event. Call `Close` to stop early: it closes the connection, and on a `*ba.ChatStream` it cancels running function handlers without waiting for them. `Close` is safe from any goroutine and more than once, so always `defer stream.Close()`. A failed body read, a missing or malformed session or turn header, a malformed function-call event, or a body that ends early fails the stream with `*ba.StreamError`; object streams report the more specific `*ba.ObjectError` from `Object()`.

Status, connection, and timeout failures before the stream starts return from the call itself as the usual error types. `stream.Meta()` exposes the status, headers, and `RequestID` before you read the body.

## Next [#next]

- [Generation and streaming](/agents/output/generation-and-streaming)
- [Structured output](/agents/output/structured-output)
- [Sessions](/sdk/go/sessions)
