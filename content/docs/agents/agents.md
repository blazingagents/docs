---
title: Agents
description: Configure reusable Agent behavior, capabilities, attribution, and runtime resolution.
---

# Agents

An Agent is a tenant-owned configuration record for reusable behavior. It is
not a person, running process, [Session, or Turn](/platform/sessions-and-turns).
Create one when multiple executions should share instructions, a model,
capabilities, and durable resources.

## Tool approval policies [#tool-approval-policies]

`approvalInChat` and `approvalInTasks` are independent versioned Agent settings,
initially full with no overrides. See [Tool approvals](/agents/tools/tool-approvals)
for exact Tool matching, validation, and human/automatic review behavior. Restoring
a Version must copy both policies along with its other configuration; older SDK
restoration helpers may omit them. Use an SDK release with policy restoration
support or include both saved policies explicitly in a REST update.

## What an Agent controls [#what-an-agent-controls]

An Agent stores its name, optional [Provider and model](/agents/providers-and-models),
instructions, selected [built-in Tools](/agents/tools/built-in-tools),
[MCP Connection](/agents/tools/mcp-tools) attachments, current
[Workspace](/agents/workspaces), automatic [Memory](/agents/memory) injection
setting, Attribution fields, and avatar. Its current Version and lifecycle
status describe configuration history and whether new Turns can begin.

For each execution, Blazing Agents resolves the latest configuration or an
explicit [Version Pin](/agents/versions-and-lifecycle), then loads the selected
Provider credential, current MCP Connection state, Workspace, and visible
Memories. The Agent stores resource IDs and selections; it does not copy those
resources into itself.

## Create an Agent [#create-an-agent]

```typescript
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});

const agent = await client.agents.create({
  name: "Support writer",
  instructions: "Answer clearly and briefly.",
});

if (!agent.id.startsWith("ag_")) throw new Error("Unexpected Agent ID");
console.log(agent.id);
```

The returned Agent is initially unconfigured: `providerId` and `model` are
`null`. It has Version `1`, status `active`, and a new normal Workspace attached
atomically. That Workspace is independent after creation and consumes no
Container or compute until its first file or process operation.

## Fields and updates [#fields-and-updates]

| Field | Create behavior | Update behavior |
| --- | --- | --- |
| `name` | Required; unique per Tenant | Mutable |
| `providerId`, `model` | Both `null`, or both configured | Mutable as a valid pair |
| `thinkingLevel` | `null` (Provider default) | Nonempty known choice or custom value when capabilities are unknown; null clears |
| `instructions` | Defaults to `""` | Mutable |
| `tools` | Defaults to `[]` | Supplied arrays replace the selection |
| `mcpConnectionIds` | Defaults to `[]` | Supplied arrays replace attachments |
| `workspaceId` | Omission creates a Workspace | Mutable to another same-Tenant Workspace |
| `autoCompaction` | Defaults to `true` | Versioned; enables automatic context summaries |
| `compactionReserveTokens` | Defaults to `16384` | Versioned; nonnegative safe integer in tokens |
| `memoryInjectionEnabled` | Defaults to `false` | Mutable |
| `userId` | Defaults to `""` | Immutable Attribution |
| `metadata` | Defaults to `{}` | Replaced as a complete object |
| `version`, `status` | Version `1`, status `active` | Changed by updates or lifecycle operations |

Ordinary updates are partial merges, except replacing or clearing a Provider
requires `providerId` and `model` together. Every accepted ordinary update
creates a Version, including a same-value update. Avatar, enable, and disable
operations do not create Versions.

## Attach capabilities [#attach-capabilities]

Attachment IDs must belong to the same Tenant. Tool selection, MCP
attachments, Workspace attachment, and Memory injection are independent:

- Built-in Tool groups decide which platform actions the Agent can call.
- MCP Connections make remote-server Tools available.
- The `memory` Tool group enables explicit Memory operations, while
  `memoryInjectionEnabled` adds visible Memory to context automatically.
- The current Workspace determines durable filesystem state for every Turn.
- Skills are Agent-owned instructions discovered and loaded progressively.

## Admin Agent [#admin-agent]

The platform-managed Admin Agent has one normal Workspace. A Tenant may set or
rotate its Provider/model pair and Thinking level, inspect Versions, and create pinned
Sessions. It cannot change the name, instructions, Tools, lifecycle, Workspace,
avatar, MCP attachments, Task assignment, or deletion state. Rejected mutations
return `admin_agent_managed`.

## Deletion and historical data [#deletion-and-historical-data]

Deleting a tenant-managed Agent requires choosing whether to delete or preserve
its Artifacts. It permanently removes Agent-owned Versions, Sessions, Tasks,
Memories, attachments, and avatar bytes. Providers, MCP Connections, and the
attached Workspace remain independently manageable. Preserved Artifacts and
historical Usage keep the deleted Agent ID as provenance.

Tenant credentials can access only their Tenant's Agents. Provider keys remain
write-only, and avatar responses expose a short-lived signed URL rather than a
private object key. See [Tenancy and Attribution](/platform/tenancy-and-attribution)
and [Security and credentials](/platform/security-and-credentials).

## SDK, CLI, and API [#sdk-cli-and-api]

- SDK: [TypeScript Agents](/sdk/typescript/agents) and [Python Agents](/sdk/python/agents)
- CLI: [Chat](/cli/chat) and [Run](/cli/run)
- REST: [Agents API](/api-reference/rest-api/agents)

## Automatic context compaction [#automatic-context-compaction]

`autoCompaction` defaults to `true`. Before each model request, BA can summarize
older conversation content and retain recent messages. The stored Session
transcript remains readable in full. Both settings belong to Agent Versions,
so pinning and restoring a Version also selects its compaction policy.

`compactionReserveTokens` defaults to `16384` and accepts a nonnegative safe
integer (up to `9007199254740991`). Compaction starts when estimated current
context exceeds the model context window minus this reserve. A larger reserve
starts compaction earlier; it also changes Pi's summary-generation budget.
This is a token count, not a percentage or a maximum conversation length.

BA uses Pi's model catalog and compaction method, including its recent-history
budget of 20,000 tokens. Models absent from the catalog use Pi's custom-model
fallback of 128,000 context tokens. This fallback is an estimate of capacity;
a Provider can still reject a request. BA attempts one compaction and retry
for a recognized context overflow before any generated content is streamed.
An indivisible oversized input, summary failure, or failed retry surfaces as
an execution error.

Context size uses the latest usable model-call usage plus estimates for new
content, rather than summing usage across the conversation. Summary calls use
the Agent's configured Provider and model and are included in Turn token usage.
Set `autoCompaction` to `false` to disable new automatic compaction; existing
Session summaries remain part of the prepared context.

