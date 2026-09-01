---
title: Providers and Models
description: Save model credentials, discover native model IDs, and assign a valid pair to an Agent.
---

# Providers and Models

A Provider is a Tenant-owned saved credential and endpoint configuration. An
Agent's `providerId` selects that Provider, while `model` is the Provider-native
identifier passed through without rewriting. Both fields are `null` on an
unconfigured Agent or both are present.

## Supported Provider configurations [#supported-provider-configurations]

| `providerType` | Default endpoint | `baseUrl` at creation |
| --- | --- | --- |
| `openai` | OpenAI | Optional override |
| `anthropic` | Anthropic | Optional override |
| `google` | Google | Optional override |
| `openrouter` | OpenRouter | Optional override |
| `vercel_ai_gateway` | Vercel AI Gateway | Not accepted |
| `custom` | None | Required OpenAI-compatible endpoint |

Only the display name is mutable. Replace a Provider to rotate its API key,
type, or endpoint, then point dependent Agents at the replacement.

## Discover, assign, and verify [#discover-assign-and-verify]

Keep Provider credentials on the backend. Model discovery makes no inference
request and consumes no model tokens.

```typescript
import assert from "node:assert/strict";
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});
const apiKey = process.env.PROVIDER_API_KEY;
assert.ok(apiKey, "Set PROVIDER_API_KEY on the backend");

const provider = await client.providers.create({
  name: `Production OpenRouter ${crypto.randomUUID()}`,
  providerType: "openrouter",
  baseUrl: null,
  apiKey,
});
assert.equal(provider.keyFragment, apiKey.slice(-4));
assert.ok(!("apiKey" in provider));

const { models } = await client.providers.listModels(provider.id);
const model = models.find(({ id }) => id === "anthropic/claude-sonnet-4.5");
assert.ok(model, "Required Provider model is unavailable");

await client.agents.update(process.env.AGENT_ID!, {
  providerId: provider.id,
  model: model.id,
});

const turn = await client.completion({
  agentId: process.env.AGENT_ID!,
  prompt: "Reply with OK.",
});
assert.ok((await turn.text).trim().length > 0);
```

Creating a configured Agent, changing its model, replacing its Provider/model
pair, or restoring a configured Version validates the ID through fresh model
discovery. A missing model returns `model_not_found`; unavailable validation
returns `model_validation_unavailable`. Custom Providers accept manual IDs
because model discovery is not standardized.

## Rotate or remove credentials [#rotate-or-remove-credentials]

Create the replacement Provider, discover its models, update every dependent
Agent with the complete `providerId` and `model` pair, verify a Turn, then
delete the old Provider. A current Agent reference returns `provider_in_use`.

Historical Versions and explicit Session or Task Pins continue to reference
the live Provider ID. After current Agents move away, deletion can return
`provider_historical_use` with the affected records. Keep the Provider while
those pins must execute, or deliberately confirm invalidation. Confirmation
deletes the credential without rewriting history; affected execution and
Version restoration then return `provider_not_found`.

## Vercel AI Gateway boundary [#vercel-ai-gateway-boundary]

A Gateway Provider stores only the Tenant's Gateway key. Vercel remains
responsible for underlying vendor credentials, credits, Team policy, routing,
fallback, and billing. Public catalog membership does not prove the saved key
can execute the selected qualified model ID.

## SDK and API [#sdk-and-api]

- Providers: [TypeScript SDK](/sdk/typescript/providers) and [Python SDK](/sdk/python/providers)
- Agent assignment: [TypeScript Agents](/sdk/typescript/agents) and [Python Agents](/sdk/python/agents)
- Generation: [TypeScript client](/sdk/typescript/client#completion) and [Python client](/sdk/python/client#completion)
- REST: [Providers API](/api-reference/rest-api/providers) and [Agents API](/api-reference/rest-api/agents)
- Security: [Security and credentials](/platform/security-and-credentials)
