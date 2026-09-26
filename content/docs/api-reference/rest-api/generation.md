---
title: Generation
description: Run stateless text or structured generation.
---

# Generation

## Stateless Tool approval [#stateless-tool-approval]

Stateless generation follows the agent's `approvalInChat` policy, but nobody
can approve a tool call mid-request. Calls that need manual approval, fail
automatic review, or are escalated by it are blocked. The agent keeps working
with the calls it is allowed to make and is told which actions were blocked. See [Tool approvals](/agents/tools/tool-approvals).

## Overview [#overview]

Get a one-off answer from an agent without starting a session. Use generation for single-shot text or JSON that matches a schema when you do not need to continue the conversation.

## Endpoints [#endpoints]

### POST /v1/agents/:agentId/generation [#generate]

Runs one agent turn without saving a session. Text and structured output both stream as plain text.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and JSON. `agentId` is a required `ag_…` path parameter. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |

Provide exactly one of `prompt` or `promptId`. `variables` is allowed only with `promptId`.

| Body field  | Type                  | Required    | Description                                                   |
| ----------- | --------------------- | ----------- | ------------------------------------------------------------- |
| `prompt`    | string                | alternative | Non-empty literal prompt                                      |
| `promptId`  | string                | alternative | Stored Prompt ID                                              |
| `variables` | object<string,string> | no          | Exact stored Prompt variables                                 |
| `output`    | object                | yes         | `{ "type": "text" }` or `{ "type": "object", "schema": {…} }` |
| `userId`    | string                | no          | Usage attribution; defaults to `""`                           |
| `metadata`  | object                | no          | Usage metadata; defaults to `{}`                              |
| `version`   | integer               | no          | Immutable Agent Version; defaults to the current Version      |

#### Response

Returns `200 OK` as `text/plain` with an AI SDK text stream. Text mode streams text; object mode streams JSON text. See the [streaming protocol](/api-reference/protocols/streaming) for transport and cancellation behavior.

```text
Password resets are available from Settings > Security.
```

#### Errors

`400 validation_failed` covers invalid prompt/output selection; `provider_required` means the agent version has no provider and model; nothing runs and nothing is billed. Prompt variables use `prompt_variable_missing` or `prompt_variable_unknown`. `402 subscription_required` or `usage_credit_required` blocks billable execution. `404 not_found` applies to a missing Agent, Provider, Prompt, or Workspace, while `agent_version_not_found` identifies a missing Pin. `409 agent_disabled` can reject execution. `429 quota_exceeded` or `rate_limited`, plus a retryable `service_unavailable`, can reject the request before it runs. A failure detected before streaming returns its non-2xx status with the standard JSON error envelope. Once the `200` plain-text stream starts, a failure ends the body early. The status stays `200`, no JSON error body is sent, and there is no error chunk like the ones session streams use. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --no-buffer --request POST \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/generation" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"prompt":"Explain password resets in one sentence.","output":{"type":"text"}}'
```

#### SDK and related guides

SDK: [completion](/sdk/typescript/client#completion) for text and [object](/sdk/typescript/client#object) for structured output. See [Generation and streaming](/agents/output/generation-and-streaming) and [Generate structured output](/agents/output/structured-output).

Python SDK: [completion](/sdk/python/client#completion) for text
and [object](/sdk/python/client#object) for structured output.

## Next [#next]

- [Generation and streaming](/agents/output/generation-and-streaming) to relay the stream to a frontend.
- [Generate structured output](/agents/output/structured-output) to get JSON back.
- [Sessions API](/api-reference/rest-api/sessions) when you need a conversation.
