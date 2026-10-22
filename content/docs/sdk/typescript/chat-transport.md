---
title: Chat transport and relays
description: Connect AI SDK useChat and useCompletion to your agents with the TypeScript relay handlers and chat transports.
---

# Chat transport and relays

The SDK connects the AI SDK `useChat` hook to your agents while your API key stays on your server. On the server, `createChatRelay()` turns each browser request into a turn that runs as the signed-in end user. In the browser, `BlazingAgentsChatTransport` sends `useChat` messages to that relay and remembers the session. For a complete app, follow [Build a chatbot](/getting-started/chatbot).

```typescript title="server.ts"
import { BlazingAgents, createChatRelay } from "@blazingagents/sdk";

// Your own sign-in check, returning the user and the agent you created for them.
declare function verifySignIn(request: Request): Promise<{ id: string; agentId: string } | null>;

const client = new BlazingAgents({ apiKey: process.env.BLAZING_AGENTS_API_KEY! });

export const relayChat = createChatRelay({
  client,
  async resolveContext(request) {
    const user = await verifySignIn(request);
    return user ? { agentId: user.agentId, userId: user.id } : null;
  },
});
```

Serve `relayChat` at the path the transport posts to, here `/api/chat`, for example `app.post("/api/chat", (c) => relayChat(c.req.raw))` in Hono.

```tsx title="Chat.tsx"
import { useChat } from "@ai-sdk/react";
import { BlazingAgentsChatTransport } from "@blazingagents/sdk";
import { useState } from "react";

export function Chat() {
  const [transport] = useState(
    () =>
      new BlazingAgentsChatTransport({
        api: "/api/chat",
        sessionId: localStorage.getItem("chat-session") ?? undefined,
        onSessionId: (id) => localStorage.setItem("chat-session", id),
      }),
  );
  const { messages, sendMessage } = useChat({ transport });

  return (
    <div>
      {messages.map((message) => (
        <p key={message.id}>
          {message.parts.map((part) => (part.type === "text" ? part.text : "")).join("")}
        </p>
      ))}
      <button type="button" onClick={() => sendMessage({ text: "Hello" })}>
        Send
      </button>
    </div>
  );
}
```

## Available exports [#available-exports]

