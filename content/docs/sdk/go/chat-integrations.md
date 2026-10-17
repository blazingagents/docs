---
title: Chat integrations
description: Connect an agent to your own Slack app or Telegram bot with the Go SDK.
---

# Chat integrations

`client.ChatConnections` connects an agent to your own Slack app or Telegram bot so people can talk to it there. `client.ChatDeliveries` lists replies and approval buttons that failed or may not have arrived, across every connection. Both are tenant only: a `*ba.UserClient` has neither.

Examples are function bodies that receive `ctx context.Context`, `client *ba.Client`, `agentID ba.AgentID`, and `sessionID ba.SessionID`, and return an `error`. Every method also takes the per-call options `ba.WithRequestTimeout`, `ba.WithRequestHeader`, `ba.WithClientRequestID`, and `ba.CaptureResponse`.

```go
connection, err := client.ChatConnections.Create(ctx, ba.TelegramConnection{
	AgentID:     agentID,
	Name:        "Support bot",
	Credentials: ba.TelegramCredentials{BotToken: ba.NewSecret(os.Getenv("TELEGRAM_BOT_TOKEN"))},
})
if err != nil {
	return err
}
fmt.Println(connection.WebhookURL)
return nil
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`List`](#list) | List chat connections | [`[]ChatConnection`](#chatconnection) |
| [`Get`](#get) | Get one connection | [`*ChatConnection`](#chatconnection) |
| [`Create`](#create) | Connect an agent to a platform | [`*ChatConnection`](#chatconnection) |
| [`Update`](#update) | Change name or configuration | [`*ChatConnection`](#chatconnection) |
| [`RotateCredentials`](#rotate-credentials) | Replace credentials | [`*ChatConnection`](#chatconnection) |
| [`CheckHealth`](#check-health) | Check the connection against its platform | [`*ChatConnection`](#chatconnection) |
| [`Enable`](#enable) | Resume deliveries | [`*ChatConnection`](#chatconnection) |
| [`Disable`](#disable) | Pause deliveries | [`*ChatConnection`](#chatconnection) |
| [`Delete`](#delete) | Delete a connection | `error` |
| [`ListDeliveries`](#deliveries), `AllDeliveries` | List one connection's deliveries | [`*Page[ChatDelivery]`](#tenantchatdelivery) |
| [`RepairDelivery`](#repair-delivery) | Resend a failed or ambiguous delivery | [`*ChatDeliveryResult`](#chatdeliveryresult) |
| [`ChatDeliveries.List`](#list-deliveries), `All` | List failed and ambiguous deliveries tenant-wide | [`*Page[TenantChatDelivery]`](#tenantchatdelivery) |

## Methods [#methods]

### `List` [#list]

Lists chat connections.

```go
connections, err := client.ChatConnections.List(ctx)
if err != nil {
	return err
}
for _, connection := range connections {
	fmt.Println(connection.ID, connection.Name)
}
return nil
```

**Signature:** `func (s *ChatConnectionsService) List(ctx context.Context, opts ...RequestOption) ([]ChatConnection, error)`

Returns every [`ba.ChatConnection`](#chatconnection).

### `Get` [#get]

Gets one chat connection.

```go
connection, err := client.ChatConnections.Get(ctx, "cc_0123456789abcdef")
if err != nil {
	return err
}
fmt.Println(connection.Enabled)
return nil
```

**Signature:** `func (s *ChatConnectionsService) Get(ctx context.Context, connectionID ChatConnectionID, opts ...RequestOption) (*ChatConnection, error)`

Returns [`*ba.ChatConnection`](#chatconnection). Fails with `*ba.APIError` whose `Code` is [`validation_failed`](/api-reference/protocols/errors#validation_failed) or [`not_found`](/api-reference/protocols/errors#not_found).

### `Create` [#create]

Connects an agent to a chat platform. Credentials are never returned.

```go
connection, err := client.ChatConnections.Create(ctx, ba.SlackConnection{
	AgentID: agentID,
	Name:    "Support app",
	Credentials: ba.SlackCredentials{
		BotToken:      ba.NewSecret(os.Getenv("SLACK_BOT_TOKEN")),
		SigningSecret: ba.NewSecret(os.Getenv("SLACK_SIGNING_SECRET")),
	},
})
if err != nil {
	return err
}
fmt.Println(connection.WebhookURL)
return nil
```

**Signature:** `func (s *ChatConnectionsService) Create(ctx context.Context, params ChatConnectionSpec, opts ...RequestOption) (*ChatConnection, error)`

Pass a `ba.SlackConnection` or a `ba.TelegramConnection`. Both take `AgentID`, `Name`, `Credentials`, and an optional `Enabled` (default `true`). A Slack connection adds `ChannelIDs`, and a Telegram connection adds `ChatIDs` and `BusinessMode`. Each list takes up to 20 IDs that health checks look at without restricting who can talk to the agent.

Returns [`*ba.ChatConnection`](#chatconnection). If `AgentID` is the admin agent, `Create` fails with [`admin_agent_managed`](/api-reference/protocols/errors#admin_agent_managed) (HTTP `409`) and creates nothing. If creation times out, list your connections before retrying, since the first attempt may have succeeded. Fails with `validation_failed`, `not_found`, [`chat_webhook_conflict`](/api-reference/protocols/errors#chat_webhook_conflict), or [`chat_webhook_registration_failed`](/api-reference/protocols/errors#chat_webhook_registration_failed). If a response ever echoes credential material back, the call fails client-side with `*ba.CredentialEchoError` and the body is discarded.

### `Update` [#update]

Changes a chat connection's name or configuration. Set at least one field; the server rejects an empty update.

```go
connection, err := client.ChatConnections.Update(ctx, "cc_0123456789abcdef", ba.UpdateChatConnectionParams{
	Name: new("Support app v2"),
})
if err != nil {
	return err
}
fmt.Println(connection.Name)
return nil
```

**Signature:** `func (s *ChatConnectionsService) Update(ctx context.Context, connectionID ChatConnectionID, params UpdateChatConnectionParams, opts ...RequestOption) (*ChatConnection, error)`

| Field | Type | Description |
| --- | --- | --- |
| `Name` | `*string` | A new display name, 1 to 80 characters |
| `Configuration` | `*ba.ChatConfigurationUpdate` | `ChannelIDs` for Slack, or `ChatIDs` and `BusinessMode` for Telegram. Each list takes up to 20 IDs that health checks look at |

Returns [`*ba.ChatConnection`](#chatconnection). Fails with `validation_failed` or `not_found`.

### `RotateCredentials` [#rotate-credentials]

Replaces a chat connection's credentials. The platform must match the connection's.

```go
connection, err := client.ChatConnections.RotateCredentials(ctx, "cc_0123456789abcdef", ba.TelegramCredentials{
	BotToken: ba.NewSecret(os.Getenv("TELEGRAM_BOT_TOKEN")),
})
if err != nil {
	return err
}
fmt.Println(connection.CredentialVersion)
return nil
```

**Signature:** `func (s *ChatConnectionsService) RotateCredentials(ctx context.Context, connectionID ChatConnectionID, params ChatCredentials, opts ...RequestOption) (*ChatConnection, error)`

Pass `ba.SlackCredentials{BotToken: ..., SigningSecret: ...}` or `ba.TelegramCredentials{BotToken: ...}`. Returns [`*ba.ChatConnection`](#chatconnection) with an incremented `CredentialVersion`. Fails with `validation_failed` or `not_found`.

### `CheckHealth` [#check-health]

Checks a chat connection against its platform.

```go
connection, err := client.ChatConnections.CheckHealth(ctx, "cc_0123456789abcdef")
if err != nil {
	return err
}
fmt.Println(connection.Health.TokenValid)
return nil
```

**Signature:** `func (s *ChatConnectionsService) CheckHealth(ctx context.Context, connectionID ChatConnectionID, opts ...RequestOption) (*ChatConnection, error)`

Returns [`*ba.ChatConnection`](#chatconnection) whose `Health` holds the last check. Fails with `validation_failed` or `not_found`.

### `Enable` [#enable]

Resumes deliveries on a chat connection.

```go
connection, err := client.ChatConnections.Enable(ctx, "cc_0123456789abcdef")
if err != nil {
	return err
}
fmt.Println(connection.Enabled)
return nil
```

**Signature:** `func (s *ChatConnectionsService) Enable(ctx context.Context, connectionID ChatConnectionID, opts ...RequestOption) (*ChatConnection, error)`

Returns [`*ba.ChatConnection`](#chatconnection) with `Enabled` `true`. Fails with `validation_failed` or `not_found`.

### `Disable` [#disable]

Pauses deliveries on a chat connection.

```go
connection, err := client.ChatConnections.Disable(ctx, "cc_0123456789abcdef")
if err != nil {
	return err
}
fmt.Println(connection.Enabled)
return nil
```

**Signature:** `func (s *ChatConnectionsService) Disable(ctx context.Context, connectionID ChatConnectionID, opts ...RequestOption) (*ChatConnection, error)`

Returns [`*ba.ChatConnection`](#chatconnection) with `Enabled` `false`. Fails with `validation_failed` or `not_found`.

### `Delete` [#delete]

Deletes a chat connection.

```go
return client.ChatConnections.Delete(ctx, "cc_0123456789abcdef")
```

**Signature:** `func (s *ChatConnectionsService) Delete(ctx context.Context, connectionID ChatConnectionID, opts ...RequestOption) error`

Fails with `validation_failed` or `not_found`.

### `ListDeliveries` [#deliveries]

Lists one chat connection's deliveries, newest first.

```go
page, err := client.ChatConnections.ListDeliveries(ctx, "cc_0123456789abcdef", ba.ListChatDeliveriesParams{})
if err != nil {
	return err
}
fmt.Println(len(page.Data))
return nil
```

**Signature:** `func (s *ChatConnectionsService) ListDeliveries(ctx context.Context, connectionID ChatConnectionID, params ListChatDeliveriesParams, opts ...RequestOption) (*Page[ChatDelivery], error)`

`Limit` takes 1 to 100 deliveries per page, defaulting to 100, and `Cursor` resumes from a `NextCursor`. Returns [`*ba.Page[ChatDelivery]`](#tenantchatdelivery); `AllDeliveries` walks every page lazily. Fails with `validation_failed`, `invalid_cursor`, or `not_found`.

### `RepairDelivery` [#repair-delivery]

Resends a failed or ambiguous delivery. `ExpectedAttempt` is the delivery's current `Attempt`, 0 to 99, and the repair is refused if it has changed. Calling it confirms the sender of the previous attempt has stopped, and that you accept the message may appear twice because the platform may already have it.

```go
result, err := client.ChatConnections.RepairDelivery(ctx, "cc_0123456789abcdef", "cd_0123456789abcdef", ba.RepairChatDeliveryParams{
	ExpectedAttempt: 1,
})
if err != nil {
	return err
}
fmt.Println(result.Status)
return nil
```

**Signature:** `func (s *ChatConnectionsService) RepairDelivery(ctx context.Context, connectionID ChatConnectionID, deliveryID ChatDeliveryID, params RepairChatDeliveryParams, opts ...RequestOption) (*ChatDeliveryResult, error)`

Returns [`*ba.ChatDeliveryResult`](#chatdeliveryresult). Fails with `validation_failed` or `not_found`.

### `ChatDeliveries.List` [#list-deliveries]

Lists failed and ambiguous deliveries across chat connections.

```go
page, err := client.ChatDeliveries.List(ctx, ba.ListTenantChatDeliveriesParams{
	Status: []ba.ChatDeliveryStatus{ba.ChatDeliveryStatusFailed},
})
if err != nil {
	return err
}
for _, delivery := range page.Data {
	fmt.Println(delivery.ID, delivery.Status)
}
return nil
```

**Signature:** `func (s *ChatDeliveriesService) List(ctx context.Context, params ListTenantChatDeliveriesParams, opts ...RequestOption) (*Page[TenantChatDelivery], error)`

| Field | Type | Description |
| --- | --- | --- |
| `Status` | `[]ba.ChatDeliveryStatus` | Only these statuses (`ba.ChatDeliveryStatusFailed`, `ba.ChatDeliveryStatusAmbiguous`), sent comma-separated; nil leaves the filter out |
| `Since` | `*time.Time` | Only deliveries created at or after this instant |
| `Cursor` | `*string` | The `NextCursor` of the previous page |
| `Limit` | `*int` | Page size, 1 to 100; defaults to 50 |

Returns [`*ba.Page[TenantChatDelivery]`](#tenantchatdelivery); `All` walks every page lazily. Fails with `validation_failed` or `invalid_cursor`.

## Response models [#response-models]

### `ChatConnection` [#chatconnection]

| Field | Type | Description |
| --- | --- | --- |
| `ID` | `ba.ChatConnectionID` | Connection ID (`cc_...`) |
| `TenantID` | `ba.TenantID` | Your tenant ID |
| `AgentID` | `ba.AgentID` | The agent that answers messages |
| `Name` | `string` | Display name |
| `Platform` | string enum | `slack` or `telegram` |
| `Enabled` | `bool` | Whether the connection accepts messages |
| `Configuration` | `ba.ChatConfiguration` | Platform settings: `ba.SlackConfiguration` with `ChannelIDs`, or `ba.TelegramConfiguration` with `BusinessMode` and `ChatIDs` |
| `Identity` | struct | The bot's identity on the platform |
| `Health` | struct | The last health check (`CheckedAt`, `TokenValid`, `IdentityVerified`, `Checks`) |
| `CredentialFragment` | `string` | Last characters of the credential, for display |
| `CredentialVersion` | `int64` | Incremented on each rotation |
| `WebhookURL` | `string` | The webhook URL registered with the platform |
| `CreatedAt`, `UpdatedAt` | timestamp | Timestamps |

### `TenantChatDelivery` [#tenantchatdelivery]

`ba.ChatDelivery` and `ba.TenantChatDelivery` share their fields; the tenant-wide entry adds `ConnectionID`, `AgentID`, and `Platform`.

| Field | Type | Description |
| --- | --- | --- |
| `ID` | `ba.ChatDeliveryID` | Delivery ID (`cd_...`) |
| `Kind` | string enum | `reply` or `card` |
| `Status` | `ba.ChatDeliveryStatus` | `pending`, `confirmed`, `failed`, or `ambiguous` |
| `Attempt` | `int64` | How many sends have been tried |
| `CredentialVersion` | `int64` | The credential version used |
| `Representation` | `string` | What the delivery sent, as text |
| `Diagnostic` | `*string` | Why it failed |
| `Receipts` | raw JSON | The platform's receipts, in its own shape |
| `SessionID` | `ba.SessionID` | The session the message belongs to |
| `MessageID` | `*string` | The message's ID, when one exists |
| `ApprovalID` | `*ba.ApprovalID` | The approval it answers, when it is one |
| `ThreadID` | `string` | The platform thread |
| `CreatedAt`, `UpdatedAt` | timestamp | Timestamps |

### `ChatDeliveryResult` [#chatdeliveryresult]

| Field | Type | Description |
| --- | --- | --- |
| `ID` | `ba.ChatDeliveryID` | The delivery's ID |
| `SessionID` | `ba.SessionID` | The session the message belongs to |
| `ThreadID` | `string` | The platform thread the delivery belongs to |
| `ConnectionID` | `ba.ChatConnectionID` | The connection the delivery went through |
| `Kind` | string enum | What the delivery carries |
| `Status` | `ba.ChatDeliveryStatus` | Where the delivery stands after the repair |
| `Attempt` | `int64` | How many sends have been tried |

## Next [#next]

- [Chat integrations](/platform/chat-integrations)
- [Agents](/sdk/go/agents)
