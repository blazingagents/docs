---
title: Agents
description: Create, configure, version, disable, and extend Agents with the Python SDK.
---

# Agents

`client.agents` manages Tenant-owned Agent configuration, lifecycle, immutable
Versions, avatars, and MCP Attachments. All request fields are keyword-only
and use snake case. The asynchronous client exposes the same operation names;
await each request method and use `async for` only for lazy Version iteration.

## Overview [#overview]

Creating or ordinarily updating an Agent creates an immutable Version. Disable,
enable, avatar, and MCP Attachment changes do not. Array fields are complete
selections, not patches. `user_id` is immutable End-user Attribution.

Omitting an update argument leaves the field unchanged. `provider_id` and
`model` form one optional pair: both are `None` on an unconfigured Agent or both
are present. `workspace_id` accepts a Workspace
ID but not `None`: every Agent always has one attached Workspace. On create,
omitting it atomically creates and attaches a normal default Workspace; an
explicit ID shares an existing same-Tenant Workspace. The implicit Workspace
starts with the Agent's name and Attribution, then remains independent; Agent
updates do not synchronize it. The product row has no
Container or compute cost until the first actual Workspace operation.

Every request method also accepts `extra_headers: Mapping[str, str] | None`
and the exported `Timeout` type (`float | httpx.Timeout | None`). See [Client](/sdk/python/client)
for request correlation, transport errors, and response observation.

## Thinking level [#thinking-level]

