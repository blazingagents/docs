---
title: Service limits
description: Design around current resource, payload, query, execution, and tenant resource bounds.
---

# Service limits

These are the limits Blazing Agents enforces today. Use them to validate input
before you send it and to plan capacity. They are not billing entitlements or
recommended batch sizes.

Last verified: 2026-10-24.

## Contract [#contract]

Fixed limits apply to every tenant. Limits marked platform default are set by
Blazing Agents and can change within the range shown. A model spending limit is a ceiling you set yourself
to protect against runaway model spend; billing is separate and
described in [Usage and spending limits](/platform/usage-and-spending-limits).

| Limit                                                                               | Current value                                                                                                  | Scope                     | On exceed                                                       | Kind                    |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------- | ----------------------- |
| <span id="api-keys-per-tenant">API keys per Tenant</span>                           | 5                                                                                                              | Tenant                    | [`api_key_limit_reached`](/api-reference/protocols/errors#api_key_limit_reached) on create                               | fixed                   |
| <span id="request-body">Request body</span> | 15 MiB | one request | 413 `invalid_request` | fixed |
| <span id="api-key-name">API key name</span>                                         | 80 characters                                                                                                  | API key                   | [`validation_failed`](/api-reference/protocols/errors#validation_failed)                                             | fixed                   |
| <span id="api-key-expiry">API key expiry</span>                                     | when supplied, must be later than the current time                                                             | API key create            | [`invalid_request`](/api-reference/protocols/errors#invalid_request)                                               | fixed                   |
| <span id="agent-fields">Agent fields</span>                                         | name 80; instructions 3,000 characters                                                                         | Agent                     | `validation_failed`                                             | fixed                   |
| <span id="tenant-resource-creation-rate">Tenant resource creation rate</span>       | 60/minute and 1,000/day, independently for Agents, Tasks, and Workspaces                                        | Tenant and resource type  | [`rate_limited`](/api-reference/protocols/errors#rate_limited); use `Retry-After`                                | service protection      |
| <span id="concurrent-turns">Concurrent turns</span> | 25 on the Developer plan; 50 on Pro. Session turns and stateless generation count together | Tenant | [`rate_limited`](/api-reference/protocols/errors#rate_limited) (429); retry later | plan |
| <span id="concurrent-task-runs">Concurrent task runs</span> | 50 on the Developer plan; 100 on Pro | Tenant | extra runs wait as `queued` | plan |
| <span id="mcp-connections-per-agent">MCP Connections per Agent</span>               | 10                                                                                                             | Agent                     | `validation_failed`                                             | fixed                   |
| <span id="agent-page">Agent page</span>                                             | default 50; max 100                                                                                            | list request              | `validation_failed`                                             | fixed                   |
| <span id="agent-avatar-upload">Agent avatar upload</span>                           | 512 KiB; PNG, JPEG, or WebP matching filename extension                                                        | upload                    | 413 for size; 415 for media type; code `invalid_request`        | fixed                   |
| <span id="workspace-name">Workspace name</span>                                     | 80 characters when present                                                                                    | Workspace                 | `validation_failed`                                             | fixed                   |
| <span id="workspace-page">Workspace page</span>                                     | default 50; max 200                                                                                            | list request              | `validation_failed`                                             | fixed                   |
| <span id="workspace-idle-stop">Workspace idle stop</span> | about 10 minutes without a file or shell operation | Workspace | the workspace stops; Core loses its files, Plus keeps them | fixed |
| <span id="workspace-disk">Core workspace disk</span> | about 1.3 GB free | Core Workspace | writes and installs fail when the disk is full | fixed |
| <span id="skills-per-agent">Skills per Agent</span>                                 | 100                                                                                                            | Agent                     | [`skill_limit_reached`](/api-reference/protocols/errors#skill_limit_reached) on create                                 | fixed product guard     |
| <span id="skill-bundle">Skill bundle</span>                                         | 10 MiB upload and stored/uncompressed bytes; 100 regular files                                                 | Skill                     | typed Skill size or file-count error                            | fixed                   |
| <span id="skill-frontmatter">Skill frontmatter</span>                               | name 64; description 1,024; compatibility 500 characters                                                       | `SKILL.md`                | [`skill_invalid_markdown`](/api-reference/protocols/errors#skill_invalid_markdown)                                        | fixed                   |
| <span id="skill-copy">Skill copy destinations</span>                                | 30 distinct Agents                                                                                             | one copy request          | `validation_failed`                                             | fixed                   |
| <span id="skill-page">Skill page</span>                                             | default 50; max 100                                                                                            | Agent Skill list          | `validation_failed`                                             | fixed                   |
| <span id="providers-per-tenant">Providers per Tenant</span>                         | 20                                                                                                             | Tenant                    | [`provider_limit_reached`](/api-reference/protocols/errors#provider_limit_reached) on create                              | fixed                   |
| <span id="provider-name">Provider name</span>                                       | 80 characters                                                                                                  | Provider                  | `validation_failed`                                             | fixed                   |
| <span id="custom-provider-base-url">Custom Provider base URL</span>                 | required, non-empty, and valid on create; immutable after creation                                               | custom Provider config    | `validation_failed`                                             | fixed                   |
| <span id="chat-connection-fields">Chat connection fields</span> | name 80 characters; 20 channel or chat IDs per list | chat connection | `validation_failed` | fixed |
| <span id="mcp-connections-per-tenant">MCP Connections per Tenant</span>             | 50                                                                                                             | Tenant                    | [`mcp_connection_limit_reached`](/api-reference/protocols/errors#mcp_connection_limit_reached) on create                        | fixed                   |
| <span id="mcp-connection-input">MCP Connection input</span>                         | name 80; URL/client ID/scope 2,048; bearer token/client secret 8,192 characters                                | connection request        | `validation_failed`                                             | fixed                   |
| <span id="mcp-tools">MCP Tools</span>                                               | 128 per Connection; 256 per Turn                                                                               | remote MCP catalog        | the connection is rejected, or the turn fails                                    | fixed                   |
| <span id="mcp-payloads">MCP payloads</span>                                         | definition 256 KiB; definitions per Connection 1 MiB; Tool result 1 MiB; request context 16 KiB                | MCP setup/call            | connection/Tool error                                           | fixed                   |
| <span id="mcp-forwarded-metadata">MCP forwarded metadata</span>                     | 32 keys, each 64 characters                                                                                    | MCP Attachment            | `validation_failed`                                             | fixed                   |
| <span id="prompt-page">Prompt page</span>                                           | default 50; max 100                                                                                            | list request              | `validation_failed`                                             | fixed                   |
| <span id="prompt-fields">Prompt fields</span>                                       | name 80; template 10,240 JavaScript string units; 10 distinct variables                                        | Prompt                    | `validation_failed`                                             | fixed                   |
| <span id="task-fields">Task fields</span>                                           | name 80; prompt 6,000 characters                                                                               | Task                      | `validation_failed`                                             | fixed                   |
| <span id="task-schedule-fields">Task schedule fields</span>                         | cron expression 120; timezone 64 characters                                                                    | Task cron schedule        | `validation_failed`                                             | fixed                   |
| <span id="task-interval">Task interval</span>                                       | minimum 60,000 ms                                                                                              | interval schedule         | `validation_failed`                                             | fixed                   |
| <span id="active-task-run">Active Task run</span>                                   | 1 per Task                                                                                                     | Task                      | overlapping schedule fire is skipped                            | fixed                   |
| <span id="scheduled-run-start">Scheduled run start</span> | up to about 30 seconds after the scheduled time | scheduled task | none; the run starts late | platform default |
| <span id="shell-command">Shell command</span> | 30 seconds per `bash` call | one `bash` Tool call | the command is killed and the call returns a Tool error | fixed |
| <span id="file-write-input">File write input</span>                                 | 512,000 UTF-8 bytes                                                                                            | one `write` Tool call     | Tool error output                                               | fixed                   |
| <span id="file-edit-input">File edit input</span>                                   | 256,000 UTF-8 bytes across old and new text                                                                    | one `edit` Tool call      | Tool error output                                               | fixed                   |
| <span id="file-output-bytes">File Tool output bytes</span>                          | 50 KiB                                                                                                         | one Tool result           | output is truncated                                             | fixed                   |
| <span id="file-output-lines">File Tool output lines</span>                          | 2,000 lines                                                                                                    | one Tool result           | output is truncated                                             | fixed                   |
| <span id="file-grep-output">File grep output</span>                                 | 100 matches; 500 characters per rendered match line                                                            | one `grep` Tool call      | extra matches and line text are truncated                       | fixed                   |
| <span id="file-glob-output">File glob output</span>                                 | 1,000 paths                                                                                                    | one `glob` Tool call      | extra paths are truncated                                       | fixed                   |
| <span id="artifacts"></span><span id="artifact-file">Artifact file</span>           | 10 MiB                                                                                                         | one `publish_artifacts` path | Tool error output                                             | fixed                   |
| <span id="artifact-batch">Artifact batch</span>                                     | 10 paths                                                                                                       | one `publish_artifacts` call | Tool validation error                                        | fixed                   |
| <span id="artifacts-per-session">Artifacts per Session</span>                       | 50                                                                                                             | Session                   | [`artifact_session_cap_reached`](/api-reference/protocols/errors#artifact_session_cap_reached) while recording                  | fixed                   |
| <span id="artifact-download-url">Artifact download URL</span> | valid for 5 minutes | one download URL | the URL stops working; create a new one | fixed |
| <span id="memories-per-agent">Memories per Agent</span> | 500 across all end users | Agent | saving another note removes the least recently used one; a [scoped save](/platform/tenancy-and-attribution#user-labels-and-user-scope) removes only that user's notes and returns `invalid_request` when other notes fill the agent | fixed |
| <span id="memory-text">Memory text</span>                                           | 10 KiB UTF-8 bytes                                                                                             | Memory                    | `validation_failed`                                             | fixed                   |
| <span id="memory-page">Memory page</span>                                           | default 50; max 100                                                                                            | list request              | `validation_failed`                                             | fixed                   |
| <span id="memory-tool-search">Memory Tool search</span>                             | default 10; max 20                                                                                             | Tool call                 | Tool validation error                                           | fixed                   |
| <span id="memory-injection">Memories added to a turn</span> | 4,000 words, in the order the agent reads them | Turn | the memory that crosses the budget is cut off and later ones are left out | fixed |
| <span id="session-or-task-run-message-page">Session or Task-run message page</span> | default 50; max 200                                                                                            | list request              | `validation_failed`                                             | fixed                   |
| <span id="tool-approval-decision-reason">Tool approval decision reason</span>       | 1,000 characters                                                                                               | approval decision         | `validation_failed`                                             | fixed                   |
| <span id="backend-functions">Backend functions</span> | 32 per turn; definitions 64 KiB in total; each call's arguments and result 256 KiB | one turn | definitions: `validation_failed`, which the SDKs check before sending; oversized arguments or result: a tool error for the model | fixed |
| <span id="backend-function-call">Backend function call</span> | 60 seconds for your backend to return a result | one function call | the call fails for the model | fixed |
| <span id="web-search">Web search</span> | query 1 to 1,024 characters; at most 10 results | one `web_search` call | Tool validation error | fixed |
| <span id="steer-request-id">Steer `requestId`</span>                                  | 1 to 128 characters; not `.` or `..`                                                                             | steer request               | `validation_failed`                                               | fixed                     |
| <span id="unresponsive-turn">Unresponsive previous turn</span> | a turn silent for more than 35 seconds is treated as stopped; the session is free again within 60 seconds | Session | [`session_turn_unresponsive`](/api-reference/protocols/errors#session_turn_unresponsive) with `Retry-After`; a turn still responding gives [`session_busy`](/api-reference/protocols/errors#session_busy) | fixed |
| <span id="session-input-page">Session input page</span>                               | default 100; max 200                                                                                             | list request                | `validation_failed`                                               | fixed                     |
| <span id="fork-idempotency-key">Fork `Idempotency-Key`</span>                         | 1 to 200 characters                                                                                              | fork request                | `validation_failed`                                               | fixed                     |
| <span id="other-cursored-resource-pages">Other cursored resource pages</span>       | Sessions, Tasks, and Task runs default 50/max 200; Artifacts fixed 50                                          | list request              | `validation_failed` or [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor)                         | fixed                   |
| <span id="usage-query-window">Usage query window</span>                             | default last 30 UTC days; bounds differ by at most 31 days                                                     | query                     | `validation_failed`                                             | fixed                   |
| <span id="usage-session-top-n">Usage Session top-N</span>                           | default 50; max 200                                                                                            | `groupBy=session`         | `validation_failed`                                             | fixed                   |
| <span id="usage-exact-session-batch">Exact session usage batch</span>               | 1 to 100 distinct session IDs                                                                                  | request                   | `validation_failed`                                             | fixed                   |
| <span id="usage-overview-top-n">Usage overview top-N</span>                         | default 5; max 20                                                                                              | Agent, End-user, and model ranking | `validation_failed`                                     | fixed                   |
| <span id="spending-limit-amount">Spending limit amount</span> | more than 0 and up to 1,000,000,000 USD | tenant or agent spending limit | `validation_failed` | fixed |
| <span id="tenant-display-name">Tenant display name</span>                           | 80 characters                                                                                                  | Tenant settings           | `validation_failed`                                             | fixed                   |
| <span id="monetization-guard-products">Monetization guard products</span> | 100 product IDs | merchant connection guard | `validation_failed` | fixed |
| <span id="merchant-page">Customer binding and usage event page</span> | default 50; max 200 | list request | `validation_failed` | fixed |
| <span id="merchant-usage-summary-days">Usage event summary window</span> | default 14 days; max 90 | summary request | `validation_failed` | fixed |
| <span id="agent-loop-steps">Agent loop steps</span>                                 | 64                                                                                                             | Turn                      | the turn ends after its 64th step                                 | fixed                   |
| <span id="task-run-lifetime"></span><span id="turn-deadline">Turn deadline</span> | 30 minutes after the turn starts; no setting changes it | session turn, generation, or task run | the turn stops and its reply is not saved; a task run ends as `failed` | fixed |
| <span id="mcp-runtime-timeouts">MCP runtime timeouts</span>                         | connect 10 s (1 to 30); auth 10 s (1 to 30); discovery 15 s (1 to 60); tool 60 s (1 to 300); cleanup 5 s (0.1 to 10)          | MCP operation             | the MCP call fails                                          | platform default |

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
Memories do not count toward durable storage. Your model spending limit is neither a
billing plan nor a rate limit.

## Examples [#examples]

Warn when spending nears your own limit:

```typescript tab="TypeScript"
const { spendingLimit, period } = await client.tenant.getSpendingLimit();

if (spendingLimit && period) {
  if (period.availableUsd < spendingLimit.amountUsd * 0.1) {
    console.warn("Model spending limit is nearly used");
  }
}
```

```python tab="Python"
budget = client.tenant.get_spending_limit()

if budget.spending_limit and budget.period:
    if budget.period.available_usd < budget.spending_limit.amount_usd * 0.1:
        print("Model spending limit is nearly used")
```

```rust tab="Rust"
let budget = client.tenant().get_spending_limit().await?;

if let (Some(limit), Some(period)) = (&budget.spending_limit, &budget.period) {
    if period.available_usd < limit.amount_usd * 0.1 {
        println!("Model spending limit is nearly used");
    }
}
```

```go tab="Go"
budget, err := client.SpendingLimits.GetTenant(ctx)
if err != nil {
	return err
}

if budget.SpendingLimit != nil && budget.Period != nil {
	if budget.Period.AvailableUSD < budget.SpendingLimit.AmountUSD*0.1 {
		fmt.Println("Model spending limit is nearly used")
	}
}
return nil
```

## Next [#next]

- [Errors](/api-reference/protocols/errors) for the codes these limits return.
- [Limits and reliability](/platform/limits-and-reliability) for retries and timeouts.
- [Usage and spending limits](/platform/usage-and-spending-limits) to set a model spending limit.
