---
title: Artifacts
description: Publish selected Workspace files as immutable outputs applications can list and download.
---

# Artifacts

An Artifact is a file an Agent deliberately publishes from a Turn. Use one
when an application must discover and download a finished output. Unpublished
Workspace files remain private mutable state.

## From Workspace file to Artifact [#from-workspace-file-to-artifact]

The Agent calls `publish_artifacts` with one to ten readable Workspace paths.
Each regular file may be up to 10 MiB and creates a fresh Artifact ID, even if
another Artifact uses the same filename. One Session can originate at most 100
Artifacts.

Publication copies immutable bytes to R2 and leaves the Workspace source
untouched. Later edits to the source do not change the Artifact.

## Publish, discover, and download [#publish-discover-and-download]

```typescript
import { BlazingAgents } from "@blazing-agents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});
const expected = "# Release\n\nReady to ship.\n";
const turn = await client.chat({
  agentId,
  userId: "end-user-42",
  message: {
    id: crypto.randomUUID(),
    role: "user",
    parts: [{
      type: "text",
      text: `Write /outputs/release.md with exactly ${JSON.stringify(expected)}, then use publish_artifacts for /outputs/release.md.`,
    }],
  },
});

const sessionId = await turn.sessionId;
await turn.toResponse().text();

const page = await client.artifacts.list({ agentId, sessionId });
const artifact = page.data.find((item) => item.filename === "release.md");
if (!artifact) throw new Error("release.md was not published");

const { url } = await client.artifacts.createDownloadUrl(artifact.artifactId);
const response = await fetch(url);
if (artifact.mediaType !== "text/markdown") throw new Error("Unexpected type");
if ((await response.text()) !== expected) throw new Error("Bytes differ");
```

Drain the Turn stream before listing so publication and Session persistence can
finish. `createDownloadUrl` returns a five-minute presigned URL. Authorize the
request in your backend before minting it, and keep credentials and URLs out of
logs.

## Ownership and discovery [#ownership-and-discovery]

Every Artifact belongs to one Tenant and retains its originating Agent and
stateful Session as provenance. It inherits the Session's `userId` and
`metadata`; Attribution supports filtering and reporting, not authorization.

Lists are Tenant-level, newest first, cursor-paginated, and filterable by
`agentId`, `sessionId`, or both. A Task run creates a fresh Session; retrieve
the run's `sessionId`, then filter Artifacts by that Session to find only its
outputs. See [Task runs](/automation/task-runs).

## Deletion and safe delivery [#deletion-and-safe-delivery]

Deleting an Artifact hard-deletes its row and R2 object without changing the
Workspace source. Later get, download, or repeated delete requests return 404.
Deleting an Agent or Session requires choosing whether to preserve or delete
its Artifacts.

Treat filenames, media types, and bytes as untrusted. Download responses force
attachment behavior and `nosniff`, but applications must still validate
content. Tenant credentials can access every Artifact in the Tenant, so enforce
end-user authorization in your backend.

## SDK and API [#sdk-and-api]

- [TypeScript Artifacts SDK](/sdk/typescript/artifacts)
- [Python Artifacts SDK](/sdk/python/artifacts)
- [Artifacts REST API](/api-reference/rest-api/artifacts)
- [Artifact service limits](/api-reference/protocols/service-limits#artifacts)
- [Built-in Tools](/agents/tools/built-in-tools)
