---
title: Service limits
description: Design around current resource, payload, query, execution, and Tenant Quota bounds.
---

# Service limits

These are the limits Blazing Agents enforces today. Use them to validate input
before you send it and to plan capacity. They are not billing entitlements or
recommended batch sizes.

Last verified: 2026-08-27.

## Contract [#contract]

Fixed limits apply to every tenant. Limits marked deployment-configurable have
a default within the range shown. A tenant quota is a ceiling you set yourself
to protect against runaway token or request use; billing is separate and
described in [Usage and quotas](/platform/usage-and-quotas).

| Limit                                                                               | Current value                                                                                                  | Scope                     | On exceed                                                       | Kind                    |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------- | ----------------------- |
| <span id="api-keys-per-tenant">API keys per Tenant</span>                           | 5                                                                                                              | Tenant                    | [`api_key_limit_reached`](/api-reference/protocols/errors#api_key_limit_reached) on create                               | fixed                   |
| <span id="api-key-name">API key name</span>                                         | 80 characters                                                                                                  | API key                   | [`validation_failed`](/api-reference/protocols/errors#validation_failed)                                             | fixed                   |
| <span id="api-key-expiry">API key expiry</span>                                     | when supplied, must be later than the current time                                                             | API key create            | [`invalid_request`](/api-reference/protocols/errors#invalid_request)                                               | fixed                   |
| <span id="agent-fields">Agent fields</span>                                         | name 80; instructions 3,000 characters                                                                         | Agent                     | `validation_failed`                                             | fixed                   |
| <span id="tenant-resource-creation-rate">Tenant resource creation rate</span>       | 60/minute and 1,000/day, independently for Agents, Tasks, and Workspaces                                        | Tenant and resource type  | [`rate_limited`](/api-reference/protocols/errors#rate_limited); use `Retry-After`                                | service protection      |
| <span id="mcp-connections-per-agent">MCP Connections per Agent</span>               | 10                                                                                                             | Agent                     | `validation_failed`                                             | fixed                   |
| <span id="agent-version-page">Agent Version page</span>                             | default 50; max 200                                                                                            | list request              | `validation_failed`                                             | fixed                   |
| <span id="agent-avatar-upload">Agent avatar upload</span>                           | 512 KiB; PNG, JPEG, or WebP matching filename extension                                                        | upload                    | 413 for size; 415 for media type; code `invalid_request`        | fixed                   |
| <span id="workspace-name">Workspace name</span>                                     | 80 characters when present                                                                                    | Workspace                 | `validation_failed`                                             | fixed                   |
| <span id="workspace-page">Workspace page</span>                                     | default 50; max 200                                                                                            | list request              | `validation_failed`                                             | fixed                   |
| <span id="skills-per-agent">Skills per Agent</span>                                 | 100                                                                                                            | Agent                     | [`skill_limit_reached`](/api-reference/protocols/errors#skill_limit_reached) on create                                 | fixed product guard     |
| <span id="skill-bundle">Skill bundle</span>                                         | 10 MiB upload and stored/uncompressed bytes; 100 regular files                                                 | Skill                     | typed Skill size or file-count error                            | fixed                   |
| <span id="skill-frontmatter">Skill frontmatter</span>                               | name 64; description 1,024; compatibility 500 characters                                                       | `SKILL.md`                | [`skill_invalid_markdown`](/api-reference/protocols/errors#skill_invalid_markdown)                                        | fixed                   |
| <span id="skill-copy">Skill copy destinations</span>                                | 30 distinct Agents                                                                                             | one copy request          | `validation_failed`                                             | fixed                   |
| <span id="skill-page">Skill page</span>                                             | default 50; max 100                                                                                            | Agent Skill list          | `validation_failed`                                             | fixed                   |
| <span id="providers-per-tenant">Providers per Tenant</span>                         | 20                                                                                                             | Tenant                    | [`provider_limit_reached`](/api-reference/protocols/errors#provider_limit_reached) on create                              | fixed                   |
| <span id="provider-name">Provider name</span>                                       | 80 characters                                                                                                  | Provider                  | `validation_failed`                                             | fixed                   |
| <span id="custom-provider-base-url">Custom Provider base URL</span>                 | required, non-empty, and valid on create; immutable after creation                                               | custom Provider config    | `validation_failed`                                             | fixed                   |
| <span id="mcp-connections-per-tenant">MCP Connections per Tenant</span>             | 50                                                                                                             | Tenant                    | [`mcp_connection_limit_reached`](/api-reference/protocols/errors#mcp_connection_limit_reached) on create                        | fixed                   |
| <span id="mcp-connection-input">MCP Connection input</span>                         | name 80; URL/client ID/scope 2,048; bearer token/client secret 8,192 characters                                | connection request        | `validation_failed`                                             | fixed                   |
| <span id="mcp-tools">MCP Tools</span>                                               | 128 per Connection; 256 per Turn                                                                               | remote MCP catalog        | connection/Turn fails safely                                    | fixed                   |
| <span id="mcp-payloads">MCP payloads</span>                                         | definition 256 KiB; definitions per Connection 1 MiB; Tool result 1 MiB; request context 16 KiB                | MCP setup/call            | connection/Tool error                                           | fixed                   |
| <span id="mcp-forwarded-metadata">MCP forwarded metadata</span>                     | 32 keys, each 64 characters                                                                                    | MCP Attachment            | `validation_failed`                                             | fixed                   |
| <span id="prompts-per-tenant">Prompts per Tenant</span>                             | 100                                                                                                            | Tenant                    | [`prompt_limit_reached`](/api-reference/protocols/errors#prompt_limit_reached) on create                                | fixed                   |
| <span id="prompt-fields">Prompt fields</span>                                       | name 80; template 10,240 JavaScript string units; 10 distinct variables                                        | Prompt                    | `validation_failed`                                             | fixed                   |
| <span id="task-fields">Task fields</span>                                           | name 80; prompt 6,000 characters                                                                               | Task                      | `validation_failed`                                             | fixed                   |
| <span id="task-schedule-fields">Task schedule fields</span>                         | cron expression 120; timezone 64 characters                                                                    | Task cron schedule        | `validation_failed`                                             | fixed                   |
| <span id="task-interval">Task interval</span>                                       | minimum 60,000 ms                                                                                              | interval schedule         | `validation_failed`                                             | fixed                   |
| <span id="active-task-run">Active Task run</span>                                   | 1 per Task                                                                                                     | Task                      | overlapping schedule fire is skipped                            | fixed                   |
| <span id="task-run-lifetime">Task run lifetime</span>                               | default 35 minutes; minimum 1 minute                                                                           | Task run                  | lifetime cancellation stops the Turn                            | deployment-configurable |
| <span id="file-write-input">File write input</span>                                 | 512,000 UTF-8 bytes                                                                                            | one `write` Tool call     | Tool error output                                               | fixed                   |
| <span id="file-edit-input">File edit input</span>                                   | 256,000 UTF-8 bytes across old and new text                                                                    | one `edit` Tool call      | Tool error output                                               | fixed                   |
| <span id="file-output-bytes">File Tool output bytes</span>                          | 50 KiB                                                                                                         | one Tool result           | output is truncated                                             | fixed                   |
| <span id="file-output-lines">File Tool output lines</span>                          | 2,000 lines                                                                                                    | one Tool result           | output is truncated                                             | fixed                   |
| <span id="file-grep-output">File grep output</span>                                 | 100 matches; 500 characters per rendered match line                                                            | one `grep` Tool call      | extra matches and line text are truncated                       | fixed                   |
| <span id="file-glob-output">File glob output</span>                                 | 1,000 paths                                                                                                    | one `glob` Tool call      | extra paths are truncated                                       | fixed                   |
| <span id="artifacts"></span><span id="artifact-file">Artifact file</span>           | 10 MiB                                                                                                         | one `publish_artifacts` path | Tool error output                                             | fixed                   |
| <span id="artifact-batch">Artifact batch</span>                                     | 10 paths                                                                                                       | one `publish_artifacts` call | Tool validation error                                        | fixed                   |
| <span id="artifacts-per-session">Artifacts per Session</span>                       | 100                                                                                                            | Session                   | [`artifact_session_cap_reached`](/api-reference/protocols/errors#artifact_session_cap_reached) while recording                  | fixed                   |
| <span id="memories-per-agent">Memories per Agent</span>                             | 500 across all Attribution partitions                                                                          | Agent                     | least-recently-accessed rows are evicted on create              | fixed                   |
| <span id="memory-text">Memory text</span>                                           | 10 KiB UTF-8 bytes                                                                                             | Memory                    | `validation_failed`                                             | fixed                   |
| <span id="memory-page">Memory page</span>                                           | default 50; max 100                                                                                            | list request              | `validation_failed`                                             | fixed                   |
| <span id="memory-tool-search">Memory Tool search</span>                             | default 10; max 20                                                                                             | Tool call                 | Tool validation error                                           | fixed                   |
| <span id="session-or-task-run-message-page">Session or Task-run message page</span> | default 50; max 200                                                                                            | list request              | `validation_failed`                                             | fixed                   |
| <span id="tool-approval-decision-reason">Tool approval decision reason</span>       | 1,000 characters                                                                                               | approval decision         | `validation_failed`                                             | fixed                   |
| <span id="other-cursored-resource-pages">Other cursored resource pages</span>       | Sessions, Tasks, and Task runs default 50/max 200; Artifacts fixed 50                                          | list request              | `validation_failed` or [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor)                         | fixed                   |
| <span id="usage-query-window">Usage query window</span>                             | default last 30 UTC days; bounds differ by at most 31 days                                                     | query                     | `validation_failed`                                             | fixed                   |
| <span id="usage-session-top-n">Usage Session top-N</span>                           | default 50; max 200                                                                                            | `groupBy=session`         | `validation_failed`                                             | fixed                   |
| <span id="usage-overview-top-n">Usage overview top-N</span>                         | default 5; max 20                                                                                              | Agent, End-user, and model ranking | `validation_failed`                                     | fixed                   |
| <span id="quota-reset-day">Quota reset day</span>                                   | 1–28                                                                                                           | Tenant Quota              | `validation_failed`                                             | Tenant-configurable     |
| <span id="quota-ceilings">Quota ceilings</span>                                     | positive token/request integers or `null`; null/absent is unlimited                                            | Tenant                    | Turn returns [`quota_exceeded`](/api-reference/protocols/errors#quota_exceeded); Task preflight becomes `blocked` | Tenant-configurable     |
| <span id="tenant-display-name">Tenant display name</span>                           | 80 characters                                                                                                  | Tenant settings           | `validation_failed`                                             | fixed                   |
| <span id="agent-loop-steps">Agent loop steps</span>                                 | 64                                                                                                             | Turn                      | loop reaches its terminal bound                                 | fixed                   |
| <span id="turn-deadline">Turn deadline</span>                                       | default 30 minutes; configurable range 1–60 minutes                                                                | Turn                      | cancellation/deadline stops new dispatch                        | deployment-configurable |
| <span id="mcp-runtime-timeouts">MCP runtime timeouts</span>                         | connect 10 s (1–30); auth 10 s (1–30); discovery 15 s (1–60); Tool 60 s (1–300); cleanup 5 s (0.1–10)          | MCP operation             | operation fails safely                                          | deployment-configurable |

Byte values use binary units (`1 MiB = 1,048,576 bytes`). Other length limits
count characters. The prompt template limit counts 10,240 JavaScript string
units.

Limits do not all behave the same way. When an agent is full, the least
recently used memory is removed instead of the new one being rejected. An
overlapping task schedule skips the run without creating a task-run record.
Workspace operations are not queued behind a compute limit. Automatic context
compaction summarizes older messages by default, and the agent's reserve
setting controls when it starts. Context can still overflow when compaction is
off, cannot shrink a single oversized input, or fails. A turn deadline does not
undo work a tool has already sent to an external system.

Session turns, stateless generation, and task runs are all metered turns.
Memories do not count toward durable storage. Your tenant quota is neither a
billing plan nor a rate limit.

## Examples [#examples]

Warn when request usage nears your own ceiling:

```typescript tab="TypeScript"
const [usage, settings] = await Promise.all([
  client.usage.get({ from: "2026-07-01", to: "2026-07-20" }),
  client.tenant.get(),
]);

const ceiling = settings.quota?.monthlyRequestLimit;
if (ceiling !== null && ceiling !== undefined) {
  const remaining = ceiling - usage.totals.requestCount;
  if (remaining < ceiling * 0.1) console.warn("Request quota is nearly used");
}
```

```python tab="Python"
usage = client.usage.get(from_="2026-07-01", to="2026-07-20")
settings = client.tenant.get()

ceiling = settings.quota.monthly_request_limit if settings.quota else None
if ceiling is not None:
    remaining = ceiling - usage.totals.request_count
    if remaining < ceiling * 0.1:
        print("Request quota is nearly used")
```

## Next [#next]

- [Errors](/api-reference/protocols/errors) for the codes these limits return.
- [Limits and reliability](/platform/limits-and-reliability) for retries and timeouts.
- [Usage and quotas](/platform/usage-and-quotas) to set a tenant quota.
