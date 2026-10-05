---
title: ba run
description: Run one agent turn from a script or pipe and get the answer on stdout.
---

# ba run

Send one prompt to an agent and get the answer on stdout, with no chat window and no questions asked. Use it in shell scripts, pipes, and CI jobs. Complete [CLI setup and authentication](/cli/setup-and-authentication) first.

```bash
ba run "Quickstart agent" --prompt "Say hello in one short sentence."
```

The answer streams to stdout as plain text, with nothing added. The command exits with `0` when the turn succeeds.

## Choose one input [#choose-one-input]

Give the prompt in exactly one of three ways:

- `--prompt <text>` for a short literal prompt.
- Standard input, from a pipe or a file: `git diff | ba run "Reviewer"` or `ba run "Reviewer" < notes.md`.
- `--prompt-id <id>` for a [stored prompt](/agents/prompts), with one `--var key=value` for each of its variables.

```bash
ba run "Release agent" \
  --prompt-id prompt_0123456789abcdef \
  --var version=1.2.3 --var environment=production
```

An empty prompt, more than one input, `--var` without `--prompt-id`, or a missing, unknown, or repeated variable fails before anything runs.

## Run stateless or resume a session [#run-stateless-or-resume-a-session]

By default each run stands alone: the agent sees no earlier conversation, and no session is saved. Pass `--session <id>` to add the turn to an existing conversation instead, for example one you started with [`ba chat`](/cli/chat). The session must belong to the agent, or the command fails.

`--user-id` and `--metadata '{"key":"value"}'` label the turn and its usage for [reporting per end user](/platform/tenancy-and-attribution). On an existing session they label this turn only; the session keeps the labels it started with.

## Choose an output mode [#choose-an-output-mode]

| Flag | stdout gets |
| --- | --- |
| none | The answer as plain text, streamed as it arrives |
| `--json` | One JSON document after the turn succeeds |
| `--schema <file>` | One JSON document whose `output` matches your JSON Schema |

```bash
ba run "Release agent" --prompt "Give the status" --json | jq -r '.output'
```

The JSON document looks like `{"agent":{"id":"ag_...","name":"Release agent"},"output":"..."}`, plus `sessionId` when you passed `--session`. With `--schema`, `output` is an object that the CLI checks against your schema before printing. `--schema` cannot be combined with `--session`.

If a JSON run fails or is interrupted, stdout stays empty. Plain text mode may already have printed part of the answer.

In a session run, each tool call prints a one-line summary to stderr, with secret-looking fields redacted. Add `--tool-output off` to hide the summaries of successful calls; failures, denials, and warnings still print.

## Handle tool approval [#handle-tool-approval]

If the agent's [approval policy](/agents/tools/tool-approvals) asks a person to approve a tool call during a session run, `ba run` prints the pending approval and its session ID to stderr and exits with `1`. It never approves or denies on anyone's behalf.

Stateless runs never pause: a tool call that needs a person is blocked, and the agent carries on without it.

To finish a paused session turn, have your app [list the pending approvals](/sdk/typescript/sessions#tool-approvals) and send the round's decisions with [`continueChat()`](/sdk/typescript/client#continue-chat). `ba assist` works only with its own sessions, so it cannot decide approvals for your other agents.

## Exit statuses and signals [#exit-statuses-and-signals]

| Status | Meaning |
| ---: | --- |
| `0` | The turn succeeded |
| `1` | The turn failed: sign-in, agent lookup, API, model, tool, or pending approval |
| `2` | The command line or local input was invalid |
| `130` | Interrupted with Ctrl+C (SIGINT) |
| `143` | Terminated (SIGTERM) |

Both signals cancel the turn. `ba run` never retries on its own, because a tool may already have done its work before the failure or cancellation.

## Next [#next]

- [Scripting and CI](/cli/scripting-and-ci) for a complete pipeline job.
- [Structured output](/agents/output/structured-output) to design the schema for `--schema`.
