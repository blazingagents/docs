---
title: ba chat
description: Hold a conversation with one of your agents in the terminal, and pick it up again later.
---

# ba chat

Talk to one of your agents in the terminal while you work on its instructions, tools, or skills. Every conversation is saved as a session, so you can come back to it later from the CLI, the SDK, or the dashboard.

## Start a chat [#start-a-chat]

Complete [CLI setup and authentication](/cli/setup-and-authentication) first. Then pass the agent's name or ID (see [choosing an agent](/cli#operational-boundaries)):

```bash
ba chat "Quickstart agent"
```

A chat window opens. Type a message and press Enter; the answer streams in, with Markdown, reasoning, and any tool calls the agent makes. The session starts with your first message.

When you exit, the CLI prints what you need to come back:

```text
Agent:   Quickstart agent (ag_...)
Session: ss_...
Usage:   812 input + 64 output tokens
Resume:  ba chat ag_... --session ss_...
```

The token counts cover what this chat window sent and received.

## Resume a session [#resume-a-session]

Run the printed `Resume` command to continue the same conversation. The agent sees the whole history; the chat window itself starts empty.

```bash
ba chat ag_0123456789abcdef --session ss_0123456789abcdef
```

The session must belong to that agent. If it does not exist or belongs to another agent, the command fails and starts nothing new.

## When a turn fails [#read-the-terminal-output]

An error appears in the chat window and your message stays in the input, so you can edit it and send it again. A failed turn adds nothing to the saved conversation. If it was the first message, the session still exists and the next send uses it.

## Cancel or exit [#cancel-or-exit]

Press Esc or Ctrl+C while an answer is streaming to stop it. Press either again when nothing is running to exit. Stopping cannot undo a tool call that already finished.

`ba chat` needs an interactive terminal. For pipes, scripts, and CI, use [`ba run`](/cli/run). To talk to the built-in assistant that manages your tenant, use [`ba assist`](/cli/assist).

## Next [#next]

- [`ba run`](/cli/run) to run one turn from a script.
- [Sessions and turns](/platform/sessions-and-turns) to read the same conversation from your app.
