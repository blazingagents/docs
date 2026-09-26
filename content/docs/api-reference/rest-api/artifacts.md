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

List artifacts.

Lists your tenant's artifacts newest first, 50 per page. Filter by the agent or session that published them, and pass `nextCursor` as `cursor` to get the next page.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | query |  | Return only artifacts published by this agent. |
| `sessionId` | string | query |  | Return only artifacts published in this session. |
| `cursor` | string \| null | query |  | `nextCursor` from the previous page. |

#### Response

Returns `200 OK` as `application/json`. A page of artifacts.

Response schema: `ArtifactList`.

```json
{
  "data": [
    {
      "artifactId": "at_6Jm2Qx8RtW4nPz1K",
      "agentId": "ag_4kP9sT2vXq7LmN3a",
      "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
      "sessionId": "ss_9Fh3Lc7VbN2kDs5Y",
      "filename": "report.pdf",
      "mediaType": "application/pdf",
      "sizeBytes": 24830,
      "userId": "",
      "metadata": {},
      "createdAt": "2026-07-10T10:00:00.000Z",
      "updatedAt": "2026-07-10T10:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/artifacts" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/artifacts/:artifactId/download-url [#create-artifact-download-url]

Create an artifact download URL.

Creates a link that downloads the artifact's file for five minutes. Fetch it without an API key; it works more than once until `expiresAt`. Anyone with the link can download the file, so keep it out of logs.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `artifactId` | string | path | required | ID of the artifact. |

#### Response

Returns `200 OK` as `application/json`. The download URL and when it expires.

Response schema: `ArtifactDownloadUrl`.

```json
{
  "url": "https://downloads.example.com/at_6Jm2Qx8RtW4nPz1K/report.pdf?signature=3f9a2c",
  "expiresAt": "2026-07-10T10:05:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/artifacts/at_1234567890ABCDEF/download-url" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/artifacts/:artifactId [#get-artifact]

Get an artifact.

Returns an artifact's metadata without its contents. Create a download URL to fetch the file.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `artifactId` | string | path | required | ID of the artifact. |

#### Response

Returns `200 OK` as `application/json`. The artifact.

Response schema: `Artifact`.

```json
{
  "artifactId": "at_6Jm2Qx8RtW4nPz1K",
  "agentId": "ag_4kP9sT2vXq7LmN3a",
  "tenantId": "ten_8Hq2Zr5WcY1bJt6D",
  "sessionId": "ss_9Fh3Lc7VbN2kDs5Y",
  "filename": "report.pdf",
  "mediaType": "application/pdf",
  "sizeBytes": 24830,
  "userId": "",
  "metadata": {},
  "createdAt": "2026-07-10T10:00:00.000Z",
  "updatedAt": "2026-07-10T10:00:00.000Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/artifacts/at_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### DELETE /v1/artifacts/:artifactId [#delete-artifact]

Delete an artifact.

Permanently deletes an artifact and its file. The source file in the workspace is not touched. Deleting the same artifact again returns `404 not_found`.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `artifactId` | string | path | required | ID of the artifact. |

#### Response

Returns `204 No Content`. The artifact was deleted.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`not_found`](/api-reference/protocols/errors#not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/artifacts/at_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Artifacts](/agents/artifacts) to have an agent publish files.
- [Service limits](/api-reference/protocols/service-limits#artifacts) for file size and count limits.
