---
title: Pagination and filtering
description: Traverse opaque keyset pages, poll transcripts forward, and apply each collection's supported filters.
---

# Pagination and filtering

Unbounded collections use opaque keyset cursors rather than offsets or page
numbers. Use this contract to continue a list safely and to distinguish
backward transcript paging from forward polling.

## Contract [#contract]

A standard page is `{ data, nextCursor }`. Pass a non-null `nextCursor` back
as `cursor` only to the same endpoint with the same Tenant, filters, and
ordering. `null` means there is no further page in the requested direction.
Do not decode, edit, or reuse a cursor across collections. A non-empty opaque
cursor that cannot be decoded returns `400 invalid_cursor`; other malformed
pagination parameters return `400 validation_failed`.

Resource lists are newest-first according to their owning keyset: Agent
Versions by Version number, Tasks by `updatedAt`, Memories by the
`(createdAt, id)` key, and other cursored resources by their documented
descending time key. Transcript endpoints return the newest page first but
order messages chronologically inside each page.

| Collection        | SDK method                                                                                                         | REST operation                                                                                                     | Response cursor fields       | Page size                                       | Filters                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ----------------------------------------------- | -------------------------------------------- |
| Agents            | [`agents.list`](/sdk/typescript/agents#list)                                                             | [`list-agents`](/api-reference/rest-api/agents#list-agents)                                                            | none                         | bounded; no public `limit`                      | `userId`                                     |
| Agent Versions    | [`agents.listVersions`](/sdk/typescript/agents#list-versions)                                            | [`list-agent-versions`](/api-reference/rest-api/agents#list-agent-versions)                                            | `nextCursor`                 | default 50, max 200                             | —                                            |
| Providers         | [`providers.list`](/sdk/typescript/providers#list)                                                       | [`list-providers`](/api-reference/rest-api/providers#list-providers)                                                   | none                         | bounded; no public `limit`                      | —                                            |
| MCP Connections   | [`mcpConnections.list`](/sdk/typescript/mcp-connections#list)                                            | [`list-mcp-connections`](/api-reference/rest-api/mcp-connections#list-mcp-connections)                                 | none                         | bounded; no public `limit`                      | —                                            |
| MCP Attachments   | [`agents.listMcpAttachments`](/sdk/typescript/agents#list-mcp-attachments)                               | [`list-agent-mcp-attachments`](/api-reference/rest-api/agents#list-agent-mcp-attachments)                              | none                         | bounded; no public `limit`                      | owning Agent path                            |
| Prompts           | [`prompts.list`](/sdk/typescript/prompts#list)                                                           | [`list-prompts`](/api-reference/rest-api/prompts#list-prompts)                                                         | none                         | bounded; no public `limit`                      | `userId`                                     |
| Sessions          | [`sessions.list`](/sdk/typescript/sessions#list)                                                         | [`list-sessions`](/api-reference/rest-api/sessions#list-sessions)                                                      | `nextCursor`                 | default 50, max 200                             | `userId`                                     |
| Session messages  | [`sessions.messages`](/sdk/typescript/sessions#messages)                                                 | [`list-session-messages`](/api-reference/rest-api/sessions#list-session-messages)                                      | `nextCursor`, `latestCursor` | default 50, max 200                             | `cursor` or `after`                          |
| Artifacts         | [`artifacts.list`](/sdk/typescript/artifacts#list)                                                       | [`list-artifacts`](/api-reference/rest-api/artifacts#list-artifacts)                                                   | `nextCursor`                 | fixed 50; no public `limit`                     | `agentId`, `sessionId`                       |
| Memories          | [`memories.list`](/sdk/typescript/memories#list)                                                         | [`list-memories`](/api-reference/rest-api/memories#list-memories)                                                      | `nextCursor`                 | default 50, max 100                             | `userId`, `search`                           |
| Tasks             | [`tasks.list`](/sdk/typescript/tasks#list)                                                               | [`list-tasks`](/api-reference/rest-api/tasks#list-tasks)                                                               | `nextCursor`                 | default 50, max 200                             | `agentId`, `userId`                          |
| Task runs         | [`tasks.listRuns`](/sdk/typescript/tasks#list-runs)                                                      | [`list-task-runs`](/api-reference/rest-api/task-runs#list-task-runs)                                                   | `nextCursor`                 | default 50, max 200                             | owning Task path                             |
| Task run messages | [`tasks.runMessages`](/sdk/typescript/tasks#run-messages)                                                | [`list-task-run-messages`](/api-reference/rest-api/task-runs#list-task-run-messages)                                   | `nextCursor`, `latestCursor` | default 50, max 200                             | `cursor` or `after`                          |
| Usage             | [`usage.get`](/sdk/typescript/usage#get), [`getForAgent`](/sdk/typescript/usage#get-for-agent) | [`get-usage`](/api-reference/rest-api/usage#get-usage), [`get-agent-usage`](/api-reference/rest-api/usage#get-agent-usage) | none                         | not cursored; Session top-N default 50, max 200 | dates, Agent, Session, Attribution, grouping |

Bounded named-array responses do not expose cursors. No list surface exposes
offset, total-count, or generic sort.

Session and Task-run message responses add `latestCursor`:

- `cursor` walks backward to older messages.
- `after` reads newer messages after a tail position.
- The two parameters are mutually exclusive; REST validation rejects both.
- When `data` is non-empty, use `latestCursor` as the next `after` value even
  if `nextCursor` is null.
- In forward mode, pass a non-null `nextCursor` back as `after` to continue the
  same multi-page result. `latestCursor` records the observed tail for the next
  poll after the forward result has been drained.

For every supported `userId` filter, omission includes all Attribution values,
`""` selects tenant-level resources, and a non-empty value selects that
tenant-user partition. Attribution remains data, not access control.

Usage `from` and `to` are paired inclusive UTC dates. With neither, the query
uses the last 30 days ending today; the bounds may differ by at most 31 days.
`groupBy` defaults to `day` and also supports `agent`, `model`, `session`, and
`user`. `sessionId: ""` filters stateless Turns; response buckets represent
that sentinel as `sessionId: null`. Tenant-level `groupBy=user` buckets keep
`userId: ""`.

Full-text `search` is specific to Memories.

## Examples [#examples]

Page through Sessions until the backward cursor is exhausted:

```typescript
let cursor: string | undefined;

do {
  const page = await client.sessions.list(agentId, { cursor, limit: 100 });
  for (const session of page.data) {
    console.log(session.id);
  }
  cursor = page.nextCursor ?? undefined;
} while (cursor);
```

Bootstrap from a backward read, persist its non-null tail, then poll forward.
Only a `nextCursor` returned by a forward request is passed back as `after`:

```typescript
const bootstrap = await client.tasks.runMessages(taskId, runId, { limit: 50 });
for (const message of bootstrap.data) console.log(message);

if (bootstrap.latestCursor === null) {
  throw new Error("The Task run has no transcript tail yet");
}

await saveTail(bootstrap.latestCursor);
let after: string | undefined = bootstrap.latestCursor;

do {
  const page = await client.tasks.runMessages(taskId, runId, {
    after,
    limit: 50,
  });

  for (const message of page.data) console.log(message);
  if (page.latestCursor !== null) await saveTail(page.latestCursor);
  after = page.nextCursor ?? undefined;
} while (after);
```

Filter tenant-level usage and keep overall totals separate from top-N buckets:

```typescript
const usage = await client.usage.get({
  from: "2026-07-01",
  to: "2026-07-20",
  userId: "",
  groupBy: "session",
  limit: 25,
});

console.log(usage.totals.requestCount, usage.buckets);
```

## Used by [#used-by]

- [Sessions and Turns](/platform/sessions-and-turns)
- [Tasks and schedules](/automation/tasks)
- [Usage and quotas](/platform/usage-and-quotas)
- [Build a chat endpoint](/platform/sessions-and-turns)
- [Run a background Task](/automation/tasks)
- [Monitor usage and quotas](/platform/usage-and-quotas)

## Source of truth [#source-of-truth]

- `packages/core/src/api.ts`
- `packages/core/src/api.test.ts`
- `packages/core/src/entities/agents.ts`
- `packages/core/src/entities/providers.ts`
- `packages/core/src/entities/mcp-connections.ts`
- `packages/core/src/entities/prompts.ts`
- `packages/core/src/entities/skills.ts`
- `packages/core/src/entities/sessions.ts`
- `packages/core/src/entities/workspaces.ts`
- `packages/core/src/entities/artifacts.ts`
- `packages/core/src/entities/memories.ts`
- `packages/core/src/entities/tasks.ts`
- `packages/core/src/entities/usage.ts`
- `packages/sdk/src/resources/agents.ts`
- `packages/sdk/src/resources/agents.test.ts`
- `packages/sdk/src/resources/providers.ts`
- `packages/sdk/src/resources/providers.test.ts`
- `packages/sdk/src/resources/mcp-connections.ts`
- `packages/sdk/src/resources/mcp-connections.test.ts`
- `packages/sdk/src/resources/prompts.ts`
- `packages/sdk/src/resources/prompts.test.ts`
- `packages/sdk/src/resources/sessions.ts`
- `packages/sdk/src/resources/sessions.test.ts`
- `packages/sdk/src/resources/artifacts.ts`
- `packages/sdk/src/resources/artifacts.test.ts`
- `packages/sdk/src/resources/memories.ts`
- `packages/sdk/src/resources/memories.test.ts`
- `packages/sdk/src/resources/tasks.ts`
- `packages/sdk/src/resources/tasks.test.ts`
- `packages/sdk/src/resources/usage.ts`
- `packages/sdk/src/resources/usage.test.ts`
- `servers/api/src/routes/sessions/list.ts`
- `servers/api/src/routes/sessions/list.test.ts`
- `servers/api/src/routes/sessions/list-messages.ts`
- `servers/api/src/routes/sessions/list-messages.test.ts`
- `servers/api/src/routes/artifacts/list.ts`
- `servers/api/src/routes/artifacts/list.test.ts`
- `servers/api/src/routes/memories/list.ts`
- `servers/api/src/routes/memories/list.test.ts`
- `servers/api/src/routes/task-runs/list.ts`
- `servers/api/src/routes/task-runs/list.test.ts`
- `servers/api/src/routes/task-runs/list-messages.ts`
- `servers/api/src/routes/task-runs/list-messages.test.ts`
- `servers/api/src/routes/usage/get.ts`
- `servers/api/src/routes/usage/get.test.ts`
- `servers/api/src/routes/usage/get-agent.ts`
- `servers/api/src/routes/usage/get-agent.test.ts`
- `servers/api/src/routes/agents/list-versions.ts`
- `servers/api/src/routes/agents/list-versions.test.ts`
- `servers/api/src/routes/agents/list.ts`
- `servers/api/src/routes/agents/list.test.ts`
- `servers/api/src/routes/agents/list-mcp-attachments.ts`
- `servers/api/src/routes/agents/mcp-attachments.test.ts`
- `servers/api/src/routes/providers/list.ts`
- `servers/api/src/routes/providers/list.test.ts`
- `servers/api/src/routes/mcp-connections/list.ts`
- `servers/api/src/routes/mcp-connections/routes.test.ts`
- `servers/api/src/routes/prompts/list.ts`
- `servers/api/src/routes/prompts/list.test.ts`
- `servers/api/src/routes/tasks/list.ts`
- `servers/api/src/routes/tasks/list.test.ts`
- `packages/server-core/src/agent-session-service.ts`
- `packages/server-core/src/artifact-service.ts`
- `packages/server-core/src/memory-service.ts`
- `packages/server-core/src/task.ts`
- `packages/server-core/src/task-run.ts`

## Related guides [#related-guides]

See the capability and guide links under [Used by](#used-by).

## Reference [#reference]

See the implementation inventory under [Source of truth](#source-of-truth).

Python page and iterator contracts are documented for
[`agents.list()`](/sdk/python/agents#list),
[`agents.list_versions()`](/sdk/python/agents#list-versions),
[`providers.list()`](/sdk/python/providers#list),
[`mcp_connections.list()`](/sdk/python/mcp-connections#list),
[`agents.list_mcp_attachments()`](/sdk/python/agents#list-mcp-attachments),
[`prompts.list()`](/sdk/python/prompts#list),
[`sessions.list()`](/sdk/python/sessions#list),
[`sessions.messages()`](/sdk/python/sessions#messages),
[`artifacts.list()`](/sdk/python/artifacts#list),
[`memories.list()`](/sdk/python/memories#list),
[`tasks.list()`](/sdk/python/tasks#list),
[`tasks.list_runs()`](/sdk/python/tasks#list-runs),
[`tasks.run_messages()`](/sdk/python/tasks#run-messages),
[`usage.get()`](/sdk/python/usage#get), and
[`usage.get_for_agent()`](/sdk/python/usage#get-for-agent).
