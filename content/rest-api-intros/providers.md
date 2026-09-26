---
title: Providers
description: Store model provider keys and discover the models each provider offers.
---

## Overview [#overview]

A provider stores the API key your agents use to call a model vendor such as OpenRouter. Blazing Agents encrypts the key and never returns it. List a provider's models to pick an ID for your agent; listing makes no model call, and the same list checks the model whenever you configure an agent.

List a model's thinking levels to see which `thinkingLevel` values an agent
can use with it. `known: false` means the capabilities could not be looked up;
a known empty list means only the provider's default is available. See
[Thinking level](/agents/providers-and-models#thinking-level) for how levels
are chosen.

## Next [#next]

- [Providers and models](/agents/providers-and-models) to choose a provider and model.
- [Agents API](/api-reference/rest-api/agents#create-agent) to use the provider in an agent.