| Export | Runs in | Description |
| --- | --- | --- |
| [`createChatRelay()`](#create-chat-relay) | Your server | Handler for `useChat` requests |
| [`createCompletionRelay()`](#create-completion-relay) | Your server | Handler for `useCompletion` requests |
| [`BlazingAgentsChatTransport`](#chat-transport) | Browser | `useChat` transport that talks to your relay |
| [`BlazingAgentsDirectChatTransport`](#direct-chat-transport) | Your server | `useChat` transport that calls the SDK in the same process |
| `RelayContext` | Your server | The type `resolveContext()` returns |

## Relays [#relays]

### `createChatRelay()` [#create-chat-relay]

Returns a handler that takes a standard `Request` and returns a `Response`, so you can mount it in any framework that uses the Fetch API.

**Signature:** `createChatRelay({ client, resolveContext }): (request: Request) => Promise<Response>`

`client` is your `BlazingAgents` client; the relay uses only its `forUser()`.

`resolveContext()` checks who is signed in and returns a `RelayContext`, or `null` to answer `401 unauthorized`:

| `RelayContext` field | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | The agent that answers. It must belong to `userId`, and so must its workspace |
| `userId` | `string` | yes | The signed-in end user, from your verified sign-in |
| `functions` | `ChatFunctions` | no | [Backend functions](/agents/tools/backend-functions) for this turn and its approved continuation |
| `metadata` | `Record<string, unknown>` | no | Your labels for the turn |

The relay calls `client.forUser(context.userId)` for every request, so each turn is a [scoped turn](/sdk/typescript/client#for-user). An agent or workspace that belongs to someone else answers `404` with `not_found` or `workspace_not_found`. A `sessionId` in the request body that is not that end user's session also answers `404`, so you do not need to record which user owns which session. A new session belongs to that end user.

The relay reads `{ message, messageId?, sessionId?, trigger? }`, which `BlazingAgentsChatTransport` sends:

- A user message starts a session or, with `sessionId`, continues it. `trigger: "regenerate-message"` regenerates from `messageId`.
- An assistant message that carries a complete round of tool approval responses calls [`continueChat()`](/sdk/typescript/client#continue-chat) for that session. See [tool approvals](/agents/tools/tool-approvals).

The relay passes the request's abort signal to the SDK call. It returns the SDK's streaming response, which keeps the `Location`, `x-ba-turn-id`, and `x-request-id` headers.

### `createCompletionRelay()` [#create-completion-relay]

Returns a handler for the AI SDK `useCompletion` hook. It takes the same `client` and `resolveContext` options.

**Signature:** `createCompletionRelay({ client, resolveContext }): (request: Request) => Promise<Response>`

```typescript
import { createCompletionRelay } from "@blazingagents/sdk";

export const relayCompletion = createCompletionRelay({
  client,
  async resolveContext(request) {
    const user = await verifySignIn(request);
    return user ? { agentId: user.agentId, userId: user.id } : null;
  },
});
```

The request body is `{ prompt: string }` with a prompt that is not blank. The relay runs [`completion()`](/sdk/typescript/client#completion) on `client.forUser(context.userId)` with `agentId` and `metadata` from the context, and streams plain text. Set `streamProtocol: "text"` on `useCompletion`.

### Relay errors [#relay-errors]

A relay answers every failure with a JSON body:

```json
{ "error": { "code": "unauthorized", "message": "Authentication required." } }
```

| Status | `code` | When |
| --- | --- | --- |
| `401` | `unauthorized` | `resolveContext()` returned `null` |
| `400` | `invalid_request` | The body is not valid JSON or has the wrong shape, the message is not a valid UI message, or it is neither a user message nor an approval round. An approval round without `sessionId`, or with no approval responses, gets this too |
| API status | API code | The API refused the turn, for example `404 not_found` or `409 session_busy`. The message drops the SDK's `[code]` prefix, and `x-request-id` is set when known |
| `499` | `request_aborted` | The request was aborted before a response arrived |
| `502` | SDK code | The SDK failed without an HTTP status, for example `network_error` |
| `500` | `internal_error` | Anything else, including an error thrown by `resolveContext()` or a `userId` that `forUser()` rejects. The response hides the details |

A `500` for an invalid `userId` sends nothing to the API. Fix the `resolveContext()` that returned it.

## Transports [#transports]

### `BlazingAgentsChatTransport` [#chat-transport]

A `useChat` transport that posts to your relay.

**Signature:** `new BlazingAgentsChatTransport(options?: BlazingAgentsChatTransportOptions)`

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | `string` | no | A session to resume after a reload; an invalid ID throws `invalid_request` |
| `onSessionId` | `(sessionId: string) => void \| Promise<void>` | no | Receives the new session's ID from the first successful response |
| `onTurnId` | `(turnId: string) => void \| Promise<void>` | no | Receives the running turn's ID from each response that names one, before its stream is read |

It also takes the AI SDK HTTP chat transport options `api` (default `/api/chat`), `credentials`, `headers`, `body`, and `fetch`. It sets the request body itself, so `prepareSendMessagesRequest` and `prepareReconnectToStreamRequest` are not accepted.

Each request carries only the newest user message, or the last assistant message when it holds a complete approval round, plus `messageId`, `trigger`, and the known `sessionId`. Without a session, the transport reads the new session ID from the last path segment of the response's `Location` header, calls `onSessionId`, and sends that ID on every later message. A first response without a valid `Location` fails the request. On every response, the transport reads `x-ba-turn-id` and calls `onTurnId`; pass that ID to [`sessions.stop()`](/sdk/typescript/sessions#stop) from your server. If you write your own relay, return the SDK's `toResponse()` so these headers reach the browser.

The transport cannot reconnect to a stream, so `reconnectToStream()` returns `null`. After a reload, pass the saved `sessionId` and load the history with [`sessions.messages()`](/sdk/typescript/sessions#messages) on the scoped client. An approval round sent before any session exists throws.

### `BlazingAgentsDirectChatTransport` [#direct-chat-transport]

A `useChat` transport that calls [`chat()`](/sdk/typescript/client#chat) and [`continueChat()`](/sdk/typescript/client#continue-chat) on an SDK client in the same process, with no HTTP relay. Use it only where your code already holds the API key, such as a server-side chat runtime.

**Signature:** `new BlazingAgentsDirectChatTransport(options: BlazingAgentsDirectChatTransportOptions)`

```typescript
import { BlazingAgentsDirectChatTransport } from "@blazingagents/sdk";

const transport = new BlazingAgentsDirectChatTransport({
  agentId: "ag_0123456789abcdef",
  getClient: () => client,
  onSessionId: (id) => saveSession(id),
});
```

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | yes | The agent that answers |
| `getClient` | `() => BlazingAgents \| Promise<BlazingAgents>` | yes | Returns the tenant client for this chat |
| `sessionId` | `string` | no | A session to continue; an invalid ID throws `invalid_request` |
| `onSessionId` | `(sessionId: string) => void \| Promise<void>` | no | Receives the new session's ID before the stream is read |
| `onTurnId` | `(turnId: string) => void \| Promise<void>` | no | Receives the running turn's ID before the stream is read |
| `functions` | `ChatFunctions` | no | Backend functions for every turn and approved continuation |
| `userId` | `string` | no | Labels a new session for one end user |
| `metadata` | `Record<string, unknown>` | no | Your labels for a new session |
| `promptId` | `string` | no | A saved prompt that starts a new session instead of the user message |
| `variables` | `Record<string, string>` | no | Saved prompt variables; only with `promptId` |

`getClient` returns a tenant client, so these turns run with tenant-wide authority, and `userId` only labels the session. For a browser chat that serves a signed-in end user, use `createChatRelay()` instead.

`sendUserMessages({ messages, abortSignal? })` sends several user messages as one turn and returns the decoded message-chunk stream. Regenerating or sending an approval round needs an existing session, or the transport throws. `reconnectToStream()` returns `null`.

## Next [#next]

- [Build a chatbot](/getting-started/chatbot)
- [Connect Blazing Agents to your app](/getting-started/connect-your-app)
- [Tool approvals](/agents/tools/tool-approvals)
- [Client reference](/sdk/typescript/client#for-user)
