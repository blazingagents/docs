---
title: Generation
description: Run stateless text or structured generation.
---

## Overview [#overview]

Get a one-off answer from an agent without starting a session. Use generation for single-shot text or JSON that matches a schema when you do not need to continue the conversation.

## Stateless Tool approval [#stateless-tool-approval]

Stateless generation follows the agent's `approvalInChat` policy, but nobody
can approve a tool call mid-request. Calls that need manual approval, fail
automatic review, or are escalated by it are blocked. The agent keeps working
with the calls it is allowed to make and is told which actions were blocked. See [Tool approvals](/agents/tools/tool-approvals).

## Next [#next]

- [Generation and streaming](/agents/output/generation-and-streaming) to relay the stream to a frontend.
- [Generate structured output](/agents/output/structured-output) to get JSON back.
- [Sessions API](/api-reference/rest-api/sessions) when you need a conversation.
