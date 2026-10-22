---
title: Chat integrations
description: Connect an agent to your own Slack app or Telegram bot with the Go SDK.
---

# Chat integrations

`client.ChatConnections` connects an agent to your own Slack app or Telegram bot so people can talk to it there. It is tenant only: a `*ba.UserClient` does not have it.

The turn that answers a Slack or Telegram message posts the reply and any approval card itself, retrying a failed post a few times. A reply that still fails stays in the session transcript, so you can read it with [`Sessions.ListMessages`](/sdk/go/sessions#messages).

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
| [`Enable`](#enable) | Accept messages again | [`*ChatConnection`](#chatconnection) |
| [`Disable`](#disable) | Stop accepting messages | [`*ChatConnection`](#chatconnection) |
| [`Delete`](#delete) | Delete a connection | `error` |

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

Pass a `ba.SlackConnection` or a `ba.TelegramConnection`. Both take `AgentID`, `Name`, `Credentials`, and an optional `Enabled` (default `true`). A Slack connection adds `ChannelIDs`, and a Telegram connection adds `ChatIDs` and `BusinessMode`. Each list takes IDs, within the [chat connection limits](/api-reference/protocols/service-limits#chat-connection-fields), that health checks look at without restricting who can talk to the agent.

Returns [`*ba.ChatConnection`](#chatconnection). If `AgentID` is the admin agent, `Create` fails with [`admin_agent_managed`](/api-reference/protocols/errors#admin_agent_managed) (HTTP `409`) and creates nothing. If creation times out, list your connections before retrying, since the first attempt may have succeeded. Creating an enabled Telegram connection registers its webhook. If that registration fails, `Create` still returns the connection, saved with `Enabled` `false` and a failing `webhook_url` health check; fix the bot, then call [`Enable`](#enable) to register again. Fails with `validation_failed`, `not_found`, or [`invalid_request`](/api-reference/protocols/errors#invalid_request) when the credentials fail the platform's check or the bot installation already has a connection. If a response ever echoes credential material back, the call fails client-side with `*ba.CredentialEchoError` and the body is discarded.

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
| `Name` | `*string` | A new display name within the [chat connection limits](/api-reference/protocols/service-limits#chat-connection-fields) |
| `Configuration` | `*ba.ChatConfigurationUpdate` | `ChannelIDs` for Slack, or `ChatIDs` and `BusinessMode` for Telegram. Each list takes IDs, within the [chat connection limits](/api-reference/protocols/service-limits#chat-connection-fields), that health checks look at |

Changing `BusinessMode` on an enabled Telegram connection registers its webhook again. If that fails, your change is still saved and the call fails with [`chat_webhook_conflict`](/api-reference/protocols/errors#chat_webhook_conflict) when the bot sends updates to another webhook, or [`chat_webhook_registration_failed`](/api-reference/protocols/errors#chat_webhook_registration_failed) otherwise; call [`Enable`](#enable) to retry. Returns [`*ba.ChatConnection`](#chatconnection). Also fails with `validation_failed`, `invalid_request` when the configuration does not match the connection's platform, or `not_found`.

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

Pass `ba.SlackCredentials{BotToken: ..., SigningSecret: ...}` or `ba.TelegramCredentials{BotToken: ...}`. Returns [`*ba.ChatConnection`](#chatconnection) with an incremented `CredentialVersion`. On an enabled Telegram connection, the webhook is registered again with a new secret. If that fails, the new credentials are still saved and the call fails with `chat_webhook_conflict` or `chat_webhook_registration_failed`; call [`Enable`](#enable) to retry. Also fails with `validation_failed`, `invalid_request` when the credentials are for another platform or bot or fail the platform's check, or `not_found`.

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

Lets a chat connection accept messages again.

```go
connection, err := client.ChatConnections.Enable(ctx, "cc_0123456789abcdef")
if err != nil {
	return err
}
fmt.Println(connection.Enabled)
return nil
```

**Signature:** `func (s *ChatConnectionsService) Enable(ctx context.Context, connectionID ChatConnectionID, opts ...RequestOption) (*ChatConnection, error)`

Returns [`*ba.ChatConnection`](#chatconnection) with `Enabled` `true`. Messages sent while the connection was disabled are not replayed. For Telegram, the webhook is registered first. If the bot already sends updates to a webhook outside Blazing Agents, the call fails with `chat_webhook_conflict`; remove that webhook and try again. Any other registration failure returns `chat_webhook_registration_failed`, and the connection stays disabled. Also fails with `validation_failed` or `not_found`.

### `Disable` [#disable]

Stops a chat connection from accepting messages.

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

## Response models [#response-models]

### `ChatConnection` [#chatconnection]

| Field | Type | Description |
| --- | --- | --- |
| `ID` | `ba.ChatConnectionID` | Connection ID (`cc_...`) |
| `TenantID` | `ba.TenantID` | Your tenant ID |
| `AgentID` | `ba.AgentID` | The agent that answers messages |
| `Name` | `string` | Display name |
| `Platform` | `ba.ChatPlatform` | `ba.ChatPlatformSlack` or `ba.ChatPlatformTelegram` |
| `Enabled` | `bool` | Whether the connection accepts messages |
| `Configuration` | `ba.ChatConfiguration` | Platform settings: `ba.SlackConfiguration` with `ChannelIDs`, or `ba.TelegramConfiguration` with `BusinessMode` and `ChatIDs` |
| `Identity` | `ba.ChatIdentity` | The bot's identity on the platform (`BotID`, `BotUserID`, `TeamID`, `AppID`) |
| `Health` | `ba.ChatHealth` | The last health check (`CheckedAt`, `TokenValid`, `IdentityVerified`, and `Checks`, a `[]ba.ChatHealthCheck`) |
| `CredentialFragment` | `string` | Last characters of the credential, for display |
| `CredentialVersion` | `int64` | Incremented on each rotation |
| `WebhookURL` | `string` | The webhook URL registered with the platform |
| `CreatedAt`, `UpdatedAt` | `time.Time` | Timestamps |

## Next [#next]

- [Chat integrations](/platform/chat-integrations)
- [Agents](/sdk/go/agents)
