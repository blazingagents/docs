---
title: Objects and schemas
description: Look up public resource shapes, status values, mutability, timestamps, omission, and null behavior.
---

# Objects and schemas

Look up what each object contains, which fields you can change, and when a
field can be `null`. The REST API and the TypeScript SDK validate these shapes
with the same schemas, exported from `@blazingagents/sdk/contracts`. For the
full input of one operation, follow the link to its SDK or REST page.

## Contract [#contract]

Timestamps are ISO 8601 strings with an offset. Requests with unknown fields
are rejected. In an update, leaving a field out keeps its value, and `null`
clears it only where that update accepts `null`. Do not send read-only
response fields in a request.

Attribution works the same way everywhere: you set `userId` at creation and
cannot change it, and you can change `metadata` only where the update accepts
it. See [Attribution](#attribution).

| Schema                                                                | Fields and state                                         | Mutable                                            | Timestamps                                                                                                             | Nullability and omission                                                   |
| --------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [Agent](#agent)                                                       | configuration; `active` or `disabled`                    | configuration through update; lifecycle separately | `createdAt`, `updatedAt`                                                                                               | Provider and avatar may be `null`; Workspace is always present; omitted updates are unchanged |
| [Workspace](#workspace)                                               | durable private Agent files                              | name and metadata                                  | `createdAt`, `updatedAt`                                                                                               | name may be `null`; `userId: ""` is tenant-level                           |
| [AgentVersion](#agentversion)                                         | numbered immutable configuration copy                    | none                                               | `createdAt`                                                                                                            | preserves the nullable Provider reference                                  |
| [SessionListItem](#sessionlistitem)                                   | Session summary and configured Version Pin               | none                                               | `createdAt`, `updatedAt`                                                                                               | Pin and preview may be `null`                                              |
| [SessionMessage](#sessionmessage)                                     | AI SDK role, parts, optional metadata                    | platform-owned transcript                          | none                                                                                                                   | metadata may be omitted                                                    |
| [UsageSummary](#usagesummary)                                         | per-Turn metering; `succeeded`, `cancelled`, or `failed` | none                                               | `startedAt`, `completedAt`                                                                                             | `errorMessage` may be `null`; `sessionId: ""` means stateless              |
| [BlazingAgentsChatMessageMetadata](#blazingagentschatmessagemetadata) | nested usage; `succeeded`, `cancelled`, or `failed`      | none                                               | `blazingAgents.usage.startedAt`, `blazingAgents.usage.completedAt`                                                     | nested Usage summary preserves its null and sentinel behavior              |
| [ToolApprovalState](#toolapprovalstate)                               | decision and continuation states                         | decision endpoint only                             | none                                                                                                                   | reason may be `null`; continuation may be `null`                           |
| [ProviderResponse](#providerresponse)                                 | Provider type and redacted credential fragment           | name and allowed base URL                          | `createdAt`, `updatedAt`                                                                                               | base URL may be `null` only where Provider rules allow it                  |
| [McpConnectionResponse](#mcpconnectionresponse)                       | auth and connection state                                | name; reconnect replaces auth material             | `tokenExpiresAt`, `createdAt`, `updatedAt`                                                                             | OAuth fields and last error may be `null`                                  |
| [McpAttachmentResponse](#mcpattachmentresponse)                       | one Agent–Connection attachment                          | forwarding settings                                | `createdAt`, `updatedAt`                                                                                               | fields are present, not nullable                                           |
| [Memory](#memory)                                                     | Agent-owned text and access timestamp                    | text                                               | `createdAt`, `updatedAt`, `lastAccessedAt`                                                                             | public reads do not alter access time                                      |
| [ArtifactListItem](#artifactlistitem)                                 | append-only published file                               | publish or hard-delete                              | `createdAt`, `updatedAt`                                                                                               | fields are present, not nullable                                           |
| [Task](#task)                                                         | schedule and run pointers                                | documented update fields                           | `deletedAt`, `createdAt`, `updatedAt`                                                                                  | Version Pin, schedule, and lifecycle pointers may be `null`                |
| [TaskListItem](#tasklistitem)                                         | Task plus compact latest run                             | documented Task update fields                      | `deletedAt`, `createdAt`, `updatedAt`, `latestRun.finishedAt`                                                          | `latestRun` and its `finishedAt` may be `null`                             |
| [TaskRun](#taskrun)                                                   | queued-to-terminal execution state                       | cooperative cancel only                            | `startedAt`, `finishedAt`, `cancelRequestedAt`, `canceledAt`, `createdAt`, `updatedAt`                                 | Session, error, and lifecycle times follow state                           |
| [Prompt](#prompt)                                                     | template and inferred variables                          | name, template, metadata                           | `createdAt`, `updatedAt`                                                                                               | omitted updates are unchanged                                              |
| [UsageResponse](#usageresponse)                                       | buckets and totals                                       | none                                               | none                                                                                                                   | grouping keys may be `null`                                                |
| [Tenant](#tenant)                                                     | identity plus separate settings                          | settings only                                      | `createdAt`, `updatedAt`                                                                                               | Quota may be `null` or omitted on update                                   |
| [Quota](#quota)                                                       | monthly request/token ceilings                           | Tenant settings update                             | none                                                                                                                   | each ceiling may be `null`; absent Quota is unlimited                      |
| [Attribution](#attribution)                                           | `userId` and metadata                                    | resource-specific metadata                         | none                                                                                                                   | `userId: ""` means tenant-level                                            |

#### Public state vocabulary

| Public schema or field | Exact values |
| --- | --- |
| `agentStatusSchema` | `active`, `disabled` |
| `usageSummarySchema.status` | `succeeded`, `cancelled`, `failed` |
| `chatModeSchema` | `create`, `resume` |
| `chatTriggerSchema` | `submit-message`, `regenerate-message` |
| `mcpConnectionAuthTypeSchema` | `none`, `bearer`, `oauth_authorization_code`, `oauth_client_credentials` |
| `mcpConnectionStatusSchema` | `connected`, `needs_auth`, `error` |
| `mcpConnectionTestErrorCodeSchema` | `MCP_CONNECTION_AUTHENTICATION_FAILED`, `MCP_CONNECTION_INVALID`, `MCP_CONNECTION_UNREACHABLE`, `MCP_CONNECTION_DISCOVERY_FAILED` |
| `providerTypeSchema` | `openai`, `anthropic`, `openrouter`, `google`, `vercel_ai_gateway`, `custom` |
| `subscriptionStatusSchema` | `active`, `inactive` |
| `taskRunStatusSchema` | `queued`, `running`, `blocked`, `succeeded`, `failed`, `canceled` |
| `taskScheduleKindSchema` | `once`, `interval`, `cron` |
| `toolApprovalContinuationStateSchema` | `waiting`, `queued`, `running`, `succeeded`, `failed` |
| `toolApprovalStateSchema.decision` | `pending`, `approved`, `denied` |

### ApprovalPolicy [#approval-policy]

Agent and AgentVersion expose `approvalInChat` and `approvalInTasks`:

```typescript
type PolicyMode = "full" | "deny" | "manual" | "auto";
type ToolReference =
  | { type: "builtin"; name: string } // Validated against the built-in catalog.
  | { type: "mcp"; connectionId: string; name: string };
type ApprovalPolicy = {
  default: PolicyMode;
  overrides: Array<{ tool: ToolReference; decision: PolicyMode }>;
};
```

These illustrative wire types do not imply SDK export availability. Inputs may
omit `overrides` (normalized to `[]`); responses include it. Both policies default
to full with no overrides. Policy objects, rules, and references reject unknown
fields; duplicate Tool references within one policy are invalid. Update omission
preserves the field; supplying a policy replaces it. See [approval policies](/agents/tools/tool-approvals#approval-policies).

### Agent [#agent]

<span id="agent-response"></span><span id="agents-response"></span>

`agentSchema` / `Agent` is the current Agent configuration. `status` is
`active` or `disabled`; `version` starts at 1. `providerId`, `model`, and `avatarUrl` are
nullable. Provider and model form an optional pair: both are null or both are present. `workspaceId` always identifies the current attachment. Ordinary configuration updates create an immutable
Version. Avatar and lifecycle changes use separate operations and do not
create Versions. `userId`, IDs, timestamps, and the current Version number are
read-only. Names can repeat. `agentsResponseSchema` returns
`{ data, nextCursor }` for list responses.

See [SDK Agents](/sdk/typescript/agents),
[REST Agents](/api-reference/rest-api/agents), and the
[Agents Capability](/agents/agents).

### Workspace [#workspace]

<span id="workspaces-list-response"></span>

`workspaceSchema` / `Workspace` identifies durable private files that may be
attached to Agents. Public fields are `id`, `tenantId`, nullable `name`,
immutable Attribution `userId`, mutable `metadata`, and timestamps.

See [SDK Workspaces](/sdk/typescript/workspaces),
[REST Workspaces](/api-reference/rest-api/workspaces), and
[Workspaces](/agents/workspaces).

### AgentVersion [#agentversion]

<span id="agent-version"></span><span id="agent-versions-response"></span>

`agentVersionSchema` / `AgentVersion` is a numbered, immutable copy of the
Agent fields accepted by update, including `metadata`. It excludes avatar,
status, and `userId`.
Provider and MCP Connection references do not copy those resources. Restoring
a Version creates a new latest Version instead of changing history.

See [SDK Agent Versions](/sdk/typescript/agents#list-versions),
[REST Agent Versions](/api-reference/rest-api/agents#list-agent-versions), and
[Versions and lifecycle](/agents/versions-and-lifecycle).

### SessionListItem [#sessionlistitem]

<span id="sessions-list-response"></span>

`sessionListItemSchema` / `SessionListItem` contains `id`, nullable configured
`agentVersion` Pin, message count, nullable last-message preview, Attribution, and
timestamps. A session is saved as soon as its first turn is accepted, before
the model runs. If that turn fails, the session keeps your message; if you
cancel it, the session can be empty. Sessions have no update operation, and
deleting one makes it inaccessible. A task run starts a fresh session and
saves the user message before generation, then saves the final assistant
message, including any failure, when the run ends. A failed task run can
therefore keep its transcript and failure details.

See [SDK Sessions](/sdk/typescript/sessions),
[REST Sessions](/api-reference/rest-api/sessions), and
[Sessions and Turns](/platform/sessions-and-turns).

### LatestSessionListItem [#latestsessionlistitem]

<span id="latest-sessions-list-response"></span>

`latestSessionListItemSchema` / `LatestSessionListItem` extends
`SessionListItem` with the owning `agentId`, nullable `model`, nullable
`thinkingLevel`, and `status` (`"active"` or `"disabled"`). These fields describe
the Agent's current state, independently of a Session's pinned Version.
`latestSessionsListResponseSchema` is the paginated envelope returned by
`GET /v1/sessions/latest`. The default mode returns the latest Sessions across
the Tenant; `byAgent=true` returns at most one item per Agent.

See [SDK Sessions](/sdk/typescript/sessions#list-latest),
[REST Sessions](/api-reference/rest-api/sessions#list-latest-sessions), and
[Sessions and Turns](/platform/sessions-and-turns).

### SessionMessage [#sessionmessage]

<span id="session-messages-response"></span>

`sessionMessageSchema` / `SessionMessage` is the public AI SDK `UIMessage`
shape: a non-empty `id`, role `system`, `user`, or `assistant`, a non-empty
parts array, and optional metadata. Parts are extensible AI SDK objects. The
platform owns the stored transcript.

See [SDK Session messages](/sdk/typescript/sessions#messages),
[REST Session messages](/api-reference/rest-api/sessions#list-session-messages), and
[Sessions and Turns](/platform/sessions-and-turns).

### UsageSummary [#usagesummary]

`usageSummarySchema` / `UsageSummary` is the per-Turn usage stamped into an
assistant message. `status` is `succeeded`, `cancelled`, or `failed`;
`startedAt` and `completedAt` bound the metered duration. `errorMessage` is
nullable, and stateless generation uses `sessionId: ""`. The record also
identifies the resolved Agent Version, model, Turn, commit, token totals,
step usage, and Attribution.

See [SDK Session messages](/sdk/typescript/sessions#messages),
[REST Session messages](/api-reference/rest-api/sessions#list-session-messages),
[Usage and quotas](/platform/usage-and-quotas), and
[Monitor usage and quotas](/platform/usage-and-quotas).

### BlazingAgentsChatMessageMetadata [#blazingagentschatmessagemetadata]

`blazingAgentsChatMessageMetadataSchema` /
`BlazingAgentsChatMessageMetadata` is the strict assistant-message metadata
wrapper `{ blazingAgents: { usage: UsageSummary } }`. Its temporal and status
fields are those of the nested Usage summary; callers do not mutate this
platform-owned metadata.

See [SDK chat generation](/sdk/typescript/client#chat),
[REST Session messages](/api-reference/rest-api/sessions#list-session-messages),
[Generation and streaming](/agents/output/generation-and-streaming), and
[Stream responses into a frontend](/agents/output/generation-and-streaming).

### Tool approval metadata [#tool-approval-metadata]

Each record in a list response has these fields:

| Field | Type | Presence |
| --- | --- | --- |
| `approvalId`, `toolCallId`, `toolName` | string | Required, nonempty |
| `input` | JSON value | Required |
| `decision` | `pending` \| `approved` \| `denied` | Required; distinct from policy modes |
| `reason` | string \| null | Required |
| `tool` | [ToolReference](#approval-policy) \| null | Optional; may be `null` |
| `assistantMessageId` | string | Optional, nonempty when present; not nullable |
| `createdAt` | ISO datetime string | Optional; not nullable |
| `decidedAt` | ISO datetime string \| null | Optional |

`tool` preserves original MCP identity; `toolName` is the runtime name.
`assistantMessageId` links to Session history and usage. Do not require optional
metadata when consuming older records.

### ToolApprovalState [#toolapprovalstate]

<span id="tool-approvals-response"></span><span id="tool-approval-decision-response"></span>

`toolApprovalStateSchema` exposes the exact Tool call and decision:
`pending`, `approved`, or `denied`. A continuation is `waiting`, `queued`,
`running`, `succeeded`, or `failed`. A decision applies to one approval and
authorizes only that exact Tool call.

See [SDK Tool approvals](/sdk/typescript/sessions#tool-approvals),
[REST Tool approvals](/api-reference/rest-api/sessions#list-tool-approvals), and
[Tool approvals](/agents/tools/tool-approvals).

### ProviderResponse [#providerresponse]

<span id="provider"></span><span id="provider-response"></span><span id="providers-response"></span><span id="provider-models-response"></span>

`providerResponseSchema` / `ProviderResponse` uses provider type `openai`,
`anthropic`, `openrouter`, `google`, `vercel_ai_gateway`, or `custom`. The API key is never
returned. Ordinary update accepts only `name`. Provider type,
credential, and base URL are immutable; create a replacement Provider to
change them.
`providersResponseSchema` returns `{ providers: ProviderListItem[] }`; each list item contains only
`id`, `name`, `providerType`, `createdAt`, and `updatedAt`. Use Get Provider for `baseUrl` and `keyFragment`.

Model discovery returns `{ models: Array<{ id: string }> }` through
`providerModelsResponseSchema`.

See [SDK Providers](/sdk/typescript/providers),
[REST Providers](/api-reference/rest-api/providers), and
[Models and Providers](/agents/providers-and-models).

### McpConnectionResponse [#mcpconnectionresponse]

<span id="mcp-connection-response"></span><span id="mcp-connections-response"></span><span id="mcp-connection-test-response"></span><span id="mcp-connection-oauth-connect-response"></span><span id="mcp-connection-reconnect-result"></span><span id="mcp-oauth-authorization-launch-response"></span>

`mcpConnectionResponseSchema` uses auth type `none`, `bearer`,
`oauth_authorization_code`, or `oauth_client_credentials`, and status
`connected`, `needs_auth`, or `error`. Credentials are redacted. Ordinary
update changes the name; reconnect replaces URL/auth material. Connection
tests and `lastAuthErrorCode` use
`MCP_CONNECTION_AUTHENTICATION_FAILED`, `MCP_CONNECTION_INVALID`,
`MCP_CONNECTION_UNREACHABLE`, or `MCP_CONNECTION_DISCOVERY_FAILED`.

See [SDK MCP Connections](/sdk/typescript/mcp-connections),
[REST MCP Connections](/api-reference/rest-api/mcp-connections), and
[MCP connections](/agents/tools/mcp-tools).

### McpAttachmentResponse [#mcpattachmentresponse]

<span id="mcp-attachments-response"></span><span id="mcp-attachment-response"></span>

`mcpAttachmentResponseSchema` / `McpAttachmentResponse` describes one MCP
Connection attached to an Agent. It exposes the MCP Connection ID, mutable
`forwardUserId` and `forwardedMetadataKeys`, plus read-only `createdAt` and
`updatedAt` timestamps. It is distinct from the MCP Connection resource.

See [SDK Agent MCP Attachments](/sdk/typescript/agents#list-mcp-attachments),
[REST Agent MCP Attachments](/api-reference/rest-api/agents#list-agent-mcp-attachments),
and [MCP connections](/agents/tools/mcp-tools).

### Memory [#memory]

<span id="memory-response"></span><span id="memories-list-response"></span>

`memorySchema` / `Memory` is an Agent-owned text note. Only `text` is mutable;
identity and `userId` are immutable. Public get, list, and search operations do
not touch `lastAccessedAt`. Updates and Agent Tool retrieval/search advance it;
the timestamp determines least-recently-used eviction across the Agent's
Memory pool.

See [SDK Memories](/sdk/typescript/memories),
[REST Memories](/api-reference/rest-api/memories), and
[Memory](/agents/memory).

### ArtifactListItem [#artifactlistitem]

<span id="artifacts-list-response"></span>

`artifactListItemSchema` / `ArtifactListItem` describes an active published
file and metadata with `createdAt` and `updatedAt`. Deleted files have no
Artifact row and are absent from lists.

See [SDK Artifacts](/sdk/typescript/artifacts),
[REST Artifacts](/api-reference/rest-api/artifacts), and
[Artifacts](/agents/artifacts).

### ArtifactDownloadUrlResponse [#artifactdownloadurlresponse]

`artifactDownloadUrlResponseSchema` / `ArtifactDownloadUrlResponse` contains
an absolute, reusable five-minute Artifact download URL and its signed
`expiresAt` timestamp.

See [SDK Artifact download URLs](/sdk/typescript/artifacts#create-download-url)
and [REST Artifact download URLs](/api-reference/rest-api/artifacts#create-artifact-download-url).

### Task [#task]

<span id="create-task-response"></span><span id="task-response"></span><span id="tasks-list-response"></span>

`taskSchema` / `Task` is the definition. A schedule is `once`, `interval`, or
`cron`. Update may change the nullable Agent Version Pin, name, prompt,
schedule, `enabled`, or metadata. `agentId` and `userId` are immutable.
Run pointers and deletion timestamps are nullable lifecycle fields.

See [SDK Tasks](/sdk/typescript/tasks),
[REST Tasks](/api-reference/rest-api/tasks), and
[Tasks and schedules](/automation/tasks).

### TaskListItem [#tasklistitem]

`taskListItemSchema` / `TaskListItem` extends `taskSchema` with nullable
`latestRun`. That compact value follows `taskLatestRunSchema`: `{ id, status,
finishedAt }`, where `finishedAt` is nullable.

See [SDK Task listing](/sdk/typescript/tasks#list),
[REST Task listing](/api-reference/rest-api/tasks#list-tasks),
[Tasks and schedules](/automation/tasks), and
[Run a background Task](/automation/tasks).

### TaskRun [#taskrun]

<span id="create-task-run-response"></span><span id="task-run"></span><span id="task-run-response"></span><span id="task-runs-list-response"></span><span id="task-run-messages-response"></span>

`taskRunSchema` / `TaskRun` status is `queued`, `running`, `blocked`,
`succeeded`, `failed`, or `canceled`. Session, error, start, finish, and cancel
timestamps are nullable according to lifecycle. Attribution and the resolved
Agent Version are fixed when the run is queued. `turnId` is `null` until the
run's turn starts, so a blocked run keeps `turnId: null`. Cancel is
the only caller-driven mutation.

See [SDK Task runs](/sdk/typescript/tasks#list-runs),
[REST Task runs](/api-reference/rest-api/task-runs), and
[Tasks and schedules](/automation/tasks).

### Prompt [#prompt]

<span id="prompt-response"></span><span id="prompts-response"></span>

`promptSchema` / `Prompt` has mutable name, template, metadata, and nullable
`agentId`. The linked Agent must belong to the same Tenant; deleting it deletes
the Prompt. Omit the link at creation or set it to null to leave it unlinked. `variables`
is inferred from distinct valid `{{name}}` tokens and is read-only. Identity,
`userId`, and creation time are immutable. Names can repeat.
`promptsResponseSchema` returns `{ data, nextCursor }` for list responses.

See [SDK Prompts](/sdk/typescript/prompts),
[REST Prompts](/api-reference/rest-api/prompts), and
[Prompts](/agents/prompts).

### UsageResponse [#usageresponse]

<span id="usage-response"></span>

`usageResponseSchema` / `UsageResponse` contains `buckets` plus overall
`totals`. Token, request, and duration values are non-negative. Group keys are
nullable: stateless usage returns `sessionId: null`, while a tenant-level
`groupBy=user` bucket preserves `userId: ""`. Usage is read-only.

See [SDK Usage](/sdk/typescript/usage),
[REST Usage](/api-reference/rest-api/usage), and
[Usage and quotas](/platform/usage-and-quotas).

### UsageOverviewResponse [#usageoverviewresponse]

<span id="usage-overview-response"></span>

`usageOverviewResponseSchema` / `UsageOverviewResponse` contains exhaustive
`totals`, one ascending `daily` bucket for every day including zero-usage days,
bounded `byAgent`, `byUser`, and
`byModel` rankings, and `activeAgentCount`. Ranked rows use the existing usage
bucket shape. Agent and End-user rankings are capped without changing totals;
the model ranking may append a `provider: null`, `model: null` remainder bucket
so its sum still matches the overall totals. Tenant-level usage retains
`userId: ""`. The active count includes every used Agent before the ranking
limit.

See [TypeScript Usage](/sdk/typescript/usage#overview-method),
[Python Usage](/sdk/python/usage#overview-method), and
[REST Usage](/api-reference/rest-api/usage#get-usage-overview).

### Tenant [#tenant]

<span id="tenant-response"></span><span id="tenant-settings-response"></span>

`tenantSchema` / `Tenant` is the read-only `/v1/me` identity. Editable Tenant
settings are a separate `{ name, quota }` object. Patch may change the name or
set `quota` to a Quota object or `null`; omitted settings remain unchanged.

See [SDK Tenant settings](/sdk/typescript/tenant),
[REST Tenant endpoints](/api-reference/rest-api/tenant), and
[Tenancy and attribution](/platform/tenancy-and-attribution).

### Quota [#quota]

`quotaSchema` / `Quota` contains positive nullable monthly token/request
ceilings and a reset day from 1 through 28. A null ceiling is unlimited on that
axis. A null/absent Quota means the Tenant has no self-set Quota.

See [SDK Tenant settings](/sdk/typescript/tenant#patch),
[REST Tenant settings](/api-reference/rest-api/tenant#update-tenant-settings), and
[Usage and quotas](/platform/usage-and-quotas).

### Attribution [#attribution]

`attributionCreateInputSchema`, `userIdSchema`, `metadataSchema`, and SDK `AttributionInput` define
Attribution. `userId: ""` is tenant-level; a non-empty string is a tenant-user
partition. It is a filtering and grouping dimension, not access control: a
Tenant credential can access every attributed resource in that Tenant.

See the [TypeScript SDK](/sdk/typescript),
[REST API](/api-reference/rest-api), and
[Tenancy and attribution](/platform/tenancy-and-attribution).

## Examples [#examples]

This complete MCP Attachment response is intentionally small:

```json
{
  "mcpConnectionId": "mcp_0123456789abcdef",
  "forwardUserId": true,
  "forwardedMetadataKeys": ["traceId"],
  "createdAt": "2026-07-20T12:00:00.000Z",
  "updatedAt": "2026-07-20T12:00:00.000Z"
}
```

This Task update leaves omitted fields unchanged while explicitly clearing the
Version Pin and schedule:

```json
{
  "agentVersion": null,
  "schedule": null
}
```

## Next [#next]

- [REST API](/api-reference/rest-api) for the operations that return these objects.
- [TypeScript SDK](/sdk/typescript) or [Python SDK](/sdk/python) for typed clients.
- [Pagination and filtering](/api-reference/protocols/pagination-and-filtering) for list envelopes.
