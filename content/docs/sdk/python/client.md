---
title: Client
description: Configure the Python client, handle errors, and generate chat, text, and structured output.
---

# Client

`BlazingAgents` is the entry point for sync code and `AsyncBlazingAgents` for async code. You configure the key, timeouts, and headers once, then call resources and generation methods from it. Creating a client makes no network request, but it raises `ValueError` when it finds no API key.

## Construct a client [#construct-a-client]

**Signatures:**

```python
BlazingAgents(
    *,
    api_key: str | None = None,
    base_url: str = "https://api.blazingagents.com",
    timeout: Timeout = 60.0,
    default_headers: Mapping[str, str] | None = None,
    http_client: httpx.Client | None = None,
    on_response: Callable[[ResponseObservation], None] | None = None,
)

AsyncBlazingAgents(
    *,
    api_key: str | None = None,
    base_url: str = "https://api.blazingagents.com",
    timeout: Timeout = 60.0,
    default_headers: Mapping[str, str] | None = None,
    http_client: httpx.AsyncClient | None = None,
    on_response: Callable[[ResponseObservation], None] | None = None,
)
```

An explicit `api_key` wins over `BLAZING_AGENTS_API_KEY`. `default_headers` go on every request, and the `extra_headers` and `timeout` arguments on a single call override them for that call.

The SDK owns two headers. It always sets `Authorization` from your tenant API key, overwriting any value you pass. It strips `X-Request-Id` from `default_headers` and `extra_headers`, and rejects an injected HTTPX client whose default headers contain it. To correlate requests with your own IDs, use `client_request_id` instead.

The SDK closes the HTTPX client it creates when you close the SDK client. An `http_client` you pass in stays yours; the SDK never closes it.

Ordinary requests time out after 60 seconds by default, and `None` disables the timeout. Streaming requests keep the connect, write, and pool timeouts but have no read deadline. Backend function claims and result submissions retry transient failures. Other requests do not retry automatically.

### `agent()` [#agent]

**Signature:** `agent(agent_id: str) -> AgentClient`

Returns resources scoped to one agent, without a network request. Use `client.agent(agent_id).skills` for every operation on that agent's skills. On `AsyncBlazingAgents`, `agent()` returns an `AsyncAgentClient` with the same `skills` member; await its request methods and use `async for` with its iterator. See [Skills](/sdk/python/skills).

### `with_options()` [#with-options]

**Signature:** `with_options(*, client_request_id: str) -> BlazingAgents`

Returns a copy of the client that sends `X-Client-Request-Id` on every resource and generation call. The original client is unchanged. The copy is the same kind of client: `AsyncBlazingAgents` returns an `AsyncBlazingAgents`, and a `UserClient` returns a `UserClient` that keeps its user scope. The method is synchronous on every client.

```python
correlated = client.with_options(client_request_id="checkout-attempt-42")
agent = correlated.agents.get("ag_0123456789abcdef")
```

Generation methods also accept `client_request_id` per call, and every method accepts `extra_headers` and `timeout`.

### `for_user()` [#for-user]

**Signature:** `for_user(user_id: str) -> UserClient`

Use `for_user()` in your backend after you authenticate an end user. It returns a `UserClient` that sends `X-BA-User-Id` on every request, and the API checks that user's ownership for reads and writes. On `AsyncBlazingAgents` it returns an `AsyncUserClient`. The method makes no network request.

```python
from blazing_agents import BlazingAgents

tenant_client = BlazingAgents()


def list_my_agents(verified_user_id: str):
    user_client = tenant_client.for_user(verified_user_id)
    return user_client.agents.list(limit=50)
```

Pass the ID from the session your backend verified. Do not take it from a request body or query parameter. The ID must contain 1 to 256 printable ASCII characters without a leading or trailing space, or `for_user()` raises `ValueError`. The scope header wins over `default_headers` and `extra_headers`.

