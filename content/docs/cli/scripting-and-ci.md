---
title: Scripting and CI
description: Run an agent from a CI job or script and use its answer in the next step.
---

# Scripting and CI

Run an agent as one step of a pipeline: summarize a release, review a diff, or draft a changelog, then hand the answer to the next step. `ba run` reads the prompt, prints only the answer on stdout, and reports success or failure through its exit status.

## Before you begin [#before-you-begin]

You need an agent with a provider and model, an API key stored in your CI system's secrets, and Node.js 24 or later on the runner. Read [`ba run`](/cli/run) for every flag.

## Configure the job [#configure-the-job]

This GitHub Actions job asks an agent for a release summary and prints it:

```yaml title=".github/workflows/release-summary.yml"
jobs:
  summarize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - name: Summarize the release
        env:
          BLAZING_AGENTS_API_KEY: ${{ secrets.BLAZING_AGENTS_API_KEY }}
        run: |
          npm install --global @blazingagents/cli@0.1.0
          ba run ag_0123456789abcdef \
            --prompt "Summarize the release status" \
            --json > result.json
          jq -r '.output' result.json
```

The step prints the summary and passes. If the turn fails, `ba run` exits with a non-zero status and the step fails before `jq` runs.

The key comes from `BLAZING_AGENTS_API_KEY` and is never saved or printed. GitHub Actions sets `CI`, so a missing key fails right away instead of waiting for a sign-in prompt. Never run `ba --login` in a pipeline. To use a different API address, also set `BLAZING_AGENTS_BASE_URL`.

## Send input [#send-input]

Use `--prompt` for a short, fixed prompt. For generated text or a file, pipe it in so you do not have to quote it for the shell:

```bash
git log --oneline v1.2.2..HEAD | ba run "Release agent" --json > result.json
```

To reuse a [stored prompt](/agents/prompts) with variables, use `--prompt-id` and `--var`. See [choosing one input](/cli/run#choose-one-input).

## Keep output machine-readable [#keep-output-machine-readable]

With `--json` or `--schema <file>`, stdout holds exactly one JSON document, and only when the turn succeeds. Errors, tool summaries, and approval notices go to stderr, so they never end up in `result.json`. Use `--schema` when the next step needs fields rather than prose; the CLI checks the answer against your schema before printing it.

Avoid plain text mode when a later step needs all or nothing. If a plain run fails halfway, stdout may already hold part of the answer.

## Handle exit statuses and cancellation [#handle-exit-statuses-and-cancellation]

`0` means success, `1` means the turn failed, and `2` means the command line or input was wrong. `130` and `143` mean the job was interrupted or terminated, which also cancels the turn. See the [full list](/cli/run#exit-statuses-and-signals).

Do not retry a failed run automatically. A tool may already have done its work before the failure, and a retry would do it again.

## Production notes [#production-notes]

- **Keep runs stateless.** Each run stands alone by default. Use `--session` only when a job should add to a known conversation.
- **Plan for approvals.** A pipeline has nobody to approve a tool call. In a stateless run the call is blocked; in a session run `ba run` exits with `1`. Set the agent's [approval policy](/agents/tools/tool-approvals) so the tools a job needs are allowed.
- **Label usage.** Pass `--user-id` so the job's usage shows up separately when you [group usage by user](/platform/usage-and-quotas).
- **Rotate the key.** Create a new API key, update the CI secret, confirm a run passes, then delete the old key.
- **Keep logs small.** Print only the fields the next step needs, not the whole result, which can contain your application's data.

## Next [#next]

- [`ba run`](/cli/run) for every flag and output mode.
- [Structured output](/agents/output/structured-output) to design a schema for `--schema`.
- [Security and credentials](/platform/security-and-credentials) for storing and rotating API keys.
