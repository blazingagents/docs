---
title: Agents
description: Create, inspect, update, disable, and extend Agents.
---

## Overview [#overview]

An agent holds the configuration Blazing Agents uses to run a turn: its
provider and model, instructions, tools, workspace, and attachments. Use these
endpoints to create and change agents, attach MCP
servers, and turn an agent off and on again. `userId` is fixed once the agent
is created. Names are display labels and can repeat. List results use `data`
and `nextCursor`; pass the cursor with the same filters to read another page.

## Automatic context compaction [#automatic-context-compaction]

`POST` and `PUT` accept `autoCompaction` (default `true` on create) and
`compactionReserveTokens` (default `16384` on create, a nonnegative safe
integer). Leave them out of an update to keep the saved values. Agents return them. See
[context compaction](/agents/agents#automatic-context-compaction) for how
summaries work, what they cost, and what happens when they fail.

## Thinking configuration [#thinking-configuration]

`POST` and `PUT` accept `thinkingLevel: string | null`. It defaults to `null`
on create. Leave it out of an update to keep it, or send `null` to clear it. A
non-null value must be non-empty and needs a configured provider and model.
Agent responses include it. A level the model is known not to
support returns `validation_failed` with the valid choices, and nothing is
saved. On the [admin agent](/agents/agents#the-admin-agent) you can change the
thinking level along with its provider and model, but nothing else.

## Tool approval configuration [#tool-approval-configuration]

`POST` and `PUT` accept `approvalInChat` and `approvalInTasks`, each an
[ApprovalPolicy](/api-reference/protocols/objects-and-schemas#approval-policy).
Agent responses include both. Each defaults to
`{"default":"full","overrides":[]}` on create. Leave a policy out of an update
to keep it; send one to replace it, and a missing or empty `overrides` clears
the list. Neither accepts `null`. Built-in tools you name must be available.
New or changed MCP tools must be found on an MCP connection attached to the
agent in your tenant. Naming the same tool twice is invalid, and later
configuration or attachment changes must keep every rule valid. See
[policy examples and validation](/agents/tools/tool-approvals#approval-policies).

## Next [#next]

- [Agents](/agents/agents) to decide what each setting does.
- [Configuration snapshots and lifecycle](/agents/configuration-snapshots) to inspect saved settings.
- [Sessions API](/api-reference/rest-api/sessions) to start a conversation with the agent.
