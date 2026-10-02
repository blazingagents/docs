---
title: Configuration snapshots and lifecycle
description: See which settings a session or task run saved, and pause an agent without deleting it.
---

# Configuration snapshots and lifecycle

Edit an agent whenever its next work needs different instructions, model, tools, or approval policies. Each session and task run saves the agent configuration it starts with. Later agent edits affect new work, while existing sessions continue with their saved settings.

## Inspect saved settings [#inspect-saved-settings]

Read a session to see the configuration its first turn saved:

```typescript tab="TypeScript" tab-group="sdk-language"
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({ apiKey: process.env.BLAZING_AGENTS_API_KEY! });
const agentId = process.env.AGENT_ID!;
const sessionId = process.env.SESSION_ID!;
const session = await client.sessions.get({ agentId, sessionId });
console.log(session.agentConfig.model, session.agentConfig.instructions);
```

```python tab="Python"
import os
from blazing_agents import BlazingAgents

client = BlazingAgents()
agent_id = os.environ["AGENT_ID"]
session_id = os.environ["SESSION_ID"]
session = client.sessions.get(agent_id, session_id)
print(session.agent_config.model, session.agent_config.instructions)
```

A session saves its configuration when its first turn begins. Every later turn in that session uses those saved settings. Session lists show brief summaries; use `sessions.get()` for `agentConfig`. Transcript message pages contain messages, not the configuration.

A task run saves its configuration when it is queued. You can read it before the run creates a session:

```typescript tab="TypeScript" tab-group="sdk-language"
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({ apiKey: process.env.BLAZING_AGENTS_API_KEY! });
const taskId = process.env.TASK_ID!;
const runId = process.env.RUN_ID!;
const run = await client.tasks.getRun({ taskId, runId });
console.log(run.agentConfig.model);
```

```python tab="Python"
import os
from blazing_agents import BlazingAgents

client = BlazingAgents()
run = client.tasks.get_run(os.environ["TASK_ID"], os.environ["RUN_ID"])
print(run.agent_config.model)
```

A task edit changes future runs. A run keeps its saved configuration even if it is blocked before a session exists. Once the run starts, its session uses the same configuration.

## What a snapshot holds [#what-a-snapshot-holds]

`agentConfig` includes the agent's name, provider and model IDs, thinking level, instructions, tool groups, MCP connection IDs, approval policies, compaction settings, memory injection setting, and metadata. It does not include the agent's identity, status, avatar, workspace attachment, or credentials.

The provider key, MCP credentials and connection details, attached workspace, skills, and memories use their current state. A saved provider ID therefore cannot keep a deleted provider available. Local SDK callback functions are supplied with each request; the snapshot does not store executable handlers. A paused tool approval keeps the function definitions needed to continue that approval.

## Enable and disable [#enable-and-disable]

Disable an agent to stop new work without losing its configuration:

```typescript tab="TypeScript" tab-group="sdk-language"
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({ apiKey: process.env.BLAZING_AGENTS_API_KEY! });
const agentId = process.env.AGENT_ID!;
await client.agents.disable({ agentId });
await client.agents.enable({ agentId });
```

```python tab="Python"
import os
from blazing_agents import BlazingAgents

client = BlazingAgents()
agent_id = os.environ["AGENT_ID"]
client.agents.disable(agent_id)
client.agents.enable(agent_id)
```

A disabled agent rejects new chat turns, completions, manual task runs, and tool approval continuations with [`agent_disabled`](/api-reference/protocols/errors#agent_disabled). Turns already running finish. Scheduled runs are skipped. You can still read and edit a disabled agent.

## Next [#next]

- [Sessions and turns](/platform/sessions-and-turns) for continuing a conversation.
- [Task runs](/automation/task-runs) for reading saved run settings.
- [Providers and models](/agents/providers-and-models) for changing the provider.
