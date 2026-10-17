---
title: Client
description: Configure the Rust client, handle errors, and generate chat, text, and structured output.
---

# Client

`Client` is the entry point. You configure the key, timeouts, and headers once, then call resources and generation methods from it. Building a client makes no network request, but `build()` fails with `ConfigError::MissingApiKey` when it finds no API key.

## Construct a client [#construct-a-client]

`Client::builder()` returns a `ClientBuilder`, and `Client::from_env()` builds one configured from `BLAZING_AGENTS_API_KEY` with every default.

```rust
use std::time::Duration;

let client = blazing_agents::Client::builder()
    .api_key(std::env::var("BLAZING_AGENTS_API_KEY")?)
    .base_url("https://api.blazingagents.com")
    .timeout(Some(Duration::from_secs(60)))
    .connect_timeout(Duration::from_secs(5))
    .default_header("X-Team", "backend")
    .on_response(|observation| {
        println!("{} {}", observation.status, observation.path);
    })
    .build()?;
```

| Setter | Description |
| --- | --- |
| `api_key(impl Into<String>)` | The tenant API key. Wins over `BLAZING_AGENTS_API_KEY` |
| `base_url(impl Into<String>)` | The API base URL. Defaults to `https://api.blazingagents.com` |
| `timeout(Option<Duration>)` | The timeout for non-streaming calls. Defaults to 60 seconds; `None` disables it |
| `connect_timeout(Duration)` | The TCP connect timeout. Unset by default |
| `default_header(name, value)` | A header sent on every request. An invalid name or value fails `build()` |
| `on_response(callback)` | A `Fn(&ResponseObservation)` that sees every response |
| `build()` | Returns `Result<Client, ConfigError>` |

`default_header` headers go on every request, and `with_header` on a single call overrides them for that call.

The SDK owns four headers. It always sets `Authorization` from your tenant API key, and sets `Content-Type` from the request body. `default_header` and `with_header` ignore `Authorization`, `Content-Type`, `X-Request-Id`, and `X-BA-User-Id`: values you pass for them are dropped. To correlate requests with your own IDs, use `with_client_request_id` instead.

A `Client` is cheap to clone, and clones share the connection pool. There is no `close()`; drop the client when you are done.

The timeout covers the request and reading the response body. For a streaming response, and for `completion()` and `object()`, which stream internally, it covers only the wait for headers; reading the stream has no deadline. `with_timeout` and `without_timeout` adjust this per call. Backend function claims and result submissions retry transient failures until the call's deadline. Other requests are not retried automatically.

### `agent()` [#agent]

**Signature:** `agent(agent_id: impl Into<AgentId>) -> AgentHandle`

Returns resources scoped to one agent, without a network request. Use `client.agent(agent_id).skills()` for every operation on that agent's skills.

### `with_client_request_id()` [#with-client-request-id]

**Signature:** `with_client_request_id(id: impl Into<String>) -> Client`

Returns a clone of the client that sends `X-Client-Request-Id` on every call. The original is unchanged, and a `UserClient` keeps its user scope. `Call::with_client_request_id` sets it for one call and overrides the client's value.

```rust
let correlated = client.with_client_request_id("checkout-attempt-42");
let agent = correlated.agents().get("ag_0123456789abcdef").await?;
```

### `for_user()` [#for-user]

**Signature:** `for_user(user_id: impl AsRef<str>) -> Result<UserClient, ConfigError>`

Use `for_user()` in your backend after you authenticate an end user. It returns a `UserClient` that sends `X-BA-User-Id` on every request, and the API checks that user's ownership for reads and writes. It makes no network request.

```rust
let user_client = client.for_user("verified_user_42")?;
let page = user_client.agents().list().limit(50).await?;
```

Pass the ID from the session your backend verified. Do not take it from a request body or query parameter. The ID must be 1 to 256 printable ASCII characters without a leading or trailing space, or `for_user()` fails with `ConfigError::InvalidUserId`. The scope header wins over default and per-call headers.

