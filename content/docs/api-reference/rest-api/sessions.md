---
title: Sessions
description: Hold conversations with an agent, read their history, and decide tool approvals.
---

# Sessions

## Policy-driven approvals [#policy-driven-approvals]

Sessions follow the agent's `approvalInChat` policy. Whether a tool call waits
for a person or is escalated by automatic review, you handle it the same way:
list the pending approvals, decide one, then join its continuation. See
[review availability](/agents/tools/tool-approvals#review-availability).

Approval records also carry `tool`, `assistantMessageId`, `createdAt`, and
`decidedAt`. Some of these fields are optional, so do not require them; see
[tool approval metadata](/api-reference/protocols/objects-and-schemas#tool-approval-metadata).

## Overview [#overview]

A session is a conversation Blazing Agents keeps for you, so each new turn sees everything said before. Use these endpoints to start a conversation, continue it, read its history, delete it, and handle tool approvals. A session is saved as soon as its first turn is accepted, before the model runs. Continuing a session never creates one that is missing.

## Endpoints [#endpoints]

### POST /v1/agents/:agentId/sessions [#create-session-turn]

Starts a session and runs its first turn. A rejected request creates no session; a turn that fails while running still leaves a usable session.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), JSON, and an `ag_…` `agentId` path parameter. Provide exactly one of `message` or `promptId`; `variables` is allowed only with `promptId`. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |

| Body field  | Type                  | Required    | Description                                                              |
| ----------- | --------------------- | ----------- | ------------------------------------------------------------------------ |
| `message`   | AI SDK `UIMessage`    | alternative | Must have `id`, `role`, and non-empty `parts`; file parts must be images |
| `promptId`  | string                | alternative | Stored Prompt ID                                                         |
| `variables` | object<string,string> | no          | Exact Prompt variables                                                   |
| `trigger`   | string                | no          | Defaults to `submit-message`; regeneration is invalid here               |
| `messageId` | string                | no          | Used only with regeneration on resume                                    |
| `userId`    | string                | no          | Session and usage attribution; defaults to `""`                          |
| `metadata`  | object                | no          | Session and usage metadata; defaults to `{}`                             |
| `version`   | integer               | no          | Pin an immutable Agent Version; omission leaves the Session unpinned     |

Leave out `version` to use the agent's current version on every turn. Send one to pin the session to that version for all later turns.

#### Response

Returns `201 Created` and `Location: /v1/agents/:agentId/sessions/:sessionId`.

The body is an AI SDK UI message SSE stream of `UIMessageChunk` events. The response includes `Content-Type: text/event-stream` and `X-Vercel-AI-UI-Message-Stream: v1`.

#### Errors

`400 validation_failed` covers malformed/mixed input; `provider_required` means the agent version has no provider and model; no session is created and nothing is billed. Prompt variables and other state failures use their specific codes. `402 subscription_required` or `usage_credit_required` blocks billable execution. `404 not_found` applies to a missing Agent, Provider, or Prompt, while `agent_version_not_found` identifies a missing Pin and `workspace_not_found` identifies a missing Workspace. `409 agent_disabled` can reject execution. `429 quota_exceeded` or `rate_limited`, plus retryable `service_unavailable`, can reject the request before it runs. Failures before the stream starts use the JSON error body; failures after it starts arrive as an AI SDK error chunk. A turn that fails or is canceled after it starts still counts toward usage and leaves the transcript unchanged. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --include --no-buffer --request POST \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"message":{"id":"msg_client_1","role":"user","parts":[{"type":"text","text":"Hello"}]}}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/client#chat) / [Python](/sdk/python/client#chat). See [Sessions and turns](/platform/sessions-and-turns).

### POST /v1/agents/:agentId/sessions/:sessionId [#resume-session-turn]

Continues a session with a new turn. A missing or deleted session returns `404` and is never created.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), JSON, an `ag_…` `agentId`, and an `ss_…` `sessionId`. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |
| Path     | `sessionId`     | yes      | Session ID (`ss_…`).                      |

