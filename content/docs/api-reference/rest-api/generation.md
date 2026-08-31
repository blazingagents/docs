---
title: Generation
description: Run stateless text or structured generation.
---

# Generation

## Overview [#overview]

Generation runs a stateless Agent Turn without creating Session history. Use it for one-shot text or JSON-schema-constrained output when later continuation is unnecessary.

## Endpoints [#endpoints]

### POST /v1/agents/:agentId/generation [#generate]

Runs a stateless Agent Turn without Session history. Text and structured output both stream as plain text.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and JSON. `agentId` is a required `ag_…` path parameter. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
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

`400 validation_failed` covers invalid prompt/output selection; `provider_required` rejects an unconfigured resolved Version before execution or billing side effects. Prompt variables use `prompt_variable_missing` or `prompt_variable_unknown`. `402 subscription_required` or `usage_credit_required` blocks billable execution. `404 not_found` applies to a missing Agent, Provider, Prompt, or Workspace, while `agent_version_not_found` identifies a missing Pin. `409 agent_disabled` can reject execution. `429 quota_exceeded` or `rate_limited`, plus retryable `service_unavailable`, may occur before admission. A failure detected before streaming returns its non-2xx status with the standard JSON error envelope. After the `200` plain-text stream starts, a failure terminates the body; it cannot change the status or emit a JSON envelope, and this endpoint does not use the UI-message error chunks produced by Session streams. See [REST errors](/api-reference/protocols/errors).

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

## Related [#related]

- [TypeScript SDK](/sdk/typescript)
- [Python SDK](/sdk/python)
- [Objects and schemas](/api-reference/protocols/objects-and-schemas)
- [Errors](/api-reference/protocols/errors)
