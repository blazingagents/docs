---
title: Monetization
description: Connect your billing account, link users to customers, and manage token usage events.
---

# Monetization

## Overview [#overview]

Charge your customers for the model tokens they use, through your own Polar or
Dodo account. Store one merchant connection for your tenant, link each of your
end users to a customer in your billing provider, and watch the usage events
Blazing Agents sends for every turn. Retry, release, or discard an event when
it cannot be delivered.

## Endpoints [#endpoints]

### GET /v1/merchant-connection [#get-merchant-connection]

Get the merchant connection.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

There are no parameters and no request body.

#### Response

Returns `200 OK` as `application/json`. The current merchant connection, or null.

Response schema: `MerchantConnectionResponse`.

```json
{
  "connection": {
    "id": "mch_1234567890ABCDEF",
    "provider": "polar",
    "environment": "sandbox",
    "status": "active",
    "merchantAccountId": "string",
    "keyFragment": "string",
    "guard": {
      "enabled": true,
      "productIds": [
        "string"
      ],
      "meterId": "string"
    },
    "configVersion": 1,
    "createdAt": "2026-07-10T10:00:00Z",
    "updatedAt": "2026-07-10T10:00:00Z"
  }
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
curl "$BLAZING_AGENTS_BASE_URL/v1/merchant-connection" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/merchant-connection [#create-merchant-connection]

Create the merchant connection.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `provider` | string | body | required | One of `polar`, `dodo`. |
| `environment` | string | body | required | One of `sandbox`, `live`. |
| `credential` | string | body | required |  |
| `guard` | object | body |  |  |

#### Response

Returns `201 Created` as `application/json`. The created merchant connection.

Response schema: `MerchantConnectionResponse`.

```json
{
  "connection": {
    "id": "mch_1234567890ABCDEF",
    "provider": "polar",
    "environment": "sandbox",
    "status": "active",
    "merchantAccountId": "string",
    "keyFragment": "string",
    "guard": {
      "enabled": true,
      "productIds": [
        "string"
      ],
      "meterId": "string"
    },
    "configVersion": 1,
    "createdAt": "2026-07-10T10:00:00Z",
    "updatedAt": "2026-07-10T10:00:00Z"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |
| `422` |  | Merchant credential rejected |
| `503` |  | Merchant provider unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/merchant-connection" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"provider":"polar","environment":"sandbox","credential":"string"}'
```

### PATCH /v1/merchant-connection [#update-merchant-connection]

Update the merchant connection.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `credential` | string | body |  |  |
| `status` | string | body |  | One of `active`, `disconnected`. |
| `guard` | object | body |  |  |

#### Response

Returns `200 OK` as `application/json`. The updated merchant connection.

Response schema: `MerchantConnectionResponse`.

```json
{
  "connection": {
    "id": "mch_1234567890ABCDEF",
    "provider": "polar",
    "environment": "sandbox",
    "status": "active",
    "merchantAccountId": "string",
    "keyFragment": "string",
    "guard": {
      "enabled": true,
      "productIds": [
        "string"
      ],
      "meterId": "string"
    },
    "configVersion": 1,
    "createdAt": "2026-07-10T10:00:00Z",
    "updatedAt": "2026-07-10T10:00:00Z"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |
| `409` |  | Merchant account mismatch |
| `422` |  | Merchant credential rejected |
| `503` |  | Merchant provider unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/merchant-connection" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"credential":"string"}'
```

### DELETE /v1/merchant-connection [#retire-merchant-connection]

Retire the merchant connection.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

There are no parameters and no request body.

#### Response

Returns `204 No Content`. Retired.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/merchant-connection" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/merchant-connection/bindings [#list-merchant-customer-bindings]

List merchant customer bindings.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `userId` | string | query |  |  |
| `cursor` | string | query |  |  |
| `limit` | integer | query |  | 1–200. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. The bindings page.

Response schema: `MerchantBindingList`.

```json
{
  "bindings": [
    {
      "userId": "string",
      "customerId": "string",
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
curl "$BLAZING_AGENTS_BASE_URL/v1/merchant-connection/bindings" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PUT /v1/merchant-connection/bindings/:userId [#bind-user-to-merchant-customer]

Bind a user to a merchant customer.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `userId` | string | path | required |  |
| `customerId` | string | body | required |  |

#### Response

Returns `200 OK` as `application/json`. The upserted binding.

Response schema: `MerchantBindingResponse`.

```json
{
  "binding": {
    "userId": "string",
    "customerId": "string",
    "createdAt": "2026-07-10T10:00:00Z",
    "updatedAt": "2026-07-10T10:00:00Z"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |
| `422` |  | Merchant customer not found |
| `503` |  | Merchant provider unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PUT "$BLAZING_AGENTS_BASE_URL/v1/merchant-connection/bindings/string" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"customerId":"string"}'
```

### DELETE /v1/merchant-connection/bindings/:userId [#delete-merchant-customer-binding]

Delete a merchant customer binding.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `userId` | string | path | required |  |

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
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/merchant-connection/bindings/string" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/merchant-usage-events [#list-merchant-usage-events]

List merchant usage events.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `status` | string | query |  | One of `pending`, `accepted`, `failed`, `uncertain`, `unmapped`, `incomplete`, `discarded`, `expired`. |
| `cursor` | string | query |  |  |
| `limit` | integer | query |  | 1–200. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. The events page.

Response schema: `MerchantUsageEventList`.

```json
{
  "events": [
    {
      "id": "mev_1234567890ABCDEF",
      "turnId": "turn_1234567890ABCDEF",
      "connectionId": "mch_1234567890ABCDEF",
      "provider": "polar",
      "userId": "string",
      "customerId": "string",
      "agentId": "ag_1234567890ABCDEF",
      "sessionId": "ss_1234567890ABCDEF",
      "model": "openai/gpt-6-luna",
      "modelProvider": "openai",
      "inputTokens": 0,
      "outputTokens": 0,
      "totalTokens": 0,
      "turnStatus": "succeeded",
      "startedAt": "2026-07-10T10:00:00Z",
      "occurredAt": "2026-07-10T10:00:00Z",
      "status": "pending",
      "payload": {},
      "attemptCount": 0,
      "attemptGeneration": 0,
      "lastAttemptAt": "2026-07-10T10:00:00Z",
      "lastErrorCode": "string",
      "acceptedAt": "2026-07-10T10:00:00Z",
      "workflowIssue": "error",
      "nextAction": "none"
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
curl "$BLAZING_AGENTS_BASE_URL/v1/merchant-usage-events" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/merchant-usage-events/summary [#summarize-merchant-usage-delivery]

Summarize merchant usage delivery.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `days` | integer | query |  | 1–90. Defaults to `14`. |

#### Response

Returns `200 OK` as `application/json`. The delivery summary.

Response schema: `MerchantUsageSummary`.

```json
{
  "summary": {
    "counts": {
      "pending": 0,
      "accepted": 0,
      "uncertain": 0,
      "failed": 0,
      "unmapped": 0,
      "incomplete": 0,
      "expired": 0,
      "discarded": 0
    },
    "lastAcceptedAt": "2026-07-10T10:00:00Z",
    "oldestPendingOccurredAt": "2026-07-10T10:00:00Z",
    "daily": [
      {
        "day": "string",
        "acceptedEvents": 0,
        "acceptedTokens": 0,
        "pendingEvents": 0
      }
    ]
  }
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
curl "$BLAZING_AGENTS_BASE_URL/v1/merchant-usage-events/summary" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/merchant-usage-events/:eventId [#get-merchant-usage-event]

Get a merchant usage event.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `eventId` | string | path | required | `mev_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The merchant usage event.

Response schema: `MerchantUsageEventResponse`.

```json
{
  "event": {
    "id": "mev_1234567890ABCDEF",
    "turnId": "turn_1234567890ABCDEF",
    "connectionId": "mch_1234567890ABCDEF",
    "provider": "polar",
    "userId": "string",
    "customerId": "string",
    "agentId": "ag_1234567890ABCDEF",
    "sessionId": "ss_1234567890ABCDEF",
    "model": "openai/gpt-6-luna",
    "modelProvider": "openai",
    "inputTokens": 0,
    "outputTokens": 0,
    "totalTokens": 0,
    "turnStatus": "succeeded",
    "startedAt": "2026-07-10T10:00:00Z",
    "occurredAt": "2026-07-10T10:00:00Z",
    "status": "pending",
    "payload": {},
    "attemptCount": 0,
    "attemptGeneration": 0,
    "lastAttemptAt": "2026-07-10T10:00:00Z",
    "lastErrorCode": "string",
    "acceptedAt": "2026-07-10T10:00:00Z",
    "workflowIssue": "error",
    "nextAction": "none"
  }
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
curl "$BLAZING_AGENTS_BASE_URL/v1/merchant-usage-events/mev_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/merchant-usage-events/:eventId/retry [#retry-merchant-usage-event-delivery]

Retry merchant usage event delivery.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `eventId` | string | path | required | `mev_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The merchant usage event.

Response schema: `MerchantUsageEventResponse`.

```json
{
  "event": {
    "id": "mev_1234567890ABCDEF",
    "turnId": "turn_1234567890ABCDEF",
    "connectionId": "mch_1234567890ABCDEF",
    "provider": "polar",
    "userId": "string",
    "customerId": "string",
    "agentId": "ag_1234567890ABCDEF",
    "sessionId": "ss_1234567890ABCDEF",
    "model": "openai/gpt-6-luna",
    "modelProvider": "openai",
    "inputTokens": 0,
    "outputTokens": 0,
    "totalTokens": 0,
    "turnStatus": "succeeded",
    "startedAt": "2026-07-10T10:00:00Z",
    "occurredAt": "2026-07-10T10:00:00Z",
    "status": "pending",
    "payload": {},
    "attemptCount": 0,
    "attemptGeneration": 0,
    "lastAttemptAt": "2026-07-10T10:00:00Z",
    "lastErrorCode": "string",
    "acceptedAt": "2026-07-10T10:00:00Z",
    "workflowIssue": "error",
    "nextAction": "none"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |
| `409` |  | Event state does not allow this action |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/merchant-usage-events/mev_1234567890ABCDEF/retry" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/merchant-usage-events/:eventId/release [#release-unmapped-merchant-usage-event]

Release an unmapped merchant usage event.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `eventId` | string | path | required | `mev_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The merchant usage event.

Response schema: `MerchantUsageEventResponse`.

```json
{
  "event": {
    "id": "mev_1234567890ABCDEF",
    "turnId": "turn_1234567890ABCDEF",
    "connectionId": "mch_1234567890ABCDEF",
    "provider": "polar",
    "userId": "string",
    "customerId": "string",
    "agentId": "ag_1234567890ABCDEF",
    "sessionId": "ss_1234567890ABCDEF",
    "model": "openai/gpt-6-luna",
    "modelProvider": "openai",
    "inputTokens": 0,
    "outputTokens": 0,
    "totalTokens": 0,
    "turnStatus": "succeeded",
    "startedAt": "2026-07-10T10:00:00Z",
    "occurredAt": "2026-07-10T10:00:00Z",
    "status": "pending",
    "payload": {},
    "attemptCount": 0,
    "attemptGeneration": 0,
    "lastAttemptAt": "2026-07-10T10:00:00Z",
    "lastErrorCode": "string",
    "acceptedAt": "2026-07-10T10:00:00Z",
    "workflowIssue": "error",
    "nextAction": "none"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |
| `409` |  | Event state conflict or missing customer binding |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/merchant-usage-events/mev_1234567890ABCDEF/release" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/merchant-usage-events/:eventId/discard [#discard-merchant-usage-event]

Discard a merchant usage event.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `eventId` | string | path | required | `mev_…` ID. |

#### Response

Returns `200 OK` as `application/json`. The merchant usage event.

Response schema: `MerchantUsageEventResponse`.

```json
{
  "event": {
    "id": "mev_1234567890ABCDEF",
    "turnId": "turn_1234567890ABCDEF",
    "connectionId": "mch_1234567890ABCDEF",
    "provider": "polar",
    "userId": "string",
    "customerId": "string",
    "agentId": "ag_1234567890ABCDEF",
    "sessionId": "ss_1234567890ABCDEF",
    "model": "openai/gpt-6-luna",
    "modelProvider": "openai",
    "inputTokens": 0,
    "outputTokens": 0,
    "totalTokens": 0,
    "turnStatus": "succeeded",
    "startedAt": "2026-07-10T10:00:00Z",
    "occurredAt": "2026-07-10T10:00:00Z",
    "status": "pending",
    "payload": {},
    "attemptCount": 0,
    "attemptGeneration": 0,
    "lastAttemptAt": "2026-07-10T10:00:00Z",
    "lastErrorCode": "string",
    "acceptedAt": "2026-07-10T10:00:00Z",
    "workflowIssue": "error",
    "nextAction": "none"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` |  | Validation failed |
| `401` |  | Missing or invalid credential |
| `404` |  | Not found in this tenant |
| `409` |  | Event state does not allow this action |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/merchant-usage-events/mev_1234567890ABCDEF/discard" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Bill your users for model tokens](/platform/monetization) to set up prices and guard rules.
- [Usage API](/api-reference/rest-api/usage) to query the tokens behind each event.