The body matches [Create a Session turn](/api-reference/rest-api/sessions#create-session-turn) except that `version` is rejected. A pinned session keeps its version; an unpinned one uses the agent's current version on each turn. To regenerate an answer, set `trigger: "regenerate-message"` and optionally `messageId`; the transcript is cut back to that message and the answer is generated again. You still send a `message` or a `promptId`.

#### Response

Returns `200 OK` with an AI SDK UI message SSE stream, `Content-Type: text/event-stream`, and `X-Vercel-AI-UI-Message-Stream: v1`. Unlike create, resume does not return a `Location` header.

#### Errors

`400 validation_failed` covers invalid input; `provider_required` means the pinned version has no provider and model; nothing runs and nothing is billed. Prompt variables, Version mismatch, and regeneration state use their specific codes. `402 subscription_required` or `usage_credit_required` blocks billable execution. `404 not_found` applies to an unknown/deleted Session or missing Agent, Provider, Prompt, or Workspace. `409 agent_disabled` can reject execution. `429 quota_exceeded` or `rate_limited`, plus retryable `service_unavailable`, can reject the request before it runs. A turn that fails or is canceled after it starts still counts toward usage and leaves the transcript unchanged. A failed or canceled regeneration keeps the previous answer. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --no-buffer --request POST \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"message":{"id":"msg_client_2","role":"user","parts":[{"type":"text","text":"Tell me more."}]}}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/client#chat) / [Python](/sdk/python/client#chat). See [Sessions and turns](/platform/sessions-and-turns).

### GET /v1/agents/:agentId/sessions [#list-sessions]

Lists an agent's sessions, most recently updated first. An unknown agent ID, or one in another tenant, returns an empty page.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and an `ag_…` `agentId` path parameter. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |

| Query parameter | Type    | Default | Description                                            |
| --------------- | ------- | ------- | ------------------------------------------------------ |
| `cursor`        | string  | none       | Opaque cursor from `nextCursor`                        |
| `limit`         | integer | 50      | 1–200                                                  |
| `userId`        | string  | none       | Attribution filter; `""` selects tenant-level Sessions |

#### Response

Returns `200 OK` with [cursor pagination](/api-reference/protocols/pagination-and-filtering).

