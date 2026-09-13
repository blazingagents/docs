---
title: Chat integrations
description: Configure Slack and Telegram connections with the Python SDK.
---

# Chat integrations

Use `client.chat_connections` (SDK 0.6.0+) to connect an existing Agent to Slack or
Telegram. BA receives messages, maintains Sessions, and sends replies and approval
buttons. Credentials are write-only. Both `BlazingAgents` and `AsyncBlazingAgents`
provide these methods; await calls on the asynchronous client.

## Create a Telegram connection

Run this in a trusted environment with the environment variables below. Set the
base URL to your BA API origin without `/v1`.

```python
import os
from blazing_agents import BlazingAgents

base_url = os.environ["BLAZING_AGENTS_BASE_URL"]
with BlazingAgents(
    api_key=os.environ["BLAZING_AGENTS_API_KEY"], base_url=base_url
) as client:
    connection = client.chat_connections.create(
        name="Support on Telegram",
        agent_id=os.environ["BA_AGENT_ID"],
        platform="telegram",
        enabled=False,
        configuration={
            "bot_id": os.environ["TELEGRAM_BOT_ID"],
            "webhook_url": f"{base_url}/v1/chat/webhooks/telegram/pending",
        },
        credentials={
            "bot_token": os.environ["TELEGRAM_BOT_TOKEN"],
            "webhook_secret": os.environ["TELEGRAM_WEBHOOK_SECRET"],
        },
    )
    webhook_url = f"{base_url}/v1/chat/webhooks/telegram/{connection.id}"
    client.chat_connections.update(connection.id, webhook_url=webhook_url)
    print(webhook_url)
```

Register the printed URL with Telegram using the same webhook secret. Then call
`client.chat_connections.check_health(connection.id)` and
`client.chat_connections.enable(connection.id)`, and send the bot a test message.
See [Slack and Telegram setup](/platform/chat-integrations) for registration
and permissions.

For Slack, use `platform="slack"`, configuration fields `team_id`, `app_id`, and
`webhook_url`, and credentials `bot_token` and `signing_secret`. Use `slack` in the
callback path. Optional `channel_ids` (Slack) and `chat_ids` (Telegram) select
health checks; they do not restrict who can message the bot.

## Manage connections

Resource IDs are positional; other fields are keyword arguments. All methods
accept optional `extra_headers` and `timeout`.

| Method | Arguments | Result |
| --- | --- | --- |
| `list()` | None | `ChatConnections` with `.chat_connections` |
| `get()` | Connection ID | `ChatConnection` |
| `create()` | `name`, `agent_id`, `platform`, `configuration`, `credentials`, optional `enabled` | `ChatConnection` |
| `update()` | Connection ID, at least one of `name` or `webhook_url` | `ChatConnection` |
| `rotate_credentials()` | Connection ID, `platform`, complete `credentials` dictionary | `ChatConnection` |
| `check_health()` | Connection ID | `ChatConnection` with refreshed health |
| `enable()` | Connection ID | `ChatConnection` |
| `disable()` | Connection ID | `ChatConnection` |
| `delete()` | Connection ID | `None` |

Responses include configuration, verified identity, health, and a credential
fragment, never the credentials. Health checks report `pass`, `fail`, or `unknown`;
verify unknown settings manually. A valid token alone does not prove delivery.

Creation defaults to enabled; the example keeps intake disabled during setup.
Update changes only the name or saved callback URL. Credential rotation requires
the complete credential bundle for the same installation. Changing the Agent or
bot requires a new connection. Registration with Slack or Telegram remains a
separate action, including updating Telegram's registered secret after rotation.

If creation times out, list connections before retrying. If saving the callback
fails, update the existing connection. See the
[REST reference](/api-reference/rest-api/chat-connections) for API errors.
