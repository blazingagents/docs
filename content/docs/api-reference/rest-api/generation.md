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

Runs one turn of the agent without saving a session and streams the answer as plain text. Send exactly one of `prompt` or `promptId`; `variables` is allowed only with `promptId`. With object output, the stream is JSON text that matches your schema. A failure before the stream starts returns a JSON error. Once the stream has started, a failure ends it early and the status stays 200.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `prompt` | string | body |  | The prompt to answer. Send either `prompt` or `promptId`. |
| `promptId` | string | body |  | ID of a saved prompt to use instead of `prompt`. |
| `variables` | object | body |  | Values for the saved prompt's variables. Allowed only with `promptId`, and must name exactly the prompt's variables. |
| `output` | object | body | required | What to stream back: `{"type":"text"}` for text, or `{"type":"object","schema":{…}}` for JSON that matches a JSON Schema. |
| `userId` | string | body |  | Your end user's ID, used for usage attribution. Defaults to `""`. |
| `metadata` | object | body |  | Your own key-value data, recorded with the usage. Defaults to `{}`. |

#### Response

Returns `200 OK` as `text/plain`. Streamed generation output.

```text
Open Settings, choose Security, and select Reset password.
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`provider_required`](/api-reference/protocols/errors#provider_required), [`prompt_variable_missing`](/api-reference/protocols/errors#prompt_variable_missing), [`prompt_variable_unknown`](/api-reference/protocols/errors#prompt_variable_unknown) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required), [`usage_credit_required`](/api-reference/protocols/errors#usage_credit_required), [`merchant_subscription_required`](/api-reference/protocols/errors#merchant_subscription_required), [`merchant_balance_required`](/api-reference/protocols/errors#merchant_balance_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden), [`merchant_customer_unmapped`](/api-reference/protocols/errors#merchant_customer_unmapped) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found), [`workspace_not_found`](/api-reference/protocols/errors#workspace_not_found) | The resource was not found |
| `409` | [`agent_disabled`](/api-reference/protocols/errors#agent_disabled) | The request conflicts with the resource's current state |
| `429` | [`quota_exceeded`](/api-reference/protocols/errors#quota_exceeded), [`rate_limited`](/api-reference/protocols/errors#rate_limited) | Too many requests |
| `503` | [`service_unavailable`](/api-reference/protocols/errors#service_unavailable), [`merchant_eligibility_unavailable`](/api-reference/protocols/errors#merchant_eligibility_unavailable) | The service is temporarily unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --no-buffer --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/generation" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"prompt":"Explain how to reset a password in one sentence.","output":{"type":"text"}}'
```

## Next [#next]

- [Generation and streaming](/agents/output/generation-and-streaming) to relay the stream to a frontend.
- [Generate structured output](/agents/output/structured-output) to get JSON back.
- [Sessions API](/api-reference/rest-api/sessions) when you need a conversation.
