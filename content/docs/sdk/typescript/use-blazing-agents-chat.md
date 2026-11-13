---
title: React chat hook
description: Render a chat with useBlazingAgentsChat, which keeps the session, restores its history after a reload, and steers the running turn.
---

# React chat hook

`useBlazingAgentsChat` from `@blazingagents/sdk/react` runs a chat in a React component. It remembers the session in `localStorage`, shows the stored conversation again after a reload, and sends a message typed during a reply into the running turn. The hook talks to one endpoint on your backend: [`createChatRelay()`](/sdk/typescript/chat-transport#create-chat-relay) in TypeScript, or the relay helper of the [Python](/sdk/python/client#browser-relay), [Rust](/sdk/rust/client#browser-relay), or [Go](/sdk/go/client#browser-relay) SDK.

Install the SDK with React:

```bash
npm install @blazingagents/sdk ai zod react
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

The hook posts to `/api/chat` unless you pass `api`. Only `@blazingagents/sdk/react` loads React, so a backend that imports `@blazingagents/sdk` does not need it.

Each component that calls the hook gets its own [`BlazingAgentsChat`](/sdk/typescript/blazing-agents-chat), started after mount and disposed on unmount. That page describes how the chat sends, restores, stops, and handles errors, and all of it applies to the hook.

## Options [#options]

**Signature:** `useBlazingAgentsChat(options?: UseBlazingAgentsChatOptions): UseBlazingAgentsChatResult`

The hook takes the [`BlazingAgentsChat` options](/sdk/typescript/blazing-agents-chat#options): `api`, `headers`, `credentials`, `fetch`, and `storageKey`. Here `headers` is a `Record<string, string>` or `Headers`, not a function. Pass new `headers` on a later render, and the next request carries them, so a new token applies without a remount. The hook reads the other options on the first render only.

## Returned chat [#returned-chat]

`UseBlazingAgentsChatResult` holds every field of the [snapshot](/sdk/typescript/blazing-agents-chat#snapshot): `messages`, `status`, `error`, `pendingIds`, `sessionId`, and `canRegenerate`. It also holds the chat's actions: [`send()`](/sdk/typescript/blazing-agents-chat#send), [`stop()`](/sdk/typescript/blazing-agents-chat#stop), `regenerate()`, `newSession()`, `clearError()`, and `addToolApprovalResponse()`. The component renders again whenever the snapshot changes.

`useBlazingAgentsChat<M>()` takes your own `UIMessage` type when your agent's messages carry typed metadata or data parts.

`send()` resolves `false` when an error, Stop, or `newSession()` rolled the message back. Put the text back in the input so the user can send it again:

```typescript
const text = input;
setInput("");
if (!(await chat.send(text))) {
  setInput(text);
}
```

## Tool approvals [#tool-approvals]

When an agent needs a person to allow a tool call, the reply ends with a tool part in the `approval-requested` state. Render it with buttons that answer it, and pass the `chat` from your chat component, as in `<Approvals chat={chat} />`:

```tsx title="Approvals.tsx"
import type { UseBlazingAgentsChatResult } from "@blazingagents/sdk/react";
import { isToolUIPart } from "ai";

export function Approvals({ chat }: { chat: UseBlazingAgentsChatResult }) {
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
- [Chat in any framework](/sdk/typescript/blazing-agents-chat)
- [Chat transport and relays](/sdk/typescript/chat-transport)
