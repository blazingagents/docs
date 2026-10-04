---
title: Sessions
description: Hold conversations with an agent, read their history, and decide tool approvals.
---

# Sessions

## Overview [#overview]

A session is a conversation Blazing Agents keeps for you, so each new turn sees everything said before. Use these endpoints to start a conversation, continue it, read its history, delete it, and handle tool approvals. A session is saved as soon as its first turn is accepted, before the model runs. Continuing a session never creates one that is missing.

## Policy-driven approvals [#policy-driven-approvals]

Sessions follow the agent's `approvalInChat` policy. Whether a tool call waits
for a person or is escalated by automatic review, you handle it the same way:
list the pending approvals, decide one, then join its continuation. See
[review availability](/agents/tools/tool-approvals#review-availability).

Approval records also carry `tool`, `assistantMessageId`, `createdAt`, and
`decidedAt`. Some of these fields are optional, so do not require them; see
[tool approval metadata](/api-reference/protocols/objects-and-schemas#tool-approval-metadata).

## Session inputs [#session-inputs]

The `/inputs` endpoints accept user messages for an existing session while a
turn runs. `POST /inputs` saves the message before it returns `202` with a
receipt. Retry it with the same `requestId` and body; a changed body returns
`input_idempotency_conflict`. `GET /inputs` returns the receipts and the
session's `activity`, so poll it from the first page to follow progress.
Promote and delete work only while a receipt is `accepted`, and return
`input_not_pending` once a turn has taken it.

`POST /stop` takes the `turnId` from `activity` and returns after that turn has
stopped. `POST /inputs/resume` restarts a queue that a failed turn paused.
`GET /input-turns/{turnId}` streams a queued turn from its first chunk, and
`POST /inputs/run` runs the queue with your backend functions attached. See
[send while the agent is working](/platform/sessions-and-turns#send-while-the-agent-is-working).

## Endpoints [#endpoints]

### GET /v1/agents/:agentId/sessions [#list-sessions]

List an agent's sessions.

Lists an agent's sessions, most recently updated first, one page at a time. Each session shows its message count and a preview of its last message. An agent that does not exist in your tenant returns an empty page.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `cursor` | string | query |  | Cursor from the previous page's `nextCursor`. Leave it out for the first page. |
| `limit` | integer | query |  | Number of items per page, from 1 to 200. Defaults to 50. 1–200. Defaults to `50`. |
| `userId` | string | query |  | Return only this end user's sessions. Send an empty value for sessions without an end user. |

#### Response

Returns `200 OK` as `application/json`. A page of the agent's sessions.

Response schema: `SessionList`.

```json
{
  "data": [
    {
      "id": "ss_6Rt2Mw8KqZ4Nc1Hp",
      "messageCount": 4,
      "lastMessagePreview": "Open Settings, choose Security, and select Reset password.",
      "userId": "user_42",
      "metadata": {
        "plan": "pro"
      },
      "createdAt": "2026-07-10T10:00:00.000Z",
      "updatedAt": "2026-07-10T10:05:00.000Z"
    }
  ],
  "nextCursor": null
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/sessions [#create-session-turn]

Create a session and run the first turn.

Starts a session and runs its first turn. The new session's URL is in the `Location` header. A rejected request creates no session; a turn that fails while running still leaves a session you can continue. The session saves the agent configuration selected for its first turn and uses it for subsequent turns. `trigger: "regenerate-message"` is not allowed here. Send exactly one of `message` or `promptId`; `variables` is allowed only with `promptId`. The answer streams back as an AI SDK UI message stream. A failure before the stream starts returns a JSON error. Once the stream has started, a failure arrives as an error chunk; the turn still counts toward usage, and the conversation is left as it was.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `message` | any | body |  | The message to send, as an AI SDK `UIMessage` with `role: "user"`, an `id`, and non-empty `parts`. Parts can be text or images. Send either `message` or `promptId`. |
| `promptId` | string | body |  | ID of a saved prompt to send instead of `message`. |
| `variables` | object | body |  | Values for the saved prompt's variables. Allowed only with `promptId`, and must name exactly the prompt's variables. |
| `trigger` | string | body |  | `submit-message` (the default) sends a new message. `regenerate-message` generates the answer again and is allowed only when continuing a session. One of `submit-message`, `regenerate-message`. Defaults to `submit-message`. |
| `messageId` | string | body |  | With `regenerate-message`, the message to cut the conversation back to before the answer is generated again. |
| `userId` | string | body |  | Your end user's ID. Starting a session records it on the session, and every turn in that session keeps the session's end user. Defaults to `""`. |
| `metadata` | object | body |  | Your own key-value data. Recorded on a new session and on the turn's usage. Defaults to `{}`. |
| `functions` | object | body |  | Caller-local functions the model may call during this turn, keyed by name; each entry has a `description` and a JSON Schema `inputSchema`. Your backend claims and answers each call through the function-call endpoints. |

#### Response

Returns `201 Created` as `text/event-stream`. Server-sent events, each carrying one AI SDK UI message chunk. Sets `Location`: URL of the new session.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`provider_required`](/api-reference/protocols/errors#provider_required), [`prompt_variable_missing`](/api-reference/protocols/errors#prompt_variable_missing), [`prompt_variable_unknown`](/api-reference/protocols/errors#prompt_variable_unknown) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required), [`usage_credit_required`](/api-reference/protocols/errors#usage_credit_required), [`merchant_subscription_required`](/api-reference/protocols/errors#merchant_subscription_required), [`merchant_balance_required`](/api-reference/protocols/errors#merchant_balance_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden), [`merchant_customer_unmapped`](/api-reference/protocols/errors#merchant_customer_unmapped) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found), [`provider_not_found`](/api-reference/protocols/errors#provider_not_found), [`workspace_not_found`](/api-reference/protocols/errors#workspace_not_found) | The resource was not found |
| `409` | [`agent_disabled`](/api-reference/protocols/errors#agent_disabled), [`tenant_deleting`](/api-reference/protocols/errors#tenant_deleting) | The request conflicts with the resource's current state |
| `429` | [`quota_exceeded`](/api-reference/protocols/errors#quota_exceeded), [`rate_limited`](/api-reference/protocols/errors#rate_limited) | Too many requests |
| `503` | [`service_unavailable`](/api-reference/protocols/errors#service_unavailable), [`merchant_eligibility_unavailable`](/api-reference/protocols/errors#merchant_eligibility_unavailable) | The service is temporarily unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --no-buffer --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"message":{"id":"msg_client_1","role":"user","parts":[{"type":"text","text":"How do I reset my password?"}]},"userId":"user_42","metadata":{"plan":"pro"}}'
```

### GET /v1/sessions/latest [#list-latest-sessions]

List latest sessions.

Lists your tenant's sessions across all agents, most recently updated first, skipping sessions with no messages. Set `byAgent=true` to get only each agent's latest session, which is handy for an inbox of agents. Each item also shows the agent's current `model`, `thinkingLevel`, and `status`, and disabled agents are included.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `byAgent` | string | query |  | `true` returns at most one session per agent: its latest. Defaults to `false`. One of `true`, `false`. Defaults to `false`. |
| `cursor` | string | query |  | Cursor from the previous page's `nextCursor`. Leave it out for the first page. |
| `limit` | integer | query |  | Number of items per page, from 1 to 200. Defaults to 50. 1–200. Defaults to `50`. |
| `userId` | string | query |  | Return only this end user's sessions. Send an empty value for sessions without an end user. |

#### Response

Returns `200 OK` as `application/json`. A page of your latest sessions.

Response schema: `LatestSessionList`.

```json
{
  "data": [
    {
      "id": "ss_6Rt2Mw8KqZ4Nc1Hp",
      "messageCount": 4,
      "lastMessagePreview": "Open Settings, choose Security, and select Reset password.",
      "userId": "user_42",
      "metadata": {
        "plan": "pro"
      },
      "createdAt": "2026-07-10T10:00:00.000Z",
      "updatedAt": "2026-07-10T10:05:00.000Z",
      "agentId": "ag_4kP9sT2vXq7LmN3a",
      "model": "openai/gpt-6-luna",
      "thinkingLevel": null,
      "status": "active"
    }
  ],
  "nextCursor": null
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/sessions/latest" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/agents/:agentId/sessions/:sessionId [#get-session]

Get a session and its saved agent configuration.

Returns session details and the agent configuration selected for its first turn. Later agent edits do not change this configuration. Credentials, workspace attachment, skills, and external resources remain live. Functions supplied by a backend belong to individual chat requests and are not part of this configuration. Use the messages endpoint to read the conversation.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `sessionId` | string | path | required | ID of the session. |

#### Response

Returns `200 OK` as `application/json`. The session and its saved configuration.

Response schema: `Session`.

```json
{
  "id": "ss_6Rt2Mw8KqZ4Nc1Hp",
  "messageCount": 4,
  "lastMessagePreview": "Open Settings, choose Security, and select Reset password.",
  "userId": "user_42",
  "metadata": {
    "plan": "pro"
  },
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:05:00.000Z",
  "agentConfig": {
    "approvalInChat": {
      "default": "full",
      "overrides": []
    },
    "approvalInTasks": {
      "default": "full",
      "overrides": []
    },
    "name": "Support Agent",
    "model": "openai/gpt-6-luna",
    "thinkingLevel": null,
    "providerId": "prv_7Tn4Kd9QwE2sLx5R",
    "autoCompaction": true,
    "compactionReserveTokens": 16384,
    "memoryInjectionEnabled": false,
    "tools": [
      "workspace",
      "write_todos"
    ],
    "instructions": "Answer billing questions clearly and briefly.",
    "metadata": {
      "team": "support"
    },
    "mcpConnectionIds": []
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/sessions/:sessionId [#resume-session-turn]

Resume a session with the next turn.

Continues a session with a new turn. A session that does not exist or was deleted returns `404`; it is never created. The session keeps its saved agent configuration. To generate an answer again, set `trigger: "regenerate-message"` and optionally `messageId`; the conversation is cut back to that message (by default, the last answer) and the answer is generated again, and a failed regeneration keeps the previous answer. Returns `409 session_busy` while another turn is running or a tool approval is waiting for a decision. Send exactly one of `message` or `promptId`; `variables` is allowed only with `promptId`. The answer streams back as an AI SDK UI message stream. A failure before the stream starts returns a JSON error. Once the stream has started, a failure arrives as an error chunk; the turn still counts toward usage, and the conversation is left as it was.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `sessionId` | string | path | required | ID of the session. |
| `message` | any | body |  | The message to send, as an AI SDK `UIMessage` with `role: "user"`, an `id`, and non-empty `parts`. Parts can be text or images. Send either `message` or `promptId`. |
| `promptId` | string | body |  | ID of a saved prompt to send instead of `message`. |
| `variables` | object | body |  | Values for the saved prompt's variables. Allowed only with `promptId`, and must name exactly the prompt's variables. |
| `trigger` | string | body |  | `submit-message` (the default) sends a new message. `regenerate-message` generates the answer again and is allowed only when continuing a session. One of `submit-message`, `regenerate-message`. Defaults to `submit-message`. |
| `messageId` | string | body |  | With `regenerate-message`, the message to cut the conversation back to before the answer is generated again. |
| `userId` | string | body |  | Your end user's ID. Starting a session records it on the session, and every turn in that session keeps the session's end user. Defaults to `""`. |
| `metadata` | object | body |  | Your own key-value data. Recorded on a new session and on the turn's usage. Defaults to `{}`. |
| `functions` | object | body |  | Caller-local functions the model may call during this turn, keyed by name; each entry has a `description` and a JSON Schema `inputSchema`. Your backend claims and answers each call through the function-call endpoints. |

#### Response

Returns `200 OK` as `text/event-stream`. Server-sent events, each carrying one AI SDK UI message chunk.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`provider_required`](/api-reference/protocols/errors#provider_required), [`prompt_variable_missing`](/api-reference/protocols/errors#prompt_variable_missing), [`prompt_variable_unknown`](/api-reference/protocols/errors#prompt_variable_unknown) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required), [`usage_credit_required`](/api-reference/protocols/errors#usage_credit_required), [`merchant_subscription_required`](/api-reference/protocols/errors#merchant_subscription_required), [`merchant_balance_required`](/api-reference/protocols/errors#merchant_balance_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden), [`merchant_customer_unmapped`](/api-reference/protocols/errors#merchant_customer_unmapped) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found), [`provider_not_found`](/api-reference/protocols/errors#provider_not_found), [`message_not_found`](/api-reference/protocols/errors#message_not_found), [`workspace_not_found`](/api-reference/protocols/errors#workspace_not_found) | The resource was not found |
| `409` | [`agent_disabled`](/api-reference/protocols/errors#agent_disabled), [`session_busy`](/api-reference/protocols/errors#session_busy), [`tenant_deleting`](/api-reference/protocols/errors#tenant_deleting) | The request conflicts with the resource's current state |
| `429` | [`quota_exceeded`](/api-reference/protocols/errors#quota_exceeded), [`rate_limited`](/api-reference/protocols/errors#rate_limited) | Too many requests |
| `503` | [`service_unavailable`](/api-reference/protocols/errors#service_unavailable), [`merchant_eligibility_unavailable`](/api-reference/protocols/errors#merchant_eligibility_unavailable) | The service is temporarily unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --no-buffer --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"message":{"id":"msg_client_2","role":"user","parts":[{"type":"text","text":"What if I no longer have my email?"}]}}'
```

### DELETE /v1/agents/:agentId/sessions/:sessionId [#delete-session]

Delete a session.

Deletes a session. Afterwards it can no longer be read or continued, and every request for it returns `404`. Set `deleteArtifacts` to choose whether its artifacts are deleted too. While a tool approval is waiting for a decision, or the turn it resumes is still running, the session cannot be deleted.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `sessionId` | string | path | required | ID of the session. |
| `deleteArtifacts` | string | query | required | `true` also deletes the session's artifacts permanently; `false` keeps them. One of `true`, `false`. |

#### Response

Returns `204 No Content`. The session was deleted.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`session_busy`](/api-reference/protocols/errors#session_busy) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF?deleteArtifacts=false" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/agents/:agentId/sessions/:sessionId/messages [#list-session-messages]

List session messages.

Lists a session's messages as AI SDK `UIMessage` objects. The first page holds the newest messages, and messages within a page are in chronological order. Use `cursor` to walk back to older messages, or save `latestCursor` and pass it as `after` later to fetch only new messages. Send at most one of `cursor` or `after`.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `sessionId` | string | path | required | ID of the session. |
| `after` | string | query |  | A `latestCursor` you saved earlier. Returns messages added after it, to poll for new messages. |
| `cursor` | string | query |  | Cursor from the previous page's `nextCursor`, to walk back to older messages. |
| `limit` | integer | query |  | Number of messages per page, from 1 to 200. Defaults to 50. 1–200. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. A page of the session's messages.

Response schema: `SessionMessageList`.

```json
{
  "data": [
    {
      "id": "msg_client_1",
      "role": "user",
      "parts": [
        {
          "type": "text",
          "text": "How do I reset my password?"
        }
      ]
    },
    {
      "id": "msg_9Kd3Vx7PqT2bLn5W",
      "role": "assistant",
      "parts": [
        {
          "type": "text",
          "text": "Open Settings, choose Security, and select Reset password."
        }
      ]
    }
  ],
  "nextCursor": null,
  "latestCursor": "eyJzZXEiOjJ9"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/messages" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/agents/:agentId/sessions/:sessionId/tool-approvals [#list-tool-approvals]

List tool approvals.

Lists the session's pending and decided tool approvals, with the continuation that resumes the turn once they are decided, if there is one. Listing does not decide or claim any tool call.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `sessionId` | string | path | required | ID of the session. |

#### Response

Returns `200 OK` as `application/json`. The session's tool approvals.

Response schema: `ToolApprovalList`.

```json
{
  "data": [
    {
      "approvalId": "apr_3Fp9Lx2WqD6sNc8J",
      "decision": "pending",
      "tool": {
        "type": "builtin",
        "name": "bash"
      },
      "toolName": "bash",
      "toolCallId": "call_8Hn4Tb1ZrM5kQv2X",
      "input": {
        "command": "rm reports/2025-q4.csv"
      },
      "reason": null,
      "assistantMessageId": "msg_9Kd3Vx7PqT2bLn5W",
      "createdAt": "2026-07-10T10:05:00.000Z",
      "decidedAt": null
    }
  ],
  "continuation": {
    "id": "tac_5Wq8Hn2KxR7mTb4C",
    "state": "waiting"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/tool-approvals" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/sessions/:sessionId/tool-approvals/:approvalId [#decide-tool-approval]

Decide a tool approval.

Approves or denies one pending tool call. The decision applies only to that exact call, and every other rule still applies. While other approvals from the same turn are still pending, the continuation stays `waiting`. Once the last one is decided it becomes `queued` and the agent carries on; join the continuation to stream the rest of the turn.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `sessionId` | string | path | required | ID of the session. |
| `approvalId` | string | path | required | ID of the tool approval, from its `approvalId`. |
| `approved` | boolean | body | required | `true` to approve the tool call; `false` to deny it. |
| `reason` | string | body |  | Why you made the decision, up to 1,000 characters. 1–1000 characters. |

#### Response

Returns `202 Accepted` as `application/json`. The continuation that resumes the turn, and its state.

Response schema: `ToolApprovalDecision`.

```json
{
  "continuationId": "tac_5Wq8Hn2KxR7mTb4C",
  "state": "queued"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`tool_approval_decision_conflict`](/api-reference/protocols/errors#tool_approval_decision_conflict), [`agent_disabled`](/api-reference/protocols/errors#agent_disabled) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/tool-approvals/$APPROVAL_ID" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"approved":true,"reason":"Reviewed the file; it is safe to delete."}'
```

### GET /v1/agents/:agentId/sessions/:sessionId/tool-approval-continuations/:continuationId [#join-tool-approval-continuation]

Join a tool-approval continuation.

Streams the rest of the turn after its tool approvals are decided, as an AI SDK UI message stream. Output saved so far replays first, then live output follows until the turn ends, so you can join again at any time. Returns `409 session_busy` while an approval is still waiting for a decision. A failure before the stream starts returns a JSON error; later failures arrive as error chunks in the stream.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `sessionId` | string | path | required | ID of the session. |
| `continuationId` | string | path | required | ID of the continuation, from the decision's `continuationId` or the approval list's `continuation.id`. |

#### Response

Returns `200 OK` as `text/event-stream`. Server-sent events, each carrying one AI SDK UI message chunk.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found), [`tool_approval_continuation_not_found`](/api-reference/protocols/errors#tool_approval_continuation_not_found) | The resource was not found |
| `409` | [`session_busy`](/api-reference/protocols/errors#session_busy) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --no-buffer "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/tool-approval-continuations/tac_5Wq8Hn2KxR7mTb4C" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/sessions/:sessionId/tool-approval-continuations/:continuationId/resume [#resume-tool-approval-continuation]

Resume a tool-approval continuation.

Starts a queued continuation, or joins a running one, from the backend that runs the conversation's functions, and streams the rest of the turn as an AI SDK UI message stream. Function calls are announced in the stream and executed through the function-call operations. Unlike joining, resuming can start a continuation that needs functions. Returns `409 session_busy` while an approval is still waiting for a decision, and `409 tool_approval_decision_conflict` once the continuation has finished. A failure before the stream starts returns a JSON error; later failures arrive as error chunks in the stream.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `sessionId` | string | path | required | ID of the session. |
| `continuationId` | string | path | required | ID of the continuation, from the decision's `continuationId` or the approval list's `continuation.id`. |

#### Response

Returns `200 OK` as `text/event-stream`. Server-sent events, each carrying one AI SDK UI message chunk.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found), [`tool_approval_continuation_not_found`](/api-reference/protocols/errors#tool_approval_continuation_not_found) | The resource was not found |
| `409` | [`session_busy`](/api-reference/protocols/errors#session_busy), [`tool_approval_decision_conflict`](/api-reference/protocols/errors#tool_approval_decision_conflict) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --no-buffer --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/tool-approval-continuations/tac_5Wq8Hn2KxR7mTb4C/resume" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{}'
```

### POST /v1/agents/:agentId/sessions/:sessionId/function-calls/:functionCallId/claim [#claim-chat-function-call]

Claim a function call.

Claims one caller-local function call announced by a `data-ba-function-call` event, before running its handler. Retrying with the same `claimRequestId` returns the same grant; a different `claimRequestId` never takes the call over. Returns `409 function_call_conflict` when another claimant holds the call, its Turn or continuation is no longer active, or its deadline has passed.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `sessionId` | string | path | required | ID of the session. |
| `functionCallId` | string | path | required | ID of the function call, from the ready event's `data.id`. |
| `claimRequestId` | string | body | required | A UUID you generate once per call and reuse on every retry of its claim and result. |

#### Response

Returns `200 OK` as `application/json`. The claim was granted to this `claimRequestId`.

```json
{
  "claimed": true
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`function_call_conflict`](/api-reference/protocols/errors#function_call_conflict) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/function-calls/fc_0123456789abcdef/claim" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"claimRequestId":"6f9619ff-8b86-4d01-b42d-00cf4fc964ff"}'
```

### POST /v1/agents/:agentId/sessions/:sessionId/function-calls/:functionCallId/result [#resolve-chat-function-call]

Submit a function call result.

Submits the outcome of a claimed function call: its JSON output or a sanitized error. Use the `claimRequestId` that won the claim. Retrying an accepted outcome unchanged succeeds even after the Turn ends; a different outcome does not. Returns `409 function_call_conflict` when another claimant holds the call, its Turn or continuation is no longer active, or its deadline has passed.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `sessionId` | string | path | required | ID of the session. |
| `functionCallId` | string | path | required | ID of the function call, from the ready event's `data.id`. |
| `claimRequestId` | string | body | required | A UUID you generate once per call and reuse on every retry of its claim and result. |
| `outcome` | object | body | required | The handler's JSON output, or a sanitized error message for the model. |

#### Response

Returns `200 OK` as `application/json`. The outcome was accepted.

```json
{
  "accepted": true
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`function_call_conflict`](/api-reference/protocols/errors#function_call_conflict) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/function-calls/fc_0123456789abcdef/result" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"claimRequestId":"6f9619ff-8b86-4d01-b42d-00cf4fc964ff","outcome":{"kind":"output","value":{"status":"shipped"}}}'
```

### GET /v1/agents/:agentId/sessions/:sessionId/inputs [#list-session-inputs]

List session inputs.

Lists the session's inputs in the order they arrived, with its current activity. To watch for changes, request the first page again; the cursor only pages through a long list.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `sessionId` | string | path | required | ID of the session. |
| `includeCompleted` | string | query |  | Also return `committed` and `cancelled` inputs. Defaults to `false`. One of `true`, `false`. Defaults to `false`. |
| `limit` | integer | query |  | Maximum receipts per page, from 1 to 200. 1–200. Defaults to `100`. |
| `cursor` | string | query |  | The previous page's nextCursor. |

#### Response

Returns `200 OK` as `application/json`. Inputs in arrival order and the session's activity.

```json
{
  "data": [
    {
      "requestId": "request_1",
      "sequence": 1,
      "message": {
        "id": "message_1",
        "role": "user",
        "parts": [
          {
            "type": "text",
            "text": "Compare costs too"
          }
        ]
      },
      "mode": "queue",
      "state": "accepted",
      "turnId": null,
      "createdAt": "2026-10-04T12:00:00Z",
      "updatedAt": "2026-10-04T12:00:00Z",
      "consumedAt": null,
      "reason": null
    }
  ],
  "nextCursor": null,
  "activity": {
    "state": "idle",
    "turnId": null,
    "reason": null
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/inputs" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/sessions/:sessionId/inputs [#submit-session-input]

Submit a session input.

Saves one user message for the session before responding. While a turn runs, the message waits for the next turn, or joins the running turn when `whenBusy` is `steer`. Retry with the same `requestId`, message, and `whenBusy`; changing them returns `input_idempotency_conflict`. Inputs never skip a pending tool approval. Steering also stays queued while an approved tool continuation runs.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `sessionId` | string | path | required | ID of the session. |
| `requestId` | string | body | required | Unique retry identity, excluding the exact values `.` and `..`. 1–128 characters. |
| `message` | any | body | required | An AI SDK user UIMessage containing text or images. |
| `whenBusy` | string | body |  | `queue` waits for the next turn. `steer` joins the running turn if it can still take messages, and otherwise waits like `queue`. One of `queue`, `steer`. Defaults to `queue`. |

#### Response

Returns `202 Accepted` as `application/json`. The saved input and the session's activity.

```json
{
  "data": {
    "requestId": "request_1",
    "sequence": 1,
    "message": {
      "id": "message_1",
      "role": "user",
      "parts": [
        {
          "type": "text",
          "text": "Compare costs too"
        }
      ]
    },
    "mode": "queue",
    "state": "accepted",
    "turnId": null,
    "createdAt": "2026-10-04T12:00:00Z",
    "updatedAt": "2026-10-04T12:00:00Z",
    "consumedAt": null,
    "reason": null
  },
  "activity": {
    "state": "idle",
    "turnId": null,
    "reason": null
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`input_idempotency_conflict`](/api-reference/protocols/errors#input_idempotency_conflict), [`input_not_pending`](/api-reference/protocols/errors#input_not_pending), [`session_busy`](/api-reference/protocols/errors#session_busy) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/inputs" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"requestId":"request_1","message":{"id":"message_1","role":"user","parts":[{"type":"text","text":"Compare costs too"}]},"whenBusy":"queue"}'
```

### POST /v1/agents/:agentId/sessions/:sessionId/inputs/:requestId/promote [#promote-session-input]

Promote a pending input.

Turns a waiting queued input into a steering message, keeping its ID and place in the order. If no turn can take it now, it waits for the next one. Returns `input_not_pending` once a turn has taken the input.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `sessionId` | string | path | required | ID of the session. |
| `requestId` | string | path | required | The input's original requestId. Encode it as a URL path segment. 1–128 characters. |

#### Response

Returns `200 OK` as `application/json`. The existing input receipt.

```json
{
  "data": {
    "requestId": "request_1",
    "sequence": 1,
    "message": {
      "id": "message_1",
      "role": "user",
      "parts": [
        {
          "type": "text",
          "text": "Compare costs too"
        }
      ]
    },
    "mode": "queue",
    "state": "accepted",
    "turnId": null,
    "createdAt": "2026-10-04T12:00:00Z",
    "updatedAt": "2026-10-04T12:00:00Z",
    "consumedAt": null,
    "reason": null
  },
  "activity": {
    "state": "idle",
    "turnId": null,
    "reason": null
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`input_idempotency_conflict`](/api-reference/protocols/errors#input_idempotency_conflict), [`input_not_pending`](/api-reference/protocols/errors#input_not_pending), [`session_busy`](/api-reference/protocols/errors#session_busy) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/inputs/$REQUEST_ID/promote" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### DELETE /v1/agents/:agentId/sessions/:sessionId/inputs/:requestId [#delete-session-input]

Delete a pending input.

Withdraws an input that is still waiting. Returns `input_not_pending` if a turn took it first. Deleting it again returns the same result.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `sessionId` | string | path | required | ID of the session. |
| `requestId` | string | path | required | The input's original requestId. Encode it as a URL path segment. 1–128 characters. |

#### Response

Returns `200 OK` as `application/json`. The cancelled receipt.

```json
{
  "data": {
    "requestId": "request_1",
    "sequence": 1,
    "message": {
      "id": "message_1",
      "role": "user",
      "parts": [
        {
          "type": "text",
          "text": "Compare costs too"
        }
      ]
    },
    "mode": "queue",
    "state": "cancelled",
    "turnId": null,
    "createdAt": "2026-10-04T12:00:00Z",
    "updatedAt": "2026-10-04T12:00:00Z",
    "consumedAt": null,
    "reason": "deleted"
  },
  "activity": {
    "state": "idle",
    "turnId": null,
    "reason": null
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`input_idempotency_conflict`](/api-reference/protocols/errors#input_idempotency_conflict), [`input_not_pending`](/api-reference/protocols/errors#input_not_pending), [`session_busy`](/api-reference/protocols/errors#session_busy) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/inputs/$REQUEST_ID" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/sessions/:sessionId/inputs/resume [#resume-session-inputs]

Resume pending session inputs.

Runs the waiting inputs again after a failed turn paused them. Inputs in the `uncertain` state never run again. It does not skip a pending tool approval and does not clear a `function_executor_required` pause.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `sessionId` | string | path | required | ID of the session. |

#### Response

Returns `200 OK` as `application/json`. The session’s activity.

```json
{
  "activity": {
    "state": "idle",
    "turnId": null,
    "reason": null
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`input_idempotency_conflict`](/api-reference/protocols/errors#input_idempotency_conflict), [`input_not_pending`](/api-reference/protocols/errors#input_not_pending), [`session_busy`](/api-reference/protocols/errors#session_busy) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/inputs/resume" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/sessions/:sessionId/stop [#stop-session-turn]

Stop a session turn.

Stops the named turn and responds once it has fully stopped and its usage is recorded. Retrying with the same `turnId` never stops a later turn. Waiting inputs then run in the next turn. Returns `session_busy` while a tool approval waits.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `sessionId` | string | path | required | ID of the session. |
| `turnId` | string | body | required | The current activity's turnId, captured before requesting Stop. |

#### Response

Returns `200 OK` as `application/json`. The stopped turn's ID and the session's activity.

```json
{
  "stoppedTurnId": "turn_4kP9sT2vXq7LmN3a",
  "activity": {
    "state": "idle",
    "turnId": null,
    "reason": null
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`input_idempotency_conflict`](/api-reference/protocols/errors#input_idempotency_conflict), [`input_not_pending`](/api-reference/protocols/errors#input_not_pending), [`session_busy`](/api-reference/protocols/errors#session_busy) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/stop" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"turnId":"turn_4kP9sT2vXq7LmN3a"}'
```

### POST /v1/agents/:agentId/sessions/:sessionId/inputs/run [#run-session-inputs]

Run pending session inputs.

Runs every waiting input, in order, as one turn and streams it. Pass `functions` to run a queue paused with `function_executor_required`. It sends no new message. Returns `session_busy` when nothing is waiting, a turn is running, or a tool approval waits.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `sessionId` | string | path | required | ID of the session. |
| `functions` | object | body |  | Backend functions that your server runs for this turn. |

#### Response

Returns `200 OK` as `text/event-stream`. The queued Turn as AI SDK UI message chunks.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |
| `409` | [`input_idempotency_conflict`](/api-reference/protocols/errors#input_idempotency_conflict), [`input_not_pending`](/api-reference/protocols/errors#input_not_pending), [`session_busy`](/api-reference/protocols/errors#session_busy) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --no-buffer --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/inputs/run" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{}'
```

### GET /v1/agents/:agentId/sessions/:sessionId/input-turns/:turnId [#join-session-input-turn]

Join a queued input turn.

Streams a turn that runs queued inputs, from its first chunk, as AI SDK UI message chunks. It never starts or restarts work. Show the assistant message by its ID so a repeat join does not duplicate it.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | ID of the agent. |
| `sessionId` | string | path | required | ID of the session. |
| `turnId` | string | path | required | The turn ID from an input or from the session's activity. |

#### Response

Returns `200 OK` as `text/event-stream`. The queued Turn as AI SDK UI message chunks.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`invalid_request`](/api-reference/protocols/errors#invalid_request), [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `403` | [`forbidden`](/api-reference/protocols/errors#forbidden) | The end user cannot run this request |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --no-buffer "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/input-turns/turn_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Sessions and turns](/platform/sessions-and-turns) to continue, stop, and reload conversations.
- [Streaming protocol](/api-reference/protocols/streaming) to read the SSE stream.
- [Tool approvals](/agents/tools/tool-approvals) to choose which calls need review.
