---
title: Prompts
description: Save a message template with variables once, then fill it in on any call.
---

# Prompts

A prompt is a saved message template with `{{variables}}`. Store one when your app sends the same kind of request again and again, such as "summarize this release for this audience", and fill in the blanks on each call. You can edit the wording in one place without redeploying code that sends it.

Instructions and prompts do different jobs. An agent's instructions shape how it behaves on every turn. A prompt is the input for one turn.

## Create and use a prompt [#create-and-use-a-prompt]

Set `AGENT_ID` to one of your `ag_...` agents.

```typescript tab="TypeScript" tab-group="sdk-language"
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});

const prompt = await client.prompts.create({
  name: "Release summary",
  template: "Summarize {{ version }} for {{ audience }}.",
});
console.log(prompt.variables); // ["version", "audience"]

const result = await client.completion({
  agentId: process.env.AGENT_ID!,
  promptId: prompt.id,
  variables: { version: "2.4", audience: "developers" },
});
console.log(await result.text);
```

```python tab="Python"
import os

from blazing_agents import BlazingAgents

client = BlazingAgents()

prompt = client.prompts.create(
    name="Release summary",
    template="Summarize {{ version }} for {{ audience }}.",
)
print(prompt.variables)  # ['version', 'audience']

print(
    client.completion(
        agent_id=os.environ["AGENT_ID"],
        prompt_id=prompt.id,
        variables={"version": "2.4", "audience": "developers"},
    )
)
```

Prompt names are unique in your account, so use a new name before you run this again.

## How variables work [#how-variables-work]

Write a variable as `{{name}}`. Spaces inside the braces are ignored. A name starts with a letter or underscore and contains only letters, digits, and underscores. The prompt's `variables` list shows each name once, in the order it first appears.

Each call must supply every variable and nothing else. A missing value fails with `prompt_variable_missing`, and an extra one fails with `prompt_variable_unknown`. A prompt with no variables needs no `variables` field.

Pass `promptId` and `variables` in place of a literal message on any call: [chat](/platform/sessions-and-turns), [completion](/agents/output/generation-and-streaming), or [structured output](/agents/output/structured-output). A call uses either a prompt or a literal message, never both.

Blazing Agents fills in the template before the agent runs, and only the filled-in text is saved in the session. Editing or deleting the prompt later does not change past conversations.

## Limits [#limits]

- Up to 100 prompts per account.
- Names up to 80 characters.
- Templates up to 10,240 characters, with at most 10 distinct variables.

## Organize prompts by agent [#organize-prompts-by-agent]

Set `agentId` on a prompt to group it with an agent. You can then list one agent's prompts with `client.prompts.list({ agentId })`. The link is for organizing only, so any of your agents can still use the prompt. Deleting the agent deletes the prompts linked to it. For the full field and update rules, see the [TypeScript](/sdk/typescript/prompts) or [Python](/sdk/python/prompts) SDK.

## Next [#next]

- [Generation and streaming](/agents/output/generation-and-streaming) to stream a prompt's answer.
- [Structured output](/agents/output/structured-output) to get JSON back from a prompt.
- Prompts SDK reference for [TypeScript](/sdk/typescript/prompts) or [Python](/sdk/python/prompts).
