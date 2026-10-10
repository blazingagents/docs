---
title: Agents
description: Create, configure, pause, and delete agents with the Python SDK.
---

# Agents

`client.agents` creates and configures your agents. You can pause an agent without losing its setup. Sessions and task runs save the configuration they start with.

Examples assume `client = BlazingAgents()` and reuse objects such as `provider` and `agent` from earlier examples. Every method also accepts `extra_headers` and `timeout`. On `AsyncBlazingAgents`, await the same method names.

```python
import os

from blazing_agents import BlazingAgents

client = BlazingAgents()
provider = client.providers.create(
    name="OpenRouter",
    provider_type="openrouter",
    api_key=os.environ["OPENROUTER_API_KEY"],
)
agent = client.agents.create(
    name="Release writer",
    provider_id=provider.id,
    model="openai/gpt-6-luna",
    instructions="Write concise release notes.",
)
print(agent.id, agent.name)
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create an agent | `Agent` |
| [`list()`](#list) | List agents | `AgentsPage` |
| [`get()`](#get) | Get the current configuration | `Agent` |
| [`update()`](#update) | Change configuration | `Agent` |
| [`delete()`](#delete) | Permanently delete an agent | `None` |
| [`disable()`](#disable) | Stop new turns | `Agent` |
| [`enable()`](#enable) | Allow new turns again | `Agent` |
| [`upload_avatar()`](#upload-avatar) | Set the avatar image | `Agent` |
| [`remove_avatar()`](#remove-avatar) | Remove the avatar | `Agent` |
| [`list_mcp_attachments()`](#list-mcp-attachments) | List MCP forwarding settings | `McpAttachments` |
| [`update_mcp_attachment()`](#update-mcp-attachment) | Change MCP forwarding settings | `McpAttachment` |
| [`get_spending_limit()`](#get-spending-limit) | Get the agent's model spending limit | `SpendingLimitResponse` |
| [`update_spending_limit()`](#update-spending-limit) | Set or turn off the agent's model spending limit | `SpendingLimitResponse` |

## Methods [#methods]

### `create()` [#create]

Creates an agent.

```python
agent = client.agents.create(
    name="Support agent",
    provider_id=provider.id,
    model="openai/gpt-6-luna",
    tools=["workspace", "memory"],
    user_id="customer_123",
    metadata={"team": "support"},
)
```

**Signature:** `create(*, name, model=..., provider_id=..., thinking_level=..., workspace_id=..., workspace_tier=..., tools=..., instructions=..., memory_injection_enabled=..., auto_compaction=..., compaction_reserve_tokens=..., approval_in_chat=..., approval_in_tasks=..., user_id=..., metadata=..., mcp_connection_ids=...) -> Agent`

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | `str` | required | Display name, 1 to 80 characters. Agents can share a name |
| `provider_id`, `model` | `str` | none | Provider and its native model ID. Pass both or neither |
| `thinking_level` | `str \| None` | `None` | Reasoning level; `None` uses the provider default. Needs a provider and model. See [`get_thinking_levels()`](/sdk/python/providers#get-thinking-levels) |
| `workspace_tier` | `Literal["core", "plus"]` | `"core"` | Tier for a new workspace; cannot combine with `workspace_id` |
| `workspace_id` | `str` | new workspace | Existing workspace to share. When omitted, a new workspace is created with the agent's name and `user_id` |
| `tools` | `list[AgentTool]` | `[]` | Built-in tool groups: `"workspace"`, `"write_todos"`, `"memory"` |
| `instructions` | `str` | `""` | System instructions, up to 3,000 characters |
| `memory_injection_enabled` | `bool` | `False` | Add the agent's memories to each turn's context automatically |
| `auto_compaction` | `bool` | `True` | Summarize older context when it nears the model's context window |
| `compaction_reserve_tokens` | `int` | `16384` | Tokens to keep free below the model's context window |
| `approval_in_chat` | `ApprovalPolicyInput` | `{"default": "full"}` | Tool approval policy for chat and stateless calls |
| `approval_in_tasks` | `ApprovalPolicyInput` | `{"default": "full"}` | Tool approval policy for task runs |
| `user_id` | `str` | `""` | End user this agent belongs to; `""` means tenant level. Fixed after creation |
| `metadata` | `dict[str, object]` | `{}` | Your own data |
| `mcp_connection_ids` | `list[str]` | `[]` | Up to 10 unique MCP connection IDs |

Without `provider_id` and `model`, the agent is saved unconfigured. Passing only one of them raises `ValueError` before any request. `workspace_tier` chooses Core or Plus for a new workspace and defaults to `core`. It cannot combine with `workspace_id`. A workspace created for the agent stays independent afterwards: renaming the agent does not rename it.

An approval policy is a dictionary with a required `default` decision and an optional list of per-tool `overrides`. Decisions are `"full"`, `"deny"`, `"manual"`, or `"auto"`. See [tool approvals](/agents/tools/tool-approvals) for what each decision does.

Returns [`Agent`](#agent). Raises `APIStatusError` with [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`provider_not_found`](/api-reference/protocols/errors#provider_not_found), [`model_not_found`](/api-reference/protocols/errors#model_not_found), [`model_validation_unavailable`](/api-reference/protocols/errors#model_validation_unavailable), [`agent_mcp_connection_not_found`](/api-reference/protocols/errors#agent_mcp_connection_not_found), or [`agent_mcp_connections_invalid`](/api-reference/protocols/errors#agent_mcp_connections_invalid).

### `list()` [#list]

Lists your agents, most recently updated first.

```python
page = client.agents.list(user_id="", limit=50)
for agent in page.data:
    print(agent.id, agent.name)
