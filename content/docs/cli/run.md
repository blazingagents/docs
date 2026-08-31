---
title: ba run
description: Execute one deterministic, non-interactive Agent Turn for a script or pipeline.
---

# ba run

`ba run <agent> [options]` executes exactly one hosted Turn without a TUI or interactive prompt. Complete [CLI setup and authentication](/cli/setup-and-authentication) first; the command never retries automatically, making it the CLI interface for scripts and CI.

## Choose one input [#choose-one-input]

Provide exactly one non-empty source:

- `--prompt <text>` for a literal prompt;
- non-TTY stdin, including a pipe or redirected file; or
- `--prompt-id <id>` for a stored Prompt, with each value supplied once as `--var key=value`.

`--prompt` conflicts with `--prompt-id`. `--var` requires `--prompt-id`; missing, unknown, duplicate, or malformed variables fail before the Turn. Empty literal or stdin input also fails.

```bash
ba run 'Release Agent' \
  --prompt-id prompt_0123456789abcdef \
  --var version=1.2.3 --var environment=production
```

## Run stateless or resume a Session [#run-stateless-or-resume-a-session]

The default is stateless generation and creates no Session. `--session <id>` first verifies an existing Session owned by the selected Agent, then appends one Turn; a missing or foreign Session fails with no stateless or new-Session fallback.

`--user-id` and JSON-object `--metadata` attribute the Turn and its usage. For an existing Session, these inputs do not change the Session's immutable Attribution.

## Choose an output mode [#choose-an-output-mode]

Plain mode streams only assistant text to stdout, with no label or added newline. For an explicit Session Turn, diagnostics and bounded, recursively secret-redacted Tool summaries go to stderr. `--tool-output summary` is the default; `--tool-output off` suppresses successful Tool summaries but retains warnings, denials, and failures.

`--json` buffers a successful result and writes exactly one document containing `agent`, `output`, and `sessionId` only for an explicit Session Turn:

```bash
ba run 'Release Agent' --prompt 'Give the status' --json \
  | jq -r '.output'
```

`--schema <file>` reads JSON Schema, performs stateless object generation, validates the final value locally, and implies buffered JSON output. It conflicts with `--session`.

Buffered JSON and schema failures or cancellations leave stdout empty. Plain streaming can retain assistant text written before a later failure.

## Handle Tool approval [#handle-tool-approval]

For a Session Turn, `ba run` reports each durable approval request and its Session ID on stderr, then exits with an operational failure. It never approves or denies on behalf of a human.

`ba assist` cannot recover an ordinary Agent Session: it always selects the Tenant's Admin Agent and accepts only that Agent's Sessions. To recover an approval reported by `ba run`, your application must [list](/sdk/typescript/sessions#tool-approvals), [decide](/sdk/typescript/sessions#decide-tool-approval), and [join](/sdk/typescript/sessions#join-tool-approval-continuation) it through the SDK, or use the matching REST operations. Review the [Tool approval lifecycle](/agents/tools/tool-approvals) before implementing that flow.

## Exit statuses and signals [#exit-statuses-and-signals]

| Status | Meaning |
| ---: | --- |
| `0` | Turn succeeded |
| `1` | Authentication, lookup, API, stream, model, Tool, or other operational failure |
| `2` | Invalid invocation or malformed local input |
| `130` | Interrupted by SIGINT |
| `143` | Terminated by SIGTERM |

SIGINT and SIGTERM abort the active request through the SDK. The CLI does not retry because a Tool may already have completed a side effect even when the client reports cancellation or failure.

## Related capabilities [#related-capabilities]

- [Sessions and Turns](/platform/sessions-and-turns)
- [Generation and streaming](/agents/output/generation-and-streaming)
- [Structured output](/agents/output/structured-output)
- [Prompts](/agents/prompts)
- [Tenancy and end-user Attribution](/platform/tenancy-and-attribution)
- [Tool approvals](/agents/tools/tool-approvals)
- [Scripting and CI](/cli/scripting-and-ci)

## Reference [#reference]

- [SDK `chat`](/sdk/typescript/client#chat)
- [SDK `completion`](/sdk/typescript/client#completion)
- [SDK `object`](/sdk/typescript/client#object)
- [SDK `prompts.get`](/sdk/typescript/prompts#get)
- [SDK `sessions.messages`](/sdk/typescript/sessions#messages)
- [SDK `toolApprovals`](/sdk/typescript/sessions#tool-approvals)
- [SDK `decideToolApproval`](/sdk/typescript/sessions#decide-tool-approval)
- [SDK `joinToolApprovalContinuation`](/sdk/typescript/sessions#join-tool-approval-continuation)
- [Python SDK `chat`](/sdk/python/client#chat)
- [Python SDK `completion`](/sdk/python/client#completion)
- [Python SDK `object`](/sdk/python/client#object)
- [Python SDK `prompts.get`](/sdk/python/prompts#get)
- [Python SDK `sessions.messages`](/sdk/python/sessions#messages)
- [Python SDK `tool_approvals`](/sdk/python/sessions#tool-approvals)
- [Python SDK `decide_tool_approval`](/sdk/python/sessions#decide-tool-approval)
- [Python SDK `join_tool_approval_continuation`](/sdk/python/sessions#join-tool-approval-continuation)
- [REST generate](/api-reference/rest-api/generation#generate)
- [REST get Prompt](/api-reference/rest-api/prompts#get-prompt)
- [REST resume Session Turn](/api-reference/rest-api/sessions#resume-session-turn)
- [REST list Session messages](/api-reference/rest-api/sessions#list-session-messages)
- [REST list Tool approvals](/api-reference/rest-api/sessions#list-tool-approvals)
- [REST decide Tool approval](/api-reference/rest-api/sessions#decide-tool-approval)
- [REST join Tool-approval continuation](/api-reference/rest-api/sessions#join-tool-approval-continuation)
