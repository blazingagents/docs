---
title: Sessions
description: Run stateful Turns and manage Session history and Tool approvals.
---

# Sessions

## Overview [#overview]

A Session stores a stateful Agent transcript and its Tool-approval lifecycle. Use these endpoints to start or resume Turns, inspect history, delete the Session, or decide and join approvals. After admission, creation materializes before model execution; resume never creates a missing Session.

## Endpoints [#endpoints]

### POST /v1/agents/:agentId/sessions [#create-session-turn]

Creates a Session and runs its first Turn. Validation and admission failures leave no Session; later failures keep the user message without an assistant response.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), JSON, and an `ag_…` `agentId` path parameter. Provide exactly one of `message` or `promptId`; `variables` is allowed only with `promptId`. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
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

An omitted `version` has no schema default. An unpinned Session resolves the Agent's current Version for each Turn; an explicit pin remains fixed for later resumes.

#### Response

Returns `201 Created` and `Location: /v1/agents/:agentId/sessions/:sessionId`.

The body is an AI SDK UI message SSE stream of `UIMessageChunk` events. The response includes `Content-Type: text/event-stream` and `X-Vercel-AI-UI-Message-Stream: v1`.

#### Errors

`400 validation_failed` covers malformed/mixed input; `provider_required` rejects an unconfigured resolved Version before Session, Turn, transcript, or billing side effects. Prompt variables and other state failures use their specific codes. `402 subscription_required` or `usage_credit_required` blocks billable execution. `404 not_found` applies to a missing Agent, Provider, or Prompt, while `agent_version_not_found` identifies a missing Pin and `workspace_not_found` identifies a missing Workspace. `409 agent_disabled` can reject execution. `429 quota_exceeded` or `rate_limited`, plus retryable `service_unavailable`, may occur before admission. Pre-stream failures use the JSON envelope; mid-stream failures emit an AI SDK error chunk. Failed admitted Turns are metered and retain the submitted user message; cancellation leaves the transcript unchanged. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --include --no-buffer --request POST \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"message":{"id":"msg_client_1","role":"user","parts":[{"type":"text","text":"Hello"}]}}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/client#chat) / [Python](/sdk/python/client#chat). See [Sessions and Turns](/platform/sessions-and-turns) and [Build a chat endpoint](/platform/sessions-and-turns).

### POST /v1/agents/:agentId/sessions/:sessionId [#resume-session-turn]

Runs a Turn from the Session's accepted history. Missing or deleted Sessions return `404` and are never created.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), JSON, an `ag_…` `agentId`, and an `ss_…` `sessionId`. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |
| Path     | `sessionId`     | yes      | Session ID (`ss_…`).                      |

