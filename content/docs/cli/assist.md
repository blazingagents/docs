---
title: ba assist and Admin Agent
description: Administer Tenant resources through the platform-managed Admin Agent and durable Tool approval.
---

# ba assist and Admin Agent

`ba assist [--session <id>]` opens an administrative conversation with the Tenant's single platform-managed Admin Agent. Unlike ordinary `ba chat`, BA Assist exposes a fixed catalog of hosted resource Tools and recovers durable approval state.

## Before you begin [#before-you-begin]

Complete [CLI setup and authentication](/cli/setup-and-authentication); stdin and stdout must both be TTYs. Before generation, the Admin Agent must have a Tenant-selected Provider and model. If it is unconfigured, `ba assist` stops and directs you to add a Provider in the dashboard and select its model on the Admin Agent. An API key grants Tenant-wide backend access, so follow the [security and credentials](/platform/security-and-credentials) and [Tenant isolation](/platform/tenancy-and-attribution) boundaries.

## Start or resume [#start-or-resume]

```bash
ba assist
ba assist --session ss_0123456789abcdef
```

The CLI requires exactly one visible Admin Agent and never falls back to a tenant-created Agent. Without `--session`, an admitted first Turn materializes a new Admin Agent Session before model execution. With `--session`, it verifies that the Session belongs to that Admin Agent. On exit from materialized work, it prints the Session ID and exact `ba assist --session <id>` resume command.

## Supported administration [#supported-administration]

The Admin Agent can perform these implemented operations:

| Resource | Supported operations |
| --- | --- |
| Tenant settings | Read and update |
| Agents | List, read, create, update, and delete |
| Providers | List, read, and discover models for an already-stored Provider |
| Prompts | List, read, create, update, and delete |
| Tasks | List, read, create, update, delete, and run |
| Task runs | List, read, read messages, and cancel |
| Usage | Query totals and grouped buckets |
| Sessions | List, read messages, and delete |
| Artifacts | List safe metadata |

Tools execute on the platform under trusted Tenant, Admin Agent, and active Session scope. Lists are bounded, targeted mutations use platform IDs, and returned values omit credentials, internal object keys, signed URLs, and other internal-only fields. API-key management, Provider credential mutation, Skill mutation, avatar mutation, and Artifact content or deletion are unavailable.

## Approval policy [#approval-policy]

Reads, creation, Provider model discovery, Task runs, and Task-run cancellation proceed without approval. Tenant updates and supported resource updates or deletes pause for explicit approval. The active BA Assist Session and the Admin Agent cannot delete or mutate themselves even after approval.

The prompt shows the trusted Tool name and validated JSON input. Answer yes to approve that exact call or no to deny it; denial executes no Tool and still allows the Agent to respond.

```text
Expected: Tenant settings loaded.
Tool: tenant {"action":"get"}
Expected proposal: update an Agent name
Tool: agents {"action":"updateById","agentId":"ag_AAAAAAAAAAAAAAAA","changes":{"name":"Release Agent"}}
Approve? y/n
n
Expected: Denied; no update was executed.
```

## Recover pending approvals [#recover-pending-approvals]

Resuming a Session first verifies it, loads durable approvals, and shows pending Tool names and inputs one at a time in stored order. Each decision persists before the next. After all decisions exist, BA Assist rejoins the single durable continuation and renders its progress before opening a clean TUI.

A repeated matching decision rereads trusted state and rejoins the same continuation rather than executing twice. Resume again with the printed command if the continuation has not settled.

## Interrupt safely [#interrupt-safely]

Ctrl+C or Ctrl+D before a recovery decision leaves the approval pending and prints a resume receipt. After a decision admits the continuation, interruption detaches the local reader without canceling the durable platform work; resume to rejoin it. During an ordinary active TUI Turn, Esc or Ctrl+C aborts the client request, but cannot undo a Tool side effect already completed.

## Related capabilities [#related-capabilities]

- [Tool approvals](/agents/tools/tool-approvals)
- [Tasks and schedules](/automation/tasks)
- [Models and Providers](/agents/providers-and-models)
- [Agents](/agents/agents)
- [Sessions and Turns](/platform/sessions-and-turns)
- [Security and credentials](/platform/security-and-credentials)
- [`ba run`](/cli/run)

## Reference [#reference]

- [SDK `toolApprovals`](/sdk/typescript/sessions#tool-approvals)
- [SDK `decideToolApproval`](/sdk/typescript/sessions#decide-tool-approval)
- [SDK `joinToolApprovalContinuation`](/sdk/typescript/sessions#join-tool-approval-continuation)
- [Python SDK `tool_approvals`](/sdk/python/sessions#tool-approvals)
- [Python SDK `decide_tool_approval`](/sdk/python/sessions#decide-tool-approval)
- [Python SDK `join_tool_approval_continuation`](/sdk/python/sessions#join-tool-approval-continuation)
- [List Tool approvals](/api-reference/rest-api/sessions#list-tool-approvals)
- [Decide a Tool approval](/api-reference/rest-api/sessions#decide-tool-approval)
- [Join a Tool-approval continuation](/api-reference/rest-api/sessions#join-tool-approval-continuation)
