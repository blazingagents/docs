---
title: Pagination and filtering
description: Traverse opaque keyset pages, poll transcripts forward, and apply each collection's supported filters.
---

# Pagination and filtering

Long lists come back one page at a time. Pass the cursor from one page into the
next request to keep reading. Transcripts add a second cursor so you can poll
for new messages without re-reading old ones.

## Contract [#contract]

A standard page is `{ data, nextCursor }`. Pass a non-null `nextCursor` back as
`cursor` to the same endpoint with the same filters. `null` means there are no
more pages in that direction. Cursors are opaque: do not decode, edit, or reuse
one on another list. A cursor the API cannot read returns `400
invalid_cursor`; other bad paging parameters return `400 validation_failed`.

Lists run newest first: tasks by
`updatedAt`, memories by `createdAt` then `id`, and other lists by their own
timestamp. Transcripts return the newest page first, with messages in
chronological order inside each page.

| Collection        | SDK method                                                                                                         | REST operation                                                                                                     | Response cursor fields       | Page size                                       | Filters                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ----------------------------------------------- | -------------------------------------------- |
| Agents            | [`agents.list`](/sdk/typescript/agents#list)                                                             | [`list-agents`](/api-reference/rest-api/agents#list-agents)                                                            | `nextCursor`                 | default 50, max 100                             | `userId`, `workspaceId`                      |
| Providers         | [`providers.list`](/sdk/typescript/providers#list)                                                       | [`list-providers`](/api-reference/rest-api/providers#list-providers)                                                   | none                         | bounded; no public `limit`                      | none                                            |
| MCP Connections   | [`mcpConnections.list`](/sdk/typescript/mcp-connections#list)                                            | [`list-mcp-connections`](/api-reference/rest-api/mcp-connections#list-mcp-connections)                                 | none                         | bounded; no public `limit`                      | none                                            |
| MCP Attachments   | [`agents.listMcpAttachments`](/sdk/typescript/agents#list-mcp-attachments)                               | [`list-agent-mcp-attachments`](/api-reference/rest-api/agents#list-agent-mcp-attachments)                              | none                         | bounded; no public `limit`                      | owning Agent path                            |
| Prompts           | [`prompts.list`](/sdk/typescript/prompts#list)                                                           | [`list-prompts`](/api-reference/rest-api/prompts#list-prompts)                                                         | `nextCursor`                 | default 50, max 100                             | `userId`, `agentId`                          |
| Sessions          | [`sessions.list`](/sdk/typescript/sessions#list)                                                         | [`list-sessions`](/api-reference/rest-api/sessions#list-sessions)                                                      | `nextCursor`                 | default 50, max 200                             | `userId`                                     |
| Latest Sessions   | [`sessions.listLatest`](/sdk/typescript/sessions#list-latest)                                            | [`list-latest-sessions`](/api-reference/rest-api/sessions#list-latest-sessions)                                    | `nextCursor`                 | default 50, max 200                             | `userId`, `byAgent`                          |
| Session messages  | [`sessions.messages`](/sdk/typescript/sessions#messages)                                                 | [`list-session-messages`](/api-reference/rest-api/sessions#list-session-messages)                                      | `nextCursor`, `latestCursor` | default 50, max 200                             | `cursor` or `after`                          |
| Artifacts         | [`artifacts.list`](/sdk/typescript/artifacts#list)                                                       | [`list-artifacts`](/api-reference/rest-api/artifacts#list-artifacts)                                                   | `nextCursor`                 | fixed 50; no public `limit`                     | `agentId`, `sessionId`                       |
| Memories          | [`memories.list`](/sdk/typescript/memories#list)                                                         | [`list-memories`](/api-reference/rest-api/memories#list-memories)                                                      | `nextCursor`                 | default 50, max 100                             | `userId`, `search`                           |
| Tasks             | [`tasks.list`](/sdk/typescript/tasks#list)                                                               | [`list-tasks`](/api-reference/rest-api/tasks#list-tasks)                                                               | `nextCursor`                 | default 50, max 200                             | `agentId`, `userId`                          |
| Task runs         | [`tasks.listRuns`](/sdk/typescript/tasks#list-runs)                                                      | [`list-task-runs`](/api-reference/rest-api/task-runs#list-task-runs)                                                   | `nextCursor`                 | default 50, max 200                             | owning Task path                             |
| Task run messages | [`tasks.runMessages`](/sdk/typescript/tasks#run-messages)                                                | [`list-task-run-messages`](/api-reference/rest-api/task-runs#list-task-run-messages)                                   | `nextCursor`, `latestCursor` | default 50, max 200                             | `cursor` or `after`                          |
| Usage             | [`usage.get`](/sdk/typescript/usage#get), [`getForAgent`](/sdk/typescript/usage#get-for-agent) | [`get-usage`](/api-reference/rest-api/usage#get-usage), [`get-agent-usage`](/api-reference/rest-api/usage#get-agent-usage) | none                         | not cursored; Session top-N default 50, max 200 | dates, Agent, Session, Attribution, grouping |


Lists without cursor fields return everything in one bounded response. No
list supports offsets, total counts, or custom sorting.

Session and task-run transcripts add `latestCursor`:

- `cursor` walks backward to older messages.
- `after` reads messages newer than a saved position.
- Send one or the other, never both.
- When `data` is not empty, save `latestCursor` and use it as the next `after`
  value, even if `nextCursor` is null.
- In forward mode, pass a non-null `nextCursor` back as `after` to finish the
  current result. `latestCursor` marks where the next poll starts once you have
  drained it.

Every `userId` filter works the same way: leave it out to include everyone,
send `""` for tenant-level records, or send a value to select that end user.
`userId` groups your data; it does not restrict access.

Usage `from` and `to` are inclusive UTC dates and must be sent together.
Without them you get the last 30 days ending today, and the range can span at
most 31 days. `groupBy` defaults to `day` and also accepts `agent`, `model`,
`session`, and `user`. `sessionId: ""` selects stateless turns, which come back
with `sessionId: null`. Tenant-level buckets in `groupBy=user` keep
`userId: ""`.

Only memories support full-text `search`.

Multi-value filters such as `status` on [list tenant chat deliveries](/api-reference/rest-api/chat-connections#list-tenant-chat-deliveries) take a comma-separated list in one parameter.

## Examples [#examples]

Read every session for an agent, one page at a time:

```typescript tab="TypeScript"
let cursor: string | undefined;

do {
  const page = await client.sessions.list({ agentId, cursor, limit: 100 });
  for (const session of page.data) {
    console.log(session.id);
  }
  cursor = page.nextCursor ?? undefined;
} while (cursor);
```

```python tab="Python"
for session in client.sessions.iter(agent_id=agent_id, limit=100):
    print(session.id)
```

Read a task run's transcript once, save its tail, then poll forward. Only pass
back as `after` a `nextCursor` that came from a forward request:

```typescript tab="TypeScript"
const bootstrap = await client.tasks.runMessages({ taskId, runId, limit: 50 });
for (const message of bootstrap.data) console.log(message);

if (bootstrap.latestCursor === null) {
  throw new Error("The task run has no transcript yet");
}

await saveTail(bootstrap.latestCursor);
let after: string | undefined = bootstrap.latestCursor;

do {
  const page = await client.tasks.runMessages({
    taskId,
    runId,
    after,
    limit: 50,
  });

  for (const message of page.data) console.log(message);
  if (page.latestCursor !== null) await saveTail(page.latestCursor);
  after = page.nextCursor ?? undefined;
} while (after);
```

```python tab="Python"
bootstrap = client.tasks.run_messages(task_id, run_id, limit=50)
for message in bootstrap.data:
    print(message)

if bootstrap.latest_cursor is None:
    raise RuntimeError("The task run has no transcript yet")

save_tail(bootstrap.latest_cursor)
after = bootstrap.latest_cursor

while after is not None:
    page = client.tasks.run_messages(task_id, run_id, after=after, limit=50)
    for message in page.data:
        print(message)
    if page.latest_cursor is not None:
        save_tail(page.latest_cursor)
    after = page.next_cursor
```

Read tenant-level usage and keep the overall totals apart from the top-N
buckets:

```typescript tab="TypeScript"
const usage = await client.usage.get({
  from: "2026-07-01",
  to: "2026-07-20",
  userId: "",
  groupBy: "session",
  limit: 25,
});

console.log(usage.totals.requestCount, usage.buckets);
```

```python tab="Python"
usage = client.usage.get(
    from_="2026-07-01",
    to="2026-07-20",
    user_id="",
    group_by="session",
    limit=25,
)

print(usage.totals.request_count, usage.buckets)
```

## Next [#next]

- [Sessions and turns](/platform/sessions-and-turns) to continue and reload conversations.
- [Tasks and schedules](/automation/tasks) to run agents in the background.
- [Usage and quotas](/platform/usage-and-quotas) to track spend per user.
