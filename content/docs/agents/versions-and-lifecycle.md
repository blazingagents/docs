---
title: Versions and lifecycle
description: Inspect, pin, restore, disable, and enable Agent configuration safely.
---

# Versions and lifecycle

Every Agent has immutable, monotonically numbered Versions and a separate
active or disabled status. Use Versions to audit or select configuration;
disable an Agent to stop new work without deleting it.

## How Versions are created [#how-versions-are-created]

Agent creation writes Version `1`. Every accepted ordinary update stores the
complete resulting configuration as the next Version, even for a same-value
update. Versions cannot be edited or deleted. Avatar, enable, and disable
operations do not create Versions.

## Latest resolution and Version Pins [#latest-resolution-and-version-pins]

An unpinned request resolves the latest Version when its Turn is admitted. A
caller can pin a Session, Task definition, or stateless generation request.

- A Session's configured Pin is immutable; an unpinned Session resolves latest
  for each Turn.
- A Task's Pin is mutable. Enqueuing a run resolves the Pin or then-current
  latest Version and records it on that run.
- Per-Turn Usage and every Task run record the Version actually resolved.

Provider credentials, MCP Connection state, the Workspace attachment, and
Memories remain live. A Version is an Agent-configuration boundary, not a
hermetic deployment snapshot.

## Inspect and restore [#inspect-and-restore]

Restore copies a historical Version through the ordinary update path, creating
a newer Version without rewriting history.

```typescript
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});
const agentId = process.env.AGENT_ID!;

const page = await client.agents.listVersions(agentId, { limit: 10 });
const version = page.data[0]?.version;
if (!version) throw new Error("No Agent Versions found");

const inspected = await client.agents.getVersion(agentId, version);
const restored = await client.agents.restoreVersion(agentId, inspected.version);
if (restored.version <= inspected.version) {
  throw new Error("Restore did not create a newer Version");
}
```

Version lists are newest first and cursor-paginated. The Admin Agent's
Provider/model Versions can be inspected but not restored.

## Enable and disable [#enable-and-disable]

`disable` and `enable` are idempotent and reversible. A disabled Agent rejects
new Turns with `agent_disabled` but remains readable and editable. In-flight
Turns finish. Session resumes, stateless generation, manual Task runs, and
Tool-approval continuations are blocked. Scheduled fires are skipped without a
Task-run row; the next eligible fire can run after enable.

See [Sessions and Turns](/platform/sessions-and-turns) and
[Automation](/automation/tasks) for those execution paths.

## SDK and API [#sdk-and-api]

- [TypeScript Agents SDK](/sdk/typescript/agents)
- [Python Agents SDK](/sdk/python/agents)
- [Agents REST API](/api-reference/rest-api/agents)
