---
title: Providers and models
description: Connect your model account once, then choose the model each agent runs.
---

# Providers and models

A provider holds the API key for your model account, such as OpenRouter, OpenAI, or Anthropic. You save the key once and every agent that uses the provider runs on your account, so model costs stay with your provider bill. The model is the provider's own model ID, which Blazing Agents passes through unchanged.

## Connect a provider and pick a model [#connect-a-provider-and-pick-a-model]

This saves an OpenRouter key, checks that the model is available, and points an agent at it. Set `AGENT_ID` to one of your `ag_...` agents.

```typescript tab="TypeScript" tab-group="sdk-language"
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});

const provider = await client.providers.create({
  name: "Production OpenRouter",
  providerType: "openrouter",
  baseUrl: null,
  apiKey: process.env.OPENROUTER_API_KEY!,
});
console.log(`Provider: ${provider.id}, key ending ${provider.keyFragment}`);

const { models } = await client.providers.listModels({
  providerId: provider.id,
});
if (!models.some(({ id }) => id === "openai/gpt-6-luna")) {
  throw new Error("openai/gpt-6-luna is not available on this provider");
}

await client.agents.update({
  agentId: process.env.AGENT_ID!,
  providerId: provider.id,
  model: "openai/gpt-6-luna",
});
```

```python tab="Python"
import os

from blazing_agents import BlazingAgents

client = BlazingAgents()

provider = client.providers.create(
    name="Production OpenRouter",
    provider_type="openrouter",
    api_key=os.environ["OPENROUTER_API_KEY"],
)
print(f"Provider: {provider.id}, key ending {provider.key_fragment}")

models = client.providers.list_models(provider.id).models
if not any(m.id == "openai/gpt-6-luna" for m in models):
    raise RuntimeError("openai/gpt-6-luna is not available on this provider")

client.agents.update(
    os.environ["AGENT_ID"],
    provider_id=provider.id,
    model="openai/gpt-6-luna",
)
```

Your key is write-only. Responses never return it, only its last four characters as `keyFragment`. Listing models sends no request to the model and costs no tokens.

Blazing Agents also checks the model ID against the provider whenever you create an agent with a model, change its model, or restore a version. An unknown ID fails with [`model_not_found`](/api-reference/protocols/errors#model_not_found). If the provider cannot be reached to check, the call fails with [`model_validation_unavailable`](/api-reference/protocols/errors#model_validation_unavailable).

## Supported providers [#supported-providers]

| `providerType` | Endpoint | `baseUrl` |
| --- | --- | --- |
| `openrouter` | OpenRouter | Optional override |
| `openai` | OpenAI | Optional override |
| `anthropic` | Anthropic | Optional override |
| `google` | Google | Optional override |
| `vercel_ai_gateway` | Vercel AI Gateway | Not accepted |
| `custom` | Your own OpenAI-compatible endpoint | Required |

A `custom` provider accepts any model ID you type, because OpenAI-compatible endpoints have no standard way to list models.

With `vercel_ai_gateway`, you store only your Gateway key. Vercel handles the underlying vendor keys, credits, routing, fallback, and billing. A model appearing in the Gateway catalog does not guarantee your key can run it.

## Thinking level [#thinking-level]

Reasoning models can think before they answer. An agent's `thinkingLevel` picks how much. Leave it `null` to use the provider's default, which sends no reasoning setting at all. `"off"` turns thinking off where the model supports that, which is not the same as the default.

Ask which levels a model supports before you set one:

```typescript tab="TypeScript" tab-group="sdk-language"
const { known, levels } = await client.providers.getThinkingLevels({
  providerId: provider.id,
  model: "openai/gpt-6-luna",
});
console.log(known ? levels : "Levels unknown; any non-empty value is accepted");

if (known && levels.length > 0) {
  await client.agents.update({
    agentId: process.env.AGENT_ID!,
    thinkingLevel: levels[0],
  });
}
```

```python tab="Python"
choices = client.providers.get_thinking_levels(
    provider.id, model="openai/gpt-6-luna"
)
print(
    choices.levels
    if choices.known
    else "Levels unknown; any non-empty value is accepted"
)

if choices.known and choices.levels:
    client.agents.update(os.environ["AGENT_ID"], thinking_level=choices.levels[0])
```

When the levels are known, Blazing Agents rejects any other value and lists the valid choices in the error. When they are unknown, it accepts any non-empty string, and a value the model does not understand fails when the agent runs. Blazing Agents never swaps in another level or retries without one.

A thinking level is not a token or cost cap, and the same level can behave differently on different models. In the dashboard, changing the provider or model resets the level to the provider default.

## Rotate or remove a key [#rotate-or-remove-a-key]

You can rename a provider, but you cannot change its key, type, or endpoint. To rotate a key:

1. Create a new provider with the new key.
2. Update each agent that used the old provider, sending `providerId` and `model` together.
3. Run one turn on each agent to confirm it works.
4. Delete the old provider.

Deleting a provider that a current agent still uses fails with [`provider_in_use`](/api-reference/protocols/errors#provider_in_use). If only older versions, pinned sessions, or pinned tasks still refer to it, deletion fails with [`provider_historical_use`](/api-reference/protocols/errors#provider_historical_use) and lists them. Keep the provider while those need to run, or delete with `confirmVersionInvalidation` (`confirm_version_invalidation=True` in Python). After that, running or restoring those pinned versions fails with [`provider_not_found`](/api-reference/protocols/errors#provider_not_found).

## Next [#next]

- [Agents](/agents/agents) to see everything else an agent controls.
- Providers SDK reference for [TypeScript](/sdk/typescript/providers) or [Python](/sdk/python/providers).
- [Security and credentials](/platform/security-and-credentials) for how keys are stored and exposed.
