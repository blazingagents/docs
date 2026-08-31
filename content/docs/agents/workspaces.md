---
title: Workspaces
description: Use the Tenant-owned durable filesystem attached to one or more same-Tenant Agents.
---

# Workspaces

A Workspace is a Tenant-owned durable mutable filesystem. Every Agent has one
attached. Several same-Tenant Agents can share a Workspace, and every attached
Agent can read and write the whole filesystem. Use separate Workspaces when
Agents need file isolation.

The Admin Agent's Workspace is reserved for platform administration. It cannot
be shared with other Agents and is excluded from public Workspace list results.

## Ownership and attachment [#ownership-and-attachment]

Omitting `workspaceId` during Agent creation atomically creates and attaches a
normal Workspace with the Agent's initial name and Attribution. It remains an
independent resource: later Agent updates do not rename it, reassignment does
not move files, and deleting an Agent preserves it.

The attachment is current Agent state, not Session state or part of a Version.
Files persist across every attached Agent's Sessions, stateless generation, and
Task runs. A Workspace cannot be deleted while an Agent remains attached.

## Resource and execution model [#resource-and-execution-model]

```typescript
interface Workspace {
  id: string;
  tenantId: string;
  name: string | null;
  userId: string;
  metadata: Record<string, unknown>;
  networkPolicy:
    | { mode: "unrestricted" }
    | { mode: "allowlist"; allowedHosts: string[] }
    | { mode: "offline" };
  createdAt: string;
  updatedAt: string;
}
```

Creating the product record provisions no compute. The first file or process
operation lazily creates its private runtime. Agent reasoning stays in the
trusted dispatcher; only file and command calls cross the authenticated
transport into the sandbox. Provider credentials never enter it.

Files appear beneath `/` to public Workspace Tools and beneath `/workspace` in
the private Container. Successful Workspace-using Turns checkpoint that
directory to R2; a fresh Container restores the latest checkpoint. Skill files
remain separate R2 resources and do not initialize Workspace compute.

## Create and attach a shared Workspace [#create-and-attach-a-shared-workspace]

Create a Workspace explicitly when several Agents should share files or when
you need to choose Attribution, metadata, or network policy before attachment:

```typescript
const workspace = await client.workspaces.create({
  name: "Release files",
  userId: "user_42",
  metadata: { project: "docs" },
  networkPolicy: {
    mode: "allowlist",
    allowedHosts: ["registry.npmjs.org"],
  },
});

await client.agents.update(firstAgentId, { workspaceId: workspace.id });
await client.agents.update(secondAgentId, { workspaceId: workspace.id });
```

Reassignment changes only the attachment and does not copy files from the old
Workspace. The two Agents now have ordinary shared-filesystem access. To prove
that files persist across separate Sessions, follow
[Verify durable file operations](/agents/tools/built-in-tools#verify-durable-file-operations).

## Concurrency, failure, and cancellation [#concurrency-failure-and-cancellation]

Workspace calls from concurrent Turns or attached Agents may overlap with
ordinary shared-filesystem semantics. A failed or canceled Turn is not a
filesystem transaction: completed mutations remain. Cancellation stops later
dispatch and the caller's wait, but does not guarantee rollback or immediate
termination of an accepted native action.

Use the narrowest network policy that supports the task, keep secrets out of
files and commands, and inspect partial state when a failed Turn matters. Only
deliberately published files become [Artifacts](/agents/artifacts).

## SDK and API [#sdk-and-api]

- [TypeScript Workspaces SDK](/sdk/typescript/workspaces)
- [Python Workspaces SDK](/sdk/python/workspaces)
- Agent attachment: [TypeScript](/sdk/typescript/agents) and [Python](/sdk/python/agents)
- [Workspaces REST API](/api-reference/rest-api/workspaces)
- Tool configuration: [Built-in Tools](/agents/tools/built-in-tools)
