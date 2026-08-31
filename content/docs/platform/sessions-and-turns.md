---
title: Sessions and Turns
description: Store conversation history, resume successful Turns, and page through a Session transcript.
---

# Sessions and Turns

A Session is one stored conversation belonging to a Tenant and Agent. Use it when later chat Turns need earlier messages; stateless generation is still a Turn but has no Session, while each executing Task run receives a fresh Session.

## Session and Turn ownership [#session-and-turn-ownership]

A Turn is one metered execution of an Agent request. The Tenant owns the Agent, Session, transcript, and usage; a Session belongs to exactly one Agent and cannot be resumed through another Agent.

Session list results are summaries. Each item contains its `id`, nullable `agentVersion` Pin, timestamps, `messageCount`, `lastMessagePreview`, `userId`, and `metadata`; fetch messages separately for the full transcript.

## Start and resume a Session [#start-and-resume-a-session]

Starting chat without `sessionId` calls `POST /v1/agents/:agentId/sessions`. Blazing Agents mints an `ss_…` ID, returns `201 Created` with its canonical resource path in `Location`, and exposes the ID as `result.sessionId` in the TypeScript SDK. The ID is available from the response headers before the Turn finishes.

The Session row materializes after admission, before model execution. Resume it by passing the returned ID; the SDK then calls the Session URL and the platform loads its stored history. A failed first Turn leaves the submitted user message, while a cancelled first Turn can leave an empty Session.

```typescript
const first = await client.chat({
  agentId,
  message: {
    id: "message-1",
    role: "user",
    parts: [{ type: "text", text: "Plan a weekend in Lisbon." }],
  },
});

await first.toResponse().text(); // Drain the stream so the Turn settles.
const sessionId = await first.sessionId;

const second = await client.chat({
  agentId,
  sessionId,
  message: {
    id: "message-2",
    role: "user",
    parts: [{ type: "text", text: "Make it suitable for children." }],
  },
});

await second.toResponse().text();
const transcript = await client.sessions.messages(agentId, sessionId);
console.log(transcript.data);
```

The final read contains the committed messages from both successful Turns.

## Successful and failed Turns [#successful-and-failed-turns]

A successful interactive Turn atomically commits the accepted user message, the assistant message and its Tool activity, pending Tool-approval records, and any regeneration truncation. Its assistant-message metadata includes the Turn's usage summary.

Failed interactive Turns are metered and commit only the submitted user message, never a partial assistant response. Cancelled interactive Turns are metered but leave the transcript unchanged. A failed first Turn therefore leaves a user-only Session, while a cancelled first Turn leaves the materialized Session empty. Task-run Sessions differ: their messages are committed incrementally so asynchronous progress can be inspected while the run is active.

## Read and poll the transcript [#read-and-poll-the-transcript]

`client.sessions.messages` returns AI SDK `UIMessage` values in chronological order within each page. The default `limit` is 50 and the maximum is 200.

- With neither cursor, the response contains the newest page. Pass opaque `nextCursor` back as `cursor` to walk backward to older pages.
- Pass `latestCursor` back as `after` to poll forward for messages added after that tail. When a forward page has more data, continue with `nextCursor` as the next `after` value.
- `latestCursor` is present whenever a returned page is non-empty, even when `nextCursor` is `null`. An empty poll returns both cursors as `null`.
- `cursor` and `after` are mutually exclusive. Treat both as opaque values.

## Conversation Artifacts [#conversation-artifacts]

Conversation views list deliberate outputs with the Tenant-level Artifact
resource filtered by `sessionId` through
`client.artifacts.list({ sessionId })`.

The same rule applies to Task runs. Each executing Task run receives a fresh
Session, so pass the run's non-null `sessionId` to the same Artifact list after
the Session is attached. Intermediate Workspace files are absent unless the
Agent explicitly publishes them.

## Version and end-user Attribution [#version-and-end-user-attribution]

Without a Pin, every Turn resolves the Agent's latest Version at that time and records the resolved number in usage; the Session's `agentVersion` remains `null`. A `version` supplied when starting the Session Pins that Session for its lifetime and is recorded as `agentVersion`; resume calls cannot override it. See [Versions and lifecycle](/agents/versions-and-lifecycle).