if page.next_cursor is not None:
    next_page = client.agents.list(user_id="", cursor=page.next_cursor, limit=50)
```

**Signature:** `list(*, user_id=..., workspace_id=..., cursor=..., limit=...) -> AgentsPage`

| Parameter | Type | Description |
| --- | --- | --- |
| `user_id` | `str` | Only agents for this end user; `""` returns tenant-level agents |
| `workspace_id` | `str` | Only agents attached to this workspace |
| `cursor` | `str` | `next_cursor` from the previous page |
| `limit` | `int` | Page size, 1 to 100; defaults to 50 |

Returns `AgentsPage` with `data: list[Agent]` and `next_cursor: str | None`. Keep the same filters when paging. Raises `validation_failed` or `invalid_cursor`.

### `get()` [#get]

Gets an agent's current configuration.

```python
agent = client.agents.get(agent.id)
```

**Signature:** `get(agent_id: str) -> Agent`

Returns [`Agent`](#agent). Raises `validation_failed` for a malformed ID or [`not_found`](/api-reference/protocols/errors#not_found).

### `update()` [#update]

Changes an agent's current configuration.

```python
agent = client.agents.update(
    agent.id,
    instructions="Write concise release notes and include migration steps.",
)
```

**Signature:** `update(agent_id: str, *, name=..., model=..., provider_id=..., thinking_level=..., workspace_id=..., tools=..., instructions=..., memory_injection_enabled=..., auto_compaction=..., compaction_reserve_tokens=..., approval_in_chat=..., approval_in_tasks=..., metadata=..., mcp_connection_ids=...) -> Agent`

Accepts every [`create()`](#create) parameter except `user_id`, which never changes. Omitted parameters keep their current value. Supplied values replace the old ones completely: `tools`, `mcp_connection_ids`, `metadata`, and each approval policy are full replacements, not patches.

- To change the model on the current provider, pass `model` alone. To switch providers, pass `provider_id` and `model` together; `provider_id` alone raises `ValueError`.
- To unconfigure the agent, pass `provider_id=None` and `model=None`. Clearing only one raises `ValueError`.
- `thinking_level=None` resets to the provider default.
- `workspace_id` moves the agent to another workspace. It cannot be cleared.

Calling `update()` with no parameters raises `ValueError` before any request. Returns [`Agent`](#agent). Raises `validation_failed`, `not_found`, `provider_not_found`, `model_not_found`, `agent_mcp_connection_not_found`, or `agent_mcp_connections_invalid`.

### `delete()` [#delete]

Permanently deletes an agent with its sessions, tasks, and memories. Its workspace, providers, and MCP connections are kept.

```python
client.agents.delete(agent.id, include_artifacts=False)
```

**Signature:** `delete(agent_id: str, *, include_artifacts: bool) -> None`

`include_artifacts` is required: `True` also deletes the agent's published artifacts, and `False` keeps them. Raises `validation_failed` or `not_found`.

### `disable()` [#disable]

Stops an agent from starting new turns. Turns already running finish normally.

```python
agent = client.agents.disable(agent.id)
```

**Signature:** `disable(agent_id: str) -> Agent`

Returns [`Agent`](#agent) with `status == "disabled"`. Calling it again is harmless. A disabled agent stays readable and editable, and new turns fail with [`agent_disabled`](/api-reference/protocols/errors#agent_disabled). Raises `not_found`.

### `enable()` [#enable]

Lets a disabled agent start turns again.

```python
agent = client.agents.enable(agent.id)
```

**Signature:** `enable(agent_id: str) -> Agent`

Returns [`Agent`](#agent) with `status == "active"`. Calling it again is harmless. Scheduled task runs skipped while the agent was disabled do not run afterwards. Raises `not_found`.

### `upload_avatar()` [#upload-avatar]

Sets or replaces the agent's avatar.

```python
from pathlib import Path

