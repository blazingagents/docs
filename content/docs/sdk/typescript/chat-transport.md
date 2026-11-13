---
title: Chat transport and relays
description: Serve a browser chat from your backend with createChatRelay, and connect it to React with useBlazingAgentsChat or to another framework with BlazingAgentsChatTransport.
---

# Chat transport and relays

A browser chat needs two pieces while your API key stays on your server. On the server, `createChatRelay()` answers the browser's requests as the signed-in end user: it streams turns, reads the stored history, and steers the running turn. In a React component, [`useBlazingAgentsChat`](/sdk/typescript/use-blazing-agents-chat) talks to that relay. For a complete app, follow [Build a chatbot](/getting-started/chatbot).

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

Serve `relayChat` at the path the hook posts to, `/api/chat` by default, for example `app.post("/api/chat", (c) => relayChat(c.req.raw))` in Hono. Then call the hook in your component:

```tsx title="Chat.tsx"
import { useBlazingAgentsChat } from "@blazingagents/sdk/react";

export function Chat() {
  const chat = useBlazingAgentsChat();

  return (
    <div>
      {chat.messages.map((message) => (
        <p key={message.id}>
          {message.parts.map((part) => (part.type === "text" ? part.text : "")).join("")}
        </p>
      ))}
      <button type="button" onClick={() => chat.send("Hello")}>
        Send
      </button>
    </div>
  );
}
```

## Available exports [#available-exports]

