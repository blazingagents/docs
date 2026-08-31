---
title: Client
description: Configure Python clients and use their root chat, completion, and structured-output methods.
---

# Client

Use `BlazingAgents` in synchronous applications and `AsyncBlazingAgents` in
native async applications. Construction makes no network request.

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

An explicit `api_key` overrides `BLAZING_AGENTS_API_KEY`. `default_headers`
apply to every request; `extra_headers` and `timeout` on an operation override
that request. The SDK always owns `Authorization`: it overwrites any supplied
value with the Tenant API key. `X-Request-Id` is server-owned and is removed
from `default_headers` and `extra_headers`; an injected HTTPX client whose
default headers contain it is rejected. Use `client_request_id` rather than
setting correlation headers directly.

The SDK owns the HTTPX client it creates and closes it with the client. A
caller-injected `http_client` remains caller-owned and is never closed by the
SDK.

Ordinary requests default to 60 seconds. `None` disables a timeout. Streaming
requests retain connect, write, and pool timeouts but have no SDK read
deadline. The SDK performs no automatic retries.

### `agent()` [#agent]

**Signature:** `agent(agent_id: str) -> AgentClient`

Selects one Agent and returns its scoped resources without making a network
request. Use `client.agent(agent_id).skills` for every operation on Skills
owned by that Agent. `AsyncBlazingAgents.agent()` returns an
`AsyncAgentClient` with the same `skills` member; await its request methods and
use `async for` with its iterator. See [Skills](/sdk/python/skills).

### `with_options()` [#with-options]

**Signature:** `with_options(*, client_request_id: str) -> BlazingAgents`

Returns a scoped client that adds `X-Client-Request-Id` to resource and
generation calls without changing the original client. The async client has
the same synchronous configuration method and return shape.

```python
correlated = client.with_options(client_request_id="checkout-attempt-42")
agent = correlated.agents.get("ag_0123456789abcdef")
```

Individual operations can instead receive `client_request_id`,
`extra_headers`, and `timeout`.

### `close()` [#close]

**Signature:** `close() -> None`

Closes transport resources owned by a synchronous client. Prefer
`with BlazingAgents(...) as client`; its exit calls `close()`. Injected HTTPX
clients remain open.

### `aclose()` [#aclose]

**Signature:** `await aclose() -> None`

Closes transport resources owned by `AsyncBlazingAgents`. Prefer
`async with AsyncBlazingAgents(...) as client`; its async exit awaits
`aclose()`. The SDK does not bridge synchronous calls through the event loop.

## Response observation and request IDs [#response-observation-and-request-ids]

`on_response` receives a `ResponseObservation` once for every received
response, including API errors, malformed bodies, and streaming handshakes:

| Field | Meaning |
| --- | --- |
| `method` | HTTP method |
| `path` | Path without query parameters |
| `status` | HTTP status |
| `duration_ms` | Elapsed request time in milliseconds |
| `request_id` | Server-owned `X-Request-Id`, when present |
| `client_request_id` | Caller-owned correlation ID, when present |

Callback failures are ignored. A connection failure with no response does not
invoke the callback. Successful Pydantic response models expose the
non-serialized `_request_id`; generated text and stream objects expose
`request_id`. Retain it when contacting support. Each explicit retry is a new
attempt with a new server request ID.

## Errors [#errors]

All SDK exceptions derive from `BlazingAgentsError`.

| Exception | Meaning |
| --- | --- |
| `APIStatusError` | A non-successful response; preserves `status_code`, headers, server `code`, `details`, `param`, `request_id`, safe `response_body`, and `retry_after` |
| `APIConnectionError` | A network failure before a complete response |
| `APITimeoutError` | An HTTP timeout; also an `APIConnectionError` |
| `StreamError` | A read, ownership, header, decoding, or finalization failure after stream headers arrive |
| `ObjectTruncationError` | Complete transport response containing incomplete JSON |
| `ObjectJSONDecodeError` | Complete transport response containing invalid JSON |
| `ObjectValidationError` | Decoded JSON that fails the requested Pydantic-compatible output type |

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

Cancellation, `KeyboardInterrupt`, and `SystemExit` are not wrapped. Decide
whether and when to retry explicitly from the operation semantics,
`retry_after`, and status.

## Logging and telemetry [#logging-and-telemetry]

The SDK is silent by default. It sends no telemetry or background analytics
and starts no background tasks. If the host enables the `blazing_agents`
logger at debug level, each record contains only method, path without query,
status, elapsed time, and request ID. Credentials, headers, query values,
bodies, schemas, file data, and stream content are never logged.

## Generation methods [#generation-methods]

The Python client exposes stateful chat plus buffered and streaming forms of
stateless text and structured generation. Every call creates a metered Turn.
All arguments are keyword-only and use snake case.