A `UserClient` has `agents`, `artifacts`, `memories`, `prompts`, `sessions`, `tasks`, `workspaces`, `agent()`, the [generation methods](#generation-methods), and `usage` with `get()` and [`sessions()`](/sdk/python/usage#sessions). It omits tenant administration, such as `providers`, `tenant`, and the merchant resources, and it omits usage overview and per-agent usage. Use the tenant client for those operations.

A request body's `user_id` labels the resource or turn. It does not grant access. On a scoped request, the API fills in a missing `user_id` with the scoped ID and rejects a different one. Without `for_user()`, your API key keeps tenant-wide authority, even when a request body contains `user_id`.

### `close()` [#close]

**Signature:** `close() -> None`

Closes the connections a sync client owns. Prefer `with BlazingAgents(...) as client`, which calls `close()` on exit. An injected HTTPX client stays open.

### `aclose()` [#aclose]

**Signature:** `await aclose() -> None`

Closes the connections an `AsyncBlazingAgents` owns. Prefer `async with AsyncBlazingAgents(...) as client`, which awaits `aclose()` on exit. The async client never runs sync calls through the event loop.

## Response observation and request IDs [#response-observation-and-request-ids]

Pass `on_response` to see every response the client receives, including API errors, malformed bodies, and stream handshakes. The callback gets one `ResponseObservation` per response:

| Field | Meaning |
| --- | --- |
| `method` | HTTP method |
| `path` | Path without query parameters |
| `status` | HTTP status |
| `duration_ms` | Elapsed request time in milliseconds |
| `request_id` | Server request ID from `X-Request-Id`, when present |
| `client_request_id` | Your correlation ID, when present |

The SDK ignores exceptions your callback raises. A connection failure with no response does not call it.

Response models expose the server request ID as `_request_id`, which is not serialized. Generated text and stream objects expose it as `request_id`. Keep it when you contact support. Each retry you make is a new attempt with a new request ID.

## Errors [#errors]

Every SDK exception derives from `BlazingAgentsError`.

| Exception | Raised when |
| --- | --- |
| `APIStatusError` | The server returns an error status. Carries `status_code`, headers, the server `code`, `details`, `param`, `request_id`, a safe `response_body`, and `retry_after` |
| `APIConnectionError` | The network fails before a complete response |
| `APITimeoutError` | An HTTP timeout fires; also an `APIConnectionError` |
| `StreamError` | Reading, ownership, headers, decoding, or finalization fails after stream headers arrive. Carries `status_code`, headers, `request_id`, and `retry_after` |
| `ObjectTruncationError` | A complete response contains incomplete JSON |
| `ObjectJSONDecodeError` | A complete response contains invalid JSON |
| `ObjectValidationError` | Decoded JSON does not match the requested output type |

```python
from blazing_agents import APIConnectionError, APIStatusError, APITimeoutError

try:
    agent = client.agents.get("ag_0123456789abcdef")
except APIStatusError as error:
    if error.code == "not_found":
        print(error.request_id, error.retry_after)
except APITimeoutError:
    ...
except APIConnectionError:
    ...
```

`str(error)` for an `APIStatusError` starts with the code in brackets, such as `[model_validation_unavailable] Provider model discovery is unavailable`, so logs show the code without extra work. `error.code` holds the bare code, such as `model_validation_unavailable`.

Branch on `error.code`, not the message. Cancellation, `KeyboardInterrupt`, and `SystemExit` pass through unwrapped. Decide whether to retry from the operation, the status, and `retry_after`.

## Logging and telemetry [#logging-and-telemetry]

The SDK sends no telemetry. The `blazing_agents` logger emits warnings for failed backend functions, invalid results, and failed claim or result requests. These records can include the function name, call ID, and API error message. Handler exception details are omitted.

At debug level, HTTP records include the method, path without query, status, elapsed time, and request ID. Function records also identify skipped or refused calls. The SDK does not log credentials, headers, request bodies, schemas, or stream content.

Chats with backend functions run handlers in background threads or async tasks while you consume the stream.

## Generation methods [#generation-methods]

The client has six generation methods: `chat()` and `continue_chat()` for conversations that Blazing Agents stores as sessions, plus buffered and streaming forms of stateless text and structured output. Every call runs one metered turn. All arguments are keyword-only.

Give each call exactly one input: a literal `message` or `messages`, a `decisions` list for `continue_chat()`, a `prompt`, or a saved prompt through `prompt_id`. `variables` works only with `prompt_id`. Every generation method also accepts `user_id` and `metadata` to attribute the turn to an end user, `client_request_id`, `extra_headers`, and `timeout`.

`AsyncBlazingAgents` has the same six method names; you await them.

## Methods [#methods]

### `chat()` [#chat]

**Signature:** `chat(*, agent_id, message=..., messages=..., prompt_id=..., variables=..., trigger=..., message_id=..., session_id=..., user_id=..., metadata=..., functions=..., client_request_id=None, extra_headers=None, timeout=...) -> ChatStream`

Sends a message in a session and returns a `ChatStream` of AI SDK SSE bytes. When you attach backend functions, the SDK consumes private callback events and forwards the remaining events to your application.

```python
with client.chat(
    agent_id="ag_0123456789abcdef",
    message={
        "id": "message-1",
        "role": "user",
        "parts": [{"type": "text", "text": "Hello"}],
    },
) as stream:
    session_id = stream.session_id
    for chunk in stream:
        print(chunk.decode(), end="")
```

Omit `session_id` to start a new session. Its `ss_...` ID is available as `stream.session_id` before you read the body, and `stream.turn_id` holds the running turn's ID for [`sessions.stop()`](/sdk/python/sessions#stop). Pass the session ID on a later call to continue the conversation. The first turn saves the current agent configuration for every later turn. Read it with `sessions.get()`. `trigger="regenerate-message"` works only in an existing session and can target a `message_id`.

Pass `messages` (a list of user messages) instead of `message` to send several waiting messages in one turn; each stays a separate user message in the history, in order.

Ordinary chat raises `APIStatusError` with `status_code=409` and `code="message_id_conflict"` if any message ID is already saved in the session's history. The entire batch is rejected before model or tool work, including when a reused ID has changed content. Regeneration is exempt. After an unknown response, read the history instead of automatically retrying. See [sessions and turns](/platform/sessions-and-turns#send-while-the-agent-is-working).

With the async client, call `stream = await client.chat(...)`, then use `async with stream` and `async for chunk in stream`.

Pass `functions` to attach handlers created with `define_function()`. Supply the handlers again on each request. The same `extra_headers` apply to the chat and its function claims and results. See [backend functions](/agents/tools/backend-functions).

Keep consuming the stream while the chat runs. Function calls are dispatched as you read their events, so pausing iteration delays new calls. Running handlers do not block iteration.

### `define_function()` [#define-function]

**Signature:** `define_function(*, description, input_schema, execute) -> ChatFunction`

The exported helper takes a Pydantic-compatible input type that describes an object. The handler receives the validated input and a `FunctionContext` with `idempotency_key`, `deadline_at`, and a `cancelled` threading event. It returns a plain JSON value. Convert Pydantic results with `model_dump(mode="json")` before returning them.

`BlazingAgents` accepts synchronous handlers. `AsyncBlazingAgents` accepts async handlers and runs synchronous handlers in a worker thread. Synchronous cancellation is cooperative. See [handle cancellation and retries](/agents/tools/backend-functions#handle-cancellation-and-retries).

### `continue_chat()` [#continue-chat]

**Signature:** `continue_chat(*, agent_id, session_id, decisions, functions=..., client_request_id=None, extra_headers=None, timeout=...) -> ChatStream`

Records one complete tool approval round and streams the rest of the turn. Pass one decision for every call pending in the round: `{"approval_id": ..., "approved": ..., "reason": ...}` with the reason optional. Nothing runs until you make this call, and a dropped continuation stream cannot be rejoined.

```python
with client.continue_chat(
    agent_id=agent_id,
    session_id=session_id,
    decisions=[
        {"approval_id": "apr_1", "approved": True},
        {"approval_id": "apr_2", "approved": False, "reason": "Too risky to run."},
    ],
) as stream:
    for chunk in stream:
        print(chunk.decode(), end="")
```

Attach `functions` when the chat uses [backend functions](/agents/tools/backend-functions). With `AsyncBlazingAgents`, await this method and consume the returned `AsyncChatStream`.

Repeating the same decisions is safe. A missing, duplicate, or mixed round raises `validation_failed`; a changed decision raises `tool_approval_decision_conflict`; a retry while the continuation runs raises `session_busy`; and a finished round raises `tool_approval_continuation_settled`. See [tool approvals](/agents/tools/tool-approvals).

### `completion()` [#completion]

**Signature:** `completion(*, agent_id, prompt=..., prompt_id=..., variables=..., user_id=..., metadata=..., client_request_id=None, extra_headers=None, timeout=...) -> Completion`

Returns the complete text answer. `Completion` is a `str` subclass that also carries `request_id`.

```python
result = client.completion(
    agent_id="ag_0123456789abcdef",
    prompt="Summarize this request.",
)
print(str(result), result.request_id)
```

Use `await client.completion(...)` with `AsyncBlazingAgents`.

### `completion_stream()` [#completion-stream]

**Signature:** `completion_stream(*, agent_id, prompt=..., prompt_id=..., variables=..., user_id=..., metadata=..., client_request_id=None, extra_headers=None, timeout=...) -> CompletionStream`

Streams the text answer as decoded text deltas. `get_final_text()` reads anything you have not consumed yet and returns the full `Completion`. Reading to the end closes the stream; call `close()` to stop early.

```python
with client.completion_stream(
    agent_id="ag_0123456789abcdef",
    prompt="Write a release note.",
) as stream:
    for delta in stream:
        print(delta, end="")
    final = stream.get_final_text()
```

With the async client, call `stream = await client.completion_stream(...)`, then use `async with`, `async for`, `await stream.get_final_text()`, and `await stream.aclose()` to stop early.

### `object()` [#object]

**Signature:** `object(*, agent_id, output_type=..., json_schema=..., prompt=..., prompt_id=..., variables=..., user_id=..., metadata=..., client_request_id=None, extra_headers=None, timeout=...) -> T | JsonValue`

Returns structured output. Pass exactly one of `output_type` or `json_schema`. With a Pydantic-compatible `output_type`, the SDK derives the JSON Schema, decodes the complete response, and validates it with Pydantic's `TypeAdapter`, so you get an instance of `output_type`. With a raw `json_schema`, you get the decoded JSON value without validation.

```python
from pydantic import BaseModel

class Summary(BaseModel):
    title: str
    risks: list[str]

summary = client.object(
    agent_id="ag_0123456789abcdef",
    prompt="Summarize the release.",
    output_type=Summary,
)
```

Use `await client.object(...)` with the async client.

### `object_stream()` [#object-stream]

**Signature:** `object_stream(*, agent_id, output_type=..., json_schema=..., prompt=..., prompt_id=..., variables=..., user_id=..., metadata=..., client_request_id=None, extra_headers=None, timeout=...) -> ObjectStream[T] | ObjectStream[JsonValue]`

Streams structured output as raw JSON text deltas. It never yields partial Pydantic models. `get_final_object()` reads any remaining data and validates only after the stream finishes. Invalid, truncated, or mismatched output raises the matching `Object...Error`.

```python
with client.object_stream(
    agent_id="ag_0123456789abcdef",
    prompt="Summarize the release.",
    output_type=Summary,
) as stream:
    for json_delta in stream:
        print(json_delta, end="")
    summary = stream.get_final_object()
```

With the async client, call `stream = await client.object_stream(...)`, then use `async with`, `async for`, `await stream.get_final_object()`, and `await stream.aclose()` to stop early.

## Stream ownership and failures [#stream-ownership-and-failures]

Each chat, completion, and object stream has exactly one reader. Iterating a second time or after close raises `StreamError`, as do a failed read, a malformed session location, or an incomplete finish. Object streams raise the more specific object errors. Reading to the end closes the stream. To stop early, use a context manager; closing an active stream closes its HTTP connection.

Status, connection, and timeout failures before the stream starts raise the normal client exceptions. Stream objects expose the status, headers, and `request_id` before you read them.

## Next [#next]

- [Generation and streaming](/agents/output/generation-and-streaming)
- [Structured output](/agents/output/structured-output)
- [Sessions](/sdk/python/sessions)
