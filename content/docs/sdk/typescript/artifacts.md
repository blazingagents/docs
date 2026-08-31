---
title: Artifacts
description: List, inspect, create download URLs for, and delete files deliberately published by Agents.
---

# Artifacts

`client.artifacts` accesses immutable files an Agent deliberately published from its Workspace.

## Overview [#overview]

Artifacts belong to a Tenant and retain their originating Agent and Session as
historical provenance. Lists are newest first and can filter by Agent,
Session, or both. Metadata reads do not create a download URL. Bytes are
available only through an explicit five-minute R2 presigned URL.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`list()`](#list) | List the Tenant's Artifacts | `ArtifactsListResponse` |
| [`get()`](#get) | Read one Artifact's metadata | `ArtifactListItem` |
| [`createDownloadUrl()`](#create-download-url) | Create a five-minute direct R2 URL | `ArtifactDownloadUrlResponse` |
| [`delete()`](#delete) | Delete an active Artifact | `void` |

## Methods [#methods]

### `list()` [#list]

Lists the Tenant's Artifacts newest first. Page size is fixed at 50.

**Signature:** `list(options?: ArtifactsListOptions): Promise<ArtifactsListResponse>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `options.agentId` | `string` | no | Restrict results to one Agent (`ag_…`) |
| `options.sessionId` | `string` | no | Restrict results to one Session (`ss_…`) |
| `options.cursor` | `string` | no | Opaque cursor from `nextCursor` |

```typescript
const page = await client.artifacts.list({
  agentId,
  sessionId,
});
```

Returns [`ArtifactsListResponse`](#artifactslistresponse). Raises `validation_failed` for malformed filters or `invalid_cursor` for an unusable cursor. See [`GET .../artifacts`](/api-reference/rest-api/artifacts#list-artifacts).

### `get()` [#get]

Returns one Tenant-owned Artifact's metadata without downloading its bytes.

**Signature:** `get(artifactId: string): Promise<ArtifactListItem>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `artifactId` | `string` | yes | Artifact ID (`at_…`) |

```typescript
const artifact = await client.artifacts.get(artifactId);
console.log(artifact.filename, artifact.sizeBytes);
```

Raises `validation_failed` for a malformed ID or `not_found` for a missing or
foreign Artifact. See
[`GET /v1/artifacts/:artifactId`](/api-reference/rest-api/artifacts#get-artifact).

### `createDownloadUrl()` [#create-download-url]

Creates a direct R2 presigned URL that expires after five minutes. Treat it as
a bearer secret and keep it out of logs.

**Signature:** `createDownloadUrl(artifactId: string): Promise<ArtifactDownloadUrlResponse>`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `artifactId` | `string` | yes | Artifact ID (`at_…`) |

```typescript
const { url, expiresAt } =
  await client.artifacts.createDownloadUrl(artifactId);
```

Returns [`ArtifactDownloadUrlResponse`](#artifactdownloadurlresponse). Raises
`validation_failed` for a malformed ID or `not_found` for a missing/foreign
Artifact. See
[`POST /v1/artifacts/:artifactId/download-url`](/api-reference/rest-api/artifacts#create-artifact-download-url).

### `delete()` [#delete]

Hard-deletes an Artifact's immutable R2 object and database row without changing
the Workspace source file. A repeated deletion returns `not_found`.

**Signature:** `delete(artifactId: string): Promise<void>`

```typescript
await client.artifacts.delete(artifactId);
```

Returns `void`. Raises `validation_failed` for malformed IDs or `not_found` for a missing, foreign, or already deleted Artifact. See [`DELETE /v1/artifacts/:artifactId`](/api-reference/rest-api/artifacts#delete-artifact).

## Response types [#response-types]

### `ArtifactListItem` [#artifactlistitem]

| Field | Type | Description |
| --- | --- | --- |
| `artifactId` | `string` | Artifact ID (`at_…`) |
| `agentId` | `string` | Originating Agent ID |
| `tenantId` | `string` | Owning Tenant ID |
| `sessionId` | `string` | Originating Session ID |
| `filename` | `string` | Published source basename |
| `mediaType` | `string` | Published media type |
| `sizeBytes` | `number` | Published byte size, at most 10 MiB |
| `userId` | `string` | Immutable End-user Attribution or `""` |
| `metadata` | `Record<string, unknown>` | Immutable Session metadata |
| `createdAt` | `string` | ISO 8601 creation timestamp |
| `updatedAt` | `string` | ISO 8601 row update timestamp |

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

See the canonical [Artifact schemas](/api-reference/protocols/objects-and-schemas#artifacts-list-response).

## Errors [#errors]

SDK request failures throw `BlazingAgentsError`. Branch on its stable `code`, not its message.

| Code | Applies to | Action |
| --- | --- | --- |
| `validation_failed` | All methods and list filters | Correct malformed Agent, Session, or Artifact IDs |
| `invalid_cursor` | `list()` | Restart pagination without the stale or malformed cursor |
| `not_found` | ID-based methods | Check Artifact ownership and active state |
| `service_unavailable` | `createDownloadUrl()` | Retry after R2 becomes available |

Authentication, transport, malformed-response, and other service failures can also throw. See [SDK errors](/api-reference/protocols/errors).

## End-to-end workflow [#end-to-end-workflow]

Find an Artifact created by a Session, inspect it, then create a short-lived
direct download URL:

```typescript
import { BlazingAgents } from "@blazing-agents/sdk";

const client = new BlazingAgents({ apiKey: process.env.BLAZING_AGENTS_API_KEY! });
const agentId = "ag_0123456789abcdef";
const sessionId = "ss_0123456789abcdef";

const page = await client.artifacts.list({ agentId, sessionId });
const artifact = page.data[0];

if (artifact) {
  const detail = await client.artifacts.get(artifact.artifactId);
  const download = await client.artifacts.createDownloadUrl(artifact.artifactId);

  console.log({
    filename: detail.filename,
    sizeBytes: detail.sizeBytes,
    expiresAt: download.expiresAt,
  });
}
```

## Related [#related]

- [Artifacts](/agents/artifacts)
- [Publish and download Artifacts](/agents/artifacts)
- [REST Artifacts](/api-reference/rest-api/artifacts)