Admission of the first Turn stamps the Session's immutable `userId` and initial `metadata` before model execution. `userId` is a trusted, Tenant-chosen shadow identity used for filtering and grouping; an empty string means Tenant-level. Attribution is not authorization: an API key can access the whole Tenant, so application access rules belong in the Tenant backend. See [tenancy and end-user Attribution](/platform/tenancy-and-attribution) and the [multi-tenant application pattern](/platform/tenancy-and-attribution#multi-tenant-application-pattern).

## Busy, deleted, and concurrent Sessions [#busy-deleted-and-concurrent-sessions]

A missing, foreign, or deleted Session returns `404`; resume never silently creates a replacement. A new Turn or regeneration returns `session_busy` with status `409` while any approval has `decision: "pending"` or a continuation has `state: "waiting"`, `"queued"`, or `"running"`. Deletion checks only active continuation state: it returns `session_busy` for those three continuation states, but a Session with pending decisions and no continuation can still be deleted.

Ordinary concurrent Turns can resolve the same Session version, but commits use optimistic version checks. After one commits, a competing stale commit fails with a Session version mismatch instead of merging histories. Serialize Turns per Session in the application when their ordering matters.

## Chat endpoint pattern [#chat-endpoint-pattern]

An application chat should map to an authorized Agent and, after its first Turn is admitted, one Session ID in backend storage. Parse exactly one newest user message, derive `userId` from the authenticated principal, and load `agentId` and `sessionId` from server-owned state:

```typescript
export async function handleChat(request: Request, appChatId: string) {
  const principal = await requirePrincipal(request);
  const message = await parseNewestUserMessage(request);
  const chat = await resolveAuthorizedChat(principal, appChatId);

  const result = await client.chat({
    agentId: chat.agentId,
    ...(chat.sessionId ? { sessionId: chat.sessionId } : {}),
    message,
    signal: request.signal,
    userId: principal.stableId,
  });

  const sessionId = await result.sessionId;
  if (!chat.sessionId) {
    await storeProvisionalSession(appChatId, sessionId);
  }
  return result.toResponse();
}
```

The minted ID identifies an already materialized Session. Hold a per-chat lease until the mapping is stored so concurrent first requests cannot create competing Sessions. If saving the mapping fails after the Turn starts, cancel the response body; the platform Session remains materialized and may be empty. A later `not_found` must propagate unless the application deliberately deleted and unlinked that Session.

Return `result.toResponse()` unchanged so the native UI message stream and headers survive. Forward the request `AbortSignal`, authorize the application chat on every request, and never accept Agent, Session, or attribution identifiers directly from an unchecked client body.

## Image input and regeneration [#image-input-and-regeneration]

Image input is a user-message part, not a Workspace upload or Artifact. A file part needs a non-empty URL, an `image/...` media type, and an optional filename. To replace one stored response, resume the authorized Session with `trigger: "regenerate-message"` and a verified assistant message ID:

```typescript
const message = {
  id: "image-question-1",
  role: "user" as const,
  parts: [
    { type: "text" as const, text: "Describe this image." },
    {
      type: "file" as const,
      mediaType: "image/png",
      filename: "sample.png",
      url: imageDataUrl,
    },
  ],
};

const first = await client.chat({ agentId, message, userId });
const sessionId = await first.sessionId;
await first.toResponse().text();

const before = await client.sessions.messages(agentId, sessionId);
const original = before.data.find((item) => item.role === "assistant");
if (!original) throw new Error("No stored assistant response");

const retry = await client.chat({
  agentId,
  sessionId,
  message,
  trigger: "regenerate-message",
  messageId: original.id,
  userId,
});
await retry.toResponse().text();

const after = await client.sessions.messages(agentId, sessionId);
if (after.data.some((item) => item.id === original.id)) {
  throw new Error("The original response was not replaced");
}
```

Regeneration works only on the resume path. The platform resolves and applies the target truncation under the Turn claim. Success appends the replacement; failure leaves the retained user message without the selected prior response; cancellation leaves the transcript unchanged. Omitting `messageId` targets the latest assistant message.

## Related concepts [#related-concepts]

- [Tenancy and attribution](/platform/tenancy-and-attribution)
- [Generation and streaming](/agents/output/generation-and-streaming)

## Reference [#reference]

- [CLI chat](/cli/chat)
- Chat references: [TypeScript](/sdk/typescript/client#chat) and [Python](/sdk/python/client#chat)
- Session references: [TypeScript](/sdk/typescript/sessions) and [Python](/sdk/python/sessions)
- [Sessions REST API](/api-reference/rest-api/sessions)
- [Artifacts](/agents/artifacts)
