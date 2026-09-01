---
title: Errors
description: Handle REST error envelopes, typed SDK failures, and errors that occur after streaming begins.
---

# Errors

Use the stable lower-snake-case `code` and HTTP status for control flow.
`message` is safe human-readable context and can change.

## Contract [#contract]

Before a stream starts, every `/v1` failure uses this envelope:

```json
{
  "error": {
    "code": "agent_name_conflict",
    "message": "An Agent with this name already exists.",
    "param": "/name",
    "details": {
      "conflictingResourceId": "ag_0123456789abcdef"
    }
  }
}
```

`code` and `message` are required. `param` is an optional JSON Pointer to one
relevant request value. `details` is an optional object whose shape depends on
the code. The server omits optional fields when they add no value; it does not
emit them as `null` or an empty object. Additional fields and unknown future
codes may appear, so REST consumers should preserve them.

Validation failures use `validation_failed` and
`details.issues: ApiErrorIssue[]`. Each issue contains a string `code`, a
`location` of `body`, `path`, `query`, or `header`, an RFC 6901 JSON Pointer
`path`, and a human-readable `message`. An empty path refers to the complete
validated target.

The `provider_in_use` and `workspace_in_use` errors can include
`details.agentIds: string[]`, listing the referencing Agents. Treat documented
details as public diagnostic data, but still avoid logging tenant-supplied
values without redaction.

`provider_historical_use` includes `details.agentVersions` entries with
`agentId` and `version`, plus `details.sessionIds` and `details.taskIds` for
explicit Pins. All impact details are Tenant-scoped.

### ApiErrorCode [#apierrorcode]

The producer's `ApiErrorCode` is closed. These are the known codes and statuses
currently used by the server; a code can appear with more than one status where
the underlying outcome is more specific.

