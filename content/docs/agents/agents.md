---
title: Agents
description: Create an agent once, then reuse its model, instructions, and tools everywhere your app calls it.
---

# Agents

An agent is the reusable setup behind every answer your app gets: which model it runs, what instructions it follows, which tools it can call, and where its files live. You create it once and call it by ID from chat sessions, one-off generations, and background tasks. Change the agent and every new call picks up the change.

## Create an agent [#create-an-agent]

This creates an agent on the provider from the [quickstart](/getting-started/quickstart) and asks it one question. Set `PROVIDER_ID` to that provider's `prv_...` ID.

```typescript tab="TypeScript" tab-group="sdk-language"
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});

const agent = await client.agents.create({
  name: "Support writer",
  providerId: process.env.PROVIDER_ID!,
  model: "openai/gpt-6-luna",
  instructions: "Answer clearly and briefly.",
});
console.log(`Agent: ${agent.id}`);

const result = await client.completion({
  agentId: agent.id,
  prompt: "How do I reset my password?",
});
console.log(await result.text);
```

```python tab="Python"
import os

from blazing_agents import BlazingAgents

client = BlazingAgents()

agent = client.agents.create(
    name="Support writer",
    provider_id=os.environ["PROVIDER_ID"],
    model="openai/gpt-6-luna",
    instructions="Answer clearly and briefly.",
)
print(f"Agent: {agent.id}")

print(client.completion(agent_id=agent.id, prompt="How do I reset my password?"))
```

You see `Agent: ag_...` followed by the answer. Agent names are unique in your account, so pick a new name or delete the agent before you run this again.

The new agent starts at version `1` with status `active`, and it comes with its own [workspace](/agents/workspaces) for files. The workspace costs nothing until the agent first reads, writes, or runs something in it.

## What an agent controls [#what-an-agent-controls]

- **Model.** A [provider and model](/agents/providers-and-models) pair, plus an optional thinking level. An agent without a model can be saved but cannot answer.
- **Instructions.** The standing guidance the agent follows on every turn.
- **Tools.** Built-in tool groups (`workspace`, `write_todos`, `memory`) in `tools`, and remote [MCP connections](/agents/tools/mcp-tools) in `mcpConnectionIds`. See [built-in tools](/agents/tools/built-in-tools).
- **Approvals.** Separate [tool approval](/agents/tools/tool-approvals) policies for chat (`approvalInChat`) and for tasks (`approvalInTasks`). Both allow every call until you change them.
- **Files.** The [workspace](/agents/workspaces) attached to the agent. Pass `workspaceId` to share an existing workspace instead of getting a new one.
- **Memory.** Whether saved [memories](/agents/memory) are added to every turn automatically (`memoryInjectionEnabled`).
- **Skills.** [Skills](/agents/skills) you add to the agent, which it loads when a task calls for them.
- **Labels.** A `userId` and `metadata` that tag the agent for your own reporting, and an optional avatar.

The agent stores references, not copies. It points to its provider, MCP connections, and workspace, and every turn uses their current state.

A `userId` labels the agent. It does not restrict who can call it: your API key can use every agent in your account, so your backend decides which user may reach which agent. See [tenancy and attribution](/platform/tenancy-and-attribution).

For every field, its default, and its limits, see `create()` in the [TypeScript](/sdk/typescript/agents#create) or [Python](/sdk/python/agents#create) SDK.

## Change an agent [#change-an-agent]

Send only the fields you want to change:

```typescript tab="TypeScript" tab-group="sdk-language"
await client.agents.update({
  agentId: agent.id,
  tools: ["workspace", "memory"],
});
```

```python tab="Python"
client.agents.update(agent.id, tools=["workspace", "memory"])
```

Lists such as `tools` replace the old list rather than adding to it. To switch models, send `providerId` and `model` together. Each update saves a new [version](/agents/versions-and-lifecycle) you can pin or roll back to. To stop an agent without deleting it, [disable it](/agents/versions-and-lifecycle#enable-and-disable).

## Automatic context compaction [#automatic-context-compaction]

Long conversations eventually outgrow the model's context window. With `autoCompaction` on, which is the default, Blazing Agents summarizes older messages before a model call once the conversation nears that limit and keeps recent messages as they are. The session history you read back stays complete. Only what the model sees gets shorter.

`compactionReserveTokens` sets how much room to keep free, and defaults to `16384`. Compaction starts when the estimated context passes the model's context window minus this reserve, so a larger reserve compacts sooner. It is a token count, not a percentage or a conversation length limit.

When the model's context window is not known, Blazing Agents assumes 128,000 tokens. That is an estimate, so the provider can still reject a long request. If the provider rejects a request as too long before any answer streams, Blazing Agents compacts once and retries. When a single message is too large to summarize, or the retry fails, the turn ends with an error.

Summaries run on the agent's own provider and model and count toward the turn's token usage. Both settings belong to each version, so pinning or restoring a version brings its compaction settings too. Set `autoCompaction` to `false` to stop new compaction. Summaries already in a session stay in place.

## Delete an agent [#delete-an-agent]

Deleting an agent is permanent. You choose whether its [artifacts](/agents/artifacts) go with it:

```typescript tab="TypeScript" tab-group="sdk-language"
await client.agents.delete({ agentId: agent.id, includeArtifacts: false });
```

```python tab="Python"
client.agents.delete(agent.id, include_artifacts=False)
```

This removes the agent's versions, sessions, tasks, memories, skills, linked prompts, and avatar. Its workspace, provider, and MCP connections stay, so you can attach them to another agent. Artifacts you keep and past usage records still show the deleted agent's ID.

## The admin agent [#the-admin-agent]

Every tenant has exactly one admin agent. It is the agent behind [`ba assist`](/cli/assist), the built-in assistant that manages your tenant, and Blazing Agents creates it for you. It appears in `agents.list()` next to your own agents, and the dashboard marks it **Powers BA Assist for this tenant**.

You choose its provider and model, plus an optional thinking level. Each change saves a new [version](/agents/versions-and-lifecycle), and you can read its version history like any other agent's. Blazing Agents manages everything else: you cannot rename it, change its instructions, tools, or avatar, restore an old version, disable it, delete it, or give it a task. Those requests fail with [`admin_agent_managed`](/api-reference/protocols/errors#admin_agent_managed).

Its workspace is reserved for it. That workspace does not appear in your workspace list and cannot be attached to another agent. Its sessions and usage belong to your tenant, the same as any other agent's.

## Next [#next]

- [Providers and models](/agents/providers-and-models) to connect a model account and pick a model.
- [Versions and lifecycle](/agents/versions-and-lifecycle) to pin, roll back, and disable agents.
- [Sessions and turns](/platform/sessions-and-turns) to hold a conversation with your agent.
