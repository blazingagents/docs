---
title: Tool approvals
description: Configure Tool approval policies and let people approve or deny calls in chat.
---

# Tool approvals

Choose which Tools run freely, are blocked, or need automatic or human review.

## Approval policies [#approval-policies]

Agents have two versioned policies: `approvalInChat` for chat and stateless
generation, and `approvalInTasks` for Tasks. Both start with
`{"default":"full","overrides":[]}`. A matching Tool override wins over `default`.

| Mode | Behavior |
| --- | --- |
| `full` | Execute without approval. |
| `deny` | Block the call. |
| `manual` | Ask a human before executing. |
| `auto` | The Agent's model allows, denies, or asks a human. Review failures block the call. |

<span id="review-availability"></span>
Human review is supported in interactive chat. Tasks and stateless generation
block `manual` calls and `auto` calls that need a human; the Agent can continue
other permitted work. Automatic review contributes to Turn usage.

For example, allow chat Tools by default, ask before running `bash`, and allow
only `read` in Tasks. Send this policy in an Agent create or update request with
the Workspace Tool group enabled:

```json
{
  "approvalInChat": {
    "default": "full",
    "overrides": [
      {"tool": {"type": "builtin", "name": "bash"}, "decision": "manual"}
    ]
  },
  "approvalInTasks": {
    "default": "deny",
    "overrides": [
      {"tool": {"type": "builtin", "name": "read"}, "decision": "full"}
    ]
  }
}
```

- **MCP Tools:** use `{"type":"mcp","connectionId":"mcp_0123456789abcdef","name":"send_mail"}` with the original Tool name and an attached Connection.
- **Updates:** omit a policy to preserve it; supply a policy to replace it. Omitted or empty `overrides` clears the list.
- **Validation:** use unique, available Tool references. Update affected rules when removing Tools or Connections.

See the Agent API for exact fields and errors: [TypeScript](/sdk/typescript/agents),
[Python](/sdk/python/agents), or [REST](/api-reference/rest-api/agents).

<span id="when-a-tool-needs-approval"></span>
<span id="approval-and-continuation-lifecycle"></span>
<span id="join-the-continuation-turn"></span>

## Human approval flow [#human-approval-flow]

1. The Agent proposes a call that needs human review and pauses.
2. Your application shows the saved Tool name and arguments to the person reviewing it.
3. Your backend sends their approve or deny decision to BA. If several calls are pending, decide each one.
4. BA resumes the Agent: approved calls can execute; denied calls return a denied result. Your application reads the resumed response.

The API calls that resumed execution a **continuation**. `continuationId` identifies
it; **join** means read its response stream. You do not create a new Session or
run the Tool yourself. Resuming creates a new metered Turn in the same Session.

## List and decide an approval [#list-and-decide-an-approval]

Use TypeScript SDK 0.8.0 or later on your backend. First list requests and show the
pending ones to an authorized reviewer:

```typescript
const { data } = await client.sessions.toolApprovals({ agentId, sessionId });
const pending = data.filter((item) => item.decision === "pending");
// Present each item's approvalId, tool ?? toolName, and input in your UI.
```

After the person chooses, pass their decision to BA. Here `client` is your
server-side SDK client; validate the request and authorize access to this Session
before calling this handler:

```typescript
async function decideAndResume(
  agentId: string,
  sessionId: string,
  approvalId: string,
  approved: boolean,
): Promise<Response> {
  const decision = await client.sessions.decideToolApproval({
    agentId, sessionId, approvalId, approved,
  });
  if (decision.state === "waiting") {
    return Response.json({ state: "waiting" }, { status: 202 });
  }
  const resumed = await client.sessions.joinToolApprovalContinuation({
    agentId, sessionId, continuationId: decision.continuationId,
  });
  return resumed.toResponse(); // AI SDK UI-message SSE
}
```

A `202` response means other calls still need decisions. Otherwise, consume the
response stream, including terminal errors. For Python, use
[`tool_approvals`, `decide_tool_approval`, and `join_tool_approval_continuation`](/sdk/python/sessions).

## AI SDK client integration [#ai-sdk-client-integration]

BA uses Vercel AI SDK approval messages and UI-message streams. Read the
[AI SDK approval guide](https://ai-sdk.dev/docs/agents/tool-approvals) for its
message format. BA owns persistence and resuming, so send decisions through the
BA endpoints above rather than relying on `addToolApprovalResponse` alone.

For a custom UI, read the response from your backend's decision route with AI SDK
7's stream helpers. `renderAssistant` is your UI callback: replace the displayed
message by its ID as each update arrives.

```typescript
import { parseJsonEventStream, readUIMessageStream, uiMessageChunkSchema } from "ai";

const response = await fetch("/api/tool-approval", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ agentId, sessionId, approvalId, approved }),
});
if (!response.ok) throw new Error("Approval request failed");
if (response.status !== 202) {
  if (!response.body) throw new Error("Missing response stream");
  const chunks = parseJsonEventStream({
    stream: response.body,
    schema: uiMessageChunkSchema,
  }).pipeThrough(new TransformStream({
    transform(result, controller) {
      if (!result.success) throw result.error;
      controller.enqueue(result.value);
    },
  }));
  for await (const message of readUIMessageStream({ stream: chunks, terminateOnError: true })) {
    renderAssistant(message);
  }
}
```

Keep remaining approval buttons visible on `202`. See
[reading UI-message streams](https://ai-sdk.dev/docs/ai-sdk-ui/reading-ui-message-streams)
and [chat transports](https://ai-sdk.dev/docs/ai-sdk-ui/transport) for custom rendering
or `useChat` transport integration.

## Idempotency, concurrency, and failure [#idempotency-concurrency-and-failure]

- Repeating the same decision is safe; reversing it returns `409`.
- New chat Turns and regeneration return `session_busy` while approval or resuming is pending.
- Disconnecting from the response does not cancel execution. Rejoin the same `continuationId` to read its progress.
- A failed continuation reports an error; joining it again does not rerun the Tool.

Exact states and recovery behavior: [Session API](/sdk/typescript/sessions).

## Security boundary [#security-boundary]

- Authenticate and authorize the reviewer on your backend; keep BA credentials there.
- Show the saved Tool identity and arguments. Submit the decision against its approval ID, without changing the call.
- Approval never grants additional Tool access. Relevant configuration changes invalidate stale approvals.

See [security and credentials](/platform/security-and-credentials).

## Reference [#reference]

- [Built-in Tools](/agents/tools/built-in-tools) and [MCP Tools](/agents/tools/mcp-tools)
- [Session APIs: TypeScript](/sdk/typescript/sessions), [Python](/sdk/python/sessions), [REST](/api-reference/rest-api/sessions)
- [Sessions and Turns](/platform/sessions-and-turns)
