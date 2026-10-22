---
title: Artifacts
description: List, inspect, download, and delete the files your agents publish, with the TypeScript SDK.
---

# Artifacts

`client.artifacts` gives you the files your agents publish from their workspaces, such as a report or a generated image. List them by agent or session, then hand your user a short-lived download link. To learn how an agent publishes a file, read [Artifacts](/agents/artifacts).

In a route that serves a signed-in end user, call these methods on the [scoped client](/sdk/typescript/client#for-user) from `client.forUser(verifiedUserId)`. It returns only artifacts from that end user's sessions and answers `not_found` for anyone else's. The tenant client sees every user's artifacts and is for your backend's administration.

```typescript
const user = client.forUser(verifiedUserId);
const { data } = await user.artifacts.list({ sessionId });
for (const artifact of data) {
  const { url } = await user.artifacts.createDownloadUrl({ artifactId: artifact.artifactId });
  console.log(artifact.filename, url);
}
```

Every method takes one input object and accepts an optional `abortSignal`. A published artifact never changes, even if the agent later edits the file in its workspace.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`list()`](#list) | List artifacts | `ArtifactsListResponse` |
| [`get()`](#get) | Read one artifact's details | `ArtifactListItem` |
| [`createDownloadUrl()`](#create-download-url) | Create a short-lived download link | `ArtifactDownloadUrlResponse` |
| [`delete()`](#delete) | Delete an artifact | `void` |

## Methods [#methods]

### `list()` [#list]

Lists your artifacts, newest first, one [fixed-size page](/api-reference/protocols/service-limits#other-cursored-resource-pages) at a time.

**Signature:** `list(input?: ArtifactsListOptions): Promise<ArtifactsListResponse>`

```typescript
const page = await client.forUser(verifiedUserId).artifacts.list({ agentId, sessionId });
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agentId` | `string` | no | Only this agent's artifacts |
| `sessionId` | `string` | no | Only artifacts from this session |
| `cursor` | `string` | no | `nextCursor` from the previous page |

Returns [`ArtifactsListResponse`](#artifactslistresponse). Errors: [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor).

### `get()` [#get]

Reads one artifact's details without downloading it.

**Signature:** `get(input: { artifactId: string } & ResourceRequestOptions): Promise<ArtifactListItem>`

```typescript
const artifact = await client.artifacts.get({ artifactId });
console.log(artifact.filename, artifact.sizeBytes);
```

Returns [`ArtifactListItem`](#artifactlistitem). Errors: `validation_failed`, [`not_found`](/api-reference/protocols/errors#not_found).

### `createDownloadUrl()` [#create-download-url]

Creates a link that downloads the file directly for a [short time](/api-reference/protocols/service-limits#artifact-download-url).

**Signature:** `createDownloadUrl(input: { artifactId: string } & ResourceRequestOptions): Promise<ArtifactDownloadUrlResponse>`

```typescript
const { url, expiresAt } = await client
  .forUser(verifiedUserId)
  .artifacts.createDownloadUrl({ artifactId });
```

Anyone with the link can download the file until `expiresAt`. Create it on the scoped client, which answers `not_found` for another user's artifact, and keep the link out of logs. Create a new link each time you need one. Returns [`ArtifactDownloadUrlResponse`](#artifactdownloadurlresponse). Errors: `validation_failed`, `not_found`, [`service_unavailable`](/api-reference/protocols/errors#service_unavailable).

### `delete()` [#delete]

Deletes an artifact for good. The file in the workspace stays.

**Signature:** `delete(input: { artifactId: string } & ResourceRequestOptions): Promise<void>`

```typescript
await client.artifacts.delete({ artifactId });
```

Deleting it again fails with `not_found`. Errors: `validation_failed`, `not_found`.

## Response types [#response-types]

### `ArtifactListItem` [#artifactlistitem]

| Field | Type | Description |
| --- | --- | --- |
| `artifactId` | `string` | Artifact ID (`at_…`) |
| `agentId` | `string` | The agent that published it |
| `sessionId` | `string` | The session it was published in |
| `tenantId` | `string` | Your tenant ID |
| `filename` | `string` | File name, without folders |
| `mediaType` | `string` | Media type, such as `application/pdf` |
| `sizeBytes` | `number` | Size, within the [artifact file limit](/api-reference/protocols/service-limits#artifact-file) |
| `userId` | `string` | The session's end user, or `""` |
| `metadata` | `Record<string, unknown>` | The session's metadata |
| `createdAt` | `string` | ISO 8601 timestamp |
| `updatedAt` | `string` | ISO 8601 timestamp |

`agentId` and `sessionId` stay on the artifact even after you delete that agent or session with its artifacts kept.

### `ArtifactsListResponse` [#artifactslistresponse]

```typescript
interface ArtifactsListResponse {
  data: ArtifactListItem[];
  nextCursor: string | null;
}
```

### `ArtifactDownloadUrlResponse` [#artifactdownloadurlresponse]

```typescript
interface ArtifactDownloadUrlResponse {
  url: string;
  expiresAt: string;
}
```

## Next [#next]

- [Artifacts](/agents/artifacts)
- [Sessions reference](/sdk/typescript/sessions#delete)
