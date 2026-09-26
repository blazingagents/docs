---
title: Versions and lifecycle
description: Roll back a bad change, pin a known-good agent config, and pause an agent without deleting it.
---

# Versions and lifecycle

Every change to an agent is saved as a numbered version. When an edit makes answers worse, you can see exactly what changed and roll back in one call. You can also pin a session or task to a version you trust, and disable an agent to stop new work while you investigate.

## Roll back to an earlier version [#roll-back-to-an-earlier-version]

This finds the version before the latest one and restores it. Set `AGENT_ID` to an agent you have updated at least once.

```typescript tab="TypeScript" tab-group="sdk-language"
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});
const agentId = process.env.AGENT_ID!;

const { data } = await client.agents.listVersions({ agentId, limit: 2 });
const previous = data[1];
if (!previous) throw new Error("This agent has only one version");

const restored = await client.agents.restoreVersion({
  agentId,
  version: previous.version,
});
console.log(`Restored version ${previous.version} as version ${restored.version}`);
```

```python tab="Python"
import os

from blazing_agents import BlazingAgents

client = BlazingAgents()
agent_id = os.environ["AGENT_ID"]

versions = client.agents.list_versions(agent_id, limit=2).data
if len(versions) < 2:
    raise RuntimeError("This agent has only one version")
previous = versions[1]

restored = client.agents.restore_version(agent_id, previous.version)
print(f"Restored version {previous.version} as version {restored.version}")
```

Restoring never rewrites history. It copies the old configuration into a new latest version, so you can roll forward again the same way. Versions are listed newest first.

## What a version holds [#what-a-version-holds]

Creating an agent saves version `1`. Each update saves the full resulting configuration as the next version, even when nothing actually changed. Versions cannot be edited or deleted.

A version holds the agent's name, provider and model, thinking level, instructions, tool groups, MCP connection list, [tool approval](/agents/tools/tool-approvals) policies, memory injection setting, [compaction settings](/agents/agents#automatic-context-compaction), and metadata. Restoring checks the old provider, model, and thinking level again, and fails without changing anything if they are no longer valid.

Some things live outside versions and always use their current state: the provider's key, MCP connection credentials, the attached workspace, [skills](/agents/skills), and [memories](/agents/memory). Restoring does not change the workspace, `userId`, status, or avatar, and enabling, disabling, or changing the avatar does not create a version.

## Pin a version [#pin-a-version]

Calls without a version use the latest one at the moment the turn starts. Pass `version` to run a specific one instead, such as the version you restored above:

```typescript tab="TypeScript" tab-group="sdk-language"
const result = await client.completion({
  agentId,
  version: previous.version,
  prompt: "Reply with OK.",
});
console.log(await result.text);
```

```python tab="Python"
print(
    client.completion(
        agent_id=agent_id, version=previous.version, prompt="Reply with OK."
    )
)
```

- **Sessions.** Pass `version` when you start a session with `client.chat()`. Every turn in that session uses it, and you cannot change it later. A session started without a version uses the latest one on each turn.
- **Tasks.** A task's pinned version can change. Each run records the version it actually used. See [tasks](/automation/tasks).
- **Usage.** Each turn's usage record shows the version that ran.

## Enable and disable [#enable-and-disable]

Disable an agent to stop new work without losing anything:

```typescript tab="TypeScript" tab-group="sdk-language"
await client.agents.disable({ agentId });
await client.agents.enable({ agentId });
```

```python tab="Python"
client.agents.disable(agent_id)
client.agents.enable(agent_id)
```

A disabled agent rejects new chat turns, completions, manual task runs, and tool approval continuations with `agent_disabled`. Turns already running finish. Scheduled runs are skipped, not queued, and the next scheduled run after you enable the agent goes ahead. You can still read and edit a disabled agent. Calling either method twice is safe.

## Next [#next]

- [Sessions and turns](/platform/sessions-and-turns) to start pinned sessions.
- [Tasks](/automation/tasks) to pin background work.
- Agents SDK reference for [TypeScript](/sdk/typescript/agents#restore-version) or [Python](/sdk/python/agents#restore-version).
