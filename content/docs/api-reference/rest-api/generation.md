---
title: Generation
description: Run stateless text or structured generation.
---

# Generation

## Overview [#overview]

Get a one-off answer from an agent without starting a session. Use generation for single-shot text or JSON that matches a schema when you do not need to continue the conversation.

## Stateless Tool approval [#stateless-tool-approval]

Stateless generation follows the agent's `approvalInChat` policy, but nobody
can approve a tool call mid-request. Calls that need manual approval, fail
automatic review, or are escalated by it are blocked. The agent keeps working
with the calls it is allowed to make and is told which actions were blocked. See [Tool approvals](/agents/tools/tool-approvals).

## Endpoints [#endpoints]

### POST /v1/agents/:agentId/generation [#generate]

Run stateless generation.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `prompt` | string | body |  |  |
| `promptId` | string | body |  | `prompt_…` ID. |
| `variables` | object | body |  |  |
| `output` | object | body | required |  |
| `version` | integer | body |  | 1–2147483647. |
| `userId` | string | body |  | Defaults to `""`. |
| `metadata` | object | body |  | Defaults to `{}`. |

#### Response

Returns `200 OK` as `text/plain`. Streamed generation output.

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --no-buffer --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/generation" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"output":{"type":"text"}}'
```

## Next [#next]

- [Generation and streaming](/agents/output/generation-and-streaming) to relay the stream to a frontend.
- [Generate structured output](/agents/output/structured-output) to get JSON back.
- [Sessions API](/api-reference/rest-api/sessions) when you need a conversation.