| Code | Usual status | Meaning |
| --- | ---: | --- |
| `invalid_request` | 400 / 413 / 415 | The request or requested state is invalid. |
| `validation_failed` | 400 | One or more request values failed validation; inspect `details.issues`. |
| `unauthorized` | 401 | The request has no valid credential. |
| `not_found` | 404 | The Tenant-scoped resource is unavailable. |
| `quota_exceeded` | 429 | A Tenant Quota ceiling has been reached. |
| `subscription_required` | 402 | The Tenant does not have an active Subscription. |
| `usage_credit_required` | 402 | The Tenant has no remaining Usage credit. |
| `rate_limited` | 429 | Request admission is rate limited. |
| `internal` | 400 / 409 / 500 / 502 / 503 | The failure has no safe, caller-actionable public outcome. |
| `service_unavailable` | 503 | The API is not admitting work. |
| `checkout_evidence_mismatch` | 409 | The authoritative checkout evidence conflicts with the Tenant's stored checkout attempt or paid cycle. |
| `agent_disabled` | 409 | Enable the Agent before starting a new Turn. |
| `admin_agent_managed` | 409 | The requested Admin Agent operation is platform-managed. |
| `agent_version_not_found` | 404 | Choose an existing Agent Version. |
| `agent_mcp_connection_not_found` | 400 | An Agent references an unavailable MCP Connection. |
| `agent_mcp_connections_invalid` | 400 | The Agent's MCP Connection selection is invalid. |
| `agent_name_conflict` | 409 | Choose a unique Agent name. |
| `provider_required` | 400 | Configure the Agent's Provider and model pair before generation. |
| `api_key_limit_reached` | 400 | The Tenant API-key cap has been reached. |
| `artifact_session_cap_reached` | 400 | The Session Artifact cap has been reached. |
| `invalid_cursor` | 400 | Restart pagination with a valid opaque cursor. |
| `message_not_found` | 404 | The referenced Session message is unavailable. |
| `prompt_limit_reached` | 400 | The Tenant Prompt cap has been reached. |
| `prompt_name_conflict` | 409 | Choose a unique Prompt name. |
| `prompt_variable_missing` | 400 | Supply the missing Prompt variable. |
| `prompt_variable_unknown` | 400 | Remove the unknown Prompt variable. |
| `provider_in_use` | 409 | Detach the Provider from the Agents in `details.agentIds` before deletion. |
| `provider_historical_use` | 409 | Review historical Version and Pin impact, then explicitly confirm invalidation if intended. |
| `provider_limit_reached` | 400 | The Tenant Provider cap has been reached. |
| `provider_name_conflict` | 409 | Choose a unique Provider name. |
| `provider_not_found` | 404 | The Tenant-scoped Provider or historical Provider credential is unavailable. |
| `model_discovery_unsupported` | 422 | Enter a model ID manually for a custom Provider. |
| `model_not_found` | 400 | Select a model ID from the Provider's current catalog. |
| `model_validation_unavailable` | 503 | Retry when the Provider catalog is available. |
| `mcp_connection_limit_reached` | 400 | The Tenant MCP Connection cap has been reached. |
| `mcp_connection_name_conflict` | 409 | Choose a unique MCP Connection name. |
| `mcp_connection_stale_credential_version` | 409 | Retry against the current credential version. |
| `mcp_connection_invalid` | 400 | Correct the MCP Connection configuration. |
| `mcp_connection_authentication_failed` | 400 | Replace or repair the MCP credential. |
| `mcp_connection_in_use` | 409 | Detach the MCP Connection before deletion. |
| `mcp_connection_unreachable` | 400 | Correct connectivity to the MCP server. |
| `mcp_connection_discovery_failed` | 400 / 502 | MCP Tool discovery did not complete. |
| `workspace_not_found` | 404 | The Workspace is unavailable. |
| `workspace_in_use` | 409 | Reassign referencing Agents before deleting the Workspace. |
| `workspace_busy` | 409 | Retry after the conflicting Workspace operation settles. |
| `session_busy` | 409 | Wait for the active Session operation to settle. |
| `session_version_mismatch` | 409 | Use the Session's immutable Agent Version. |
| `tool_approval_continuation_not_found` | 404 | The Tool-approval continuation is unavailable. |
| `tool_approval_decision_conflict` | 409 | The Tool approval has already been decided. |
| `skill_invalid_archive` | 400 | Correct the Skill archive. |
| `skill_invalid_markdown` | 400 | Correct `SKILL.md`. |
| `skill_limit_reached` | 400 | The Agent Skill cap has been reached. |
| `skill_name_conflict` | 409 | Choose a unique Skill name. |
| `skill_not_found` | 404 | The Agent-owned Skill is unavailable. |
| `skill_too_many_files` | 400 | Reduce the number of Skill files. |
| `skill_uncompressed_too_large` | 413 | Reduce the Skill's uncompressed size. |
| `task_active_run_exists` | 409 | Wait for the active Task run to settle. |

### Quota errors [#quota]

