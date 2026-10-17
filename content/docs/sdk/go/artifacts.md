---
title: Artifacts
description: List, inspect, download, and delete the files your agents publish, with the Go SDK.
---

# Artifacts

`client.Artifacts` manages the fixed copies of files your agents publish.

Examples are function bodies that receive `ctx context.Context`, `client *ba.Client`, `agentID ba.AgentID`, and `sessionID ba.SessionID`, and return an `error`. Every method also takes the per-call options `ba.WithRequestTimeout`, `ba.WithRequestHeader`, `ba.WithClientRequestID`, and `ba.CaptureResponse`.

```go
page, err := client.Artifacts.List(ctx, ba.ListArtifactsParams{})
if err != nil {
	return err
}
for _, artifact := range page.Data {
	fmt.Println(artifact.ArtifactID, artifact.Filename)
}
return nil
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`List`](#list), `All` | List artifacts | [`*Page[Artifact]`](#artifact) |
| [`Get`](#get) | Get an artifact's metadata | [`*Artifact`](#artifact) |
| [`CreateDownloadURL`](#create-download-url) | Create a download link | `*ArtifactDownloadURL` |
| [`Delete`](#delete) | Permanently delete an artifact | `error` |

## Methods [#methods]

### `List` [#list]

Lists artifacts, newest first, 50 per page.

```go
page, err := client.Artifacts.List(ctx, ba.ListArtifactsParams{AgentID: &agentID})
if err != nil {
	return err
}
fmt.Println(len(page.Data))
return nil
```

**Signature:** `func (s *ArtifactsService) List(ctx context.Context, params ListArtifactsParams, opts ...RequestOption) (*Page[Artifact], error)`

| Field | Type | Description |
| --- | --- | --- |
| `AgentID` | `*ba.AgentID` | Only artifacts published by this agent |
| `SessionID` | `*ba.SessionID` | Only artifacts published in this session |
| `Cursor` | `*string` | The `NextCursor` of the previous page |

Returns [`*ba.Page[Artifact]`](#artifact); `All` walks every page lazily. Fails with `*ba.APIError` whose `Code` is [`validation_failed`](/api-reference/protocols/errors#validation_failed) or [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor).

### `Get` [#get]

Gets one artifact's metadata without its contents. Create a download URL to fetch the file.

```go
artifact, err := client.Artifacts.Get(ctx, "at_0123456789abcdef")
if err != nil {
	return err
}
fmt.Println(artifact.Filename, artifact.SizeBytes)
return nil
```

**Signature:** `func (s *ArtifactsService) Get(ctx context.Context, artifactID ArtifactID, opts ...RequestOption) (*Artifact, error)`

Returns [`*ba.Artifact`](#artifact). Fails with `validation_failed` or [`not_found`](/api-reference/protocols/errors#not_found).

### `CreateDownloadURL` [#create-download-url]

Creates a link that downloads the artifact's file for five minutes. Fetch it without an API key; anyone with the link can download the file, so keep it out of logs.

```go
link, err := client.Artifacts.CreateDownloadURL(ctx, "at_0123456789abcdef")
if err != nil {
	return err
}
fmt.Println(link.ExpiresAt)
response, err := http.Get(link.URL.Reveal())
if err != nil {
	return err
}
defer response.Body.Close()
return nil
```

**Signature:** `func (s *ArtifactsService) CreateDownloadURL(ctx context.Context, artifactID ArtifactID, opts ...RequestOption) (*ArtifactDownloadURL, error)`

Returns a `*ba.ArtifactDownloadURL` with `URL` and `ExpiresAt`. `URL` is a `ba.Secret`, so it prints and encodes as `[redacted]`; call `URL.Reveal()` to get the link. Fails with `validation_failed`, `not_found`, or [`service_unavailable`](/api-reference/protocols/errors#service_unavailable) when downloads are temporarily unavailable.

### `Delete` [#delete]

Permanently deletes an artifact and its file. The source file in the workspace is not touched.

```go
return client.Artifacts.Delete(ctx, "at_0123456789abcdef")
```

**Signature:** `func (s *ArtifactsService) Delete(ctx context.Context, artifactID ArtifactID, opts ...RequestOption) error`

Fails with `validation_failed` or `not_found`.

## Response models [#response-models]

### `Artifact` [#artifact]

| Field | Type | Description |
| --- | --- | --- |
| `ArtifactID` | `ba.ArtifactID` | Artifact ID (`at_...`) |
| `AgentID` | `ba.AgentID` | The agent that published it |
| `TenantID` | `ba.TenantID` | Your tenant ID |
| `SessionID` | `ba.SessionID` | The session it was published in |
| `Filename` | `string` | The file name |
| `MediaType` | `string` | The MIME type |
| `SizeBytes` | `int64` | Size in bytes |
| `UserID` | `string` | End user, or `""` for tenant level |
| `Metadata` | `ba.Metadata` | Your own data |
| `CreatedAt`, `UpdatedAt` | `time.Time` | Timestamps |

## Next [#next]

- [Artifacts](/agents/artifacts)
- [Agents](/sdk/go/agents)