| Export | Runs in | Description |
| --- | --- | --- |
| [`createChatRelay()`](#create-chat-relay) | Your server | Handler for every chat request from the browser |
| [`createCompletionRelay()`](#create-completion-relay) | Your server | Handler for `useCompletion` requests |
| [`useBlazingAgentsChat`](/sdk/typescript/use-blazing-agents-chat) | Browser | React hook that talks to your relay, from `@blazingagents/sdk/react` |
| [`BlazingAgentsChatTransport`](#chat-transport) | Browser | AI SDK chat transport that talks to your relay, for a framework other than React |
| [`BlazingAgentsDirectChatTransport`](#direct-chat-transport) | Your server | AI SDK chat transport that calls the SDK in the same process |
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

The request body's `op` names the operation. `useBlazingAgentsChat` and `BlazingAgentsChatTransport` send all three:

| `op` | Body | What the relay does |
| --- | --- | --- |
| `chat` | `{ message, messageId?, sessionId?, trigger? }` | A user message starts a session or, with `sessionId`, continues it. `trigger: "regenerate-message"` regenerates from `messageId`. An assistant message that carries a complete round of tool approval responses calls [`continueChat()`](/sdk/typescript/client#continue-chat) for that session. See [tool approvals](/agents/tools/tool-approvals) |
| `history` | `{ sessionId, cursor? }` | Returns one page of up to 200 stored messages from [`sessions.messages()`](/sdk/typescript/sessions#messages) as `{ data, nextCursor }` |
| `steer` | `{ sessionId, requestId, message }` | Sends the user message into the running turn with [`sessions.submitInput()`](/sdk/typescript/sessions#submit-input) and answers `202` with `{ state }` |

For `chat`, the relay passes the request's abort signal to the SDK call, so a Stop in the browser cancels the turn. It returns the SDK's streaming response, which keeps the `Location`, `x-ba-turn-id`, and `x-request-id` headers. If your own code posts to the relay, include `op`. A body without a known `op` answers `400`. The [browser chat relay](/api-reference/protocols/browser-relay) page describes every field, for a relay you write in another language.

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
| `400` | `invalid_request` | The body is not valid JSON, has no known `op`, or has the wrong shape, the message is not a valid UI message, or it is neither a user message nor an approval round. An approval round without `sessionId`, or with no approval responses, gets this too |
| API status | API code | The API refused the request, for example `404 not_found`, `409 session_busy`, or `409 steer_not_available`. The message is the API's message, and `x-request-id` is set when known |
| `499` | `request_aborted` | The request was aborted before a response arrived |
| `502` | SDK code | The SDK failed without an HTTP status, for example `network_error` |
| `500` | `internal_error` | Anything else, including an error thrown by `resolveContext()` or a `userId` that `forUser()` rejects. The response hides the details |

A `500` for an invalid `userId` sends nothing to the API. Fix the `resolveContext()` that returned it.

## Transports [#transports]

### `BlazingAgentsChatTransport` [#chat-transport]

An AI SDK chat transport that posts to your relay. `useBlazingAgentsChat` is built on it. Use it directly with an AI SDK `Chat` in a framework other than React.

**Signature:** `new BlazingAgentsChatTransport(options?: BlazingAgentsChatTransportOptions)`

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | `string` | no | A session to resume after a reload; an invalid ID throws `invalid_request` |
| `onSessionId` | `(sessionId: string) => void \| Promise<void>` | no | Receives the new session's ID from the first successful response |
| `onTurnId` | `(turnId: string) => void \| Promise<void>` | no | Receives the running turn's ID from each response that names one, before its stream is read |
| `onTurnStart` | `() => void` | no | Called when the relay answers a chat request with a stream, before any chunk is read. From then on the turn takes steers |
| `onTurnFinish` | `() => void` | no | Called when the turn's stream carries its `finish` chunk. A stream that ends without one, by Stop, an error, or a dropped connection, did not complete, though the turn may have stored its messages |
| `onSteerConsumed` | `(requestId: string) => void` | no | Called with the steer's `requestId` when the running turn reads a steered message |

It also takes the AI SDK HTTP chat transport options `api` (default `/api/chat`), `credentials`, `headers`, `body`, and `fetch`. It sets the request body itself, so `prepareSendMessagesRequest` and `prepareReconnectToStreamRequest` are not accepted. `loadHistory()` and `steer()` send the same `headers`, `credentials`, and `body`.

Each chat request carries `op: "chat"`, the newest user message, or the last assistant message when it holds a complete approval round, plus `messageId`, `trigger`, and the known `sessionId`. Without a session, the transport reads the new session ID from the last path segment of the response's `Location` header, calls `onSessionId`, and sends that ID on every later request. A first response without a valid `Location` fails the request. On every response, the transport reads `x-ba-turn-id` and calls `onTurnId`. An error response from the relay rejects with a [`BlazingAgentsError`](/sdk/typescript/client#errors) that carries the relay's `status`, `code`, and message. An approval round sent before any session exists throws.

| Member | Returns | Description |
| --- | --- | --- |
| `sessionId` | `string \| undefined` | The session the transport talks to: the one you passed, or the one the first chat started |
| `loadHistory({ abortSignal? })` | `Promise<UIMessage[]>` | Reads the whole stored conversation through the relay's `history` operation, oldest first, and checks each message. Returns `[]` without a session. Throws the relay's error, such as `404 not_found` when the session is gone or belongs to another user |
| `steer({ message, requestId, abortSignal? })` | `Promise<"accepted" \| "committed" \| "resend">` | Sends a user message into the running turn through the relay's `steer` operation. `accepted`: the turn holds it and may still read it. `committed`: it is stored with that turn. `resend`: it will never reach this turn, so send it as an ordinary chat message. Retrying with the same `requestId` and message returns the same answer |

The transport cannot reconnect to a stream, so `reconnectToStream()` returns `null`. After a reload, pass the saved `sessionId` and call `loadHistory()` to show the stored conversation.

### `BlazingAgentsDirectChatTransport` [#direct-chat-transport]

An AI SDK chat transport that calls [`chat()`](/sdk/typescript/client#chat) and [`continueChat()`](/sdk/typescript/client#continue-chat) on an SDK client in the same process, with no HTTP relay. Use it only where your code already holds the API key, such as a server-side chat runtime.

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
- [React chat hook](/sdk/typescript/use-blazing-agents-chat)
- [Browser chat relay](/api-reference/protocols/browser-relay)
- [Client reference](/sdk/typescript/client#for-user)
