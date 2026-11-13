---
title: React chat hook
description: Render a chat with useBlazingAgentsChat, which keeps the session, restores its history after a reload, and steers the running turn.
---

# React chat hook

`useBlazingAgentsChat` from `@blazingagents/sdk/react` runs a chat in a React component. It remembers the session in `localStorage`, shows the stored conversation again after a reload, and sends a message typed during a reply into the running turn. The hook talks to one endpoint on your backend: [`createChatRelay()`](/sdk/typescript/chat-transport#create-chat-relay) in TypeScript, or a Python, Rust, or Go endpoint that follows the [browser chat relay](/api-reference/protocols/browser-relay).

Install the SDK with React and the AI SDK React package:

```bash
npm install @blazingagents/sdk ai zod react @ai-sdk/react
```

```tsx title="Chat.tsx"
import { useBlazingAgentsChat } from "@blazingagents/sdk/react";
import { useState } from "react";

export function Chat({ token }: { token: string }) {
  const [input, setInput] = useState("");
  const chat = useBlazingAgentsChat({
    headers: { authorization: `Bearer ${token}` },
  });

  return (
    <main>
      {chat.messages.map((message) => (
        <p key={message.id}>
          <strong>{message.role}:</strong>{" "}
          {message.parts.map((part) => (part.type === "text" ? part.text : ""))}
        </p>
      ))}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void chat.send(input);
          setInput("");
        }}
      >
        <input value={input} onChange={(event) => setInput(event.target.value)} />
        <button type="submit">Send</button>
      </form>
    </main>
  );
}
```

The hook posts to `/api/chat` unless you pass `api`. Only `@blazingagents/sdk/react` loads React and `@ai-sdk/react`, so a backend that imports `@blazingagents/sdk` needs neither.

## Options [#options]

**Signature:** `useBlazingAgentsChat(options?: UseBlazingAgentsChatOptions): BlazingAgentsChat`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `api` | `string` | `/api/chat` | Your relay endpoint |
| `headers` | `Record<string, string> \| Headers` | none | Sent with every request. The hook reads them when it sends, so a new token applies to the next request |
| `credentials` | `RequestCredentials` | the browser default | Sent with every request, for a relay that reads a cookie |
| `fetch` | `typeof fetch` | `globalThis.fetch` | The `fetch` to send requests with |
| `storageKey` | `string \| null` | `blazing-agents-session` | The `localStorage` key for the session ID. `null` keeps the session in memory only, so a reload starts a new one |

The hook reads `localStorage` after the component mounts, so server rendering never touches it. Where `localStorage` throws, for example when the browser blocks it, the hook keeps the session in memory.

## Returned chat [#returned-chat]

| Member | Type | Description |
| --- | --- | --- |
| `messages` | `BlazingAgentsUIMessage[]` | What to render, oldest first: the stored conversation, the reply that is streaming, and sent messages that are not stored yet |
| [`send(input)`](#send) | `(input: string \| { text: string; files?: FileUIPart[] }) => Promise<boolean>` | Sends a user message. Resolves `true` once the message is stored and `false` when it was rolled back. Never rejects |
| `status` | `"restoring" \| "idle" \| "running"` | `restoring` while the hook reads the stored conversation, `running` while a turn starts, streams, or settles. `send()` works in every status |
| [`stop()`](#stop) | `() => void` | Cancels the running turn and shows the stored conversation again |
| `regenerate()` | `() => void` | Replaces the last assistant reply. Does nothing unless `canRegenerate` |
| `canRegenerate` | `boolean` | `true` when the chat is idle and has a stored assistant reply to replace |
| `newSession()` | `() => void` | Cancels any running turn, forgets the stored session, and clears the conversation. The next message starts a new session |
| [`addToolApprovalResponse(response)`](#tool-approvals) | `(response: { id: string; approved: boolean; reason?: string }) => void` | Answers a pending tool approval |
| `pendingIds` | `ReadonlySet<string>` | IDs of messages in `messages` that are sent but not stored yet |
| `sessionId` | `string \| undefined` | The session, once restored from storage or started by the first reply |
| `error` | `Error \| undefined` | The last failure of a turn, a steer, or a history read. The next `send()` clears it |
| `clearError()` | `() => void` | Clears `error`. If the history could not be read, reads it again |

`useBlazingAgentsChat<M>()` takes your own `UIMessage` type when your agent's messages carry typed metadata or data parts.

## Send a message [#send]

When the chat is idle, `send()` starts a turn. While a reply streams, it steers the message into that turn, so the agent reads it at its next step and answers in the same reply. A message the turn could not take, or did not read before it ended, goes out again as the next ordinary message with a new ID. The hook never sends a message twice. A message sent while a turn is still starting waits and steers once the reply streams. Messages sent while the hook settles a finished turn, or while a tool approval waits, wait in order. The oldest starts the next turn, and the rest steer into it.

A steered message stays at the end of `messages` while the reply streams. Once the turn ends, the hook reads the stored conversation and shows the message where the agent read it.

`send()` resolves `false` when an error, Stop, or `newSession()` rolled the message back. Put the text back in the input so the user can send it again:

```typescript
const text = input;
setInput("");
if (!(await chat.send(text))) {
  setInput(text);
}
```

Each resend is a new attempt. A tool that ran during the failed attempt can run again.

## Reload and restore [#restore]

On mount, the hook reads the session ID from `localStorage` and loads the stored conversation through your relay, one page at a time. If that read fails, for example because the user's token is missing after a reload, the hook reads it again when `headers` change, on the next `send()`, or on `clearError()`. If the relay answers `404`, because the session was deleted or belongs to another user, the hook forgets it and the next message starts a new session.

## Stop and errors [#stop]

`stop()` aborts the request, which cancels the turn. When a reply ends without finishing, by Stop, an error, or a dropped connection, the hook reads the stored conversation again. Each message sent for that turn stays if the session stored it, and rolls back if it did not.

An error response from the relay rolls back the turn without reading the history, and `error` is a [`BlazingAgentsError`](/sdk/typescript/client#errors) with the relay's `status` and `code`.

## Tool approvals [#tool-approvals]

When an agent needs a person to allow a tool call, the reply ends with a tool part in the `approval-requested` state. Render it with buttons that answer it, and pass the `chat` from your chat component, as in `<Approvals chat={chat} />`:

```tsx title="Approvals.tsx"
import type { BlazingAgentsChat } from "@blazingagents/sdk/react";
import { isToolUIPart } from "ai";

export function Approvals({ chat }: { chat: BlazingAgentsChat }) {
  return chat.messages
    .flatMap((message) => message.parts)
    .filter(isToolUIPart)
    .map((part) =>
      part.state === "approval-requested" ? (
        <p key={part.toolCallId}>
          {part.type}
          <button
            type="button"
            onClick={() => chat.addToolApprovalResponse({ id: part.approval.id, approved: true })}
          >
            Allow
          </button>
          <button
            type="button"
            onClick={() => chat.addToolApprovalResponse({ id: part.approval.id, approved: false })}
          >
            Deny
          </button>
        </p>
      ) : null,
    );
}
```

Once every approval of the round has an answer, the hook sends the round to your relay and the rest of the turn streams like any reply. Until then, new messages wait instead of starting a turn. See [tool approvals](/agents/tools/tool-approvals).

## Next [#next]

- [Build a chatbot](/getting-started/chatbot)
- [Chat transport and relays](/sdk/typescript/chat-transport)
- [Browser chat relay](/api-reference/protocols/browser-relay)