`quota_exceeded` is returned by Turn-producing calls when the Tenant's
self-set token or request ceiling is exhausted. See
[Quota limits](/api-reference/protocols/service-limits#quota-ceilings).

Billable execution can also return `subscription_required` or
`usage_credit_required`. A `service_unavailable` response from this gate is
retryable because the authoritative Customer State could not be read.

#### ReceivedApiErrorCode [#receivedapierrorcode]

REST producers emit `ApiErrorCode`, while tolerant consumers model a received
server discriminator as any non-empty string. This preserves a future server
code instead of reclassifying it from HTTP status.

### BlazingAgentsErrorCode [#blazingagentserrorcode]

`BlazingAgentsErrorCode` is the known union plus an open string branch.

#### KnownBlazingAgentsErrorCode [#knownblazingagentserrorcode]

The SDK accepts any non-empty server code so an older client can preserve a
newer API outcome. `KnownBlazingAgentsErrorCode` provides completion for every
`ApiErrorCode` plus these SDK-local codes:

| Code | `status` | Meaning |
| --- | ---: | --- |
| `invalid_response` | response status | The HTTP body is not a valid API envelope or successful JSON result. |
| `network_error` | `undefined` | Fetch failed before an HTTP exchange for a reason other than caller abort. |
| `request_aborted` | `undefined` | The caller's `AbortSignal` aborted the request. |
| `stream_error` | `undefined` | A stream failed after its response started or violated its stream contract. |

`BlazingAgentsError` extends `Error` and exposes `code`, optional `details`,
`headers`, `param`, `requestId`, `responseBody`, `responseBodyTruncated`,
`status`, and `cause`. `responseBody` is size-bounded diagnostic text used for
an invalid response; it is not used as the exception message. Prefer
`BlazingAgentsError.isInstance(error)` to `instanceof` across package copies.

A valid error envelope retains its exact server code, even when a newer server
returns a code unknown to the installed SDK. A malformed error envelope or
malformed successful JSON becomes `invalid_response`; the SDK does not infer a
domain code from the status. Response-backed errors preserve a copy of the
headers and `X-Request-Id` as `requestId`.

## Streaming boundary [#streaming-boundary]

A non-2xx failure before streaming begins uses the JSON envelope. After a
successful response starts, its status and headers are already committed:
Session streams emit a native AI SDK error chunk, while completion/object
terminal consumption rejects with `stream_error`. SDK-created relay responses
preserve the originating request ID. Precise post-start domain codes are not
part of the current stream protocols.

Retry safety is operation-specific. Exposed headers allow callers to read an
authoritative `Retry-After` if one is present, but the SDK does not retry
automatically and the contract does not promise that replaying a mutation is
safe.

## Request correlation [#request-correlation]

`X-Request-Id` is the wire source of truth and is not duplicated in the JSON
body. With raw REST, capture that response header. With the SDK, record
`error.requestId`; `error.headers` is also available when other response
metadata is needed. Record status, code, request ID, and non-sensitive resource
IDs. Never log credentials, authorization headers, raw prompts, or Tool data.

## Examples [#examples]

A `validation_failed` response sets `details.issues` to normalized
`ApiErrorIssue` objects, for example `{ code: "invalid_type", location:
"body", path: "/output/schema", message: "Expected an object." }`.

Branch on known SDK codes while preserving unknown future codes:

```typescript
import { BlazingAgentsError } from "@blazingagents/sdk";

async function inspectTaskError() {
try {
  await client.tasks.get(taskId);
} catch (error) {
  if (!BlazingAgentsError.isInstance(error)) throw error;

  console.error({
    code: error.code,
    requestId: error.requestId,
    status: error.status,
  });

  if (error.code === "quota_exceeded") return;
  if (error.code === "request_aborted") return;
  throw error;
}
}
```

Await the terminal value to observe a failure after a response starts:

```typescript
const result = await client.completion(input);

try {
  console.log(await result.text);
} catch (error) {
  if (BlazingAgentsError.isInstance(error) && error.code === "stream_error") {
    console.error({ code: error.code, requestId: error.requestId });
  } else {
    throw error;
  }
}
```

## Used by [#used-by]

- [SDK client](/sdk/typescript/client)
- [SDK generation](/sdk/typescript/client)
- [REST authentication](/api-reference/rest-api/authentication)
- [REST generation](/api-reference/rest-api/generation)
- [REST Sessions](/api-reference/rest-api/sessions)
- [Limits and reliability](/platform/limits-and-reliability)
- [Troubleshoot a failed integration](/platform/limits-and-reliability)

Every SDK resource and REST endpoint page uses this error contract.

## Source of truth [#source-of-truth]

- `packages/core/src/api.ts`
- `packages/server-core/src/http.ts`
- `packages/server-core/src/http-validation.ts`
- `servers/api/src/utils/error-envelope.ts`
- `../typescript-sdk/src/errors.ts`
- `../typescript-sdk/src/http.ts`
- `../typescript-sdk/src/generation.ts`

## Related guides [#related-guides]

See the capability and guide links under [Used by](#used-by).

## Reference [#reference]

See the implementation inventory under [Source of truth](#source-of-truth).

Python error handling is documented in the [client
reference](/sdk/python/client) and [generation
reference](/sdk/python/client).
