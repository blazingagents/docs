---
title: Artifacts
description: List, inspect, download, and delete the files your agents publish, with the Rust SDK.
---

# Artifacts

`client.artifacts()` manages the fixed copies of files your agents publish.

Examples receive a `client: blazing_agents::Client`. Every call also takes the `with_timeout`, `without_timeout`, `with_header`, and `with_client_request_id` transport options.

In a route that serves a signed-in end user, call these methods on the [scoped client](/sdk/rust/client#for-user) from `client.for_user()`, which returns only that user's artifacts. The tenant client sees every user's artifacts and is for your backend's administration.

```rust
let user = client.for_user("user_0123456789abcdef")?;
let page = user.artifacts().list().await?;
for artifact in &page.data {
    println!("{} {}", artifact.artifact_id, artifact.filename);
}
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`list()`](#list) | List artifacts | [`Page<Artifact>`](#artifact) |
| [`get()`](#get) | Get an artifact's metadata | [`Artifact`](#artifact) |
| [`create_download_url()`](#create-download-url) | Create a download link | `ArtifactDownloadUrl` |
| [`delete()`](#delete) | Permanently delete an artifact | `()` |

## Methods [#methods]

### `list()` [#list]

Lists artifacts, newest first, with a fixed [page size](/api-reference/protocols/service-limits#other-cursored-resource-pages).

```rust
let user = client.for_user("user_0123456789abcdef")?;
let page = user
    .artifacts()
    .list()
    .agent_id("ag_0123456789abcdef")
    .await?;
```

**Signature:** `list() -> Call<ListArtifacts>`

| Setter | Type | Description |
| --- | --- | --- |
| `agent_id` | `impl Into<AgentId>` | Only artifacts published by this agent |
| `session_id` | `impl Into<SessionId>` | Only artifacts published in this session |

Awaiting returns [`Page<Artifact>`](#artifact); `.items()` and `.pages()` walk every page lazily. Fails with `Error::Api` whose code is [`validation_failed`](/api-reference/protocols/errors#validation_failed) or [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor).

### `get()` [#get]

Gets one artifact's metadata without its contents. Create a download URL to fetch the file.

```rust
let artifact = client.artifacts().get("at_0123456789abcdef").await?;
```

**Signature:** `get(artifact_id: impl Into<ArtifactId>) -> Call<GetArtifact>`

Awaiting returns [`Artifact`](#artifact). Fails with `validation_failed` or [`not_found`](/api-reference/protocols/errors#not_found).

### `create_download_url()` [#create-download-url]

Creates a link that downloads the artifact's file for five minutes. Fetch it without an API key; anyone with the link can download the file, so keep it out of logs. On a `UserClient`, another user's artifact fails with `not_found`, so you do not need your own ownership check.

```rust
let user = client.for_user("user_0123456789abcdef")?;
let link = user
    .artifacts()
    .create_download_url("at_0123456789abcdef")
    .await?;
println!("{}", link.expires_at);
```

**Signature:** `create_download_url(artifact_id: impl Into<ArtifactId>) -> Call<CreateArtifactDownloadUrl>`

Awaiting returns `ArtifactDownloadUrl` with `url` and `expires_at`. Its `Debug` output redacts the URL. Fails with `validation_failed`, `not_found`, or [`service_unavailable`](/api-reference/protocols/errors#service_unavailable) when downloads are temporarily unavailable.

### `delete()` [#delete]

Permanently deletes an artifact and its file. The source file in the workspace is not touched.

```rust
client.artifacts().delete("at_0123456789abcdef").await?;
```

**Signature:** `delete(artifact_id: impl Into<ArtifactId>) -> Call<DeleteArtifact>`

Fails with `validation_failed` or `not_found`.

## Response models [#response-models]

### `Artifact` [#artifact]

| Field | Type | Description |
| --- | --- | --- |
| `artifact_id` | `ArtifactId` | Artifact ID (`at_...`) |
| `agent_id` | `AgentId` | The agent that published it |
| `tenant_id` | `TenantId` | Your tenant ID |
| `session_id` | `SessionId` | The session it was published in |
| `filename` | `String` | The file name |
| `media_type` | `String` | The MIME type |
| `size_bytes` | `u64` | Size in bytes |
| `user_id` | `String` | End user, or `""` for tenant level |
| `metadata` | `Metadata` | Your own data |
| `created_at`, `updated_at` | `Timestamp` | Timestamps |

## Next [#next]

- [Artifacts](/agents/artifacts)
- [Agents](/sdk/rust/agents)
