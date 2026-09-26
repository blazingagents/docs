---
title: Client
description: Configure the TypeScript client and run turns with chat, completion, and structured output.
---

# Client

`BlazingAgents` is the one object your backend creates. Give it your API key once, then use its resource properties such as `client.agents` and its generation methods `chat()`, `completion()`, and `object()`. The [TypeScript SDK overview](/sdk/typescript#client-objects) lists every resource property.

## Create a client [#create-a-client]

```typescript
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
  onResponse(response) {
    console.log(response.requestId, response.status);
  },
});
```

**Signature:** `new BlazingAgents(options: BlazingAgentsOptions)`

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `apiKey` | `string` | yes | none | Your API key, sent on every request |
| `baseUrl` | `string` | no | `https://api.blazingagents.com` | API origin; trailing slashes are removed |
| `clientRequestId` | `string` | no | none | Your own correlation ID, sent as `X-Client-Request-Id` on every request |
| `fetch` | `BlazingAgentsFetch` | no | `globalThis.fetch` | Replacement transport for logging, tests, or another runtime |
| `onResponse` | `(response: ResponseObservation) => void` | no | none | Called for every response before the body is read |

Creating a client makes no network request. Requests send `Authorization: Bearer <apiKey>`.

`onResponse` receives `method`, the path without its query string, `status`, `durationMs`, the server's `requestId`, and your `clientRequestId` if you set one. It runs for successes, API errors, malformed responses, and the start of each stream. It does not run when no response arrives, and an error thrown inside it is ignored. Keep `requestId` for support requests.

### `agent()` [#agent]

Selects one agent and returns the resources that belong to it. It makes no network request.

**Signature:** `agent(input: { agentId: string }): AgentClient`

```typescript
const { data } = await client.agent({ agentId: "ag_0123456789abcdef" }).skills.list();
```

Every skill operation goes through `client.agent({ agentId }).skills`. See [Skills](/sdk/typescript/skills).

### `withOptions()` [#with-options]

Returns a copy of the client that tags every request with your correlation ID. The original client is unchanged.

**Signature:** `withOptions(options: BlazingAgentsRequestOptions): BlazingAgents`

```typescript
const correlated = client.withOptions({ clientRequestId: "checkout-attempt-42" });
const agent = await correlated.agents.get({ agentId: "ag_0123456789abcdef" });
```

The ID uses 1 to 128 ASCII letters, digits, `.`, `_`, `:`, or `-`. Generation inputs also accept `clientRequestId` directly.

## Custom fetch [#custom-fetch]

Pass `fetch` to time requests or to run on a runtime with its own transport. Your function must forward the request unchanged and return a standard `Response`.

**Type:** `type BlazingAgentsFetch = (input: string, init?: BlazingAgentsRequestInit) => Promise<Response>`

```typescript
const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
  fetch: async (input, init) => {
    const startedAt = performance.now();
    try {
      return await fetch(input, init);
    } finally {
      console.log(init?.method ?? "GET", input, performance.now() - startedAt);
    }
  },
});
```

The SDK supplies the URL, method, auth header, body, and abort signal. JSON requests include `Content-Type: application/json`. File uploads leave the multipart boundary to `fetch`.

## Cancellation [#cancellation]

Every network method accepts an optional `abortSignal` in its input object, including reads, writes, uploads, and generation:

```typescript
const controller = new AbortController();

const pending = client.completion({
  agentId: "ag_0123456789abcdef",
  prompt: "Summarize this request.",
  abortSignal: controller.signal,
});

controller.abort();
await pending;
```

The SDK passes it to `fetch` as `signal`. Aborting throws `BlazingAgentsError` with `code: "request_aborted"`. It stops your wait, not work the server already finished.

## Errors [#errors]

Every failed request throws `BlazingAgentsError`. Branch on `code`, never on `message`.

```typescript
import { BlazingAgentsError } from "@blazingagents/sdk";

try {
  await client.agents.get({ agentId: "ag_0123456789abcdef" });
} catch (error) {
  if (BlazingAgentsError.isInstance(error) && error.code === "not_found") {
    console.log("Agent not found", error.requestId);
  }
}
```

Use `BlazingAgentsError.isInstance(error)` rather than `instanceof`, which fails when your app loads two copies of the package.

| Field | Type | Description |
| --- | --- | --- |
| `code` | `BlazingAgentsErrorCode` | Machine-readable API or SDK code |
| `message` | `string` | Human-readable description |
| `status` | `number \| undefined` | HTTP status, when a response arrived |
| `details` | `Record<string, unknown> \| undefined` | Structured error details from the API |
| `param` | `string \| undefined` | The invalid parameter, when the API names one |
| `headers` | `Headers \| undefined` | Response headers, when available |
| `requestId` | `string \| undefined` | The server's ID for the request |
| `responseBody` | `string \| undefined` | A bounded copy of an unreadable response body |
| `responseBodyTruncated` | `boolean \| undefined` | Whether `responseBody` was cut short |
| `cause` | `unknown` | The underlying transport, parsing, or stream error |

Besides API codes, the SDK raises four codes of its own. `code` stays an open string type, so a code added to the API later reaches you unchanged.

| SDK code | Meaning |
| --- | --- |
| `network_error` | `fetch` failed before any response arrived |
| `request_aborted` | Your abort signal stopped the request |
| `invalid_response` | A response or error body could not be read |
| `stream_error` | A stream was missing, malformed, read twice, or broke while reading |

The [error reference](/api-reference/protocols/errors#blazingagentserrorcode) lists every API code.

## Generation methods [#generation-methods]

Three methods run an agent. `chat()` keeps a session, a conversation Blazing Agents stores for you. `completion()` and `object()` keep nothing between calls. Every call counts as one turn in your usage.

| Method | Session | Output | Returns |
| --- | --- | --- | --- |
| [`chat()`](#chat) | Starts or continues one | AI SDK UI message stream | `ChatResult` |
| [`completion()`](#completion) | None | Text stream and final text | `CompletionResult` |
| [`object()`](#object) | None | Partial objects and final JSON value | `ObjectResult` |

Every input needs `agentId` and exactly one source: `message` for `chat()` or `prompt` for the others, or a saved prompt's `promptId` with optional `variables`. Add `userId` and `metadata` to label the turn for one of your users; leave them out for tenant-level usage. `abortSignal` and `clientRequestId` work as described above.

### `chat()` [#chat]

Starts a session, or continues one when you pass `sessionId`.

**Signature:** `chat(input: ChatInput): Promise<ChatResult>`

```typescript
const first = await client.chat({
  agentId: "ag_0123456789abcdef",
  message: {
    id: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: "Remember that my project is Atlas." }],
  },
  userId: "user_123",
});

const sessionId = await first.sessionId;
await first.toResponse().text();

const next = await client.chat({
  agentId: "ag_0123456789abcdef",
  sessionId,
  message: {
    id: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: "What is my project called?" }],
  },
  userId: "user_123",
});

const response = next.toResponse(); // return this from your route
```

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |
| `message` | `UIMessage` | one source | The user's AI SDK UI message |
| `promptId` | `string` | one source | Saved prompt ID (`prompt_…`) |
| `variables` | `Record<string, string>` | no | Saved prompt variables; only with `promptId` |
| `sessionId` | `string` | no | Session to continue (`ss_…`); omit to start one |
| `version` | `number` | no | Agent version to pin; only when starting a session |
| `trigger` | `"submit-message" \| "regenerate-message"` | no | Defaults to `submit-message`; `regenerate-message` needs `sessionId` |
| `messageId` | `string` | no | Message to regenerate from |
| `userId` | `string` | no | Your end user's ID, for usage and reporting |
| `metadata` | `Record<string, unknown>` | no | Your labels for the turn |
| `clientRequestId` | `string` | no | Your correlation ID |
| `abortSignal` | `AbortSignal` | no | Cancels the request |

Pass `version` to pin a new session to one agent version for its whole life; without it, each turn uses the agent's current version. You cannot pass `version` when you continue a session. To regenerate an answer, send `trigger: "regenerate-message"` with a `message` or `promptId` as usual. The transcript is cut from `messageId`, or from the latest assistant message when you omit it, and replaced only if the new turn succeeds.

Returns [`ChatResult`](#types). `sessionId` resolves as soon as the server accepts the turn, before the answer streams, so save it right away. From that point the session keeps the user's message even if the turn later fails. Read the body once, through either `toResponse()` (a `Response` you can return from a route) or `toStream()` (the same bytes as a `ReadableStream`).

Errors before streaming throw from `chat()` itself. Reading the body twice raises `stream_error`. See [`POST /v1/agents/:agentId/sessions`](/api-reference/rest-api/sessions#create-session-turn).

### `completion()` [#completion]

Generates text once, without a session.

**Signature:** `completion(input: CompletionInput): Promise<CompletionResult>`

```typescript
const completion = await client.completion({
  agentId: "ag_0123456789abcdef",
  prompt: "Write one sentence about durable agents.",
});

for await (const text of completion.textStream) {
  process.stdout.write(text);
}
```

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |
| `prompt` | `string` | one source | The prompt text |
| `promptId` | `string` | one source | Saved prompt ID (`prompt_…`) |
| `variables` | `Record<string, string>` | no | Saved prompt variables; only with `promptId` |
| `version` | `number` | no | Agent version to use |
| `userId` | `string` | no | Your end user's ID |
| `metadata` | `Record<string, unknown>` | no | Your labels for the turn |
| `clientRequestId` | `string` | no | Your correlation ID |
| `abortSignal` | `AbortSignal` | no | Cancels the request |

Returns [`CompletionResult`](#types). `textStream` yields text as it arrives and `text` resolves to the whole output. `toResponse()` returns a plain-text streaming `Response` and works once. A broken stream or a second `toResponse()` call raises `stream_error`. See [`POST /v1/agents/:agentId/generation`](/api-reference/rest-api/generation#generate).

### `object()` [#object]

Generates one JSON value that matches your JSON Schema, without a session.

**Signature:** `object(input: ObjectInput): Promise<ObjectResult>`

```typescript
const result = await client.object({
  agentId: "ag_0123456789abcdef",
  prompt: "Return a concise article title.",
  schema: {
    type: "object",
    properties: { title: { type: "string" } },
    required: ["title"],
    additionalProperties: false,
  },
});

console.log(await result.object);
```

Takes the same fields as [`completion()`](#completion) plus a required `schema: Record<string, unknown>`.

Returns [`ObjectResult`](#types). `partialObjectStream` yields partial values while the JSON forms, and `object` resolves to the final value as `unknown`, so check its shape before you use it. `toResponse()` streams the JSON text as plain text and works once. A broken stream, invalid final JSON, or a second `toResponse()` call raises `stream_error`. See [structured output](/agents/output/structured-output).

## Types [#types]

```typescript
interface ChatResult {
  requestId?: string;
  sessionId: Promise<string>;
  toResponse: () => Response;
  toStream: () => ReadableStream<Uint8Array>;
}

interface CompletionResult {
  requestId?: string;
  textStream: AsyncIterable<string>;
  text: Promise<string>;
  toResponse: () => Response;
}

interface ObjectResult {
  requestId?: string;
  partialObjectStream: AsyncIterable<unknown>;
  object: Promise<unknown>;
  toResponse: () => Response;
}
```

`requestId` identifies the HTTP request. The turn's own `turnId`, which your usage records use, arrives at the end of the stream in `metadata.blazingAgents.usage.turnId` on the final message.

Input types are unions, so TypeScript rejects a call that passes both `prompt` and `promptId`, or `variables` without `promptId`:

| Exported type | Shape |
| --- | --- |
| `ChatInput` | `ChatMessageInput \| ChatPromptInput` |
| `CompletionInput` | `CompletionPromptInput \| CompletionPromptIdInput` |
| `ObjectInput` | `ObjectPromptInput \| ObjectPromptIdInput`, each with `schema` |
| `AttributionInput` | Optional `userId` and `metadata` |
| `ChatTrigger` | `"submit-message" \| "regenerate-message"` |
| `TerminalStreamResult` | `requestId`, `toStream()`, and `toResponse()`; returned by [`sessions.joinToolApprovalContinuation()`](/sdk/typescript/sessions#join-tool-approval-continuation) |
| `BlazingAgentsUIMessage` / `BlazingAgentsUIMessageChunk` | AI SDK message types with Blazing Agents metadata |
| `UIMessage` | Re-export of the AI SDK `UIMessage` type |

## Next [#next]

- [Generation and streaming](/agents/output/generation-and-streaming)
- [Sessions and turns](/platform/sessions-and-turns)
- [Streaming protocol](/api-reference/protocols/streaming)