Response schema: [`sessionsListResponseSchema`](/api-reference/protocols/objects-and-schemas#sessions-list-response).

```json
{
  "data": [
    {
      "id": "ss_1234567890ABCDEF",
      "agentVersion": 3,
      "messageCount": 4,
      "lastMessagePreview": "Tell me more.",
      "userId": "",
      "metadata": {},
      "createdAt": "2026-07-10T10:00:00Z",
      "updatedAt": "2026-07-10T10:05:00Z"
    }
  ],
  "nextCursor": null
}
```

#### Errors

`400 validation_failed` for malformed parameters; `400 invalid_cursor` for an
opaque cursor that cannot be decoded. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --get \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --data-urlencode "limit=50"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/sessions#list) / [Python](/sdk/python/sessions#list). See [Sessions and turns](/platform/sessions-and-turns).

### GET /v1/sessions/latest [#list-latest-sessions]

Lists your tenant's most recently updated sessions. Set `byAgent=true` to get only the latest session for each agent.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). Only your tenant's sessions are considered.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |

| Query parameter | Type    | Default | Description                                            |
| --------------- | ------- | ------- | ------------------------------------------------------ |
| `cursor`        | string  | none       | Opaque cursor from `nextCursor`                        |
| `limit`         | integer | 50      | 1–200                                                  |
| `userId`        | string  | none       | Attribution filter; `""` selects tenant-level Sessions |
| `byAgent`       | boolean | `false` | When true, return at most one latest Session per Agent  |

With `byAgent=false`, several sessions can belong to the same agent. With `byAgent=true`, each agent appears at most once, and only if it has a session that is not deleted, not empty, and matches your filters. Use it to build an inbox of agents instead of calling `GET /v1/agents/:agentId/sessions?limit=1` for each one. With `userId`, only that end user's sessions count.

#### Response

Returns `200 OK` with [cursor pagination](/api-reference/protocols/pagination-and-filtering). Items are ordered by `updatedAt` descending, then `id` ascending. Each item is a session list item plus its `agentId`, nullable `model`, nullable `thinkingLevel`, and `status` (`"active"` or `"disabled"`). These show the agent as it is now, not the session's pinned version or earlier turns. Disabled agents are included.

Response schema: [`latestSessionsListResponseSchema`](/api-reference/protocols/objects-and-schemas#latest-sessions-list-response).

```json
{
  "data": [
    {
      "id": "ss_1234567890ABCDEF",
      "agentId": "ag_1234567890ABCDEF",
      "model": "openai/gpt-6-luna",
      "thinkingLevel": "high",
      "status": "disabled",
      "agentVersion": 3,
      "messageCount": 4,
      "lastMessagePreview": "Tell me more.",
      "userId": "",
      "metadata": {},
      "createdAt": "2026-07-10T10:00:00Z",
      "updatedAt": "2026-07-10T10:05:00Z"
    },
    {
      "id": "ss_0987654321FEDCBA",
      "agentId": "ag_0987654321FEDCBA",
      "agentVersion": null,
      "messageCount": 2,
      "lastMessagePreview": "Thanks!",
      "userId": "",
      "metadata": {},
      "createdAt": "2026-07-09T08:00:00Z",
      "updatedAt": "2026-07-09T08:02:00Z"
    }
  ],
  "nextCursor": null
}
```

#### Errors

`400 validation_failed` for malformed parameters; `400 invalid_cursor` for an
opaque cursor that cannot be decoded; `401 unauthorized` for a missing or
invalid credential. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --get \
  "$BLAZING_AGENTS_BASE_URL/v1/sessions/latest" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --data-urlencode "limit=10" \
  --data-urlencode "byAgent=false"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/sessions#list-latest) / [Python](/sdk/python/sessions#list-latest). See [Sessions and Turns](/platform/sessions-and-turns) and [Tenancy and end-user attribution](/platform/tenancy-and-attribution).

### GET /v1/agents/:agentId/sessions/:sessionId/messages [#list-session-messages]

Lists a session's messages as AI SDK `UIMessage` objects. Pages run newest first, with messages in chronological order inside each page.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), an `ag_…` `agentId`, and an `ss_…` `sessionId`. You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |
| Path     | `sessionId`     | yes      | Session ID (`ss_…`).                      |

| Query parameter | Type    | Default | Description                         |
| --------------- | ------- | ------- | ----------------------------------- |
| `cursor`        | string  | none       | Walk backward to older messages     |
| `after`         | string  | none       | Poll forward after a `latestCursor` |
| `limit`         | integer | 50      | 1–200                               |

`cursor` and `after` are mutually exclusive.

#### Response

Returns `200 OK`.

Response schema: [`sessionMessagesResponseSchema`](/api-reference/protocols/objects-and-schemas#session-messages-response).

```json
{
  "data": [
    {
      "id": "msg_client_1",
      "role": "user",
      "parts": [{ "type": "text", "text": "Hello" }]
    },
    {
      "id": "msg_response",
      "role": "assistant",
      "parts": [{ "type": "text", "text": "Hello!" }]
    }
  ],
  "nextCursor": null,
  "latestCursor": "opaque-tail-cursor"
}
```

#### Errors

`400 validation_failed` for invalid IDs, limits, or incompatible cursor
directions; `400 invalid_cursor` for an opaque cursor that cannot be decoded.
`404 not_found` applies to a missing, foreign, or deleted Session. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --get \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/messages" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --data-urlencode "limit=50"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/sessions#messages) / [Python](/sdk/python/sessions#messages). See [Sessions and turns](/platform/sessions-and-turns).

### DELETE /v1/agents/:agentId/sessions/:sessionId [#delete-session]

Deletes a session so it can no longer be read. `deleteArtifacts=true` also
deletes its artifacts permanently; `deleteArtifacts=false` keeps them.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), an
`ag_…` `agentId`, an `ss_…` `sessionId`, and
`deleteArtifacts=true|false`.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |
| Path     | `sessionId`     | yes      | Session ID (`ss_…`).                      |
| Query    | `deleteArtifacts` | yes    | Delete (`true`) or preserve (`false`) Artifacts. |

#### Response

Returns `204 No Content` with an empty body.

#### Errors

`400 validation_failed` for malformed IDs. `404 not_found` for a missing, foreign, or already-deleted Session. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request DELETE \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF?deleteArtifacts=false" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/sessions#delete) / [Python](/sdk/python/sessions#delete). See [Sessions and turns](/platform/sessions-and-turns).

### GET /v1/agents/:agentId/sessions/:sessionId/tool-approvals [#list-tool-approvals]

Lists a session's pending and decided tool approvals.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |
| Path     | `sessionId`     | yes      | Session ID (`ss_…`).                      |

#### Response

| Status   | Body                                                                                      | Lifecycle effect |
| -------- | ----------------------------------------------------------------------------------------- | ---------------- |
| `200 OK` | [ToolApprovalsResponse](/api-reference/protocols/objects-and-schemas#tool-approvals-response) | Read-only.       |

Listing approvals does not claim or decide any tool call.

Response schema: [`toolApprovalsResponseSchema`](/api-reference/protocols/objects-and-schemas#tool-approvals-response).

#### Errors

`404 not_found`. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/tool-approvals" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/sessions#tool-approvals) / [Python](/sdk/python/sessions#tool-approvals). See [Tool approvals](/agents/tools/tool-approvals) and [Build a chat endpoint](/platform/sessions-and-turns).

### POST /v1/agents/:agentId/sessions/:sessionId/tool-approvals/:approvalId [#decide-tool-approval]

Approves or denies one pending tool call. The decision applies only to that exact call.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). You can reach only resources your tenant owns.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |
| Path     | `sessionId`     | yes      | Session ID (`ss_…`).                      |
| Path     | `approvalId`    | yes      | Tool approval ID.                         |

| Location | Field          | Required | Description                              |
| -------- | -------------- | -------- | ---------------------------------------- |
| Body     | `approved`     | yes      | `true` to approve; `false` to deny.      |
| Body     | `reason`       | no       | Decision reason, up to 1,000 characters. |
| Header   | `Content-Type` | yes      | `application/json`.                      |

#### Response

| Status         | Body                                                                                                     | Lifecycle effect                                          |
| -------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `202 Accepted` | [ToolApprovalDecisionResponse](/api-reference/protocols/objects-and-schemas#tool-approval-decision-response) | Persists the decision and exposes a continuation to join. |

Approving a call allows only that call; every other rule still applies.

Response schema: [`toolApprovalDecisionResponseSchema`](/api-reference/protocols/objects-and-schemas#tool-approval-decision-response).

#### Errors

`400 validation_failed`; `404 not_found`; `409
tool_approval_decision_conflict` when the approval was already decided. See
[REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/tool-approvals/apr_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"approved":true,"reason":"Reviewed"}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/sessions#decide-tool-approval) / [Python](/sdk/python/sessions#decide-tool-approval). See [Tool approvals](/agents/tools/tool-approvals) and [Build a chat endpoint](/platform/sessions-and-turns).

### GET /v1/agents/:agentId/sessions/:sessionId/tool-approval-continuations/:continuationId [#join-tool-approval-continuation]

Streams the rest of the turn after a tool approval decision. Saved chunks replay first, then live output or the final state.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). You can reach only resources your tenant owns.

| Location | Field            | Required | Description                               |
| -------- | ---------------- | -------- | ----------------------------------------- |
| Header   | `Authorization`  | yes      | Tenant API key or dashboard JWT. |
| Path     | `agentId`        | yes      | Agent ID (`ag_…`).                        |
| Path     | `sessionId`      | yes      | Session ID (`ss_…`).                      |
| Path     | `continuationId` | yes      | Tool-approval continuation ID.            |

#### Response

| Status   | Body                           | Lifecycle effect                                                       |
| -------- | ------------------------------ | ---------------------------------------------------------------------- |
| `200 OK` | AI SDK UI message event stream | Claims or follows the durable continuation until it succeeds or fails. |

The response is SSE with `Content-Type: text/event-stream`, `X-Vercel-AI-UI-Message-Stream: v1`, `Cache-Control: no-cache`, `Connection: keep-alive`, and `X-Accel-Buffering: no`. `409 session_busy` applies only while the continuation is `waiting`. When it is queued or running, or you join again later, you get the saved chunks first, then live output or the final state.

#### Errors

`404 not_found`; `409 session_busy`; errors before the stream starts use the JSON error body, and later failures arrive as error chunks. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --no-buffer "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/tool-approval-continuations/cont_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/sessions#join-tool-approval-continuation) / [Python](/sdk/python/sessions#join-tool-approval-continuation). See [Tool approvals](/agents/tools/tool-approvals) and [Build a chat endpoint](/platform/sessions-and-turns).

## Next [#next]

- [Sessions and turns](/platform/sessions-and-turns) to continue, stop, and reload conversations.
- [Streaming protocol](/api-reference/protocols/streaming) to read the SSE stream.
- [Tool approvals](/agents/tools/tool-approvals) to choose which calls need review.