The body matches [Create a Session turn](/api-reference/rest-api/sessions#create-session-turn) except that `version` is rejected. A Session created with a pin keeps using that Version; an unpinned Session resolves the Agent's current Version on each resumed Turn. To regenerate, set `trigger: "regenerate-message"` and optionally `messageId`; the transcript is truncated from that stored message and regenerated. A literal `message` or stored `promptId` remains required.

#### Response

Returns `200 OK` with an AI SDK UI message SSE stream, `Content-Type: text/event-stream`, and `X-Vercel-AI-UI-Message-Stream: v1`. Unlike create, resume does not return a `Location` header.

#### Errors

`400 validation_failed` covers invalid input; `provider_required` rejects an unconfigured pinned Version before Turn or billing side effects. Prompt variables, Version mismatch, and regeneration state use their specific codes. `402 subscription_required` or `usage_credit_required` blocks billable execution. `404 not_found` applies to an unknown/deleted Session or missing Agent, Provider, Prompt, or Workspace. `409 agent_disabled` can reject execution. `429 quota_exceeded` or `rate_limited`, plus retryable `service_unavailable`, may occur before admission. Failed admitted Turns are metered and retain the submitted user message. Failed regeneration also removes the selected prior response; cancellation leaves the transcript unchanged. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --no-buffer --request POST \
  "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"message":{"id":"msg_client_2","role":"user","parts":[{"type":"text","text":"Tell me more."}]}}'
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/client#chat) / [Python](/sdk/python/client#chat). See [Sessions and Turns](/platform/sessions-and-turns) and [Build a chat endpoint](/platform/sessions-and-turns).

### GET /v1/agents/:agentId/sessions [#list-sessions]

Lists Sessions by most recent update. Unknown or foreign Agent IDs return an empty page.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and an `ag_…` `agentId` path parameter. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |

| Query parameter | Type    | Default | Description                                            |
| --------------- | ------- | ------- | ------------------------------------------------------ |
| `cursor`        | string  | —       | Opaque cursor from `nextCursor`                        |
| `limit`         | integer | 50      | 1–200                                                  |
| `userId`        | string  | —       | Attribution filter; `""` selects tenant-level Sessions |

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

SDKs: [TypeScript](/sdk/typescript/sessions#list) / [Python](/sdk/python/sessions#list). See [Sessions and Turns](/platform/sessions-and-turns) and [Build a chat endpoint](/platform/sessions-and-turns).

### GET /v1/agents/:agentId/sessions/:sessionId/messages [#list-session-messages]

Lists stored AI SDK `UIMessage` objects. Pages are newest-first, with messages chronological within each page.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), an `ag_…` `agentId`, and an `ss_…` `sessionId`. The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |
| Path     | `sessionId`     | yes      | Session ID (`ss_…`).                      |

| Query parameter | Type    | Default | Description                         |
| --------------- | ------- | ------- | ----------------------------------- |
| `cursor`        | string  | —       | Walk backward to older messages     |
| `after`         | string  | —       | Poll forward after a `latestCursor` |
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

SDKs: [TypeScript](/sdk/typescript/sessions#messages) / [Python](/sdk/python/sessions#messages). See [Sessions and Turns](/platform/sessions-and-turns) and [Build a chat endpoint](/platform/sessions-and-turns).

### DELETE /v1/agents/:agentId/sessions/:sessionId [#delete-session]

Soft-deletes a Session. `deleteArtifacts=true` also hard-deletes its Artifacts;
`deleteArtifacts=false` preserves them.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication), an
`ag_…` `agentId`, an `ss_…` `sessionId`, and
`deleteArtifacts=true|false`.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
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

SDKs: [TypeScript](/sdk/typescript/sessions#delete) / [Python](/sdk/python/sessions#delete). See [Sessions and Turns](/platform/sessions-and-turns) and [Build a chat endpoint](/platform/sessions-and-turns).

### GET /v1/agents/:agentId/sessions/:sessionId/tool-approvals [#list-tool-approvals]

Lists pending and decided Tool approvals for a Session.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `agentId`       | yes      | Agent ID (`ag_…`).                        |
| Path     | `sessionId`     | yes      | Session ID (`ss_…`).                      |

#### Response

| Status   | Body                                                                                      | Lifecycle effect |
| -------- | ----------------------------------------------------------------------------------------- | ---------------- |
| `200 OK` | [ToolApprovalsResponse](/api-reference/protocols/objects-and-schemas#tool-approvals-response) | Read-only.       |

Approval state belongs to this Session; listing does not claim or decide a Tool call.

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

Approves or denies one pending Tool call. The decision applies only to that exact call.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard Supabase JWT. |
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

The decision authorizes only the named Tool call; it does not bypass Tenant or product invariants.

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

Streams a decided Tool approval continuation over SSE. Persisted chunks replay before live or terminal state.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication). The credential selects the Tenant ownership boundary; reads and mutations are restricted to resources owned by that Tenant.

| Location | Field            | Required | Description                               |
| -------- | ---------------- | -------- | ----------------------------------------- |
| Header   | `Authorization`  | yes      | Tenant API key or dashboard Supabase JWT. |
| Path     | `agentId`        | yes      | Agent ID (`ag_…`).                        |
| Path     | `sessionId`      | yes      | Session ID (`ss_…`).                      |
| Path     | `continuationId` | yes      | Tool-approval continuation ID.            |

#### Response

| Status   | Body                           | Lifecycle effect                                                       |
| -------- | ------------------------------ | ---------------------------------------------------------------------- |
| `200 OK` | AI SDK UI message event stream | Claims or follows the durable continuation until it succeeds or fails. |

The response is SSE with `Content-Type: text/event-stream`, `X-Vercel-AI-UI-Message-Stream: v1`, `Cache-Control: no-cache`, `Connection: keep-alive`, and `X-Accel-Buffering: no`. `409 session_busy` applies only while the continuation is `waiting`. Queued and running joins, replays, and followers stream persisted chunks before following live or returning terminal state.

#### Errors

`404 not_found`; `409 session_busy`; pre-stream Turn errors use the JSON error envelope and later failures use error chunks. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --no-buffer "$BLAZING_AGENTS_BASE_URL/v1/agents/ag_1234567890ABCDEF/sessions/ss_1234567890ABCDEF/tool-approval-continuations/cont_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/sessions#join-tool-approval-continuation) / [Python](/sdk/python/sessions#join-tool-approval-continuation). See [Tool approvals](/agents/tools/tool-approvals) and [Build a chat endpoint](/platform/sessions-and-turns).

## Related [#related]

- Session SDKs: [TypeScript](/sdk/typescript/sessions) and [Python](/sdk/python/sessions)
- [Streaming](/api-reference/protocols/streaming)
- [Pagination and filtering](/api-reference/protocols/pagination-and-filtering)
