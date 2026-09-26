---
title: Artifacts
description: List, inspect, create download URLs for, and delete Agent-produced Artifacts.
---

# Artifacts

## Overview [#overview]

Artifacts are files your agents publish during a turn, such as a report or an
export. List and inspect them here, then create a short-lived download link to
fetch the bytes. Published files never change.

## Endpoints [#endpoints]

### GET /v1/artifacts [#list-artifacts]

Lists your tenant's artifacts newest first. Filter by the agent or session that
produced them.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Query parameter | Type   | Default | Description                                 |
| --------------- | ------ | ------- | ------------------------------------------- |
| `agentId`       | string | —       | Restrict to one `ag_…` Agent                |
| `sessionId`     | string | —       | Restrict to one `ss_…` Session              |
| `cursor`        | string | —       | Opaque cursor                               |

Page size is 50.

#### Response

Returns `200 OK`.

Response schema: [`artifactsListResponseSchema`](/api-reference/protocols/objects-and-schemas#artifacts-list-response).

```json
{
  "data": [
    {
      "artifactId": "at_1234567890ABCDEF",
      "agentId": "ag_1234567890ABCDEF",
      "tenantId": "ten_1234567890ABCDEF",
      "sessionId": "ss_1234567890ABCDEF",
      "filename": "report.pdf",
      "mediaType": "application/pdf",
      "sizeBytes": 24830,
      "userId": "",
      "metadata": {},
      "createdAt": "2026-07-10T10:00:00Z",
      "updatedAt": "2026-07-10T10:00:00Z"
    }
  ],
  "nextCursor": null
}
```

#### Errors

`400 validation_failed` for malformed filters; `400 invalid_cursor` for an
opaque cursor that cannot be decoded. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --get \
  "$BLAZING_AGENTS_BASE_URL/v1/artifacts?agentId=ag_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/artifacts#list) / [Python](/sdk/python/artifacts#list). See [Artifacts](/agents/artifacts).

### GET /v1/artifacts/:artifactId [#get-artifact]

Returns one artifact's metadata without downloading its bytes.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and an
`at_…` `artifactId`. There are no query or body parameters.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `artifactId`    | yes      | Artifact ID (`at_…`).                     |

#### Response

Returns `200 OK` with the same public Artifact fields shown by the list
endpoint. Storage locations and credentials are never included.

Response schema:
[`artifactListItemSchema`](/api-reference/protocols/objects-and-schemas#artifactlistitem).

```json
{
  "artifactId": "at_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "sessionId": "ss_1234567890ABCDEF",
  "filename": "report.pdf",
  "mediaType": "application/pdf",
  "sizeBytes": 24830,
  "userId": "",
  "metadata": {},
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

`400 validation_failed` for a malformed ID. `404 not_found` applies to a
missing or foreign Artifact. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --fail-with-body \
  "$BLAZING_AGENTS_BASE_URL/v1/artifacts/at_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/artifacts#get) /
[Python](/sdk/python/artifacts#get).

### POST /v1/artifacts/:artifactId/download-url [#create-artifact-download-url]

Creates a download URL that works for five minutes.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and an
`at_…` `artifactId`. There are no query or body parameters.

#### Response

Returns `200 OK` with an absolute download URL and its expiry.
Response schema:
[`artifactDownloadUrlResponseSchema`](/api-reference/protocols/objects-and-schemas#artifactdownloadurlresponse).

```json
{
  "url": "https://downloads.example.com/at_1234567890ABCDEF/report.pdf?signature=…",
  "expiresAt": "2026-07-31T12:05:00.000Z"
}
```

Fetch the URL without an API credential. It returns the artifact's bytes until
it expires, and you can use it more than once before then.

#### Errors

`400 validation_failed` for malformed IDs. `404 not_found` applies to a missing or foreign Artifact. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request POST \
  "$BLAZING_AGENTS_BASE_URL/v1/artifacts/at_1234567890ABCDEF/download-url" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/artifacts#create-download-url) / [Python](/sdk/python/artifacts#create-download-url). Treat the returned URL as a bearer secret and omit it from logs.

### DELETE /v1/artifacts/:artifactId [#delete-artifact]

Permanently deletes an artifact and its bytes. The source file in the workspace
is not touched. Deleting the same artifact again returns `404 not_found`.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and an
`at_…` `artifactId`. There are no query or body parameters.

| Location | Field           | Required | Description                               |
| -------- | --------------- | -------- | ----------------------------------------- |
| Header   | `Authorization` | yes      | Tenant API key or dashboard JWT. |
| Path     | `artifactId`    | yes      | Artifact ID (`at_…`).                     |

#### Response

Returns `204 No Content` with an empty body.

#### Errors

`400 validation_failed` for malformed IDs. `404 not_found` applies to a missing,
foreign, or already deleted Artifact. See [REST errors](/api-reference/protocols/errors).

#### cURL

```bash
curl --request DELETE \
  "$BLAZING_AGENTS_BASE_URL/v1/artifacts/at_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

#### SDK and related guides

SDKs: [TypeScript](/sdk/typescript/artifacts#delete) / [Python](/sdk/python/artifacts#delete). See [Artifacts](/agents/artifacts).

## Next [#next]

- [Artifacts](/agents/artifacts) to have an agent publish files.
- [Service limits](/api-reference/protocols/service-limits#artifacts) for file size and count limits.
