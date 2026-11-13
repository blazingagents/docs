---
title: Chat in any framework
description: Run a browser chat in Vue, Angular, or plain JavaScript with BlazingAgentsChat, which keeps the session, restores its history after a reload, and steers the running turn.
---

# Chat in any framework

`BlazingAgentsChat` from `@blazingagents/sdk` runs a chat in the browser with any UI framework, or none. It remembers the session in `localStorage`, shows the stored conversation again after a reload, and sends a message typed during a reply into the running turn. It talks to one endpoint on your backend: [`createChatRelay()`](/sdk/typescript/chat-transport#create-chat-relay) in TypeScript, or the relay helper of the [Python](/sdk/python/client#browser-relay), [Rust](/sdk/rust/client#browser-relay), or [Go](/sdk/go/client#browser-relay) SDK. In React, use the [`useBlazingAgentsChat`](/sdk/typescript/use-blazing-agents-chat) hook, which runs one `BlazingAgentsChat` per component.

Install the SDK:

```bash
npm install @blazingagents/sdk ai zod
```

Create the chat, subscribe to it, and render `getSnapshot()` again each time your listener runs. Call `start()` once the component is in the page and `dispose()` when it leaves. In Vue, keep the snapshot in a `shallowRef`. In Angular, keep it in a signal:

```typescript tab="Vue" title="useChat.ts"
import { BlazingAgentsChat } from "@blazingagents/sdk";
import { onMounted, onUnmounted, shallowRef } from "vue";

export function useChat(headers: Record<string, string>) {
  const chat = new BlazingAgentsChat({ headers });
  const snapshot = shallowRef(chat.getSnapshot());
  const unsubscribe = chat.subscribe(() => {
    snapshot.value = chat.getSnapshot();
  });
  onMounted(chat.start);
  onUnmounted(() => {
    unsubscribe();
    chat.dispose();
  });
  return { chat, snapshot };
}
```

```typescript tab="Angular" title="chat.component.ts"
import { afterNextRender, Component, DestroyRef, inject, signal } from "@angular/core";
import { BlazingAgentsChat } from "@blazingagents/sdk";

@Component({ selector: "app-chat", templateUrl: "./chat.component.html" })
export class ChatComponent {
  readonly chat = new BlazingAgentsChat({ api: "/api/chat" });
  readonly snapshot = signal(this.chat.getSnapshot());

  constructor() {
    const unsubscribe = this.chat.subscribe(() => this.snapshot.set(this.chat.getSnapshot()));
    afterNextRender(this.chat.start);
    inject(DestroyRef).onDestroy(() => {
      unsubscribe();
      this.chat.dispose();
    });
  }
}
```

Render `snapshot.messages` in Vue or `snapshot().messages` in Angular, and call `chat.send(text)` from your form. Every method is bound to its chat, so you can pass `chat.start` or `chat.send` as a callback. `getSnapshot()` returns the same object until something in it changes, so a framework that compares by identity renders only on a change.

## Options [#options]

**Signature:** `new BlazingAgentsChat(options?: BlazingAgentsChatOptions)`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `api` | `string` | `/api/chat` | Your relay endpoint |
| `headers` | `Record<string, string> \| Headers \| (() => Record<string, string> \| Headers)` | none | Sent with every request. The chat reads them at each request, so a function can return the current token |
| `credentials` | `RequestCredentials` | the browser default | Sent with every request, for a relay that reads a cookie |
| `fetch` | `typeof fetch` | `globalThis.fetch` | The `fetch` to send requests with |
| `storageKey` | `string \| null` | `blazing-agents-session` | The `localStorage` key for the session ID. `null` keeps the session in memory only, so a reload starts a new one |

The constructor touches neither storage nor the network. `start()` reads `localStorage`, so server rendering never touches it. Where `localStorage` throws, for example when the browser blocks it, the chat keeps the session in memory.

## Snapshot [#snapshot]

`getSnapshot()` returns a `BlazingAgentsChatSnapshot`:

| Field | Type | Description |
| --- | --- | --- |
| `messages` | `readonly BlazingAgentsUIMessage[]` | What to render, oldest first: the stored conversation, the reply that is streaming, and sent messages that are not stored yet |
| `status` | `"restoring" \| "idle" \| "running"` | `restoring` while the chat reads the stored conversation, `running` while a turn starts, streams, or settles. `send()` works in every status |
| `error` | `Error \| undefined` | The last failure of a turn, a steer, or a history read. The next `send()` clears it |
| `pendingIds` | `ReadonlySet<string>` | IDs of messages in `messages` that are sent but not stored yet |
| `sessionId` | `string \| undefined` | The session, once restored from storage or started by the first reply |
| `canRegenerate` | `boolean` | `true` when the chat is idle and has a stored assistant reply to replace |

`new BlazingAgentsChat<M>()` takes your own `UIMessage` type when your agent's messages carry typed metadata or data parts.

## Methods [#methods]

| Method | Type | Description |
| --- | --- | --- |
| `start()` | `() => void` | Reads the stored session from `localStorage` and restores its conversation. Does nothing when already started |
| `dispose()` | `() => void` | Cancels the running turn and resolves every pending `send()` with `false`. `start()` may follow it again |
| `subscribe(listener)` | `(listener: () => void) => () => void` | Runs `listener` after each change to the snapshot. Returns a function that removes it |
| `getSnapshot()` | `() => BlazingAgentsChatSnapshot` | What to render now |
| [`send(input)`](#send) | `(input: string \| { text: string; files?: FileUIPart[] }) => Promise<boolean>` | Sends a user message. Resolves `true` once the message is stored and `false` when it was rolled back. Never rejects |
| [`stop()`](#stop) | `() => void` | Cancels the running turn and shows the stored conversation again |
| `regenerate()` | `() => void` | Replaces the last assistant reply. Does nothing unless `canRegenerate` |
| `newSession()` | `() => void` | Cancels any running turn, forgets the stored session, and clears the conversation. The next message starts a new session |
| `clearError()` | `() => void` | Clears `error`. If the history could not be read, reads it again |
| `setHeaders(headers)` | `(headers: BlazingAgentsChatOptions["headers"]) => void` | Replaces the request headers, so a new token applies to the next request |
| [`addToolApprovalResponse(response)`](#tool-approvals) | `(response: { id: string; approved: boolean; reason?: string }) => void` | Answers a pending tool approval |

## Send a message [#send]

When the chat is idle, `send()` starts a turn. While a reply streams, it steers the message into that turn, so the agent reads it at its next step and answers in the same reply. A message the turn could not take, or did not read before it ended, goes out again as the next ordinary message with a new ID. The chat never sends a message twice. A message sent while a turn is still starting waits and steers once the reply streams. Messages sent while the chat settles a finished turn, or while a tool approval waits, wait in order. The oldest starts the next turn, and the rest steer into it.

A steered message stays at the end of `messages` while the reply streams. Once the turn ends, the chat reads the stored conversation and shows the message where the agent read it.

`send()` resolves `false` when an error, Stop, `newSession()`, or `dispose()` rolled the message back. Put the text back in the input so the user can send it again. Each resend is a new attempt, so a tool that ran during the failed attempt can run again.

## Reload and restore [#restore]

On `start()`, the chat reads the session ID from `localStorage` and loads the stored conversation through your relay, one page at a time. If that read fails, for example because the user's token is missing after a reload, the chat reads it again when the headers change, on the next `send()`, or on `clearError()`. If the relay answers `404`, because the session was deleted or belongs to another user, the chat forgets it and the next message starts a new session.

## Stop and errors [#stop]

`stop()` aborts the request, which cancels the turn. When a reply ends without finishing, by Stop, an error, or a dropped connection, the chat reads the stored conversation again. Each message sent for that turn stays if the session stored it, and rolls back if it did not.

An error response from the relay rolls back the turn without reading the history, and `error` is a [`BlazingAgentsError`](/sdk/typescript/client#errors) with the relay's `status` and `code`.

## Tool approvals [#tool-approvals]

When an agent needs a person to allow a tool call, the reply ends with a tool part in the `approval-requested` state. Render it with buttons that call `addToolApprovalResponse({ id: part.approval.id, approved })`. Once every approval of the round has an answer, the chat sends the round to your relay and the rest of the turn streams like any reply. Until then, new messages wait instead of starting a turn. The [React chat hook](/sdk/typescript/use-blazing-agents-chat#tool-approvals) page shows the buttons in a component. See [tool approvals](/agents/tools/tool-approvals).

## Next [#next]

- [React chat hook](/sdk/typescript/use-blazing-agents-chat)
- [Chat transport and relays](/sdk/typescript/chat-transport)
- [Browser chat relay](/api-reference/protocols/browser-relay)
