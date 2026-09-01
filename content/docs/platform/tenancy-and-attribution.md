---
title: Tenancy and end-user attribution
description: Keep Tenant isolation separate from optional end-user labels used for filtering and reporting.
---

# Tenancy and end-user attribution

Every authenticated request runs in one credential-derived Tenant context. Within that boundary, optional Attribution labels activity with an opaque end-user `userId` and metadata so a backend can filter resources and report usage.

## Tenant isolation [#tenant-isolation]

A backend API key establishes the trusted Tenant context. Services use that credential-derived `tenantId` for reads and writes, so a request cannot select another Tenant by supplying `userId`, metadata, or a resource ID. See [REST authentication](/api-reference/rest-api/authentication) for all accepted credential paths.

One API key has Tenant-wide authority. The tenant's backend must authenticate its end-user, authorize the operation, select allowed Agent and resource IDs, and only then call Blazing Agents.

## Attribution fields and propagation [#attribution-fields-and-propagation]

Attributed create inputs accept `userId` and `metadata`. Both default to the tenant-level values `userId: ""` and `metadata: {}`. The `userId` convention is immutable after creation; resource update contracts may allow metadata changes without allowing the Attribution identity to move.

Agents, Workspaces, Prompts, Sessions, Tasks, Task runs, Artifacts, Memories, and usage records carry Attribution. Agent-owned Skills inherit their Agent's Attribution. Tenant configuration such as API keys, Providers, and quota settings does not.

For a new Session, admission stamps the Turn's `userId` and metadata when the Session materializes before model execution. The same values enter that Turn's usage record. A Task run inherits Attribution from its Task, and the run's fresh Session, usage, and any Artifacts saved by its Agent use those values. An Artifact deliberately saved during an interactive Turn uses the Turn's Session ownership and Attribution.

## Attribute a Turn and filter results [#attribute-a-turn-and-filter-results]

Derive the identifier from authenticated backend state, then reuse it as a filter:

```typescript
import { BlazingAgents } from "@blazingagents/sdk";

const apiKey = process.env.BLAZING_AGENTS_API_KEY;
if (!apiKey) throw new Error("BLAZING_AGENTS_API_KEY is required");

const client = new BlazingAgents({ apiKey });
const agentId = "ag_0123456789abcdef";
const userId = "usr_7f3a9c";

const turn = await client.chat({
  agentId,
  message: { id: "msg_user_1", role: "user", parts: [{ type: "text", text: "Summarize my open items." }] },
  userId,
  metadata: { workspace: "primary" },
});

await turn.toResponse().text(); // Drain the Turn so the transcript can commit.

const sessionId = await turn.sessionId;
const sessions = await client.sessions.list(agentId, { userId });
console.log(sessions.data.some((session) => session.id === sessionId));
```

After the Turn succeeds, the final expression prints `true` because the filtered Session list includes the materialized Session.

## Reporting and filtering [#reporting-and-filtering]

Session lists accept a `userId` filter. Tenant-wide and per-Agent usage queries can filter by `userId` or group by `user`; usage also supports Agent, model, Session, day, and time-window dimensions. See [`sessions.list`](/sdk/typescript/sessions#list) and [`usage.get`](/sdk/typescript/usage#get) for exact fields.

Omitting a `userId` filter includes all Attribution buckets visible to the Tenant credential. Passing `userId: ""` selects only tenant-level activity; a non-empty value selects that exact opaque identifier.

## What Attribution is not [#what-attribution-is-not]

Attribution is not authentication. It is not authorization. It is not an ACL, and it is not a stored end-user account. Supplying a `userId` neither proves identity nor narrows what an API key can access.

## Multi-tenant application pattern [#multi-tenant-application-pattern]

Derive attribution from the authenticated application principal, and resolve every Agent, application chat, and Session through backend authorization. Never trust platform IDs or `userId` values copied from a browser body.

```typescript
import { type UIMessage } from "@blazingagents/sdk";

export async function runAuthorizedTurn(input: {
  principal: { subject: string; workspaceId: string };
  appChatId: string;
  message: UIMessage;
}) {
  const userId = `app:${input.principal.subject}`;
  const chat = await resolveAuthorizedChat(input.principal, input.appChatId);
  const result = await client.chat({
    agentId: chat.agentId,
    ...(chat.sessionId ? { sessionId: chat.sessionId } : {}),
    message: input.message,
    userId,
    metadata: { workspaceId: input.principal.workspaceId },
  });

  const sessionId = await result.sessionId;
  await result.toResponse().text();
  if (!chat.sessionId) await saveAuthorizedSession(input.appChatId, sessionId);

  const sessions = await client.sessions.list(chat.agentId, { userId });
  const usage = await client.usage.getForAgent(chat.agentId, {
    userId,
    groupBy: "session",
  });
  return { sessionId, sessions, usage };
}
```

After the stream settles, verify the filtered Session has the expected `userId` and the usage totals include the Turn. Separately test that your application rejects another principal's `appChatId` before calling the SDK. An empty filtered list is not proof that a caller may access a separately supplied resource ID.

## Production considerations [#production-considerations]

- Derive a stable, opaque `userId` on the backend. Keep the mapping to a real identity in the tenant's own system.
- Treat metadata as product data: minimize personal information, validate values at the backend boundary, and apply the tenant's retention policy.
- Check application ownership before reading, resuming, updating, or deleting a resource. A matching Attribution filter is not an authorization check.
- Decide whether missing Attribution should mean tenant-level activity. Because omission defaults to `userId: ""`, accidental omission otherwise merges activity into that bucket.

See [Security and credentials](/platform/security-and-credentials), [Usage and quotas](/platform/usage-and-quotas), [Sessions and Turns](/platform/sessions-and-turns), and [Artifacts](/agents/artifacts) for the corresponding execution and storage boundaries.

## Reference [#reference]

- [TypeScript SDK `chat`](/sdk/typescript/client#chat)
- [TypeScript SDK `sessions.list`](/sdk/typescript/sessions#list)
- [TypeScript SDK `usage.get`](/sdk/typescript/usage#get)
- [Python SDK `chat`](/sdk/python/client#chat)
- [Python SDK `sessions.list`](/sdk/python/sessions#list)
- [Python SDK `usage.get`](/sdk/python/usage#get)
- [Python SDK Tenant settings](/sdk/python/tenant)
- [REST generation](/api-reference/rest-api/generation#generate)
- [REST Sessions](/api-reference/rest-api/sessions#list-sessions)
- [REST Usage](/api-reference/rest-api/usage#get-usage)
- [Attribution schema](/api-reference/protocols/objects-and-schemas#attribution)
