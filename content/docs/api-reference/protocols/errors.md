---
title: Errors
description: Look up any error code to see what happened and how to fix it, and handle errors from REST, the SDKs, and streams.
---

# Errors

Every failed request gives you an HTTP status and a stable `code` you can
branch on, plus a readable `message` for logs. Codes never change meaning;
messages can. Find your code below to see what happened and what to do, or read
on to handle errors in your client.

## Find a code [#find-a-code]

Each code links to its own entry. You can link straight to one, for example
`/api-reference/protocols/errors#session_busy`.

<!-- error-index:start -->

| Area | Codes |
| --- | --- |
| [Auth and access](#auth-and-access) | [`unauthorized`](#unauthorized), [`forbidden`](#forbidden), [`api_key_limit_reached`](#api_key_limit_reached), [`tenant_deleting`](#tenant_deleting), [`tenant_deletion_in_progress`](#tenant_deletion_in_progress), [`tenant_deletion_not_ready`](#tenant_deletion_not_ready), [`tenant_not_deleting`](#tenant_not_deleting) |
| [Requests and validation](#requests-and-validation) | [`invalid_request`](#invalid_request), [`idempotency_conflict`](#idempotency_conflict), [`validation_failed`](#validation_failed), [`not_found`](#not_found), [`invalid_cursor`](#invalid_cursor) |
| [Agents and providers](#agents-and-providers) | [`agent_disabled`](#agent_disabled), [`admin_agent_managed`](#admin_agent_managed), [`provider_required`](#provider_required), [`provider_in_use`](#provider_in_use), [`provider_historical_use`](#provider_historical_use), [`provider_limit_reached`](#provider_limit_reached), [`provider_name_conflict`](#provider_name_conflict), [`provider_not_found`](#provider_not_found), [`model_discovery_unsupported`](#model_discovery_unsupported), [`model_not_found`](#model_not_found), [`model_validation_unavailable`](#model_validation_unavailable), [`prompt_variable_missing`](#prompt_variable_missing), [`prompt_variable_unknown`](#prompt_variable_unknown) |
| [Sessions and turns](#sessions-and-turns) | [`session_busy`](#session_busy), [`function_call_conflict`](#function_call_conflict), [`session_version_mismatch`](#session_version_mismatch), [`input_idempotency_conflict`](#input_idempotency_conflict), [`input_not_pending`](#input_not_pending), [`message_not_found`](#message_not_found), [`tool_approval_continuation_not_found`](#tool_approval_continuation_not_found), [`tool_approval_decision_conflict`](#tool_approval_decision_conflict) |
| [Tools and MCP](#tools-and-mcp) | [`agent_mcp_connection_not_found`](#agent_mcp_connection_not_found), [`agent_mcp_connections_invalid`](#agent_mcp_connections_invalid), [`mcp_connection_limit_reached`](#mcp_connection_limit_reached), [`mcp_connection_name_conflict`](#mcp_connection_name_conflict), [`mcp_connection_stale_credential_version`](#mcp_connection_stale_credential_version), [`mcp_connection_invalid`](#mcp_connection_invalid), [`mcp_connection_authentication_failed`](#mcp_connection_authentication_failed), [`mcp_connection_in_use`](#mcp_connection_in_use), [`mcp_connection_unreachable`](#mcp_connection_unreachable), [`mcp_connection_discovery_failed`](#mcp_connection_discovery_failed), [`skill_invalid_archive`](#skill_invalid_archive), [`skill_invalid_markdown`](#skill_invalid_markdown), [`skill_limit_reached`](#skill_limit_reached), [`skill_name_conflict`](#skill_name_conflict), [`skill_not_found`](#skill_not_found), [`skill_too_many_files`](#skill_too_many_files), [`skill_uncompressed_too_large`](#skill_uncompressed_too_large), [`chat_webhook_conflict`](#chat_webhook_conflict), [`chat_webhook_registration_failed`](#chat_webhook_registration_failed) |
| [Tasks](#tasks) | [`task_active_run_exists`](#task_active_run_exists) |
| [Quotas and billing](#quotas-and-billing) | [`quota_exceeded`](#quota_exceeded), [`rate_limited`](#rate_limited), [`subscription_required`](#subscription_required), [`usage_credit_required`](#usage_credit_required), [`checkout_evidence_mismatch`](#checkout_evidence_mismatch), [`merchant_connection_not_found`](#merchant_connection_not_found), [`merchant_credential_invalid`](#merchant_credential_invalid), [`merchant_provider_unavailable`](#merchant_provider_unavailable), [`merchant_customer_not_found`](#merchant_customer_not_found), [`merchant_binding_not_found`](#merchant_binding_not_found), [`merchant_binding_required`](#merchant_binding_required), [`merchant_account_mismatch`](#merchant_account_mismatch), [`merchant_event_not_found`](#merchant_event_not_found), [`merchant_event_state_conflict`](#merchant_event_state_conflict), [`merchant_customer_unmapped`](#merchant_customer_unmapped), [`merchant_subscription_required`](#merchant_subscription_required), [`merchant_balance_required`](#merchant_balance_required), [`merchant_eligibility_unavailable`](#merchant_eligibility_unavailable) |
| [Workspaces and artifacts](#workspaces-and-artifacts) | [`workspace_not_found`](#workspace_not_found), [`workspace_in_use`](#workspace_in_use), [`workspace_busy`](#workspace_busy), [`artifact_session_cap_reached`](#artifact_session_cap_reached) |
| [Service](#service) | [`internal`](#internal), [`service_unavailable`](#service_unavailable) |

<!-- error-index:end -->

## Error response [#error-response]

A request that fails before any streaming starts returns a non-2xx status and
this JSON body:

```json
{
  "error": {
    "code": "not_found",
    "message": "Not found"
  }
}
```

`code` and `message` are always present. `param` is a JSON Pointer to the
request value at fault, when there is one. `details` is an object whose shape
depends on the code. Fields with nothing to say are left out rather than sent
as `null` or `{}`. New fields and new codes can appear, so keep anything you do
not recognize.

For [`validation_failed`](#validation_failed), `details.issues` lists every
problem. Each issue has a string `code`, a `location` of `body`, `path`,
`query`, or `header`, a JSON Pointer `path`, and a `message`. An empty `path`
means the whole body, path, query, or header set.

A few codes add the resources you need to act on:
[`provider_in_use`](#provider_in_use) and
[`workspace_in_use`](#workspace_in_use) include `details.agentIds`, and
[`provider_historical_use`](#provider_historical_use) includes
`details.sessionIds` and `details.taskRunIds`. Details
only list your own tenant's resources, but redact any values your users
supplied before you log them.

## SDK error classes [#sdk-error-classes]

In TypeScript, every failure is a `BlazingAgentsError`. Check for it with
`BlazingAgentsError.isInstance(error)` rather than `instanceof`, which fails
when two copies of the package are installed. It exposes `code`, `status`,
`message`, `param`, `details`, `requestId`, `headers`, and `cause`. For a
response the SDK could not read, `responseBody` holds a size-limited copy for
diagnosis, and `responseBodyTruncated` says whether it was cut short.

`message` starts with the code in brackets, such as
`[model_validation_unavailable] Provider model discovery is unavailable`.
`error.code` holds the bare code, such as `model_validation_unavailable`.

`error.code` has the type `BlazingAgentsErrorCode`: every code on this page,
plus four codes the SDK raises itself, plus any other string. The known codes
alone are `KnownBlazingAgentsErrorCode`. Treat the code as an open string so a
code added after you wrote your client still reaches your handler.

| Code | `status` | What happened |
| --- | ---: | --- |
| `invalid_response` | response status | The response body is not a valid error or result. |
| `network_error` | `undefined` | The request failed before any response arrived, and you did not cancel it. |
| `request_aborted` | `undefined` | Your `AbortSignal` cancelled the request. |
| `stream_error` | `undefined` | A stream failed after it started, or sent something invalid. |

The SDK keeps the exact code from a valid error body, even one it does not
know, and never guesses a code from the status.

In Python, an error response raises `APIStatusError` with `code`,
`status_code`, `details`, `param`, `request_id`, `headers`, and `retry_after`.
A network failure raises `APIConnectionError` (or `APITimeoutError`), and a
failure after a stream starts raises `StreamError`. All of them extend
`BlazingAgentsError`. As in TypeScript, `str(error)` for an `APIStatusError`
starts with the bracketed code, and `error.code` holds the bare code.

## Streaming boundary [#streaming-boundary]

Once a stream starts, its status and headers are already sent, so a later
failure cannot change them. A chat stream reports the failure as an AI SDK
error chunk. Completion and object results raise `stream_error` when you await
the final value. These failures carry no specific code, and relay responses
built by the SDK keep the original request ID.

Each entry on this page says whether retrying the same request can succeed.
That does not make a retry safe: a request that timed out may still have taken
effect. The SDK never retries for you, so retry only calls that are safe to
repeat, and wait for the `Retry-After` header when it is present. See
[decide whether to retry](/platform/limits-and-reliability#decide-whether-to-retry).

## Request correlation [#request-correlation]

Every response has an `X-Request-Id` header. It is not in the JSON body. With
the SDK, read `error.requestId` (`error.request_id` in Python), and use
`error.headers` for other response headers. Log the status, code, request ID,
and resource IDs, and include the request ID when you contact support. Never
log credentials, authorization headers, raw prompts, or tool data.

## Examples [#examples]

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

<!-- error-catalog:start -->

## Auth and access [#auth-and-access]

Credentials, API keys, and your account's deletion state.

### `unauthorized` [#unauthorized]

**The request has no valid credential.**

The `Authorization` header is missing, or it holds an API key that is revoked, expired, or mistyped. Dashboard-only endpoints, such as creating API keys, checkout, and account deletion, also return this code when you call them with an API key.

HTTP `401`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Send `Authorization: Bearer <key>` with a current key from the [API keys page](https://www.blazingagents.com/app/keys).
- Check that your backend reads the key from the environment you expect and that it was copied in full.
- Call dashboard-only endpoints from the dashboard instead of with an API key.

### `forbidden` [#forbidden]

**This request needs tenant authority.**

The request used an end-user scope for an operation that only a tenant administrator can perform, or sent a user scope with dashboard authentication.

HTTP `403`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Use a tenant API key without X-BA-User-Id for tenant administration.
- Use a user-scoped client only for that user's agents, sessions, tasks, and other owned resources.

### `api_key_limit_reached` [#api_key_limit_reached]

**Your tenant already has the maximum number of API keys.**

Creating the key would go past the [API key limit](/api-reference/protocols/service-limits#api-keys-per-tenant). No key was created.

HTTP `400`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Revoke a key you no longer use, then create the new one.

### `tenant_deleting` [#tenant_deleting]

**Your account is scheduled for deletion.**

While a deletion is scheduled, you cannot start turns or task runs, and some billing actions are refused. Work that was already running finishes.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Cancel the deletion from the dashboard before its scheduled time if you want to keep the account.
- Otherwise, stop sending new work.

### `tenant_deletion_in_progress` [#tenant_deletion_in_progress]

**Deletion has already started and can no longer be cancelled.**

You tried to cancel an account deletion after its scheduled time passed. The account is being deleted.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Nothing can stop this deletion. Create a new account if you need one.

### `tenant_deletion_not_ready` [#tenant_deletion_not_ready]

**The scheduled deletion time has not arrived yet.**

Account deletion runs at its scheduled time, 24 hours after you request it. This code reports an attempt to finish it early. Public endpoints do not currently return it.

HTTP `409`. Retrying the same request can succeed.

To fix it:

- No action is needed. The deletion completes at its scheduled time, and you can cancel it until then.

### `tenant_not_deleting` [#tenant_not_deleting]

**There is no scheduled deletion to cancel.**

You asked to cancel an account deletion, but none is scheduled. It may already have been cancelled.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Read the account's `deletion` field. `null` means nothing is scheduled and there is nothing to cancel.

## Requests and validation [#requests-and-validation]

Malformed input, missing resources, and pagination.

### `invalid_request` [#invalid_request]

**The request cannot be carried out as sent.**

The request is well formed, but something about it does not make sense for the current state. Examples: a body that is not valid JSON, an API key expiry in the past, a thinking level on an agent with no model, regenerating in a session that does not exist, or an expired MCP sign-in link. `413` means the body or file is too large, and `415` means the file type is not accepted, such as an agent avatar that is not PNG, JPEG, or WebP.

HTTP `400`, `413`, or `415`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Read `message`, which names the problem.
- Change the request to match, then send it again.

### `idempotency_conflict` [#idempotency_conflict]

**This idempotency key belongs to a different request.**

A task create request reused a key with different task fields, or the original task was deleted. No new task or run was created.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Retry with the original request fields, or use a new key for a different task.

### `validation_failed` [#validation_failed]

**One or more request values failed validation.**

A body field, path parameter, query parameter, or header has the wrong type, format, or length, or a required value is missing. Nothing was changed.

HTTP `400`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Read `details.issues`. Each issue gives the `location`, a JSON Pointer `path` to the value, and a `message`.
- Check the value against the endpoint's reference and the [service limits](/api-reference/protocols/service-limits).

### `not_found` [#not_found]

**The resource does not exist in your tenant.**

The ID is wrong, the resource was deleted, or it belongs to another tenant or user scope. You get the same answer in each case, so a missing resource does not reveal who owns it. An unknown URL path also returns this code.

HTTP `404`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Check the ID and its prefix, such as `ag_` or `ss_`.
- Check that you use the API key and user scope that own the resource.
- If the resource was deleted, create it again.

### `invalid_cursor` [#invalid_cursor]

**The pagination cursor cannot be used.**

The `cursor` is not one this list returned, was altered, or came from a list with different filters.

HTTP `400`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Start again from the first page without a cursor.
- Pass the `nextCursor` value back exactly as you received it, with the same filters. See [pagination](/api-reference/protocols/pagination-and-filtering).

## Agents and providers [#agents-and-providers]

Agent configuration, providers, models, and prompts.

### `agent_disabled` [#agent_disabled]

**The agent is disabled.**

A disabled agent cannot start turns or task runs. Its configuration and history are kept.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Enable the agent, then send the request again. See [enable and disable](/agents/configuration-snapshots#enable-and-disable).

### `admin_agent_managed` [#admin_agent_managed]

**Blazing Agents manages this setting on the admin agent.**

The [admin agent](/agents/agents#the-admin-agent), which powers `ba assist`, accepts changes only to its provider, model, and thinking level. It cannot be renamed, disabled, deleted, given an avatar, or assigned to a task.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Send only `providerId`, `model`, and `thinkingLevel` when you update this agent.
- Use one of your own agents for everything else.

### `provider_required` [#provider_required]

**The agent configuration has no provider and model.**

A turn needs a model, and the agent configuration saved for this work has none. Nothing ran and nothing was billed.

HTTP `400`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Set `providerId` and `model` together on the agent. New sessions and task runs will use the updated settings.

### `provider_in_use` [#provider_in_use]

**An agent still uses this provider.**

You cannot delete a provider that an agent's current configuration uses. `details.agentIds` lists those agents.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Move each listed agent to another provider, sending `providerId` and `model` together.
- Delete the provider again.

### `provider_historical_use` [#provider_historical_use]

**Saved sessions or task runs still use this provider.**

No current agent uses the provider, but saved sessions or queued or running task runs do. `details.sessionIds` and `details.taskRunIds` list them.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Keep the provider while that work needs it.
- Or delete with `confirmSnapshotInvalidation=true` (`confirm_snapshot_invalidation=True` in Python). Saved configuration stays readable, but work that needs the deleted provider fails with [`provider_not_found`](#provider_not_found).

### `provider_limit_reached` [#provider_limit_reached]

**Your tenant already has the maximum number of providers.**

Creating the provider would go past the [provider limit](/api-reference/protocols/service-limits#providers-per-tenant). No provider was created.

HTTP `400`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Delete a provider you no longer use, then create the new one.

### `provider_name_conflict` [#provider_name_conflict]

**Another provider already uses this name.**

Provider names are unique within your tenant. Nothing was created or changed.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Choose a different name.

### `provider_not_found` [#provider_not_found]

**The provider does not exist in your tenant.**

The `providerId` is wrong or the provider was deleted. A session or task run whose saved configuration names a deleted provider fails when it needs that provider.

HTTP `404`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- List your providers and use an existing ID.
- Update the agent to use an existing provider for new sessions and task runs.

### `model_discovery_unsupported` [#model_discovery_unsupported]

**This provider cannot list its models.**

Custom providers do not offer a model list to Blazing Agents.

HTTP `422`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Enter the model ID your provider documents when you create or update the agent.

### `model_not_found` [#model_not_found]

**The provider does not offer this model.**

Blazing Agents checks the model ID against the provider when you create an agent with a model or change its model. The ID is not in the provider's current list.

HTTP `400`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- List the provider's models and pick one. Check the spelling and any prefix, such as `openai/`.
- If the key, provider type, or base URL changed, create a new provider.

### `model_validation_unavailable` [#model_validation_unavailable]

**The provider's model list could not be read.**

Blazing Agents asked the provider for its models, to list them or to check a model ID before saving an agent, and got no usable answer. The provider may be down or slow, or it may have rejected the stored key. Nothing was saved.

HTTP `503`. Retrying the same request can succeed.

To fix it:

- Retry after a short wait.
- If it keeps failing, check the provider's status and that its key is still valid. A key cannot change, so create a new provider with a working key and move your agents to it.

### `prompt_variable_missing` [#prompt_variable_missing]

**The prompt needs a variable you did not send.**

The prompt template uses a variable that the request's `variables` object does not include. `message` names the missing variables. Nothing ran.

HTTP `400`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Add every variable the template uses to `variables`. See [prompts](/agents/prompts).

### `prompt_variable_unknown` [#prompt_variable_unknown]

**You sent a variable the prompt does not use.**

The request's `variables` object includes a name the prompt template does not contain. `message` names the unknown variables. Nothing ran.

HTTP `400`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Remove the extra variables, or check them for typos against the template.

## Sessions and turns [#sessions-and-turns]

Running turns, regenerating answers, and tool approvals.

### `session_busy` [#session_busy]

**The session is busy with another operation.**

A turn is running, a tool approval is waiting for a decision, an approved tool call is still running, or another turn holds the session. New chat turns, regeneration, and deletion wait until it settles. Joining a continuation also returns this code while its approvals still need decisions. Stopping a turn or resuming the session's inputs returns it while an approval waits. Running the session's inputs returns it when nothing is waiting, a turn is running, an approval waits, or the queue is paused. A queue paused for backend functions runs only when you pass them.

HTTP `409`. Retrying the same request can succeed.

To fix it:

- Decide any pending tool approvals.
- To send while a turn runs, submit the message as a session input. See [send while the agent is working](/platform/sessions-and-turns#send-while-the-agent-is-working).
- Otherwise wait for the running work to finish, then send again. See [busy and concurrent sessions](/platform/sessions-and-turns#busy-and-concurrent-sessions).

### `function_call_conflict` [#function_call_conflict]

**The backend function call cannot accept this claim or result.**

The call expired, its turn ended, another backend claimed it, or a different result was already accepted.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Use the SDK to claim calls and submit results. It handles retries with the same call identifier and claim nonce.
- Do not run a handler after a rejected claim. If an operation may have completed, check your application records before repeating it. See [backend functions](/agents/tools/backend-functions).

### `session_version_mismatch` [#session_version_mismatch]

**The session changed while this turn was being saved.**

Two turns ran on the same session at once. The first to finish was saved, and this one was not, so the histories are never merged.

HTTP `409`. Retrying the same request can succeed.

To fix it:

- Read the session's messages to see what was saved.
- Send one turn at a time per session, and resend this one if you still need it.

### `input_idempotency_conflict` [#input_idempotency_conflict]

**This request ID or message ID was already used for a different input.**

A session input with this `requestId` already exists with a different message or mode, or this `message.id` was already sent under another `requestId`. The original input is unchanged, even after it was promoted or finished.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- To retry a send whose outcome you do not know, resend the original message and mode with the original `requestId`.
- For a new message, use a new `requestId` and a new `message.id`. See [queue, steer, and withdraw](/platform/sessions-and-turns#queue-steer-and-withdraw).

### `input_not_pending` [#input_not_pending]

**The session input is no longer waiting.**

A turn already picked up this input, or it already finished, so you can no longer promote it to steer or delete it. Work that already started from it may have had effects.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- List the session's inputs to read its current state. See [show progress and recover after a reload](/platform/sessions-and-turns#show-progress-and-recover-after-a-reload).
- To stop work already in progress, stop the running turn.

### `message_not_found` [#message_not_found]

**The message to regenerate does not exist.**

A regenerate request named a `messageId` that is not an assistant message in this session, or the session has no assistant answer yet.

HTTP `404`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Read the session's messages and use the ID of an assistant message.
- Leave out `messageId` to regenerate the latest answer.

### `tool_approval_continuation_not_found` [#tool_approval_continuation_not_found]

**The tool approval continuation does not exist.**

The `continuationId` is wrong, or it belongs to a different agent or session.

HTTP `404`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Use the `continuationId` returned when you decided the approval, with the same agent and session IDs.

### `tool_approval_decision_conflict` [#tool_approval_decision_conflict]

**The approval operation conflicts with the saved state.**

You tried to reverse a saved approval decision or resume a continuation that already succeeded or failed. Sending the same approval decision again is safe.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Read the session's approvals and messages to see the saved decision or continuation result. Treat a saved decision as final. See [tool approvals](/agents/tools/tool-approvals#retries-and-busy-sessions).

## Tools and MCP [#tools-and-mcp]

MCP connections, skills, and chat integrations.

### `agent_mcp_connection_not_found` [#agent_mcp_connection_not_found]

**The agent references an MCP connection that does not exist.**

An ID in `mcpConnectionIds` is wrong, deleted, or belongs to another tenant. The agent was not changed.

HTTP `400`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- List your MCP connections and use existing IDs.

### `agent_mcp_connections_invalid` [#agent_mcp_connections_invalid]

**The agent's MCP connections could not be saved.**

The change would leave the agent with more than the [per-agent limit](/api-reference/protocols/service-limits#mcp-connections-per-agent) of MCP connections, usually because another change attached one at the same time. A request that repeats an ID or lists too many is rejected earlier with [`validation_failed`](#validation_failed). The agent was not changed.

HTTP `400`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Read the agent to see its current `mcpConnectionIds`.
- Send a list within the limit.

### `mcp_connection_limit_reached` [#mcp_connection_limit_reached]

**Your tenant already has the maximum number of MCP connections.**

Creating the connection would go past the [MCP connection limit](/api-reference/protocols/service-limits#mcp-connections-per-tenant). No connection was created.

HTTP `400`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Delete a connection you no longer use, then create the new one.

### `mcp_connection_name_conflict` [#mcp_connection_name_conflict]

**Another MCP connection already uses this name.**

MCP connection names are unique within your tenant. Nothing was created or changed.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Choose a different name.

### `mcp_connection_stale_credential_version` [#mcp_connection_stale_credential_version]

**The connection's credential changed during your reconnect.**

Another reconnect or sign-in replaced the credential while yours was in progress, so yours was not saved.

HTTP `409`. Retrying the same request can succeed.

To fix it:

- Read the connection to see its current state.
- Reconnect again if it still needs a new credential.

### `mcp_connection_invalid` [#mcp_connection_invalid]

**The MCP connection settings are not valid.**

Blazing Agents checks a connection before saving it, and the URL could not be used. Nothing was saved.

HTTP `400`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Check that `url` is the full `https://` address of the MCP server's endpoint.

### `mcp_connection_authentication_failed` [#mcp_connection_authentication_failed]

**The MCP server rejected the credential.**

The bearer token, client credentials, or OAuth sign-in was refused when Blazing Agents connected to the server. Nothing was saved.

HTTP `400`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Check the token or client secret with the server's owner, or sign in again.
- Reconnect with the new credential. See [MCP tools](/agents/tools/mcp-tools#choose-how-to-sign-in).

### `mcp_connection_in_use` [#mcp_connection_in_use]

**An agent still uses this MCP connection.**

You cannot delete a connection while it is attached to an agent.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Remove the connection from each agent's `mcpConnectionIds`, then delete it.

### `mcp_connection_unreachable` [#mcp_connection_unreachable]

**The MCP server could not be reached.**

Blazing Agents could not connect to the URL in time. The server may be down, the address may be wrong, or it may not accept connections from the internet. Nothing was saved.

HTTP `400`. Retrying the same request can succeed.

To fix it:

- Check the URL and that the server is running and reachable from the public internet.
- Try again once the server responds.

### `mcp_connection_discovery_failed` [#mcp_connection_discovery_failed]

**The MCP server's tools or sign-in could not be discovered.**

`400`: Blazing Agents reached the server, but listing its tools or finding its OAuth sign-in failed, so nothing was saved. `502`: a turn could not load the tools of an MCP connection attached to the agent, so the turn did not start.

HTTP `400`, or `502`. Retrying the same request can succeed.

To fix it:

- Test the connection to see its current result. See [check a connection](/agents/tools/mcp-tools#check-a-connection).
- Check that the server implements tool listing, and OAuth discovery if you use OAuth.
- For a turn, retry once the connection tests cleanly, or detach it from the agent.

### `skill_invalid_archive` [#skill_invalid_archive]

**The skill archive cannot be read.**

The upload is not a valid zip or tar.gz file, or it contains unsafe paths, duplicate paths, links, or special files. No skill was created.

HTTP `400`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Rebuild the archive with regular files only and relative paths inside the skill folder.

### `skill_invalid_markdown` [#skill_invalid_markdown]

**The skill's `SKILL.md` is not valid.**

`SKILL.md` is missing, or its frontmatter lacks a required field or goes past a [length limit](/api-reference/protocols/service-limits#skill-frontmatter).

HTTP `400`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Add `SKILL.md` at the skill root with `name` and `description` in its frontmatter, within the limits. See [skills](/agents/skills).

### `skill_limit_reached` [#skill_limit_reached]

**The agent already has the maximum number of skills.**

Adding the skill would go past the [per-agent skill limit](/api-reference/protocols/service-limits#skills-per-agent). No skill was added.

HTTP `400`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Delete a skill the agent no longer needs, then add the new one.

### `skill_name_conflict` [#skill_name_conflict]

**The agent already has a skill with this name.**

Skill names are unique within each agent. Nothing was created or changed.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Rename the skill, or update the existing skill instead.

### `skill_not_found` [#skill_not_found]

**The skill does not exist on this agent.**

The skill ID is wrong, the skill was deleted, or it belongs to a different agent.

HTTP `404`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- List the agent's skills and use an existing ID.

### `skill_too_many_files` [#skill_too_many_files]

**The skill has too many files.**

The skill goes past the [file count limit](/api-reference/protocols/service-limits#skill-bundle). No skill was created or changed.

HTTP `400`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Remove files the skill does not need, or combine small files.

### `skill_uncompressed_too_large` [#skill_uncompressed_too_large]

**The skill is too large.**

The upload, or the skill's files after extraction, go past the [size limit](/api-reference/protocols/service-limits#skill-bundle). No skill was created or changed.

HTTP `413`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Remove large files from the skill, such as datasets or binaries, and upload again.

### `chat_webhook_conflict` [#chat_webhook_conflict]

**The Telegram bot already sends its messages somewhere else.**

The bot has a webhook registered by another service, and Blazing Agents does not overwrite it.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Remove the other webhook from the bot, or create a new bot for Blazing Agents.
- Enable the connection again. See [connect Telegram](/platform/chat-integrations#connect-telegram).

### `chat_webhook_registration_failed` [#chat_webhook_registration_failed]

**Telegram did not accept the webhook.**

Your change to the connection was saved, but registering the webhook with Telegram failed, so messages may not arrive yet.

HTTP `502`. Retrying the same request can succeed.

To fix it:

- Check that the bot token is still valid.
- Enable the connection again to retry the registration, then check its health.

## Tasks [#tasks]

Task runs.

### `task_active_run_exists` [#task_active_run_exists]

**The task already has an active run.**

A task runs one at a time. A new run cannot start, and the task cannot be deleted, while another run is queued or running.

HTTP `409`. Retrying the same request can succeed.

To fix it:

- Wait for the active run to finish, or cancel it, then try again. See [task runs](/automation/task-runs).

## Quotas and billing [#quotas-and-billing]

Your quota, your plan, and billing your own users.

### `quota_exceeded` [#quota_exceeded]

**Your tenant reached the quota you set.**

The current window's token or request usage is at or above your quota ceiling, so the turn did not start. Task runs in the same situation end as `blocked` instead.

HTTP `429`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Wait for the window to reset on your reset day, or raise or remove the quota. See [how quotas work](/platform/usage-and-quotas#how-quotas-work).

### `rate_limited` [#rate_limited]

**Too many requests at once.**

Either too many interactive turns are running at the same time for your plan, or you created agents, tasks, or workspaces faster than the [creation rate limit](/api-reference/protocols/service-limits#tenant-resource-creation-rate) allows.

HTTP `429`. Retrying the same request can succeed.

To fix it:

- Wait for the time in the `Retry-After` header when it is present.
- Otherwise retry with backoff and jitter, and limit how many turns you run at once. See [quota and capacity outcomes](/platform/usage-and-quotas#quota-and-capacity-outcomes).

### `subscription_required` [#subscription_required]

**Your account has no active paid plan.**

Most endpoints and every turn need an active plan. Account, billing, and API key endpoints still work without one.

HTTP `402`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Choose a plan in the [dashboard](https://www.blazingagents.com/app), then send the request again.

### `usage_credit_required` [#usage_credit_required]

**Your account has no usage credit left.**

Your plan is active, but its usage credit balance is used up, so the turn did not start.

HTTP `402`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Add credit or change plan in the [dashboard](https://www.blazingagents.com/app).

### `checkout_evidence_mismatch` [#checkout_evidence_mismatch]

**The checkout does not match your account.**

The payment details returned from checkout do not match the checkout your account started or the plan it is paying for. Your plan was not changed.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Start a new checkout from the dashboard.
- Contact support if you were charged.

### `merchant_connection_not_found` [#merchant_connection_not_found]

**You have not connected a billing account.**

Monetization calls need a connection to your Polar or Dodo account, and none exists.

HTTP `404`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Create the connection first. See [set up monetization](/platform/monetization#set-up-monetization).

### `merchant_credential_invalid` [#merchant_credential_invalid]

**Your billing provider rejected the credential.**

Blazing Agents checks the credential with Polar or Dodo before saving it, and the provider refused it. Nothing was saved.

HTTP `422`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Create a new credential with the permissions listed in [set up monetization](/platform/monetization#set-up-monetization), in the mode that matches `environment`.

### `merchant_provider_unavailable` [#merchant_provider_unavailable]

**Your billing provider could not be reached.**

Blazing Agents needed to check something with Polar or Dodo, such as a credential or a customer, and the provider did not answer. Nothing was saved.

HTTP `503`. Retrying the same request can succeed.

To fix it:

- Retry after a short wait, and check the provider's status page if it keeps failing.

### `merchant_customer_not_found` [#merchant_customer_not_found]

**Your billing provider has no such customer.**

You linked a user to a `customerId` that Polar or Dodo does not know in the connected account and environment. Nothing was linked.

HTTP `422`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Create the customer in your provider first, then link the user with its ID.
- Check that the connection's environment matches where the customer lives.

### `merchant_binding_not_found` [#merchant_binding_not_found]

**This user is not linked to a customer.**

You read or removed the customer link for a `userId` that has none.

HTTP `404`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Check the `userId`, or link the user to a customer.

### `merchant_binding_required` [#merchant_binding_required]

**Link the user before releasing the event.**

You tried to release an `unmapped` usage event, but its user is still not linked to a customer.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Link the event's `userId` to a customer, then release the event again.

### `merchant_account_mismatch` [#merchant_account_mismatch]

**The new credential belongs to a different billing account.**

A connection stays tied to the Polar or Dodo account it was created with. The replacement credential is for another account, so it was not saved.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Use a credential from the account you first connected.
- To move to another account, remove the connection and create a new one.

### `merchant_event_not_found` [#merchant_event_not_found]

**The usage event does not exist.**

The `mev_` event ID is wrong, or the event belongs to another tenant.

HTTP `404`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- List usage events and use an existing ID.

### `merchant_event_state_conflict` [#merchant_event_state_conflict]

**The usage event's status does not allow this action.**

Retry works on `failed` and `uncertain` events and on `pending` events whose automatic delivery gave up. Release works only on `unmapped` events. Discard works only on events your provider has not accepted.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Read the event's `status` and `nextAction`, and take the suggested action. See [delivery states](/platform/monetization#delivery-states).

### `merchant_customer_unmapped` [#merchant_customer_unmapped]

**This user is not linked to a customer, so the guard refused the turn.**

Your monetization guard is on, and the turn's `userId` has no linked customer. The turn did not start. Task runs in the same situation end as `blocked`.

HTTP `403`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Link the user to a customer in your billing provider, then start the turn again.

### `merchant_subscription_required` [#merchant_subscription_required]

**Your customer has no active subscription to a required product.**

Your monetization guard requires one of its `productIds`, and your provider reports no active subscription to any of them for this user's customer. The turn did not start.

HTTP `402`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Ask your user to subscribe to a listed product, or change the guard's `productIds`. See [guard rules](/platform/monetization#guard-rules).

### `merchant_balance_required` [#merchant_balance_required]

**Your customer's balance is used up.**

Your monetization guard requires a positive balance on its `meterId`, and your provider reports none for this user's customer. The turn did not start.

HTTP `402`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Ask your user to top up or upgrade in your billing provider. See [guard rules](/platform/monetization#guard-rules).

### `merchant_eligibility_unavailable` [#merchant_eligibility_unavailable]

**Your customer's plan could not be checked.**

Your monetization guard is on, and your billing provider did not answer in time. The guard refuses the turn rather than guess.

HTTP `503`. Retrying the same request can succeed.

To fix it:

- Retry after a short wait, and check your provider's status page if it keeps failing.

## Workspaces and artifacts [#workspaces-and-artifacts]

Workspace attachment and deletion, and artifact limits.

### `workspace_not_found` [#workspace_not_found]

**The workspace does not exist in your tenant.**

The `workspaceId` is wrong, the workspace was deleted, or the agent has no workspace for its workspace tools to use.

HTTP `404`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- List your workspaces and use an existing ID.
- Attach a workspace to the agent before it uses workspace tools. See [workspaces](/agents/workspaces).

### `workspace_in_use` [#workspace_in_use]

**Agents still use this workspace.**

You cannot delete a workspace while agents are attached to it. `details.agentIds` lists them.

HTTP `409`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Move each listed agent to another workspace, or delete those agents, then delete the workspace.

### `workspace_busy` [#workspace_busy]

**Another operation on this workspace has not finished.**

The workspace could not be deleted because other work on it is still in progress.

HTTP `409`. Retrying the same request can succeed.

To fix it:

- Wait a moment, then delete the workspace again.

### `artifact_session_cap_reached` [#artifact_session_cap_reached]

**The session already has the maximum number of artifacts.**

The agent tried to publish an artifact past the [per-session artifact limit](/api-reference/protocols/service-limits#artifacts-per-session). That artifact was not saved, and the agent sees the error as its tool result.

HTTP `400`. Retrying the same request fails the same way until you fix the cause.

To fix it:

- Start a new session for more artifacts, or have the agent bundle files into fewer artifacts.

## Service [#service]

Failures on the Blazing Agents side.

### `internal` [#internal]

**Something failed on the Blazing Agents side.**

The failure has no specific code you can act on. The status hints at the cause: `500` is an unexpected error, `502` and `503` mean a part of the service did not respond, and `400` or `409` mean an internal step found conflicting state, often because two requests raced.

HTTP `400`, `409`, `500`, `502`, or `503`. Retrying the same request can succeed.

To fix it:

- Retry with backoff if the call is safe to repeat.
- If it keeps failing, contact support with the `X-Request-Id` header value.

### `service_unavailable` [#service_unavailable]

**Blazing Agents cannot take this request right now.**

The service is restarting, or a part it needs, such as billing status or file storage, is briefly unavailable. The request did not run.

HTTP `503`. Retrying the same request can succeed.

To fix it:

- Retry after a short wait with backoff.

<!-- error-catalog:end -->

## Next [#next]

- [Limits and reliability](/platform/limits-and-reliability) for retries and timeouts.
- [Service limits](/api-reference/protocols/service-limits) for every limit and the code it returns.
- [TypeScript client](/sdk/typescript/client) and [Python client](/sdk/python/client) for SDK error handling.
