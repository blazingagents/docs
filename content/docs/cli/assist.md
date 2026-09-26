---
title: ba assist
description: Manage agents, prompts, tasks, and more by asking a built-in assistant in plain language.
---

# ba assist

Manage your tenant by asking for what you want. `ba assist` opens a chat with a built-in assistant that can create and change agents, prompts, tasks, workspaces, and skills, run tasks, and answer questions about usage. Anything that changes or deletes something that already exists waits for your yes.

## Before you begin [#before-you-begin]

Complete [CLI setup and authentication](/cli/setup-and-authentication) and use an interactive terminal.

The assistant needs a model. In the dashboard, open **Agents**, find your [admin agent](/agents/agents#the-admin-agent), marked **Powers BA Assist for this tenant**, and choose a provider and model for it. Until you do, `ba assist` stops and tells you what to set.

## Start or resume [#start-or-resume]

```bash
ba assist
```

Ask in plain language, for example "List my agents and their models" or "Create a task that summarizes yesterday's support sessions every morning". When you exit, the CLI prints the session ID and the command to come back:

```text
Session: ss_...
Resume:  ba assist --session ss_...
```

`ba assist --session` opens only the assistant's own sessions. To continue a conversation with one of your agents, use [`ba chat`](/cli/chat).

## What it can do [#supported-administration]

| Area | What you can ask for |
| --- | --- |
| Tenant settings | Read and update |
| Agents | List, read, create, update, and delete |
| Providers | List, read, and list available models |
| Workspaces | List, read, create, update, and delete |
| Skills | List, read, create, upload, copy, and delete skills, and read, write, or delete their files |
| Prompts | List, read, create, update, and delete |
| Tasks | List, read, create, update, delete, and run |
| Task runs | List, read, read messages, and cancel |
| Usage | Totals and breakdowns |
| Sessions | List, read messages, and delete |
| Artifacts | List |

It cannot manage API keys, add providers or change provider keys, change avatars, or read or delete artifact contents. Its tools never return keys or other credentials. It also cannot change itself or delete the session you are talking to it in.

## Set an agent's thinking level [#thinking-level]

Ask for it by name: "Set Release agent's thinking level to high" or "Clear Release agent's thinking level". Like any other update, it waits for your approval. `ba chat` and `ba run` then use the saved level. See [thinking level](/agents/providers-and-models#thinking-level) for what each level does.

## Approve changes [#approval-policy]

Reading, creating, listing models, running a task, and cancelling a task run happen right away. Updating or deleting something that exists, changing tenant settings, and writing or deleting skill files wait for you.

When the assistant wants to make one of those changes, the chat shows the tool it wants to call and the exact input. Answer yes to run that exact call, or no to block it. Either way, the assistant carries on and tells you what happened.

## Recover pending approvals [#recover-pending-approvals]

If you leave while a change is waiting, it stays waiting. Resume the session and the CLI shows each pending change before the chat opens:

```text
Pending Tool approval
Tool: agents
Input:
{
  "action": "updateById",
  "agentId": "ag_...",
  "changes": {
    "name": "Release agent"
  }
}
Approve? y/n
```

After you answer every one, the CLI shows the rest of the work as it finishes, then opens the chat. Answering the same approval twice never runs the change twice.

## Interrupt safely [#interrupt-safely]

- **At an approval prompt**, Ctrl+C or Ctrl+D leaves the change waiting and prints the resume command.
- **After you answer**, Ctrl+C stops showing progress, but the work keeps going. Resume to see the result.
- **While the assistant is answering**, Esc or Ctrl+C stops the answer. A change that already finished stays done.

## Next [#next]

- [Tool approvals](/agents/tools/tool-approvals) to require approvals for your own agents.
- [Tasks](/automation/tasks) to see what the assistant creates when you ask for background work.
