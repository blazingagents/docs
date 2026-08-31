---
title: Artifacts
description: List, inspect, create download URLs for, and delete published Artifacts with the Python SDK.
---

# Artifacts

`client.artifacts` accesses immutable files an Agent deliberately published.

## Overview [#overview]

Artifacts belong to a Tenant and retain their Agent and Session IDs as
historical provenance. Metadata reads do not create a download URL. Bytes are
available only through an explicit five-minute R2 presigned URL. The
synchronous and asynchronous resources expose the same operations.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`list()`](#list) | Read one Artifact page | `ArtifactsPage` |
| [`iter()`](#iter) | Lazily iterate Artifact pages | `Iterator[Artifact]` |
| [`get()`](#get) | Read one Artifact's metadata | `Artifact` |
| [`create_download_url()`](#create-download-url) | Create a five-minute direct R2 URL | `ArtifactDownloadUrl` |
| [`delete()`](#delete) | Hard-delete an Artifact | `None` |

## Methods [#methods]

### `list()` [#list]

**Signature:** `list(*, agent_id: str = ..., session_id: str = ..., cursor: str = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> ArtifactsPage`

Returns a newest-first Tenant page of 50 active Artifacts. Filter by Agent,
Session, or both. Pass `next_cursor` unchanged for the next page.

```python
page = client.artifacts.list(
    agent_id=agent_id,
    session_id=session_id,
)
```

Failures include `validation_failed` and `invalid_cursor`. See
[`GET .../artifacts`](/api-reference/rest-api/artifacts#list-artifacts).

### `iter()` [#iter]

**Signature:** `iter(*, agent_id: str = ..., session_id: str = ..., cursor: str = ..., extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Iterator[Artifact]`

Lazily yields Artifacts using the same filters as [`list()`](#list). The first
page is fetched when iteration starts and later pages only as needed.

```python
for artifact in client.artifacts.iter(agent_id=agent_id):
    print(artifact.filename)

async for artifact in async_client.artifacts.iter(agent_id=agent_id):
    print(artifact.filename)
```

The async return is `AsyncIterator[Artifact]`; do not await the iterator
factory.

### `get()` [#get]

**Signature:** `get(*, artifact_id: str, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> Artifact`

Returns one Tenant-owned Artifact's metadata without downloading its bytes.

```python
artifact = client.artifacts.get(artifact_id=artifact_id)
print(artifact.filename, artifact.size_bytes)
```

The async resource uses `await async_client.artifacts.get(...)`. See
[`GET /v1/artifacts/:artifactId`](/api-reference/rest-api/artifacts#get-artifact).

### `create_download_url()` [#create-download-url]

**Signature:** `create_download_url(*, artifact_id: str, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> ArtifactDownloadUrl`

Creates a direct R2 presigned URL that expires after five minutes. Treat it as
a bearer secret and keep it out of logs and referrers.

```python
download = client.artifacts.create_download_url(
    artifact_id=artifact.artifact_id,
)
print(download.url, download.expires_at)
```

The async resource uses `await async_client.artifacts.create_download_url(...)`.
See
[`POST /v1/artifacts/:artifactId/download-url`](/api-reference/rest-api/artifacts#create-artifact-download-url).

### `delete()` [#delete]

**Signature:** `delete(*, artifact_id: str, extra_headers: Mapping[str, str] | None = None, timeout: Timeout = ...) -> None`

Deletes the immutable R2 object and active database row without changing the
Workspace source file. Repeated deletion returns `not_found`. See
[`DELETE /v1/artifacts/:artifactId`](/api-reference/rest-api/artifacts#delete-artifact).

## Models, metadata, and errors [#models-metadata-and-errors]

`Artifact` exposes `artifact_id`, `agent_id`, `tenant_id`, `session_id`,
`filename`, `media_type`, `size_bytes`, `user_id`, `metadata`, `created_at`,
and `updated_at`. `ArtifactsPage` contains `data` and `next_cursor`.
`ArtifactDownloadUrl` contains `url` and `expires_at`. Pydantic response
models preserve unknown fields and carry a non-serialized `_request_id`.

Every operation accepts per-request headers and timeout configuration.
`not_found` covers unavailable or foreign Artifacts, and
`service_unavailable` covers an unavailable R2 service. API request failures
carry request correlation.
See [Python errors and request IDs](/sdk/python/client#errors).

## Related [#related]

- [Artifacts](/agents/artifacts)
- [Publish and download Artifacts](/agents/artifacts)
- [REST Artifacts](/api-reference/rest-api/artifacts)
- [TypeScript Artifacts](/sdk/typescript/artifacts)