A `UserClient` has `agents()`, `artifacts()`, `memories()`, `prompts()`, `sessions()`, `tasks()`, `workspaces()`, `agent()`, the [generation methods](#generation-methods), and `usage()` with `get()`, [`sessions()`](/sdk/rust/usage#sessions), and [`get_for_agent()`](/sdk/rust/usage#get-for-agent). Tenant administration is missing at compile time: a `UserClient` has no `providers()`, `mcp_connections()`, `chat_connections()`, `chat_deliveries()`, `tenant()`, or merchant accessors, its `agents()` has no spending limit methods, and its `usage()` has no `overview()`. Use the tenant client for those operations.

A request body's `user_id` labels the resource or turn. It does not grant access. On a scoped request, the API fills in a missing `user_id` with the scoped ID and rejects a different one. Without `for_user()`, your API key keeps tenant-wide authority, even when a request body contains `user_id`.

## Response observation and request IDs [#response-observation-and-request-ids]

Pass `on_response` to see every response the client receives, including API errors, malformed bodies, and stream handshakes. The callback gets one `ResponseObservation` per response:

| Field | Meaning |
| --- | --- |
| `operation_id` | The spec's `operationId` |
| `method` | HTTP method |
| `path` | Path without query parameters |
| `status` | HTTP status |
| `duration` | Time from sending the request to receiving the headers |
| `request_id` | Server request ID from `X-Request-Id`, when present |
| `client_request_id` | Your correlation ID, when present |

A panic inside the callback is caught and discarded. A connection failure with no response produces no observation.

`send_with_meta()` on any call returns `WithMeta { value, meta }`, where `meta.status()`, `meta.headers()`, and `meta.request_id()` describe the response. Streams and downloads expose the same `meta()` before you read them: `ChatStream::meta()`, `CompletionStream::meta()`, `ObjectStream::meta()`, and `Download::meta()`. Keep the request ID when you contact support. Each retry you make is a new attempt with a new request ID.

```rust
let with_meta = client
    .agents()
    .get("ag_0123456789abcdef")
    .send_with_meta()
    .await?;
println!("{} {}", with_meta.meta.status(), with_meta.value.name);
```

## Errors [#errors]

Every fallible call returns `Result<T, blazing_agents::Error>`:

| Variant | Happens when |
| --- | --- |
| `Error::Api` | The server returns an error status. Carries `status()`, `code()`, `message()`, `details()`, `param()`, `request_id()`, `retry_after()`, `headers()`, and `body()` |
| `Error::Connection` | The network fails before a complete response |
| `Error::Timeout` | The call's timeout elapses |
| `Error::Stream` | Reading, headers, a function-call event, or finalization fails after stream headers arrive. `StreamError::kind()` and `meta()` describe it |
| `Error::Object` | Object generation produced truncated JSON, invalid JSON, or JSON that does not match the requested type. `ObjectError::kind()`, `text()`, and `meta()` describe it |
| `Error::Decode` | A 2xx body does not match the response model |
| `Error::CredentialEcho` | A response echoed credential material back. The body is discarded |
| `Error::InvalidArgument` | A client-side argument the types could not rule out, such as a path parameter of `..` |
| `Error::Config` | A client configuration problem, reported before any request is sent |

```rust
use blazing_agents::Error;
use blazing_agents::error::ErrorCode;

match client.agents().get("ag_0123456789abcdef").await {
    Ok(agent) => println!("{}", agent.name),
    Err(Error::Api(error)) => match error.code() {
        ErrorCode::NotFound => println!("no such agent"),
        code => println!("{} {}", code.as_str(), error.message()),
    },
    Err(error) => return Err(error.into()),
}
```

An `ApiError` displays as `[code] message`, such as `[model_validation_unavailable] Provider model discovery is unavailable`, so logs show the code without extra work. Submitted credentials are redacted from its `body()` and `headers()`. `Error::status()`, `Error::request_id()`, and `Error::code()` give the same values without matching the variant.

`ErrorCode` is an open enum: match known variants with a fallback arm, or compare `code().as_str()`. Branch on the code, not the message. Decide whether to retry from the operation, the status, and `retry_after()`.

`StreamErrorKind` tells apart `Read`, `Incomplete`, `MissingSessionId`, `MalformedSessionId`, `MissingTurnId`, `MalformedTurnId`, and `MalformedFunctionCall`. `ObjectErrorKind` tells apart `Truncated`, `InvalidJson`, and `Mismatch`.

## Logging and telemetry [#logging-and-telemetry]

The SDK sends no telemetry. It emits `tracing` events: a `debug` record for every response with the operation, method, path, status, elapsed time, and request ID, a `debug` record for a refused function call, and `warn` records for function calls that fail, expire, or exceed the result size limit, for handler failures, and for a panicked `on_response` callback. Records can include the function name, call ID, and API error message. The SDK does not log credentials, headers, request bodies, schemas, or stream content.

Chats with backend functions run handlers on Tokio tasks while you consume the stream.

## Generation methods [#generation-methods]

The client has `chat()`, `regenerate()`, and `continue_chat()` for conversations that Blazing Agents stores as sessions, plus buffered and streaming forms of stateless text and structured output. Every call runs one metered turn.

Give `chat()` one input: a `UserMessage`, a `ChatInput::try_from` over a `Vec<UserMessage>` for a batch, or a `SavedPrompt` for a saved prompt. `regenerate()` takes a `UserMessage` or `SavedPrompt`. The stateless methods take prompt text or a `SavedPrompt`, and `object()` and `object_stream()` also take an `ObjectSchema`. `SavedPrompt::new(id).var(name, value)` supplies the saved prompt's variables.

`chat()`, `regenerate()`, and the four stateless calls (`completion`, `completion_stream`, `object`, `object_stream`) have `user_id` and `metadata` setters to attribute the turn; `chat()`, `regenerate()`, and `continue_chat()` have a `functions` setter; `continue_chat()` has only `functions`. Every call has the `with_*` transport options.

## Methods [#methods]

### `chat()` [#chat]

**Signature:** `chat(agent_id: impl Into<AgentId>, input: impl Into<ChatInput>) -> Call<ChatTurn>`

Sends a message in a session and returns a `ChatStream` of AI SDK SSE event bytes when awaited. When you attach backend functions, the SDK consumes private callback events and forwards the remaining events to your application.

```rust
use blazing_agents::messages::UserMessage;
use futures_util::TryStreamExt;

let mut stream = client
    .chat("ag_0123456789abcdef", UserMessage::text("Hello"))
    .await?;
println!("session {}", stream.session_id());
while let Some(event) = stream.try_next().await? {
    print!("{}", String::from_utf8_lossy(&event));
}
```

Without the `session` setter, `chat()` starts a new session. Its `ss_...` ID is available as `stream.session_id()` before you read the body, and `stream.turn_id()` holds the running turn's ID for [`sessions().stop()`](/sdk/rust/sessions#stop). Pass the session ID on a later call to continue the conversation. The first turn saves the current agent configuration for every later turn.

| Setter | Description |
| --- | --- |
| `session(session_id)` | Continue an existing session instead of starting one |
| `user_id(user_id)` | Attribute the turn to an end user |
| `metadata(metadata)` | Your own data, stored with the turn |
| `functions(functions)` | Backend functions the agent may call during the turn |

`UserMessage::text(...)` builds a text message with a random ID. `UserMessage::new(id, UserPart::text(...))` sets the ID and first part, and `.part(...)` and `.metadata(...)` add to it. `UserPart::file(media_type, url)` attaches a file, such as an image, as a `data:` URL or a fetchable URL. Keep the message and resend it to retry safely. A batch sends several waiting messages in one turn, and each stays a separate user message in order:

```rust
use blazing_agents::chat::ChatInput;
use blazing_agents::messages::UserMessage;
use futures_util::TryStreamExt;

let messages = vec![UserMessage::text("First"), UserMessage::text("Second")];
let mut stream = client
    .chat("ag_0123456789abcdef", ChatInput::try_from(messages)?)
    .await?;
while let Some(event) = stream.try_next().await? {
    print!("{}", String::from_utf8_lossy(&event));
}
```

An empty batch fails `try_from` with `EmptyBatch` before any request. A chat fails with `Error::Api` whose status is 409 and code is `message_id_conflict` if any message ID is already saved in the session's history. The entire batch is rejected before model or tool work, including when a reused ID has changed content. Regeneration is exempt. After an unknown response, read the history instead of automatically retrying. See [sessions and turns](/platform/sessions-and-turns#send-while-the-agent-is-working).

Keep consuming the stream while the chat runs. Function calls are dispatched as you read their events, so pausing iteration delays new calls. Running handlers do not block iteration.

### `regenerate()` [#regenerate]

**Signature:** `regenerate(agent_id: impl Into<AgentId>, session_id: impl Into<SessionId>, input: impl Into<RegenerateInput>) -> Call<Regenerate>`

Generates the answer again in an existing session. The `message_id` setter cuts the history back to that message first.

```rust
use blazing_agents::messages::UserMessage;
use futures_util::TryStreamExt;

let mut stream = client
    .regenerate(
        "ag_0123456789abcdef",
        "ss_0123456789abcdef",
        UserMessage::text("Try again"),
    )
    .message_id("message-1")
    .await?;
while let Some(event) = stream.try_next().await? {
    print!("{}", String::from_utf8_lossy(&event));
}
```

`regenerate()` also has `user_id`, `metadata`, and `functions` setters. Awaiting returns a `ChatStream`, the same as `chat()`.

### `Functions::builder()` [#functions]

**Signature:** `Functions::builder().function(name, description, handler).build() -> Result<Functions, FunctionsError>`

Backend functions are handlers in your process that the agent can call during a chat turn. `function()` derives the input schema from a `schemars` type and decodes the input into it; `function_json()` takes a hand-written JSON Schema and a handler that receives a `serde_json::Value`. The handler's `Ok` value is sent to the agent as JSON.

A `with_header` or `with_client_request_id` on a chat call is forwarded to that call's backend function claim and result requests too. Those requests keep the client's timeout, not the chat call's.

```rust
use blazing_agents::functions::{FunctionContext, Functions};
use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Deserialize, JsonSchema)]
struct RefundInput {
    order_id: String,
}

let functions = Functions::builder()
    .function(
        "refund_order",
        "Refund one order.",
        |input: RefundInput, context: FunctionContext| async move {
            let _ = context.idempotency_key();
            Ok::<_, std::io::Error>(serde_json::json!({ "refunded": input.order_id }))
        },
    )
    .build()?;
```

`build()` fails with `FunctionsError` for a name outside `^[A-Za-z][A-Za-z0-9_-]{0,63}$` or reserved for a built-in or MCP tool, a duplicate, more than 32 functions, an empty description, a non-object input schema, or definitions over 64 KiB.

The handler also gets a `FunctionContext`: `idempotency_key()` to make side effects idempotent across retries, `deadline()` for when the platform stops waiting, `cancelled()` which resolves when the deadline passes or the stream is dropped, and `is_cancelled()`. Input that does not decode, an `Err`, or a result that is not plain JSON becomes a sanitized tool error; the handler's own error text never reaches the agent. Results over 256 KiB become an invalid-result error.

Build one `Functions` value and attach it to every chat call with the `functions` setter; it is cheap to clone. Claims and result submissions retry transient failures with the same body until the call's deadline. See [backend functions](/agents/tools/backend-functions).

### `continue_chat()` [#continue-chat]

**Signature:** `continue_chat(agent_id: impl Into<AgentId>, session_id: impl Into<SessionId>, decisions: impl IntoIterator<Item = ToolApprovalDecision>) -> Call<ContinueChat>`

Records one complete tool approval round and streams the rest of the turn. Pass one decision for every call pending in the round: `ToolApprovalDecision::approve(id)` or `ToolApprovalDecision::deny(id)` with an optional `.reason(...)`. Nothing runs until you make this call, and a dropped continuation stream cannot be rejoined.

```rust
use blazing_agents::chat::ToolApprovalDecision;
use futures_util::TryStreamExt;

let mut stream = client
    .continue_chat(
        "ag_0123456789abcdef",
        "ss_0123456789abcdef",
        [
            ToolApprovalDecision::approve("apr_1"),
            ToolApprovalDecision::deny("apr_2").reason("Too risky to run."),
        ],
    )
    .await?;
while let Some(event) = stream.try_next().await? {
    print!("{}", String::from_utf8_lossy(&event));
}
```

Attach `functions` when the chat uses [backend functions](/agents/tools/backend-functions).

Repeating the same decisions is safe. A missing, duplicate, or mixed round fails with `validation_failed`; a changed decision fails with `tool_approval_decision_conflict`; a retry while the continuation runs fails with `session_busy`; and a finished round fails with `tool_approval_continuation_settled`. See [tool approvals](/agents/tools/tool-approvals).

### `completion()` [#completion]

**Signature:** `completion(agent_id: impl Into<AgentId>, prompt: impl Into<PromptInput>) -> Call<Completion>`

Awaiting returns the complete text answer as a `String`.

```rust
let answer = client
    .completion("ag_0123456789abcdef", "Summarize this request.")
    .await?;
println!("{answer}");
```

### `completion_stream()` [#completion-stream]

**Signature:** `completion_stream(agent_id: impl Into<AgentId>, prompt: impl Into<PromptInput>) -> Call<CompletionStreaming>`

Awaiting returns a `CompletionStream` of text deltas decoded as UTF-8 across chunk boundaries. `final_text()` reads anything you have not consumed yet and returns the full text.

```rust
use futures_util::TryStreamExt;

let mut stream = client
    .completion_stream("ag_0123456789abcdef", "Write a release note.")
    .await?;
while let Some(delta) = stream.try_next().await? {
    print!("{delta}");
}
let final_text = stream.final_text().await?;
```

### `object()` [#object]

**Signature:** `object<T>(agent_id: impl Into<AgentId>, prompt: impl Into<PromptInput>, schema: ObjectSchema<T>) -> Call<Object<T>>`

Returns structured output decoded into `T`. `ObjectSchema::derive()` builds the JSON Schema from a `schemars` type and the response is decoded into that type. `ObjectSchema::from_json_schema(value)` takes a hand-written schema; with `T = serde_json::Value` the decoded JSON is returned without further validation.

```rust
use blazing_agents::generation::ObjectSchema;
use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Deserialize, JsonSchema)]
struct Summary {
    title: String,
    risks: Vec<String>,
}

let summary: Summary = client
    .object(
        "ag_0123456789abcdef",
        "Summarize the release.",
        ObjectSchema::derive(),
    )
    .await?;
```

### `object_stream()` [#object-stream]

**Signature:** `object_stream<T>(agent_id: impl Into<AgentId>, prompt: impl Into<PromptInput>, schema: ObjectSchema<T>) -> Call<ObjectStreaming<T>>`

Awaiting returns an `ObjectStream<T>` of raw JSON text deltas. Nothing is validated until `final_object()`, which reads any remaining data and decodes the complete text. Truncated, invalid, and mismatched output fail with the matching `ObjectErrorKind`.

```rust
use blazing_agents::generation::ObjectSchema;
use futures_util::TryStreamExt;
use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Deserialize, JsonSchema)]
struct Summary {
    title: String,
    risks: Vec<String>,
}

let mut stream = client
    .object_stream(
        "ag_0123456789abcdef",
        "Summarize the release.",
        ObjectSchema::<Summary>::derive(),
    )
    .await?;
while let Some(delta) = stream.try_next().await? {
    print!("{delta}");
}
let summary: Summary = stream.final_object().await?;
```

## Stream ownership and failures [#stream-ownership-and-failures]

Each chat, completion, and object stream has exactly one consumer, by ownership: streams do not implement `Clone`, and `final_text()` and `final_object()` consume the stream. Drop a stream to stop early; dropping closes the connection, and dropping a `ChatStream` cancels its running function handlers. A failed body read, a missing or malformed session or turn header, a malformed function-call event, or a body that ends early fails the stream with `Error::Stream`; object streams report the more specific `Error::Object`.

Status, connection, and timeout failures before the stream starts surface as the usual `Error` variants when you await the call. `stream.meta()` exposes the status, headers, and `request_id` before you read the body.

## Next [#next]

- [Generation and streaming](/agents/output/generation-and-streaming)
- [Structured output](/agents/output/structured-output)
- [Sessions](/sdk/rust/sessions)