Pass exactly one literal source (`message` or `prompt`) or `prompt_id`.
`variables` is valid only with `prompt_id`. Generation calls also accept a
Version `version`, End-user Attribution through `user_id` and `metadata`,
`client_request_id`, `extra_headers`, and a per-request `timeout`.

The asynchronous client uses the same five operation names with `await`.
There is no `achat()` or other `a`-prefixed generation alias.

## Methods [#methods]

### `chat()` [#chat]

**Signature:** `chat(*, agent_id, message=..., prompt_id=..., variables=..., trigger=..., message_id=..., session_id=..., version=..., user_id=..., metadata=..., client_request_id=None, extra_headers=None, timeout=...) -> ChatStream`

Returns a one-owner `ChatStream` of the server's exact AI SDK SSE bytes. The
SDK does not decode or re-encode `UIMessageChunk` values.

```python
with client.chat(
    agent_id="ag_0123456789abcdef",
    message={"id": "message-1", "role": "user", "parts": []},
) as stream:
    session_id = stream.session_id
    for chunk in stream:
        relay(chunk)
```

Omit `session_id` to create a Session; the resolved `ss_...` ID comes from the
response `Location` header and is available before body consumption. Pass it
to a later call to continue that Session. A resumed Session cannot receive a
new Version Pin. `regenerate-message` applies only to a resumed Session and
can select `message_id`.

The async form is `stream = await client.chat(...)`, followed by
`async with stream` and `async for chunk in stream`.

### `completion()` [#completion]

**Signature:** `completion(*, agent_id, prompt=..., prompt_id=..., variables=..., version=..., user_id=..., metadata=..., client_request_id=None, extra_headers=None, timeout=...) -> Completion`

Buffers the complete plain-text result. `Completion` is a `str` subclass with
the originating `request_id`.

```python
result = client.completion(
    agent_id="ag_0123456789abcdef",
    prompt="Summarize this request.",
)
print(str(result), result.request_id)
```

Use `await client.completion(...)` with `AsyncBlazingAgents`.

### `completion_stream()` [#completion-stream]

**Signature:** `completion_stream(*, agent_id, prompt=..., prompt_id=..., variables=..., version=..., user_id=..., metadata=..., client_request_id=None, extra_headers=None, timeout=...) -> CompletionStream`

Returns a one-owner context-managed stream of decoded text deltas.
`get_final_text()` drains any unread remainder and returns the correlated
`Completion`. Exhaustion closes the stream; use `close()` for early exit.

```python
with client.completion_stream(
    agent_id="ag_0123456789abcdef",
    prompt="Write a release note.",
) as stream:
    for delta in stream:
        print(delta, end="")
    final = stream.get_final_text()
```

The async form is `stream = await client.completion_stream(...)`; use
`async with`, `async for`, `await stream.get_final_text()`, and
`await stream.aclose()` for early exit.

### `object()` [#object]

**Signature:** `object(*, agent_id, output_type=..., json_schema=..., prompt=..., prompt_id=..., variables=..., version=..., user_id=..., metadata=..., client_request_id=None, extra_headers=None, timeout=...) -> object`

Pass exactly one of a Pydantic-compatible `output_type` or raw `json_schema`.
The SDK derives JSON Schema from `output_type`, decodes only the complete
response, and validates it through Pydantic's `TypeAdapter`. A raw schema
returns JSON-compatible Python values.

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

**Signature:** `object_stream(*, agent_id, output_type=..., json_schema=..., prompt=..., prompt_id=..., variables=..., version=..., user_id=..., metadata=..., client_request_id=None, extra_headers=None, timeout=...) -> ObjectStream`

Returns a one-owner stream of raw JSON text deltas. It never emits partial
Pydantic models. `get_final_object()` drains unread data and validates only
after the stream completes successfully. Invalid, truncated, or
type-incompatible final output raises its specific stream exception.

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

The async form is `stream = await client.object_stream(...)`; use
`async with`, `async for`, `await stream.get_final_object()`, and
`await stream.aclose()` for early exit.

## Stream ownership and failures [#stream-ownership-and-failures]

Chat, completion, and object streams have exactly one consumer. A second
iteration, iteration after close, a failed read, malformed Session location,
or incomplete finalization raises `StreamError` or a more specific object
error. Exhaustion closes automatically. A context manager is the safest way
to close early; closing an active chat or generation stream propagates
cancellation to the server.

Pre-stream status, connection, and timeout failures use the client exception
hierarchy. Stream objects expose status, headers, and `request_id` before
consumption.

## Related [#related]

- [Generation and streaming](/agents/output/generation-and-streaming)
- [Structured output](/agents/output/structured-output)
- [REST generation](/api-reference/rest-api/generation)
- [REST Session Turns](/api-reference/rest-api/sessions#create-session-turn)
- [Streaming protocol](/api-reference/protocols/streaming)
