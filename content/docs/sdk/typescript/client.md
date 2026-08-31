---
title: Client
description: Configure the TypeScript client and use its root chat, completion, and structured-output methods.
---

# Client

`BlazingAgents` is the entry point for the Server SDK. Create one client for a Tenant API key, then reuse its resource properties and generation methods.

## Overview [#overview]

The client sends the API key as a bearer token, serializes JSON request bodies, and validates successful JSON resource responses. It also converts API, transport, response, and streaming failures into `BlazingAgentsError`.

The default base URL is the local API development server. Set `baseUrl` when connecting to another deployment.

## Available capabilities [#available-capabilities]

| Client member | Description | Reference |
| --- | --- | --- |
| `agents` | Configure Agents and immutable Agent Versions | [Agents](/sdk/typescript/agents) |
| `sessions` | Inspect Sessions and handle Tool approvals | [Sessions](/sdk/typescript/sessions) |
| `agent(agentId).skills` | Manage one Agent's Skill archives | [Skills](/sdk/typescript/skills) |
| `providers` | Manage Provider credentials and discover models | [Providers](/sdk/typescript/providers) |
| `mcpConnections` | Configure MCP servers and Agent attachments | [MCP connections](/sdk/typescript/mcp-connections) |
| `memories` | Read and delete Agent Memory | [Memories](/sdk/typescript/memories) |
| `prompts` | Manage versioned Prompt templates | [Prompts](/sdk/typescript/prompts) |
| `usage` | Query metered usage | [Usage](/sdk/typescript/usage) |
| `artifacts` | List generated Artifacts and create download URLs | [Artifacts](/sdk/typescript/artifacts) |
| `tasks` | Inspect durable Tasks | [Tasks](/sdk/typescript/tasks) |
| `tenant` | Read and update Tenant configuration | [Tenant](/sdk/typescript/tenant) |
| `workspaces` | Manage secure execution Workspaces | [Workspaces](/sdk/typescript/workspaces) |
| `chat()` | Run a stateful Session Turn | [Generation](/sdk/typescript/client#chat) |
| `completion()` | Stream stateless text | [Generation](/sdk/typescript/client#completion) |
| `object()` | Stream stateless structured output | [Generation](/sdk/typescript/client#object) |

## Create a client [#create-a-client]

**Signature:** `new BlazingAgents(options: BlazingAgentsOptions)`

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `apiKey` | `string` | yes | — | Tenant API key sent on every request |
| `baseUrl` | `string` | no | `http://localhost:8787` | API origin; trailing slashes are removed |
| `fetch` | `BlazingAgentsFetch` | no | `globalThis.fetch` | Replacement transport for instrumentation, tests, or runtime integration |
| `onResponse` | `(response: ResponseObservation) => void` | no | — | Observes every received response before body decoding |

```typescript
import { BlazingAgents } from "@blazing-agents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
  baseUrl: "https://api.example.com/",
  onResponse(response) {
    console.log(response.requestId, response.status);
  },
});

const correlated = client.withOptions({
  clientRequestId: "checkout-attempt-42",
});
const agent = await correlated.agents.get("ag_0123456789abcdef");
```

The constructor creates the resource clients synchronously and does not make a network request. Requests use `Authorization: Bearer <apiKey>`.

`onResponse` receives `method`, path without query, `status`, `durationMs`,
the server-owned `requestId`, and the request's optional `clientRequestId`.
It runs for successes, API errors, malformed responses, and streaming
handshakes, but not failures with no HTTP response. Hook failures are ignored.
Retain `requestId` when contacting support.

### `agent()` [#agent]

Selects one Agent and returns its scoped resources. Creating the scoped client
does not make a network request.

**Signature:** `agent(agentId: string): AgentClient`

Use `client.agent(agentId).skills` for every operation on Skills owned by that
Agent. See [Skills](/sdk/typescript/skills).

### `withOptions()` [#with-options]

Creates a scoped client view that correlates any resource or generation
request without manipulating raw headers. The original client is unchanged.

**Signature:** `withOptions(options: BlazingAgentsRequestOptions): BlazingAgents`

Generation inputs also
accept `clientRequestId` directly. The caller-owned ID
uses 1–128 ASCII letters, digits, `.`, `_`, `:`, or `-`.

## Custom fetch [#custom-fetch]

Use `fetch` to add observability or integrate with a runtime-specific transport. The replacement must preserve the SDK request and return a standard `Response`.

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

The SDK supplies the URL, method, bearer header, body, and any supported abort signal. JSON requests include `Content-Type: application/json`; multipart uploads let `fetch` set the boundary.

## Cancellation [#cancellation]

Generation inputs accept `signal`. Tool approval methods accept an options object containing `signal`:

```typescript
const controller = new AbortController();

const pending = client.completion({
  agentId: "ag_0123456789abcdef",
  prompt: "Summarize this request.",
  signal: controller.signal,
});

controller.abort();
await pending;
```

`sessions.decideToolApproval()` and `sessions.joinToolApprovalContinuation()` also support `{ signal }`. Other resource methods do not expose per-request cancellation.

A caller abort throws `BlazingAgentsError` with `code: "request_aborted"`. A fetch failure before an HTTP exchange throws `code: "network_error"`.

## Errors [#errors]

All SDK request failures throw `BlazingAgentsError`. API error codes remain open so a newer server code can pass through unchanged.

```typescript
import { BlazingAgentsError } from "@blazing-agents/sdk";

try {
  await client.agents.get("ag_0123456789abcdef");
} catch (error) {
  if (
    BlazingAgentsError.isInstance(error) &&
    error.code === "not_found"
  ) {
    console.log("Agent not found", error.requestId);
  }
}
```

| Field | Type | Description |
| --- | --- | --- |
| `code` | `BlazingAgentsErrorCode` | Stable API or SDK-local machine-readable code |
| `message` | `string` | Human-readable description; do not branch on it |
| `status` | `number \| undefined` | HTTP status when a response was received |
| `details` | `Record<string, unknown> \| undefined` | Structured API error details |
| `param` | `string \| undefined` | Invalid parameter identified by the API |
| `headers` | `Headers \| undefined` | Response headers when available |
| `requestId` | `string \| undefined` | Request identifier returned by the API |
| `responseBody` | `string \| undefined` | Bounded diagnostic body for an invalid response |
| `responseBodyTruncated` | `boolean \| undefined` | Whether diagnostic content was truncated |
| `cause` | `unknown` | Underlying transport, parsing, or stream error |

Use `BlazingAgentsError.isInstance(error)` instead of `instanceof` when package duplication or cross-realm values are possible.

| SDK-local code | Meaning |
| --- | --- |
| `network_error` | `fetch` failed before an HTTP response |
| `request_aborted` | The caller's abort signal stopped the request |
| `invalid_response` | A non-streaming response or API error envelope was malformed |
| `stream_error` | A streaming response was missing, malformed, already claimed, or failed while decoding |

See the canonical [error contract](/api-reference/protocols/errors#blazingagentserrorcode).

## End-to-end workflow [#end-to-end-workflow]

Create a client, inspect an Agent, and run a stateless completion:

```typescript
import { BlazingAgents } from "@blazing-agents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
  baseUrl: process.env.BLAZING_AGENTS_BASE_URL,
});

const agent = await client.agents.get("ag_0123456789abcdef");

const result = await client.completion({
  agentId: agent.id,
  prompt: "Introduce yourself in one sentence.",
});

console.log(await result.text);
```

## Generation methods [#generation-methods]

The client exposes three generation methods. After admission, `chat()` creates
the Session before the model loop and persists the submitted user message even
when execution later fails; only a successful Turn adds the assistant response.
Earlier validation or admission failures leave no Session. `completion()` and
`object()` are stateless.
Every generation call still creates a metered Turn.

## Overview [#overview]

Every generation input requires `agentId`. Optional `userId` and `metadata` add End-user Attribution; omit them for tenant-level Attribution. Pass `signal` to cancel the request. Pass `clientRequestId` to correlate this attempt with caller-owned logs without manipulating headers.

Each method accepts either literal content or a saved Prompt:

- Pass `message` to `chat()` or `prompt` to `completion()` and `object()`.
- Pass `promptId` instead to render a saved Prompt. `variables` is available only with `promptId`.

## Available methods [#available-methods]

| Method | State | Output | Returns |
| --- | --- | --- | --- |
| [`chat()`](#chat) | Creates or resumes a Session | AI SDK UI-message stream | `ChatResult` |
| [`completion()`](#completion) | Stateless | Text stream and final text | `CompletionResult` |
| [`object()`](#object) | Stateless | Partial objects and final JSON value | `ObjectResult` |

## Methods [#methods]

### `chat()` [#chat]

Creates a Session when `sessionId` is omitted, or resumes an existing Session when it is provided.

**Signature:** `chat(input: ChatInput): Promise<ChatResult>`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |
| `message` | `UIMessage` | one source | Literal AI SDK UI message; mutually exclusive with `promptId` |
| `promptId` | `string` | one source | Saved Prompt ID (`prompt_…`); mutually exclusive with `message` |
| `variables` | `Record<string, string>` | no | Saved Prompt variables; valid only with `promptId` |
| `sessionId` | `string` | no | Existing Session ID (`ss_…`); omit to create a Session |
| `version` | `number` | no | Agent Version Pin; valid only when creating a Session |
| `trigger` | `"submit-message" \| "regenerate-message"` | no | Turn action; a new Session accepts only `submit-message`; defaults to it |
| `messageId` | `string` | no | Transcript message selected by regeneration |
| `userId` | `string` | no | End-user Attribution ID |
| `metadata` | `Record<string, unknown>` | no | Tenant-defined Attribution metadata |
| `clientRequestId` | `string` | no | Caller-owned request correlation sent as `X-Client-Request-Id` |
| `signal` | `AbortSignal` | no | Cancels the request |

`regenerate-message` is valid only when resuming a Session. Its optional `messageId` selects where the transcript is truncated. A resumed Session keeps its immutable Version Pin, so `version` cannot be combined with `sessionId`.

```typescript
const chat = await client.chat({
  agentId: "ag_0123456789abcdef",
  message: {
    id: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: "Hello" }],
  },
});

console.log(await chat.sessionId);
```

Omitting `sessionId` calls [`POST /v1/agents/:agentId/sessions`](/api-reference/rest-api/sessions#create-session-turn). Passing it calls [`POST /v1/agents/:agentId/sessions/:sessionId`](/api-reference/rest-api/sessions#resume-session-turn).

Returns [`ChatResult`](#types). `toResponse()` exposes the one-shot AI SDK UI-message SSE response for relay. The Session ID promise is independent of consuming the body.

Pre-stream API and transport failures throw before a result is returned. A missing or malformed Session `Location` header or a second body claim raises `stream_error`.

### `completion()` [#completion]

Runs stateless text generation and exposes both incremental text and an awaited final string.

**Signature:** `completion(input: CompletionInput): Promise<CompletionResult>`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |
| `prompt` | `string` | one source | Literal prompt; mutually exclusive with `promptId` |
| `promptId` | `string` | one source | Saved Prompt ID (`prompt_…`); mutually exclusive with `prompt` |
| `variables` | `Record<string, string>` | no | Saved Prompt variables; valid only with `promptId` |
| `version` | `number` | no | Agent Version Pin |
| `userId` | `string` | no | End-user Attribution ID |
| `metadata` | `Record<string, unknown>` | no | Tenant-defined Attribution metadata |
| `clientRequestId` | `string` | no | Caller-owned request correlation sent as `X-Client-Request-Id` |
| `signal` | `AbortSignal` | no | Cancels the request |

```typescript
const completion = await client.completion({
  agentId: "ag_0123456789abcdef",
  prompt: "Write one sentence about durable agents.",
});

for await (const text of completion.textStream) {
  process.stdout.write(text);
}
```

Calls [`POST /v1/agents/:agentId/generation`](/api-reference/rest-api/generation#generate) and returns [`CompletionResult`](#types). `textStream` yields text as it arrives; `text` resolves to the complete output. `toResponse()` creates a plain-text streaming `Response` and may be called once.

Pre-stream API and transport failures throw before a result is returned. A missing response body, failed stream, or second `toResponse()` call raises `stream_error`.

### `object()` [#object]

Runs stateless structured generation against a JSON Schema and exposes partial values while the JSON is forming.

**Signature:** `object(input: ObjectInput): Promise<ObjectResult>`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | Agent ID (`ag_…`) |
| `schema` | `Record<string, unknown>` | yes | JSON Schema describing the required output |
| `prompt` | `string` | one source | Literal prompt; mutually exclusive with `promptId` |
| `promptId` | `string` | one source | Saved Prompt ID (`prompt_…`); mutually exclusive with `prompt` |
| `variables` | `Record<string, string>` | no | Saved Prompt variables; valid only with `promptId` |
| `version` | `number` | no | Agent Version Pin |
| `userId` | `string` | no | End-user Attribution ID |
| `metadata` | `Record<string, unknown>` | no | Tenant-defined Attribution metadata |
| `clientRequestId` | `string` | no | Caller-owned request correlation sent as `X-Client-Request-Id` |
| `signal` | `AbortSignal` | no | Cancels the request |

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

Calls [`POST /v1/agents/:agentId/generation`](/api-reference/rest-api/generation#generate) and returns [`ObjectResult`](#types). `partialObjectStream` yields parsed partial values; `object` resolves to the final value typed as `unknown`. Validate or narrow it before use. `toResponse()` relays the generated JSON text in a plain-text streaming `Response` and may be called once.

Pre-stream API and transport failures throw before a result is returned. A missing or failed stream, invalid final JSON, or second `toResponse()` call raises `stream_error`.

## Types [#types]

```typescript
interface ChatResult {
  requestId?: string;
  sessionId: Promise<string>;
  toResponse: () => Response;
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

`requestId` comes only from the server's `x-request-id` response header and
identifies that HTTP attempt. Successful terminal message metadata separately
exposes the metered `turnId`. `BlazingAgentsUIMessageChunk` is the AI SDK v7
`UIMessageChunk` contract with Blazing Agents message metadata. The package
also re-exports `UIMessage`.

See [streaming contracts](/api-reference/protocols/streaming) and [objects and schemas](/api-reference/protocols/objects-and-schemas).

## Prompt and Attribution inputs [#prompt-and-attribution-inputs]

Prompt-source unions make invalid combinations visible to TypeScript:

```typescript
type CompletionInput =
  | {
      agentId: string;
      prompt: string;
      promptId?: never;
      variables?: never;
      version?: number;
      userId?: string;
      metadata?: Record<string, unknown>;
      signal?: AbortSignal;
    }
  | {
      agentId: string;
      prompt?: never;
      promptId: string;
      variables?: Record<string, string>;
      version?: number;
      userId?: string;
      metadata?: Record<string, unknown>;
      signal?: AbortSignal;
    };
```

`ChatInput` follows the same source rule with `message` instead of `prompt`, plus the new-or-existing Session union. `ObjectInput` follows `CompletionInput` and requires `schema`.

| Exported type | Contract |
| --- | --- |
| `AttributionInput` | Optional `userId` and `metadata` shared by generation inputs |
| `ChatTrigger` | Either `"submit-message"` or `"regenerate-message"` |
| `ChatMessageInput` / `ChatPromptInput` | `agentId` plus exactly one message source; create accepts only `submit-message`, while resume also accepts `regenerate-message` |
| `ChatInput` | Union of the two chat inputs |
| `ChatResult` | Optional request ID, Session ID promise, and terminal UI-message stream/response helpers |
| `CompletionPromptInput` / `CompletionPromptIdInput` | `agentId`, exactly one Prompt source; optional Version Pin, Attribution, and signal |
| `CompletionInput` | Union of the two completion inputs |
| `CompletionResult` | Optional request ID, text stream, final text promise, and response helper |
| `ObjectPromptInput` / `ObjectPromptIdInput` | Completion fields plus required JSON `schema` |
| `ObjectInput` | Union of the two object inputs |
| `ObjectResult` | Optional request ID, partial-object stream, final object promise, and response helper |
| `BlazingAgentsUIMessage` / `BlazingAgentsUIMessageChunk` | AI SDK message contracts with Blazing Agents metadata |
| `TerminalStreamResult` | Optional request ID and one-shot UI-message stream/response helpers, also used by Tool approval continuation |
| `UIMessage` | Public re-export of AI SDK v7's `UIMessage` type |

## Generation errors [#generation-errors]

Generation failures throw `BlazingAgentsError`. Branch on its stable `code`, not its message.

| Code | When |
| --- | --- |
| API error code | The server rejects the request before streaming; exact code, details, parameter, headers, and request ID are preserved |
| `request_aborted` | The caller's signal aborts before an HTTP response |
| `network_error` | `fetch` fails before an HTTP exchange |
| `invalid_response` | A pre-stream API error response is malformed |
| `stream_error` | Session headers, response bodies, stream decoding, body ownership, or final JSON are invalid |

Stream errors retain the originating request ID when available. See [protocol errors](/api-reference/protocols/errors).

## Generation workflow [#generation-workflow]

Create a Session, consume its UI-message stream, then resume the same Session:

```typescript
import { BlazingAgents } from "@blazing-agents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});

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

const resumed = await client.chat({
  agentId: "ag_0123456789abcdef",
  sessionId,
  message: {
    id: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: "What is my project called?" }],
  },
  userId: "user_123",
});

await resumed.toResponse().text();
```

## Related [#related]

- [Generation and streaming](/agents/output/generation-and-streaming)
- [Structured output](/agents/output/structured-output)
- [Build a chat endpoint](/platform/sessions-and-turns)
- [Generate structured output](/agents/output/structured-output)
- [REST generation](/api-reference/rest-api/generation)
- [REST Session Turns](/api-reference/rest-api/sessions#create-session-turn)
