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

## Endpoints [#endpoints]

### GET /v1/agents/:agentId/sessions [#list-sessions]

List an agent's sessions.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `cursor` | string | query |  |  |
| `limit` | integer | query |  | 1–200. Defaults to `50`. |
| `userId` | string | query |  |  |

#### Response

Returns `200 OK` as `application/json`. A page of sessions.

Response schema: `SessionList`.

```json
{
  "data": [
    {
      "agentVersion": 1,
      "id": "ss_1234567890ABCDEF",
      "messageCount": 0,
      "lastMessagePreview": "string",
      "userId": "string",
      "metadata": {},
      "createdAt": "2026-07-10T10:00:00Z",
      "updatedAt": "2026-07-10T10:00:00Z"
    }
  ],
  "nextCursor": "string"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/sessions [#create-session-turn]

Create a session and run the first turn.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `message` | any | body |  |  |
| `promptId` | string | body |  | `prompt_…` ID. |
| `variables` | object | body |  |  |
| `trigger` | string | body |  | One of `submit-message`, `regenerate-message`. Defaults to `submit-message`. |
| `messageId` | string | body |  |  |
| `version` | integer | body |  | 1–2147483647. |
| `userId` | string | body |  | Defaults to `""`. |
| `metadata` | object | body |  | Defaults to `{}`. |

#### Response

Returns `201 Created` as `text/event-stream`. Server-sent events; each event's data is one TurnStreamChunk (AI SDK UI message stream protocol). Sets `Location`: URL of the created session resource.

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --no-buffer --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"message":{}}'
```

### GET /v1/sessions/latest [#list-latest-sessions]

List latest sessions.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `byAgent` | string | query |  | One of `true`, `false`. Defaults to `false`. |
| `cursor` | string | query |  |  |
| `limit` | integer | query |  | 1–200. Defaults to `50`. |
| `userId` | string | query |  |  |

#### Response

Returns `200 OK` as `application/json`. A page of latest sessions.

Response schema: `LatestSessionList`.

```json
{
  "data": [
    {
      "agentVersion": 1,
      "id": "ss_1234567890ABCDEF",
      "messageCount": 0,
      "lastMessagePreview": "string",
      "userId": "string",
      "metadata": {},
      "createdAt": "2026-07-10T10:00:00Z",
      "updatedAt": "2026-07-10T10:00:00Z",
      "agentId": "ag_1234567890ABCDEF",
      "model": "openai/gpt-6-luna",
      "thinkingLevel": "string",
      "status": "active"
    }
  ],
  "nextCursor": "string"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/sessions/latest" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/agents/:agentId/sessions/:sessionId/messages [#list-session-messages]

List session messages.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `sessionId` | string | path | required | `ss_…` ID. |
| `after` | string | query |  |  |
| `cursor` | string | query |  |  |
| `limit` | integer | query |  | 1–200. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. A page of session messages.

Response schema: `SessionMessageList`.

```json
{
  "data": [
    {
      "id": "string",
      "role": "system",
      "parts": [
        {
          "type": "string"
        }
      ],
      "metadata": {}
    }
  ],
  "nextCursor": "string",
  "latestCursor": "string"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/messages" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/sessions/:sessionId [#resume-session-turn]

Resume a session with the next turn.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `sessionId` | string | path | required | `ss_…` ID. |
| `message` | any | body |  |  |
| `promptId` | string | body |  | `prompt_…` ID. |
| `variables` | object | body |  |  |
| `trigger` | string | body |  | One of `submit-message`, `regenerate-message`. Defaults to `submit-message`. |
| `messageId` | string | body |  |  |
| `version` | integer | body |  | 1–2147483647. |
| `userId` | string | body |  | Defaults to `""`. |
| `metadata` | object | body |  | Defaults to `{}`. |

#### Response

Returns `200 OK` as `text/event-stream`. Server-sent events; each event's data is one TurnStreamChunk (AI SDK UI message stream protocol).

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --no-buffer --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"message":{}}'
```

### DELETE /v1/agents/:agentId/sessions/:sessionId [#delete-session]

Delete a session.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `sessionId` | string | path | required | `ss_…` ID. |
| `deleteArtifacts` | string | query | required | One of `true`, `false`. |

#### Response

Returns `204 No Content`. Deleted.

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF?deleteArtifacts=true" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/agents/:agentId/sessions/:sessionId/tool-approvals [#list-tool-approvals]

List tool approvals.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `sessionId` | string | path | required | `ss_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The session's tool approvals.

Response schema: `ToolApprovalList`.

```json
{
  "data": [
    {
      "tool": {
        "type": "builtin",
        "name": "read"
      },
      "assistantMessageId": "string",
      "createdAt": "2026-07-10T10:00:00Z",
      "decidedAt": "2026-07-10T10:00:00Z",
      "approvalId": "string",
      "decision": "pending",
      "input": {},
      "reason": "string",
      "toolCallId": "string",
      "toolName": "string"
    }
  ],
  "continuation": {
    "id": "string",
    "state": "waiting"
  }
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/tool-approvals" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/agents/:agentId/sessions/:sessionId/tool-approvals/:approvalId [#decide-tool-approval]

Decide a tool approval.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `sessionId` | string | path | required | `ss_…` ID. |
| `approvalId` | string | path | required |  |
| `approved` | boolean | body | required |  |
| `reason` | string | body |  | 1–1000 characters. |

#### Response

Returns `202 Accepted` as `application/json`. The recorded decision and continuation state.

Response schema: `ToolApprovalDecision`.

```json
{
  "continuationId": "string",
  "state": "waiting"
}
```

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |
| `409` | Approval already decided or session busy |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/tool-approvals/string" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"approved":true}'
```

### GET /v1/agents/:agentId/sessions/:sessionId/tool-approval-continuations/:continuationId [#join-tool-approval-continuation]

Join a tool-approval continuation.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | path | required | `ag_…` ID. |
| `sessionId` | string | path | required | `ss_…` ID. |
| `continuationId` | string | path | required |  |

#### Response

Returns `200 OK` as `text/event-stream`. Streamed continuation events.

#### Errors

| Status | Description |
| --- | --- |
| `400` | Validation failed |
| `401` | Missing or invalid credential |
| `404` | Not found in this tenant |
| `409` | Tool approvals are still awaiting decisions |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --no-buffer "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/tool-approval-continuations/string" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Sessions and turns](/platform/sessions-and-turns) to continue, stop, and reload conversations.
- [Streaming protocol](/api-reference/protocols/streaming) to read the SSE stream.
- [Tool approvals](/agents/tools/tool-approvals) to choose which calls need review.
