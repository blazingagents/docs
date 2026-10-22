---
title: Artifacts
description: List, inspect, download, and delete the files your agents publish, with the Python SDK.
---

# Artifacts

`client.artifacts` gives you the files your agents chose to publish, such as reports or exports. Each artifact is a fixed copy of the file at publish time. It keeps the IDs of the agent and session that published it, even after those are deleted.

Examples assume `client = BlazingAgents()`. Every method also accepts `extra_headers` and `timeout`. On `AsyncBlazingAgents`, await the same method names and use `async for` with `iter()`.

In a route that serves a signed-in end user, call these methods on [`client.for_user(verified_user_id)`](/sdk/python/client#for-user), which returns only that user's records. The tenant client sees every user's records and is for your backend's administration. An artifact ID from a browser is safe to use only on the scoped client, which answers `not_found` for another user's artifact.

```python
user = client.for_user(verified_user_id)
for artifact in user.artifacts.iter(agent_id="ag_0123456789abcdef"):
    download = user.artifacts.create_download_url(artifact_id=artifact.artifact_id)
    print(artifact.filename, download.url)
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`list()`](#list) | Get one page of artifacts | `ArtifactsPage` |
| [`iter()`](#iter) | Iterate every artifact | `Iterator[Artifact]` |
| [`get()`](#get) | Get one artifact's details | `Artifact` |
| [`create_download_url()`](#create-download-url) | Get a short-lived download link | `ArtifactDownloadUrl` |
| [`delete()`](#delete) | Delete an artifact | `None` |

## Methods [#methods]

### `list()` [#list]

Gets one [fixed-size page](/api-reference/protocols/service-limits#other-cursored-resource-pages) of artifacts, newest first.

```python
page = client.artifacts.list(agent_id="ag_0123456789abcdef", session_id="ss_0123456789abcdef")
```

**Signature:** `list(*, agent_id=..., session_id=..., cursor=...) -> ArtifactsPage`

Filter by agent, session, or both. A scoped client returns only its user's artifacts. Pass the previous page's `next_cursor` as `cursor`. Returns `ArtifactsPage` with `data: list[Artifact]` and `next_cursor: str | None`. Raises `APIStatusError` with [`validation_failed`](/api-reference/protocols/errors#validation_failed) or [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor).

### `iter()` [#iter]

Iterates every matching artifact, fetching pages as you go.

```python
for artifact in client.artifacts.iter(session_id="ss_0123456789abcdef"):
    print(artifact.filename, artifact.size_bytes)
```

**Signature:** `iter(*, agent_id=..., session_id=..., cursor=...) -> Iterator[Artifact]`

Takes the same parameters as [`list()`](#list). No request is sent until you start iterating. On the async client, use `async for` directly on `iter(...)`; do not await it.

### `get()` [#get]

Gets one artifact's details without downloading it.

```python
artifact = client.artifacts.get(artifact_id="at_0123456789abcdef")
print(artifact.filename, artifact.media_type, artifact.size_bytes)
```

**Signature:** `get(*, artifact_id: str) -> Artifact`

Returns [`Artifact`](#artifact). Raises `validation_failed` or [`not_found`](/api-reference/protocols/errors#not_found).

### `create_download_url()` [#create-download-url]

Creates a direct download link that expires after the [download URL lifetime](/api-reference/protocols/service-limits#artifact-download-url).

```python
user = client.for_user(verified_user_id)
download = user.artifacts.create_download_url(artifact_id=artifact.artifact_id)
print(download.url, download.expires_at)
```

**Signature:** `create_download_url(*, artifact_id: str) -> ArtifactDownloadUrl`

Anyone with the link can download the file until it expires, so keep it out of logs and share it only with the intended user. Returns `ArtifactDownloadUrl` with `url` and `expires_at`. Raises `validation_failed`, `not_found`, or [`service_unavailable`](/api-reference/protocols/errors#service_unavailable) when downloads are temporarily unavailable.

### `delete()` [#delete]

Permanently deletes an artifact.

```python
client.artifacts.delete(artifact_id=artifact.artifact_id)
```

**Signature:** `delete(*, artifact_id: str) -> None`

The original file in the agent's workspace is not touched. Raises `validation_failed` or `not_found`; deleting the same artifact again raises `not_found`.

## Response models [#response-models]

### `Artifact` [#artifact]

| Field | Type | Description |
| --- | --- | --- |
| `artifact_id` | `str` | Artifact ID (`at_...`) |
| `tenant_id` | `str` | Your tenant ID |
| `agent_id` | `str` | Agent that published it |
| `session_id` | `str` | Session it was published in |
| `filename` | `str` | File name |
| `media_type` | `str` | MIME type |
| `size_bytes` | `int` | Size in bytes |
| `user_id` | `str` | End user, or `""` for tenant level |
| `metadata` | `dict[str, object]` | Metadata |
| `created_at`, `updated_at` | `datetime` | Timestamps |

## Next [#next]

- [Artifacts guide](/agents/artifacts)
- [Sessions](/sdk/python/sessions)
- [Client errors](/sdk/python/client#errors)
