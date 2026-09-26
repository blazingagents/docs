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

Returns your current merchant connection, or `connection: null` when you have none. The credential is never returned; `keyFragment` shows its last few characters.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

There are no parameters and no request body.

#### Response

Returns `200 OK` as `application/json`. The current merchant connection, or null.

Response schema: `MerchantConnectionResponse`.

```json
{
  "connection": {
    "id": "mch_6Wd3Lp8RtY2kVn5Q",
    "provider": "polar",
    "environment": "sandbox",
    "status": "active",
    "merchantAccountId": "8f2c1d9e-4b7a-4f3e-9c21-5a6b7d8e9f01",
    "keyFragment": "x7Qa",
    "guard": {
      "enabled": false,
      "productIds": [],
      "meterId": null
    },
    "configVersion": 1,
    "createdAt": "2026-07-10T10:00:00.000Z",
    "updatedAt": "2026-07-10T10:00:00.000Z"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/merchant-connection" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/merchant-connection [#create-merchant-connection]

Create a merchant connection.

Connects your Polar or Dodo account so your end users' model-token usage is sent to it. Blazing Agents checks the credential with your provider first, and afterwards shows only its last few characters. Creating a connection replaces your current one; events already recorded against the old connection keep being delivered. Customer bindings belong to a connection, so link your users again after you replace it. An enabled `guard` needs at least one entry in `productIds` or a `meterId`. Monetization stays off until you set `monetizationEnabled` on your tenant.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `provider` | string | body | required | Your billing provider: `polar` or `dodo`. One of `polar`, `dodo`. |
| `environment` | string | body | required | The provider environment to send usage to: `sandbox` or `live`. One of `sandbox`, `live`. |
| `credential` | string | body | required | A credential for your provider account: a Polar Organization Access Token, or a Dodo API key in the mode that matches `environment`. It is never returned. |
| `guard` | object | body |  | Check each end user's plan or balance with your provider before every turn starts. Off when left out. |

#### Response

Returns `201 Created` as `application/json`. The created merchant connection.

Response schema: `MerchantConnectionResponse`.

```json
{
  "connection": {
    "id": "mch_6Wd3Lp8RtY2kVn5Q",
    "provider": "polar",
    "environment": "sandbox",
    "status": "active",
    "merchantAccountId": "8f2c1d9e-4b7a-4f3e-9c21-5a6b7d8e9f01",
    "keyFragment": "x7Qa",
    "guard": {
      "enabled": false,
      "productIds": [],
      "meterId": null
    },
    "configVersion": 1,
    "createdAt": "2026-07-10T10:00:00.000Z",
    "updatedAt": "2026-07-10T10:00:00.000Z"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `422` | [`merchant_credential_invalid`](/api-reference/protocols/errors#merchant_credential_invalid) | The request was understood but rejected |
| `503` | [`merchant_provider_unavailable`](/api-reference/protocols/errors#merchant_provider_unavailable) | The service is temporarily unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/merchant-connection" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"provider":"polar","environment":"sandbox","credential":"polar_oat_3kF8sL2qW9xZ7vB4nM6tY1cR5dH0jP"}'
```

### PATCH /v1/merchant-connection [#update-merchant-connection]

Update the merchant connection.

Changes your current merchant connection's status or guard, or rotates its credential. Fields you leave out keep their current value. A new `credential` is checked with your provider and must belong to the same merchant account; to switch accounts, create a new connection instead. A `guard` replaces the whole guard, and an enabled guard needs at least one entry in `productIds` or a `meterId`.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `credential` | string | body |  | A replacement credential. It must belong to the same merchant account as the current one. |
| `status` | string | body |  | `active` sends usage events to your provider. While `disconnected`, deliveries fail and can be retried after you set it back to `active`, and turns are refused if the guard is on. One of `active`, `disconnected`. |
| `guard` | object | body |  | The complete guard configuration, replacing the current one. |

#### Response

Returns `200 OK` as `application/json`. The updated merchant connection.

Response schema: `MerchantConnectionResponse`.

```json
{
  "connection": {
    "id": "mch_6Wd3Lp8RtY2kVn5Q",
    "provider": "polar",
    "environment": "sandbox",
    "status": "active",
    "merchantAccountId": "8f2c1d9e-4b7a-4f3e-9c21-5a6b7d8e9f01",
    "keyFragment": "x7Qa",
    "guard": {
      "enabled": true,
      "productIds": [
        "prod_4Tq8Wn2Lx6Rv"
      ],
      "meterId": null
    },
    "configVersion": 2,
    "createdAt": "2026-07-10T10:00:00.000Z",
    "updatedAt": "2026-07-10T10:20:00.000Z"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`merchant_connection_not_found`](/api-reference/protocols/errors#merchant_connection_not_found) | The resource was not found |
| `409` | [`merchant_account_mismatch`](/api-reference/protocols/errors#merchant_account_mismatch) | The request conflicts with the resource's current state |
| `422` | [`merchant_credential_invalid`](/api-reference/protocols/errors#merchant_credential_invalid) | The request was understood but rejected |
| `503` | [`merchant_provider_unavailable`](/api-reference/protocols/errors#merchant_provider_unavailable) | The service is temporarily unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PATCH "$BLAZING_AGENTS_BASE_URL/v1/merchant-connection" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"guard":{"enabled":true,"productIds":["prod_4Tq8Wn2Lx6Rv"],"meterId":null}}'
```

### DELETE /v1/merchant-connection [#retire-merchant-connection]

Retire the merchant connection.

Retires your current merchant connection. New usage is no longer recorded against it, but events already recorded keep being delivered with its credential. Create a new connection to start again.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

There are no parameters and no request body.

#### Response

Returns `204 No Content`. The connection was retired.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`merchant_connection_not_found`](/api-reference/protocols/errors#merchant_connection_not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/merchant-connection" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/merchant-connection/bindings [#list-merchant-bindings]

List merchant bindings.

Lists the links between your end users and your provider's customers on your current merchant connection, sorted by `userId`. Pass `nextCursor` as `cursor` to get the next page; it is `null` on the last page.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `userId` | string | query |  | Return only the binding for this end user. |
| `cursor` | string | query |  | The `nextCursor` from the previous page. |
| `limit` | integer | query |  | Bindings per page, from 1 to 200. 1–200. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. A page of bindings.

Response schema: `MerchantBindingList`.

```json
{
  "bindings": [
    {
      "userId": "app:user-42",
      "customerId": "cus_9aB3dE5fG7hJ",
      "createdAt": "2026-07-10T10:05:00.000Z",
      "updatedAt": "2026-07-10T10:05:00.000Z"
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
| `404` | [`merchant_connection_not_found`](/api-reference/protocols/errors#merchant_connection_not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/merchant-connection/bindings" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### PUT /v1/merchant-connection/bindings/:userId [#set-merchant-binding]

Set a merchant binding.

Links one of your end users to a customer in your billing provider, or changes the customer an existing link points to. Blazing Agents checks that the customer exists first. Usage for that user is then sent to this customer. Events already held as `unmapped` stay held until you release them.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication) and a JSON body.

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `userId` | string | path | required | Your end user's ID, the `userId` you send with turns. |
| `customerId` | string | body | required | The ID of the customer in your billing provider. |

#### Response

Returns `200 OK` as `application/json`. The binding.

Response schema: `MerchantBindingResponse`.

```json
{
  "binding": {
    "userId": "app:user-42",
    "customerId": "cus_9aB3dE5fG7hJ",
    "createdAt": "2026-07-10T10:05:00.000Z",
    "updatedAt": "2026-07-10T10:05:00.000Z"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`merchant_connection_not_found`](/api-reference/protocols/errors#merchant_connection_not_found) | The resource was not found |
| `422` | [`merchant_customer_not_found`](/api-reference/protocols/errors#merchant_customer_not_found) | The request was understood but rejected |
| `503` | [`merchant_provider_unavailable`](/api-reference/protocols/errors#merchant_provider_unavailable) | The service is temporarily unavailable |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request PUT "$BLAZING_AGENTS_BASE_URL/v1/merchant-connection/bindings/$USER_ID" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"customerId":"cus_9aB3dE5fG7hJ"}'
```

### DELETE /v1/merchant-connection/bindings/:userId [#delete-merchant-binding]

Delete a merchant binding.

Removes the link between one of your end users and their customer on your current merchant connection. Usage for that user is then held as `unmapped` until you link them again.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `userId` | string | path | required | Your end user's ID, the `userId` you send with turns. |

#### Response

Returns `204 No Content`. The binding was deleted.

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`merchant_connection_not_found`](/api-reference/protocols/errors#merchant_connection_not_found), [`merchant_binding_not_found`](/api-reference/protocols/errors#merchant_binding_not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request DELETE "$BLAZING_AGENTS_BASE_URL/v1/merchant-connection/bindings/$USER_ID" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/merchant-usage-events [#list-merchant-usage-events]

List merchant usage events.

Lists the usage events Blazing Agents records for your billing provider, one per turn, newest first. Each event has a delivery `status` and a suggested `nextAction`: `wait`, `retry`, `bind_and_release`, `investigate`, `discard`, or `none`. `workflowIssue` is set when automatic delivery has given up on a `pending` event. Pass `nextCursor` as `cursor` to get the next page; it is `null` on the last page.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `status` | string | query |  | Return only events with this delivery status. One of `pending`, `accepted`, `failed`, `uncertain`, `unmapped`, `incomplete`, `discarded`, `expired`. |
| `cursor` | string | query |  | The `nextCursor` from the previous page. |
| `limit` | integer | query |  | Events per page, from 1 to 200. 1–200. Defaults to `50`. |

#### Response

Returns `200 OK` as `application/json`. A page of events.

Response schema: `MerchantUsageEventList`.

```json
{
  "events": [
    {
      "id": "mev_2Hs8Kq4ZpX6cWm1T",
      "turnId": "turn_5Nf7Gb2VcL9xRk3P",
      "connectionId": "mch_6Wd3Lp8RtY2kVn5Q",
      "provider": "polar",
      "userId": "app:user-42",
      "customerId": "cus_9aB3dE5fG7hJ",
      "agentId": "ag_4kP9sT2vXq7LmN3a",
      "sessionId": "ss_7Yt2Mv5QbN8dKs4W",
      "model": "openai/gpt-6-luna",
      "modelProvider": "openrouter",
      "inputTokens": 1840,
      "outputTokens": 612,
      "totalTokens": 2452,
      "turnStatus": "succeeded",
      "startedAt": "2026-07-10T10:12:00.000Z",
      "occurredAt": "2026-07-10T10:12:09.000Z",
      "status": "accepted",
      "payload": {
        "events": [
          {
            "customer_id": "cus_9aB3dE5fG7hJ",
            "external_id": "mev_2Hs8Kq4ZpX6cWm1T",
            "metadata": {
              "agent_id": "ag_4kP9sT2vXq7LmN3a",
              "ba_event_id": "mev_2Hs8Kq4ZpX6cWm1T",
              "input_tokens": 1840,
              "model": "openai/gpt-6-luna",
              "model_provider": "openrouter",
              "output_tokens": 612,
              "session_id": "ss_7Yt2Mv5QbN8dKs4W",
              "status": "succeeded",
              "total_tokens": 2452,
              "turn_id": "turn_5Nf7Gb2VcL9xRk3P"
            },
            "name": "ba.model_tokens.v1",
            "timestamp": "2026-07-10T10:12:09.000Z"
          }
        ]
      },
      "attemptCount": 1,
      "attemptGeneration": 0,
      "lastAttemptAt": "2026-07-10T10:12:10.000Z",
      "lastErrorCode": null,
      "acceptedAt": "2026-07-10T10:12:10.000Z",
      "workflowIssue": null,
      "nextAction": "none"
    },
    {
      "id": "mev_2Hs8Kq4ZpX6cWm1T",
      "turnId": "turn_5Nf7Gb2VcL9xRk3P",
      "connectionId": "mch_6Wd3Lp8RtY2kVn5Q",
      "provider": "polar",
      "userId": "app:user-42",
      "customerId": null,
      "agentId": "ag_4kP9sT2vXq7LmN3a",
      "sessionId": "ss_7Yt2Mv5QbN8dKs4W",
      "model": "openai/gpt-6-luna",
      "modelProvider": "openrouter",
      "inputTokens": 1840,
      "outputTokens": 612,
      "totalTokens": 2452,
      "turnStatus": "succeeded",
      "startedAt": "2026-07-10T10:12:00.000Z",
      "occurredAt": "2026-07-10T10:12:09.000Z",
      "status": "unmapped",
      "payload": null,
      "attemptCount": 0,
      "attemptGeneration": 0,
      "lastAttemptAt": null,
      "lastErrorCode": null,
      "acceptedAt": null,
      "workflowIssue": null,
      "nextAction": "bind_and_release"
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
curl "$BLAZING_AGENTS_BASE_URL/v1/merchant-usage-events" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/merchant-usage-events/summary [#get-merchant-usage-summary]

Get merchant usage summary.

Shows at a glance whether usage is reaching your billing provider: all-time event counts per delivery status, when an event was last accepted, when the oldest pending event happened, and a daily series of accepted events and tokens against pending events for the last `days` UTC days.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `days` | integer | query |  | UTC days in the `daily` series, ending today, from 1 to 90. 1–90. Defaults to `14`. |

#### Response

Returns `200 OK` as `application/json`. The delivery summary.

Response schema: `MerchantUsageSummary`.

```json
{
  "summary": {
    "counts": {
      "pending": 2,
      "accepted": 318,
      "uncertain": 0,
      "failed": 1,
      "unmapped": 3,
      "incomplete": 0,
      "expired": 0,
      "discarded": 4
    },
    "lastAcceptedAt": "2026-07-10T10:12:10.000Z",
    "oldestPendingOccurredAt": "2026-07-10T10:14:02.000Z",
    "daily": [
      {
        "day": "2026-07-09",
        "acceptedEvents": 41,
        "acceptedTokens": 98430,
        "pendingEvents": 0
      },
      {
        "day": "2026-07-10",
        "acceptedEvents": 27,
        "acceptedTokens": 61205,
        "pendingEvents": 2
      }
    ]
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/merchant-usage-events/summary" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### GET /v1/merchant-usage-events/:eventId [#get-merchant-usage-event]

Get a merchant usage event.

Returns one usage event with its delivery `status`, suggested `nextAction`, and the exact `payload` sent to your provider. `payload` is `null` for `unmapped` and `incomplete` events, and can be `null` for `discarded` ones.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `eventId` | string | path | required | ID of the merchant usage event. |

#### Response

Returns `200 OK` as `application/json`. The merchant usage event.

Response schema: `MerchantUsageEventResponse`.

```json
{
  "event": {
    "id": "mev_2Hs8Kq4ZpX6cWm1T",
    "turnId": "turn_5Nf7Gb2VcL9xRk3P",
    "connectionId": "mch_6Wd3Lp8RtY2kVn5Q",
    "provider": "polar",
    "userId": "app:user-42",
    "customerId": "cus_9aB3dE5fG7hJ",
    "agentId": "ag_4kP9sT2vXq7LmN3a",
    "sessionId": "ss_7Yt2Mv5QbN8dKs4W",
    "model": "openai/gpt-6-luna",
    "modelProvider": "openrouter",
    "inputTokens": 1840,
    "outputTokens": 612,
    "totalTokens": 2452,
    "turnStatus": "succeeded",
    "startedAt": "2026-07-10T10:12:00.000Z",
    "occurredAt": "2026-07-10T10:12:09.000Z",
    "status": "accepted",
    "payload": {
      "events": [
        {
          "customer_id": "cus_9aB3dE5fG7hJ",
          "external_id": "mev_2Hs8Kq4ZpX6cWm1T",
          "metadata": {
            "agent_id": "ag_4kP9sT2vXq7LmN3a",
            "ba_event_id": "mev_2Hs8Kq4ZpX6cWm1T",
            "input_tokens": 1840,
            "model": "openai/gpt-6-luna",
            "model_provider": "openrouter",
            "output_tokens": 612,
            "session_id": "ss_7Yt2Mv5QbN8dKs4W",
            "status": "succeeded",
            "total_tokens": 2452,
            "turn_id": "turn_5Nf7Gb2VcL9xRk3P"
          },
          "name": "ba.model_tokens.v1",
          "timestamp": "2026-07-10T10:12:09.000Z"
        }
      ]
    },
    "attemptCount": 1,
    "attemptGeneration": 0,
    "lastAttemptAt": "2026-07-10T10:12:10.000Z",
    "lastErrorCode": null,
    "acceptedAt": "2026-07-10T10:12:10.000Z",
    "workflowIssue": null,
    "nextAction": "none"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`merchant_event_not_found`](/api-reference/protocols/errors#merchant_event_not_found) | The resource was not found |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl "$BLAZING_AGENTS_BASE_URL/v1/merchant-usage-events/mev_1234567890ABCDEF" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/merchant-usage-events/:eventId/retry [#retry-merchant-usage-event]

Retry a merchant usage event.

Sends a `failed` or `uncertain` event to your provider again, or a `pending` event that automatic delivery gave up on. The event goes back to `pending` with the same payload. Retrying is safe: your provider drops duplicates by the event ID. Fix the cause of a `failed` event, such as a revoked credential, before you retry it.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `eventId` | string | path | required | ID of the merchant usage event. |

#### Response

Returns `200 OK` as `application/json`. The event, pending delivery again.

Response schema: `MerchantUsageEventResponse`.

```json
{
  "event": {
    "id": "mev_2Hs8Kq4ZpX6cWm1T",
    "turnId": "turn_5Nf7Gb2VcL9xRk3P",
    "connectionId": "mch_6Wd3Lp8RtY2kVn5Q",
    "provider": "polar",
    "userId": "app:user-42",
    "customerId": "cus_9aB3dE5fG7hJ",
    "agentId": "ag_4kP9sT2vXq7LmN3a",
    "sessionId": "ss_7Yt2Mv5QbN8dKs4W",
    "model": "openai/gpt-6-luna",
    "modelProvider": "openrouter",
    "inputTokens": 1840,
    "outputTokens": 612,
    "totalTokens": 2452,
    "turnStatus": "succeeded",
    "startedAt": "2026-07-10T10:12:00.000Z",
    "occurredAt": "2026-07-10T10:12:09.000Z",
    "status": "pending",
    "payload": {
      "events": [
        {
          "customer_id": "cus_9aB3dE5fG7hJ",
          "external_id": "mev_2Hs8Kq4ZpX6cWm1T",
          "metadata": {
            "agent_id": "ag_4kP9sT2vXq7LmN3a",
            "ba_event_id": "mev_2Hs8Kq4ZpX6cWm1T",
            "input_tokens": 1840,
            "model": "openai/gpt-6-luna",
            "model_provider": "openrouter",
            "output_tokens": 612,
            "session_id": "ss_7Yt2Mv5QbN8dKs4W",
            "status": "succeeded",
            "total_tokens": 2452,
            "turn_id": "turn_5Nf7Gb2VcL9xRk3P"
          },
          "name": "ba.model_tokens.v1",
          "timestamp": "2026-07-10T10:12:09.000Z"
        }
      ]
    },
    "attemptCount": 1,
    "attemptGeneration": 1,
    "lastAttemptAt": "2026-07-10T10:12:10.000Z",
    "lastErrorCode": null,
    "acceptedAt": null,
    "workflowIssue": null,
    "nextAction": "wait"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`merchant_event_not_found`](/api-reference/protocols/errors#merchant_event_not_found) | The resource was not found |
| `409` | [`merchant_event_state_conflict`](/api-reference/protocols/errors#merchant_event_state_conflict) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/merchant-usage-events/mev_1234567890ABCDEF/retry" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/merchant-usage-events/:eventId/release [#release-merchant-usage-event]

Release a merchant usage event.

Sends an `unmapped` event to your provider after you link its user to a customer. Link the user on your current merchant connection with `PUT /v1/merchant-connection/bindings/{userId}` first. The event takes that customer, gets its payload, and goes to `pending`.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `eventId` | string | path | required | ID of the merchant usage event. |

#### Response

Returns `200 OK` as `application/json`. The event, pending delivery.

Response schema: `MerchantUsageEventResponse`.

```json
{
  "event": {
    "id": "mev_2Hs8Kq4ZpX6cWm1T",
    "turnId": "turn_5Nf7Gb2VcL9xRk3P",
    "connectionId": "mch_6Wd3Lp8RtY2kVn5Q",
    "provider": "polar",
    "userId": "app:user-42",
    "customerId": "cus_9aB3dE5fG7hJ",
    "agentId": "ag_4kP9sT2vXq7LmN3a",
    "sessionId": "ss_7Yt2Mv5QbN8dKs4W",
    "model": "openai/gpt-6-luna",
    "modelProvider": "openrouter",
    "inputTokens": 1840,
    "outputTokens": 612,
    "totalTokens": 2452,
    "turnStatus": "succeeded",
    "startedAt": "2026-07-10T10:12:00.000Z",
    "occurredAt": "2026-07-10T10:12:09.000Z",
    "status": "pending",
    "payload": {
      "events": [
        {
          "customer_id": "cus_9aB3dE5fG7hJ",
          "external_id": "mev_2Hs8Kq4ZpX6cWm1T",
          "metadata": {
            "agent_id": "ag_4kP9sT2vXq7LmN3a",
            "ba_event_id": "mev_2Hs8Kq4ZpX6cWm1T",
            "input_tokens": 1840,
            "model": "openai/gpt-6-luna",
            "model_provider": "openrouter",
            "output_tokens": 612,
            "session_id": "ss_7Yt2Mv5QbN8dKs4W",
            "status": "succeeded",
            "total_tokens": 2452,
            "turn_id": "turn_5Nf7Gb2VcL9xRk3P"
          },
          "name": "ba.model_tokens.v1",
          "timestamp": "2026-07-10T10:12:09.000Z"
        }
      ]
    },
    "attemptCount": 1,
    "attemptGeneration": 1,
    "lastAttemptAt": "2026-07-10T10:12:10.000Z",
    "lastErrorCode": null,
    "acceptedAt": null,
    "workflowIssue": null,
    "nextAction": "wait"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`merchant_event_not_found`](/api-reference/protocols/errors#merchant_event_not_found), [`merchant_connection_not_found`](/api-reference/protocols/errors#merchant_connection_not_found) | The resource was not found |
| `409` | [`merchant_event_state_conflict`](/api-reference/protocols/errors#merchant_event_state_conflict), [`merchant_binding_required`](/api-reference/protocols/errors#merchant_binding_required) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/merchant-usage-events/mev_1234567890ABCDEF/release" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

### POST /v1/merchant-usage-events/:eventId/discard [#discard-merchant-usage-event]

Discard a merchant usage event.

Marks an `unmapped`, `incomplete`, `failed`, `uncertain`, or `expired` event as `discarded`, so Blazing Agents stops trying to deliver it. The event stays in the list. Correct an `expired` event in your provider directly.

#### Request

Requires [bearer authentication](/api-reference/rest-api/authentication).

| Field | Type | Location | Required | Description |
| --- | --- | --- | --- | --- |
| `eventId` | string | path | required | ID of the merchant usage event. |

#### Response

Returns `200 OK` as `application/json`. The discarded event.

Response schema: `MerchantUsageEventResponse`.

```json
{
  "event": {
    "id": "mev_2Hs8Kq4ZpX6cWm1T",
    "turnId": "turn_5Nf7Gb2VcL9xRk3P",
    "connectionId": "mch_6Wd3Lp8RtY2kVn5Q",
    "provider": "polar",
    "userId": "app:user-42",
    "customerId": "cus_9aB3dE5fG7hJ",
    "agentId": "ag_4kP9sT2vXq7LmN3a",
    "sessionId": "ss_7Yt2Mv5QbN8dKs4W",
    "model": "openai/gpt-6-luna",
    "modelProvider": "openrouter",
    "inputTokens": 1840,
    "outputTokens": 612,
    "totalTokens": 2452,
    "turnStatus": "succeeded",
    "startedAt": "2026-07-10T10:12:00.000Z",
    "occurredAt": "2026-07-10T10:12:09.000Z",
    "status": "discarded",
    "payload": {
      "events": [
        {
          "customer_id": "cus_9aB3dE5fG7hJ",
          "external_id": "mev_2Hs8Kq4ZpX6cWm1T",
          "metadata": {
            "agent_id": "ag_4kP9sT2vXq7LmN3a",
            "ba_event_id": "mev_2Hs8Kq4ZpX6cWm1T",
            "input_tokens": 1840,
            "model": "openai/gpt-6-luna",
            "model_provider": "openrouter",
            "output_tokens": 612,
            "session_id": "ss_7Yt2Mv5QbN8dKs4W",
            "status": "succeeded",
            "total_tokens": 2452,
            "turn_id": "turn_5Nf7Gb2VcL9xRk3P"
          },
          "name": "ba.model_tokens.v1",
          "timestamp": "2026-07-10T10:12:09.000Z"
        }
      ]
    },
    "attemptCount": 1,
    "attemptGeneration": 0,
    "lastAttemptAt": "2026-07-10T10:12:10.000Z",
    "lastErrorCode": "MERCHANT_CREDENTIAL_REJECTED",
    "acceptedAt": null,
    "workflowIssue": null,
    "nextAction": "none"
  }
}
```

#### Errors

| Status | Codes | Description |
| --- | --- | --- |
| `400` | [`validation_failed`](/api-reference/protocols/errors#validation_failed) | The request is invalid |
| `401` | [`unauthorized`](/api-reference/protocols/errors#unauthorized) | The credential is missing or invalid |
| `402` | [`subscription_required`](/api-reference/protocols/errors#subscription_required) | An active subscription or usage credit is required |
| `404` | [`merchant_event_not_found`](/api-reference/protocols/errors#merchant_event_not_found) | The resource was not found |
| `409` | [`merchant_event_state_conflict`](/api-reference/protocols/errors#merchant_event_state_conflict) | The request conflicts with the resource's current state |

See [REST errors](/api-reference/protocols/errors) for the error envelope and shared codes.

#### cURL

```bash
curl --request POST "$BLAZING_AGENTS_BASE_URL/v1/merchant-usage-events/mev_1234567890ABCDEF/discard" \
  --header "Authorization: Bearer $BLAZING_AGENTS_API_KEY"
```

## Next [#next]

- [Bill your users for model tokens](/platform/monetization) to set up prices and guard rules.
- [Usage API](/api-reference/rest-api/usage) to query the tokens behind each event.
