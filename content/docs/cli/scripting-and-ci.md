---
title: Scripting and CI
description: Run one secret-safe, predictable, non-interactive Agent Turn in an automation job.
---

# Scripting and CI

Use `ba run` to execute one predictable non-interactive Turn while keeping credentials and diagnostics out of the result channel. This pattern fits any CI system that can install Node packages, inject secrets, and inspect an exit status.

## Before you begin [#before-you-begin]

Store a Tenant API key in the CI system's secret manager, identify an Agent by exact ID or resolvable full name, and make Node.js 24 plus npm available. Review [CLI setup and authentication](/cli/setup-and-authentication) and [`ba run`](/cli/run).

## Configure the job [#configure-the-job]

Inject `BLAZING_AGENTS_API_KEY` as an environment secret. Optionally set `BLAZING_AGENTS_BASE_URL` for a non-default API origin. When `CI` is set, a missing API key fails before the native credential store loads; automation should never run `ba --login`.

```yaml title="GitHub Actions step"
- name: Run the release Agent
  env:
    BLAZING_AGENTS_API_KEY: ${{ secrets.BLAZING_AGENTS_API_KEY }}
  run: |
    npm install --global @blazing-agents/cli@0.1.0
    set +e
    ba run ag_0123456789abcdef \
      --prompt 'Summarize the release status' \
      --json --tool-output off > result.json
    status=$?
    set -e
    test "$status" -eq 0
    jq -e '.output | strings | length > 0' result.json
```

The step should exit zero and `jq` should validate the buffered `output`. The secret is injected without being echoed, and Tool diagnostics remain on stderr rather than in `result.json`.

## Send input [#send-input]

Prefer `--prompt` for a short literal. Pipe or redirect non-TTY stdin for generated text or a file so the content does not need shell quoting. For stored Prompt variables, follow the complete [`--prompt-id` and `--var` rules](/cli/run#choose-one-input).

## Keep output machine-readable [#keep-output-machine-readable]

Use `--json` for one buffered document or `--schema <file>` for a stateless, schema-validated JSON value. Stdout then contains only the successful result; authentication errors, Tool summaries, approval notices, and failures use stderr. Add `--tool-output off` to suppress successful Tool summaries while keeping warnings and failures.

Buffered failure or cancellation leaves stdout empty. Plain mode can preserve partial text and is therefore unsuitable when a consumer requires an all-or-nothing document.

## Handle exit statuses and cancellation [#handle-exit-statuses-and-cancellation]

Treat `0` as success, `1` as an operational failure, `2` as invalid local input, `130` as SIGINT, and `143` as SIGTERM. Both signals abort the active SDK request. Do not automatically retry: the platform may have completed a Tool side effect before the process observed failure or cancellation.

## Verify the job [#verify-the-job]

Capture the process status before parsing output, require status `0`, and validate only the field your next step consumes. Do not print the full environment or API key, and avoid dumping entire result documents when they can contain application data.

## Production notes [#production-notes]

- Keep stateless execution as the default; use `--session` only when the job intentionally appends to known server-owned history.
- Set `--user-id` and `--metadata` only for the intended end-user Attribution; they do not change an existing Session's Attribution.
- Rotate the secret by deploying a replacement API key, verifying it, and then deleting the old key.
- `ba run` reports durable Tool approval but never decides it. BA Assist cannot recover an ordinary Agent Session; implement a human flow that [lists](/sdk/typescript/sessions#tool-approvals), [decides](/sdk/typescript/sessions#decide-tool-approval), and [joins](/sdk/typescript/sessions#join-tool-approval-continuation) the approval through the SDK or matching REST operations, or design unattended work to avoid manual approval.
- Keep logs bounded with buffered output and `--tool-output off`; Tool failures and approval notices remain visible on stderr.

## Related capabilities [#related-capabilities]

- [Security and credentials](/platform/security-and-credentials)
- [Tenancy and end-user Attribution](/platform/tenancy-and-attribution)
- [Structured output](/agents/output/structured-output)
- [Tool approvals](/agents/tools/tool-approvals)
- [Limits and reliability](/platform/limits-and-reliability)

## Reference [#reference]

- [`ba run`](/cli/run)
- [SDK `completion`](/sdk/typescript/client#completion)
- [SDK `object`](/sdk/typescript/client#object)
- [SDK `chat`](/sdk/typescript/client#chat)
- [SDK `toolApprovals`](/sdk/typescript/sessions#tool-approvals)
- [SDK `decideToolApproval`](/sdk/typescript/sessions#decide-tool-approval)
- [SDK `joinToolApprovalContinuation`](/sdk/typescript/sessions#join-tool-approval-continuation)
- [Python SDK `completion`](/sdk/python/client#completion)
- [Python SDK `object`](/sdk/python/client#object)
- [Python SDK `chat`](/sdk/python/client#chat)
- [Python SDK `tool_approvals`](/sdk/python/sessions#tool-approvals)
- [Python SDK `decide_tool_approval`](/sdk/python/sessions#decide-tool-approval)
- [Python SDK `join_tool_approval_continuation`](/sdk/python/sessions#join-tool-approval-continuation)
- [REST generate](/api-reference/rest-api/generation#generate)
- [REST resume Session Turn](/api-reference/rest-api/sessions#resume-session-turn)
- [REST list Tool approvals](/api-reference/rest-api/sessions#list-tool-approvals)
- [REST decide Tool approval](/api-reference/rest-api/sessions#decide-tool-approval)
- [REST join Tool-approval continuation](/api-reference/rest-api/sessions#join-tool-approval-continuation)
