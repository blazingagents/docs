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

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `agentId` | string | query |  | `ag_…` ID. |
| `sessionId` | string | query |  | `ss_…` ID. |
| `cursor` | string \| null | query |  |  |

#### Response

Returns `200 OK` as `application/json`. A page of artifacts.

Response schema: `ArtifactList`.

```json
{
  "data": [
    {
      "artifactId": "at_1234567890ABCDEF",
      "agentId": "ag_1234567890ABCDEF",
      "tenantId": "ten_1234567890ABCDEF",
      "sessionId": "ss_1234567890ABCDEF",
      "filename": "string",
      "mediaType": "string",
      "sizeBytes": 0,
      "userId": "string",
      "metadata": {},
      "createdAt": "2026-07-10T10:00:00Z",
      "updatedAt": "2026-07-10T10:00:00Z"
    }
  ],
  "nextCursor": "string"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/artifacts" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/artifacts/:artifactId/download-url [#create-artifact-download-url]

Create an artifact download URL.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `artifactId` | string | path | required | `at_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The signed download URL.

Response schema: `ArtifactDownloadUrl`.

```json
{
  "url": "https://example.com",
  "expiresAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/artifacts/at_1234567890ABCDEF/download-url" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/artifacts/:artifactId [#get-artifact]

Get an artifact.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `artifactId` | string | path | required | `at_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The artifact metadata.

Response schema: `Artifact`.

```json
{
  "artifactId": "at_1234567890ABCDEF",
  "agentId": "ag_1234567890ABCDEF",
  "tenantId": "ten_1234567890ABCDEF",
  "sessionId": "ss_1234567890ABCDEF",
  "filename": "string",
  "mediaType": "string",
  "sizeBytes": 0,
  "userId": "string",
  "metadata": {},
  "createdAt": "2026-07-10T10:00:00Z",
  "updatedAt": "2026-07-10T10:00:00Z"
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/artifacts/at_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### DELETE /v1/artifacts/:artifactId [#delete-artifact]

Delete an artifact.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `artifactId` | string | path | required | `at_…` ID. |

#### Response

Returns `204 No Content`. Deleted.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/artifacts/at_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Artifacts](/agents/artifacts) to have an agent publish files.
- [Service limits](/api-reference/protocols/service-limits#artifacts) for file size and count limits.