Create and update accept `thinking_level` as a nonempty string or null
(`None` in Python). Creation defaults to Provider default; omission on update
preserves the saved selection, and null clears it. Agent and AgentVersion
responses include the field, and restoration copies it through normal
validation. Known invalid combinations fail without changing configuration
or Version history. Unknown capabilities allow custom strings, which can
still fail during Provider execution. See [Thinking level](/agents/providers-and-models#thinking-level).

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`create()`](#create) | Create an Agent and Version 1 | `Agent` |
| [`list()`](#list) | List and filter Agents | `Agents` |
| [`get()`](#get) | Retrieve current configuration | `Agent` |
| [`update()`](#update) | Update configuration and create a Version | `Agent` |
| [`delete()`](#delete) | Permanently delete an Agent | `None` |
| [`disable()`](#disable) | Reject future Turns | `Agent` |
| [`enable()`](#enable) | Allow future Turns | `Agent` |
| [`upload_avatar()`](#upload-avatar) | Upload or replace the private avatar | `Agent` |
| [`remove_avatar()`](#remove-avatar) | Remove the avatar | `Agent` |
| [`list_versions()`](#list-versions) | Read one Version page | `AgentVersionsPage` |
| [`iter_versions()`](#iter-versions) | Lazily iterate Version pages | `Iterator[AgentVersion]` |
| [`get_version()`](#get-version) | Retrieve an immutable Version | `AgentVersion` |
| [`restore_version()`](#restore-version) | Copy an old Version into a new latest Version | `Agent` |
| [`list_mcp_attachments()`](#list-mcp-attachments) | List MCP Attachment settings | `McpAttachments` |
| [`update_mcp_attachment()`](#update-mcp-attachment) | Change End-user forwarding settings | `McpAttachment` |

## Methods [#methods]

### `create()` [#create]

**Signature:** `create(*, name: str, model: str | _Omitted = ..., provider_id: str | _Omitted = ..., workspace_id: str = ..., memory_injection_enabled: bool = ..., tools: list[AgentTool] = ..., instructions: str = ..., user_id: str = ..., metadata: dict[str, object] = ..., mcp_connection_ids: list[str] = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Agent`

Creates an Agent and Version 1. `name` is required. Omit both `provider_id` and
`model` to create an unconfigured Agent, or provide both to configure it. `workspace_id` accepts a string or
omission. `tools` and
`mcp_connection_ids` are complete selections.

```python
agent = client.agents.create(
    name="Release writer",
    instructions="Write concise release notes.",
    metadata={"team": "platform"},
)
```

Returns an [`Agent`](#agent). Server failures include `validation_failed`,
`agent_name_conflict`, `provider_not_found`,
`agent_mcp_connection_not_found`, and `agent_mcp_connections_invalid`. See
[`POST /v1/agents`](/api-reference/rest-api/agents#create-agent).

### `list()` [#list]

**Signature:** `list(*, user_id: str = ..., workspace_id: str = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Agents`

Lists current Agents by most recent update. The result is unpaginated.
`user_id=""` filters for tenant-level Attribution; `workspace_id` filters by
current Workspace attachment.

Returns `Agents`, whose `agents` field is `list[Agent]`. Server failures include
`validation_failed`. See [`GET /v1/agents`](/api-reference/rest-api/agents#list-agents).

### `get()` [#get]

**Signature:** `get(agent_id: str, *, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Agent`

Retrieves current Agent configuration without creating a Version. Server
failures include `validation_failed` and `not_found`. See
[`GET /v1/agents/:agentId`](/api-reference/rest-api/agents#get-agent).

### `update()` [#update]

**Signature:** `update(agent_id: str, *, name: str = ..., model: str | None = ..., provider_id: str | None = ..., thinking_level: str | None = ..., workspace_id: str = ..., memory_injection_enabled: bool = ..., tools: Sequence[AgentTool] = ..., instructions: str = ..., metadata: dict[str, object] = ..., mcp_connection_ids: Sequence[str] = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Agent`

Updates at least one mutable field and creates the next Version. Omitted fields
stay unchanged. Changing a Provider requires a model in the same call; explicit
`None` for both fields clears the pair. Supplied
arrays replace their selections. `user_id` cannot be updated. Supplying no
field raises `ValueError` before a request is sent.

For the Admin Agent, `update()` accepts only `provider_id`, `model`, and `thinking_level`. Each
accepted settled-pair change creates the next ordinary Version; all other
fields remain platform-managed.

```python
updated = client.agents.update(
    agent.id,
    instructions="Include migration steps.",
)
```

Returns an [`Agent`](#agent). Server failures include `validation_failed`,
`not_found`, `agent_name_conflict`, `provider_not_found`,
`agent_mcp_connection_not_found`, `agent_mcp_connections_invalid`, and
`admin_agent_managed`. See
[`PUT /v1/agents/:agentId`](/api-reference/rest-api/agents#update-agent).

### `delete()` [#delete]

**Signature:** `delete(agent_id: str, *, include_artifacts: bool, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> None`

Permanently deletes a Tenant-managed Agent and its owned history while
preserving its Workspace. Server failures include `validation_failed`,
`not_found`, and `admin_agent_managed`. See
[`DELETE /v1/agents/:agentId`](/api-reference/rest-api/agents#delete-agent).

### `disable()` [#disable]

**Signature:** `disable(agent_id: str, *, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Agent`

Idempotently disables an Agent. New Turns fail with `agent_disabled`; in-flight
Turns finish. Returns an `Agent` with `status == "disabled"`. Server failures
include `not_found` and `admin_agent_managed`. See
[`POST .../disable`](/api-reference/rest-api/agents#disable-agent).

### `enable()` [#enable]

**Signature:** `enable(agent_id: str, *, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Agent`

Idempotently enables an Agent. Skipped schedule fires are not replayed. Returns
an `Agent` with `status == "active"`. Server failures include `not_found` and
`admin_agent_managed`. See
[`POST .../enable`](/api-reference/rest-api/agents#enable-agent).

### `upload_avatar()` [#upload-avatar]

**Signature:** `upload_avatar(agent_id: str, file: UploadFile, *, filename: str | None = None, content_type: str | None = None, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Agent`

Uploads or replaces a private PNG, JPEG, or WebP avatar of at most 512 KiB
without creating a Version. `file` can be bytes, a filesystem path, or an open
caller-owned binary file. The SDK opens and closes paths itself, but never
closes a caller-owned file. Bytes require `filename`; paths derive it, and
file objects use their `.name` when available. `content_type` overrides MIME
inference.

```python
from pathlib import Path

agent = client.agents.upload_avatar(
    agent.id,
    Path("avatar.webp"),
    content_type="image/webp",
)
```

Returns an `Agent` whose `avatar_url` is a short-lived signed URL. Missing
filenames raise `ValueError`; server failures include `invalid_request`,
`validation_failed`, `not_found`, and `admin_agent_managed`. See
[`POST .../avatar`](/api-reference/rest-api/agents#upload-agent-avatar).

### `remove_avatar()` [#remove-avatar]

**Signature:** `remove_avatar(agent_id: str, *, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Agent`

Idempotently removes the avatar without creating a Version. Returns an `Agent`
with `avatar_url is None`. Server failures include `validation_failed`,
`not_found`, and `admin_agent_managed`. See
[`DELETE .../avatar`](/api-reference/rest-api/agents#delete-agent-avatar).

### `list_versions()` [#list-versions]

**Signature:** `list_versions(agent_id: str, *, cursor: str = ..., limit: int = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> AgentVersionsPage`

Returns one page of immutable Versions, newest first. `cursor` is opaque;
`limit` is 1 through 200 and defaults to 50. The returned page contains
`data: list[AgentVersion]` and `next_cursor: str | None`.

Server failures include `validation_failed`, `invalid_cursor`, and
`not_found`. See
[`GET .../versions`](/api-reference/rest-api/agents#list-agent-versions).

### `iter_versions()` [#iter-versions]

**Signature:** `iter_versions(agent_id: str, *, cursor: str = ..., limit: int = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Iterator[AgentVersion]`

Returns a lazy iterator. No request is made until iteration starts; later
pages are fetched only as needed, using the server's cursor.

```python
for version in client.agents.iter_versions(agent.id, limit=20):
    print(version.version)

# AsyncBlazingAgents uses the same name.
async for version in async_client.agents.iter_versions(agent.id, limit=20):
    print(version.version)
```

The async return is `AsyncIterator[AgentVersion]`; do not `await` the iterator
factory. Page requests can raise the same errors as [`list_versions()`](#list-versions).

### `get_version()` [#get-version]

**Signature:** `get_version(agent_id: str, version: int, *, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> AgentVersion`

Retrieves one immutable numbered Version. Server failures include
`validation_failed` and `not_found`. See
[`GET .../versions/:version`](/api-reference/rest-api/agents#get-agent-version).

### `restore_version()` [#restore-version]

**Signature:** `restore_version(agent_id: str, version: int, *, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Agent`

This SDK composition gets the immutable Version, then copies its versioned
fields through an ordinary update to create a new latest Version. It never
rewrites history. `user_id`, Workspace attachment, status, and avatar are not
restored because Versions do not contain them; Version metadata is restored.
The operation can raise
errors from both reads and updates, including reference errors when an old
Provider or MCP Connection is no longer available.

### `list_mcp_attachments()` [#list-mcp-attachments]

**Signature:** `list_mcp_attachments(agent_id: str, *, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> McpAttachments`

Lists forwarding settings for the MCP Connections currently selected by the
Agent. Returns `McpAttachments`, whose `mcp_attachments` field is
`list[McpAttachment]`. Server failures include `validation_failed` and
`not_found`. See
[`GET .../mcp-attachments`](/api-reference/rest-api/agents#list-agent-mcp-attachments).

### `update_mcp_attachment()` [#update-mcp-attachment]

**Signature:** `update_mcp_attachment(agent_id: str, mcp_connection_id: str, *, forward_user_id: bool = ..., forwarded_metadata_keys: Sequence[str] = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> McpAttachment`

Changes End-user forwarding settings without changing MCP access control or
creating a Version. At least one setting is required; omitting both raises
`ValueError`. `forwarded_metadata_keys` accepts a sequence of up to 32 unique
keys.

```python
attachment = client.agents.update_mcp_attachment(
    agent.id,
    "mcp_0123456789abcdef",
    forward_user_id=True,
    forwarded_metadata_keys=["locale"],
)
```

Returns [`McpAttachment`](#mcpattachment). Server failures include
`validation_failed` and `not_found`. See
[`PATCH .../mcp-attachments/:mcpConnectionId`](/api-reference/rest-api/agents#update-agent-mcp-attachment).

## Response models [#response-models]

Responses are Pydantic v2 models with snake-case fields. Documented fields are
validated, unknown server fields remain in `model_extra`, and `_request_id`
retains the server request ID without appearing in serialized output. An
invalid success body raises `pydantic.ValidationError`.

### `Agent` [#agent]

| Field | Type | Description |
| --- | --- | --- |
| `id` | `str` | Agent ID (`ag_...`) |
| `tenant_id` | `str` | Owning Tenant ID |
| `name` | `str` | Tenant-unique name |
| `model` | `str \| None` | Opaque model identifier, or `None` when unconfigured |
| `provider_id` | `str \| None` | Stored Provider, or `None` when unconfigured |
| `workspace_id` | `str` | Current Workspace attachment |
| `memory_injection_enabled` | `bool` | Whether Memory is injected automatically |
| `tools` | `list[str]` | Selected Tool groups |
| `instructions` | `str` | System instructions |
| `user_id` | `str` | Immutable End-user Attribution |
| `metadata` | `dict[str, object]` | Application metadata |
| `mcp_connection_ids` | `list[str]` | Selected MCP Connections |
| `avatar_url` | `AnyUrl \| None` | Short-lived signed avatar URL |
| `version` | `int` | Current positive Version |
| `status` | `str` | Current execution status |
| `created_at`, `updated_at` | `datetime` | Aware timestamps |

### `AgentVersion` [#agentversion]

`AgentVersion` contains `agent_id`, `tenant_id`, `version`, `name`, `model`,
`provider_id`, `memory_injection_enabled`, `tools`, `instructions`, `metadata`,
`mcp_connection_ids`, and `created_at`. It intentionally omits current
`workspace_id`, `user_id`, avatar, status, and update timestamp.

### `McpAttachment` [#mcpattachment]

| Field | Type | Description |
| --- | --- | --- |
| `mcp_connection_id` | `str` | Selected MCP Connection |
| `forward_user_id` | `bool` | Whether requests forward End-user Attribution |
| `forwarded_metadata_keys` | `list[str]` | Metadata-key allowlist |
| `created_at`, `updated_at` | `datetime` | Aware timestamps |

See the canonical [Agent and MCP schemas](/api-reference/protocols/objects-and-schemas).

## Errors [#errors]

HTTP failures raise `APIStatusError`; branch on its stable `code`, not the
message. Connection and timeout failures raise `APIConnectionError` and
`APITimeoutError`. Local argument errors described above are raised before the
request. A disabled Agent remains readable and configurable; generation later
fails with `agent_disabled`.

## Async use [#async-use]

Use `await async_client.agents.create(...)` and the same name for every other
request operation. There are no `acreate()` or other `a`-prefixed aliases.
Only lazy Version iteration changes syntax to `async for`, as shown under
[`iter_versions()`](#iter-versions).

## Related [#related]

- [Agents](/agents/agents)
- [Versions and lifecycle](/agents/versions-and-lifecycle)
- [MCP connections](/agents/tools/mcp-tools)
- [REST Agents](/api-reference/rest-api/agents)
