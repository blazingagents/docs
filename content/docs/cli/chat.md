---
title: ba chat
description: Start or resume an interactive terminal conversation with an ordinary Agent.
---

# ba chat

`ba chat <agent> [--session <id>]` opens an interactive TUI for an ordinary hosted Agent. Use `ba run` instead for pipes, scripts, and CI.

## Before you begin [#before-you-begin]

Complete [CLI setup and authentication](/cli/setup-and-authentication). Both stdin and stdout must be TTYs.

Select the Agent by exact ID or full name. Exact-case full names win; one case-insensitive full-name match is also accepted. Partial and fuzzy names do not match, and multiple case-insensitive matches fail with the exact candidate names and IDs. The Admin Agent is available only through `ba assist`.

## Start a chat [#start-a-chat]

Without `--session`, the CLI opens an empty local TUI. The platform mints and materializes a Session after the first message is admitted, before model execution. A failed Turn can therefore leave a user-only Session, while cancellation can leave it empty.

```bash
ba chat 'Release Agent'
ba chat ag_0123456789abcdef --session ss_0123456789abcdef
```

Output streams in the TUI. On exit from an admitted chat, the CLI prints the Agent, Session ID, cumulative input/output token counts observed by that process, and an exact ID-based resume command.

## Resume a Session [#resume-a-session]

Pass `--session` only for an existing Session owned by the selected Agent. The CLI verifies ownership before opening the TUI; a missing or foreign Session fails without creating another Session.

The platform owns canonical Session history. The TUI keeps a local view for rendering and sends only the newest user message for each Turn. The exit receipt remains the reliable command for returning to the same server-owned history.

## Read the terminal output [#read-the-terminal-output]

The TUI renders Markdown, reasoning, hosted Tool activity, stream errors, and output-token statistics. These are a local rendering of AI SDK UI-message chunks; the stored Session transcript remains canonical.

A safe in-stream failure appears in the TUI and leaves the input available for retry. Once the first Turn is admitted, retries resume the Session ID returned by the platform.

## Cancel or exit [#cancel-or-exit]

Press Esc or Ctrl+C during an active Turn to abort its SDK request. When the TUI is idle, either exits successfully. Cancellation stops further client participation, but cannot undo a Tool side effect that completed before the abort reached the platform.

## Related capabilities [#related-capabilities]

- [Agents](/agents/agents)
- [Sessions and Turns](/platform/sessions-and-turns)
- [Generation and streaming](/agents/output/generation-and-streaming)
- [Tools](/agents/tools/built-in-tools)
- [Usage and quotas](/platform/usage-and-quotas)

## Reference [#reference]

- [SDK `chat`](/sdk/typescript/client#chat)
- [SDK `sessions.messages`](/sdk/typescript/sessions#messages)
- [Python SDK `chat`](/sdk/python/client#chat)
- [Python SDK `sessions.messages`](/sdk/python/sessions#messages)
- [Create a Session Turn](/api-reference/rest-api/sessions#create-session-turn)
- [Resume a Session Turn](/api-reference/rest-api/sessions#resume-session-turn)
- [List Session messages](/api-reference/rest-api/sessions#list-session-messages)
