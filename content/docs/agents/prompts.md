---
title: Prompts
description: Store named message templates and render validated variables for any generation mode.
---

# Prompts

A Prompt is a Tenant-owned named message template. Store one when multiple
Turns should reuse the same input shape. Agent instructions define persistent
behavior; a Prompt or literal message supplies input for one Turn.

## Variables and rendering [#variables-and-rendering]

Write placeholders as `{{variable}}`. Whitespace inside the braces is trimmed;
names start with an ASCII letter or underscore and continue with letters,
digits, or underscores. Repeated names appear once in the `variables` inventory
in first-seen order.

An invocation must supply all and only those variables. Missing values use
`prompt_variable_missing`; unknown keys use `prompt_variable_unknown`. A Prompt
without placeholders can omit `variables`.

## Create and invoke a Prompt [#create-and-invoke-a-prompt]

```typescript
import { BlazingAgents } from "@blazing-agents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});
const prompt = await client.prompts.create({
  name: "Release summary",
  template: "Summarize {{ version }} for {{ audience }}.",
});

if (prompt.variables.join(",") !== "version,audience") {
  throw new Error("Unexpected Prompt variables");
}

const result = await client.completion({
  agentId: process.env.AGENT_ID!,
  promptId: prompt.id,
  variables: { version: "2.4", audience: "developers" },
});
console.log(await result.text);
```

The same `promptId` and `variables` alternative works with stateful chat,
stateless [generation and streaming](/agents/output/generation-and-streaming),
and [structured output](/agents/output/structured-output). Choose either
literal input or a Prompt; a mixed shape is rejected.

Blazing Agents expands the template before execution. Only the rendered text
enters a Session transcript, so later edits or deletion do not change history.

## Limits and lifecycle [#limits-and-lifecycle]

A Tenant can store up to 100 Prompts. Names are unique per Tenant and at most
80 characters. Templates are non-empty, at most 10,240 characters, and contain
at most 10 distinct variables. `userId` is immutable Attribution; `name`,
`template`, and `metadata` are mutable. Deletion is permanent.

## SDK and API [#sdk-and-api]

- Prompts: [TypeScript SDK](/sdk/typescript/prompts) and [Python SDK](/sdk/python/prompts)
- Invocation: [TypeScript client](/sdk/typescript/client) and [Python client](/sdk/python/client)
- REST: [Prompts API](/api-reference/rest-api/prompts) and [Generation API](/api-reference/rest-api/generation)