agent = client.agents.upload_avatar(agent.id, Path("avatar.webp"))
```

**Signature:** `upload_avatar(agent_id: str, file: UploadFile, *, filename: str | None = None, content_type: str | None = None) -> Agent`

`file` is a PNG, JPEG, or WebP image of at most 512 KiB, given as bytes, a file path, or an open binary file. The SDK opens and closes paths itself and never closes a file object you pass. Bytes need `filename`; paths and named file objects supply their own. `content_type` overrides the type guessed from the filename.

Returns [`Agent`](#agent) whose `avatar_url` is a short-lived signed URL. A missing filename raises `ValueError`. Raises `validation_failed` for a missing, oversized, or unsupported file, or `not_found`.

### `remove_avatar()` [#remove-avatar]

Removes the avatar. Calling it again is harmless.

```python
agent = client.agents.remove_avatar(agent.id)
```

**Signature:** `remove_avatar(agent_id: str) -> Agent`

Returns [`Agent`](#agent) with `avatar_url is None`. Raises `validation_failed` or `not_found`.

### `list_mcp_attachments()` [#list-mcp-attachments]

Lists how the agent forwards end-user details to each of its MCP connections.

```python
attachments = client.agents.list_mcp_attachments(agent.id).mcp_attachments
```

**Signature:** `list_mcp_attachments(agent_id: str) -> McpAttachments`

Returns `McpAttachments`, whose `mcp_attachments` field is `list[McpAttachment]`, one per connection in the agent's `mcp_connection_ids`. Raises `validation_failed` or `not_found`.

### `update_mcp_attachment()` [#update-mcp-attachment]

Chooses whether the agent sends the end user's ID and selected metadata keys to one MCP connection.

```python
attachment = client.agents.update_mcp_attachment(
    agent.id,
    "mcp_0123456789abcdef",
    forward_user_id=True,
    forwarded_metadata_keys=["locale"],
)
```

**Signature:** `update_mcp_attachment(agent_id: str, mcp_connection_id: str, *, forward_user_id=..., forwarded_metadata_keys=...) -> McpAttachment`

| Parameter | Type | Description |
| --- | --- | --- |
| `forward_user_id` | `bool` | Send the turn's `user_id` to the MCP server |
| `forwarded_metadata_keys` | `Sequence[str]` | Up to 32 unique turn metadata keys to send |

Pass at least one; omitting both raises `ValueError`. Returns [`McpAttachment`](#mcpattachment). Raises `validation_failed` or `not_found`.

### `get_spending_limit()` [#get-spending-limit]

Gets one agent's model spending limit and the current period.

```python
budget = client.agents.get_spending_limit("ag_0123456789abcdef")
```

**Signature:** `get_spending_limit(agent_id: str) -> SpendingLimitResponse`

Returns the same [`SpendingLimitResponse`](/sdk/python/tenant#get-spending-limit) as the tenant method.

### `update_spending_limit()` [#update-spending-limit]

Sets one agent's dollar allowance for model tokens across all its sessions and tasks, or turns it off with `spending_limit=None`. The account limit, if you set one, still applies too.

```python
client.agents.update_spending_limit(
    "ag_0123456789abcdef",
    spending_limit={
        "amount_usd": 5,
        "reset_start_date": "2026-10-01",
        "reset_interval": "weekly",
    },
)
```

**Signature:** `update_spending_limit(agent_id: str, *, spending_limit: SpendingLimitInput | None) -> SpendingLimitResponse`

See [model spending limits](/platform/usage-and-quotas#model-spending-limits).

## Response models [#response-models]

### `Agent` [#agent]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `str` | Agent ID (`ag_...`) |
| `tenant_id` | `str` | Your tenant ID |
| `name` | `str` | Name |
| `provider_id` | `str \| None` | Provider, or `None` when unconfigured |
| `model` | `str \| None` | Model ID, or `None` when unconfigured |
| `thinking_level` | `str \| None` | Reasoning level, or `None` for the provider default |
| `workspace_id` | `str` | Attached workspace |
| `tools` | `list[str]` | Built-in tool groups |
| `instructions` | `str` | System instructions |
| `memory_injection_enabled` | `bool` | Whether memories are added automatically |
| `auto_compaction` | `bool` | Whether older context is summarized automatically |
| `compaction_reserve_tokens` | `int` | Tokens kept free below the context window |
| `approval_in_chat`, `approval_in_tasks` | `ApprovalPolicy` | Tool approval policies, with `default` and `overrides` |
| `user_id` | `str` | End user, or `""` for tenant level |
| `metadata` | `dict[str, object]` | Your own data |
| `mcp_connection_ids` | `list[str]` | Selected MCP connections |
| `avatar_url` | `AnyUrl \| None` | Short-lived avatar URL |
| `status` | `str` | `"active"` or `"disabled"` |
| `created_at`, `updated_at` | `datetime` | Timestamps |

### `McpAttachment` [#mcpattachment]

| Field | Type | Description |
| --- | --- | --- |
| `mcp_connection_id` | `str` | MCP connection |
| `forward_user_id` | `bool` | Whether the turn's `user_id` is sent |
| `forwarded_metadata_keys` | `list[str]` | Metadata keys that are sent |
| `created_at`, `updated_at` | `datetime` | Timestamps |

## Next [#next]

- [Agents guide](/agents/agents)
- [Configuration snapshots and lifecycle](/agents/configuration-snapshots)
- [Providers](/sdk/python/providers)
