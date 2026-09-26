---
title: Errors
description: Handle REST error envelopes, typed SDK failures, and errors that occur after streaming begins.
---

# Errors

When a request fails, you get an HTTP status and a stable `code` to branch on,
plus a readable `message` for logs. Codes do not change; messages can. This
page covers the REST error body, the SDK error types, and failures that happen
after a stream has started.

## Contract [#contract]

Every `/v1` failure before a stream starts returns this body:

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

`code` and `message` are always present. `param` is an optional JSON Pointer to
the request value at fault. `details` is an optional object whose shape depends
on the code. Optional fields are left out rather than sent as `null` or `{}`.
New fields and new codes can appear, so keep anything you do not recognize.

Validation failures use `validation_failed` with
`details.issues: ApiErrorIssue[]`. Each issue has a string `code`, a
`location` of `body`, `path`, `query`, or `header`, an RFC 6901 JSON Pointer
`path`, and a readable `message`. An empty `path` means the whole body, path,
query, or header set.

`provider_in_use` and `workspace_in_use` can include `details.agentIds`, the
agents that still reference the resource. `provider_historical_use` includes
`details.agentVersions` entries with `agentId` and `version`, plus
`details.sessionIds` and `details.taskIds` for pinned versions. Details only
ever list your own tenant's resources, but redact any values your users
supplied before you log them.

### ApiErrorCode [#apierrorcode]

These are the common codes and their usual statuses. A code can appear with
more than one status when the outcome is more specific.

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
| `admin_agent_managed` | 409 | The platform manages this setting on the admin agent that `ba assist` uses. |
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

Turn-producing calls return `quota_exceeded` when your tenant reaches its own
token or request ceiling. See
[quota limits](/api-reference/protocols/service-limits#quota-ceilings).

Billable calls can also return `subscription_required` or
`usage_credit_required`. A `service_unavailable` from this check is safe to
retry: it means your billing status could not be read at that moment.

#### ReceivedApiErrorCode [#receivedapierrorcode]

When you read a code from a response, treat it as any non-empty string rather
than a closed list. That way a code added after you wrote your client still
reaches your handler instead of being guessed from the HTTP status.

### BlazingAgentsErrorCode [#blazingagentserrorcode]

The TypeScript SDK types `error.code` as `BlazingAgentsErrorCode`: every known
code plus any other string.

#### KnownBlazingAgentsErrorCode [#knownblazingagentserrorcode]

`KnownBlazingAgentsErrorCode` gives you completion for every API code above
plus these codes the SDK raises itself:

| Code | `status` | Meaning |
| --- | ---: | --- |
| `invalid_response` | response status | The HTTP body is not a valid API envelope or successful JSON result. |
| `network_error` | `undefined` | Fetch failed before an HTTP exchange for a reason other than caller abort. |
| `request_aborted` | `undefined` | The caller's `AbortSignal` aborted the request. |
| `stream_error` | `undefined` | A stream failed after its response started or violated its stream contract. |

`BlazingAgentsError` extends `Error` and exposes `code`, optional `details`,
`headers`, `param`, `requestId`, `responseBody`, `responseBodyTruncated`,
`status`, and `cause`. `responseBody` is a size-limited copy of an invalid
response for diagnosis; it is never the error message. Use
`BlazingAgentsError.isInstance(error)` rather than `instanceof`, which fails
when two copies of the package are installed.

A valid error body keeps its exact code, even one the installed SDK does not
know. A malformed error body or malformed success JSON becomes
`invalid_response`; the SDK never guesses a code from the status. Errors from a
response keep a copy of its headers and its `X-Request-Id` as `requestId`.

In Python, a non-2xx response raises `APIStatusError` with `code`,
`status_code`, `details`, `param`, `request_id`, `headers`, and `retry_after`.
Network failures raise `APIConnectionError` (or `APITimeoutError`), and
failures after a stream starts raise `StreamError`. All of them extend
`BlazingAgentsError`.

## Streaming boundary [#streaming-boundary]

A failure before a stream starts returns a non-2xx status with the JSON body
above. Once a stream starts, its status and headers are already sent. Session
streams then report the failure as an AI SDK error chunk, and completion or
object results raise `stream_error` when you await the final value. Relay
responses built by the SDK keep the original request ID. Streams do not carry
a specific error code after they start.

Whether a retry is safe depends on the operation. You can read a
`Retry-After` header when one is present, but the SDK never retries for you,
and replaying a write is not guaranteed to be safe.

## Request correlation [#request-correlation]

The request ID lives only in the `X-Request-Id` response header, not in the
JSON body. With raw REST, read that header. With the SDK, log
`error.requestId` (`error.request_id` in Python), and use `error.headers` for
other response metadata. Log the status, code, request ID, and resource IDs
that are not sensitive. Never log credentials, authorization headers, raw
prompts, or tool data.

## Examples [#examples]

A `validation_failed` response puts entries like this in `details.issues`:
`{ code: "invalid_type", location: "body", path: "/output/schema", message:
"Expected an object." }`.

Branch on the codes you handle and rethrow the rest:

```typescript tab="TypeScript"
import { BlazingAgentsError } from "@blazingagents/sdk";

async function inspectTaskError() {
  try {
    await client.tasks.get({ taskId });
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

```python tab="Python"
from blazing_agents import APIStatusError


def inspect_task_error() -> None:
    try:
        client.tasks.get(task_id)
    except APIStatusError as error:
        print(
            {
                "code": error.code,
                "request_id": error.request_id,
                "status": error.status_code,
            }
        )
        if error.code != "quota_exceeded":
            raise
```

Await the final value to catch a failure after the response starts:

```typescript tab="TypeScript"
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

```python tab="Python"
from blazing_agents import StreamError

try:
    with client.completion_stream(agent_id=agent_id, prompt=prompt) as stream:
        print(stream.get_final_text())
except StreamError as error:
    print({"request_id": error.request_id})
```

## Next [#next]

- [Streaming protocol](/api-reference/protocols/streaming) for failures inside a stream.
- [Limits and reliability](/platform/limits-and-reliability) for retries and timeouts.
- [TypeScript client](/sdk/typescript/client) and [Python client](/sdk/python/client) for SDK error handling.
