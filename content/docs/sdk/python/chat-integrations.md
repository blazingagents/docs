---
title: Chat integrations
description: Configure Slack and Telegram connections with the Python SDK.
---

# Chat integrations

Use `client.chat_connections` (SDK 0.7.0+) to connect an existing Agent to Slack or
Telegram. BA receives messages, maintains Sessions, and sends replies and approval
buttons. Credentials are write-only. Both `BlazingAgents` and `AsyncBlazingAgents`
provide these methods; await calls on the asynchronous client.

## Create a Telegram connection

Run this in a trusted environment with the environment variables below.

```python
import os
from blazing_agents import BlazingAgents

with BlazingAgents(api_key=os.environ["BLAZING_AGENTS_API_KEY"]) as client:
    connection = client.chat_connections.create(
        name="Support on Telegram",
        agent_id=os.environ["BA_AGENT_ID"],
        platform="telegram",
        enabled=False,
        configuration={"business_mode": False},
        credentials={"bot_token": os.environ["TELEGRAM_BOT_TOKEN"]},
    )
    print(connection.webhook_url)
    client.chat_connections.enable(connection.id)
```

BA generates the Telegram webhook secret and registers the returned URL when
enabled. Call `client.chat_connections.check_health(connection.id)`, require the
`webhook_url` check to pass, and send the bot a test message.

For Slack, use `platform="slack"`, credentials `bot_token` and `signing_secret`,
and paste the returned `webhook_url` into Slack. Optional `channel_ids` (Slack),
`chat_ids` (Telegram), and Telegram `business_mode` configure health probes and
registration; destination IDs are not access restrictions.

## Manage connections

Resource IDs are positional; other fields are keyword arguments. All methods
accept optional `extra_headers` and `timeout`.

| Method | Arguments | Result |
| --- | --- | --- |
| `list()` | None | `ChatConnections` with `.chat_connections` |
| `get()` | Connection ID | `ChatConnection` |
| `create()` | `name`, `agent_id`, `platform`, `configuration`, `credentials`, optional `enabled` | `ChatConnection` |
| `update()` | Connection ID, at least one of `name` or `configuration` | `ChatConnection` |
| `rotate_credentials()` | Connection ID, `platform`, complete `credentials` dictionary | `ChatConnection` |
| `check_health()` | Connection ID | `ChatConnection` with refreshed health |
| `enable()` | Connection ID | `ChatConnection` |
| `disable()` | Connection ID | `ChatConnection` |
| `delete()` | Connection ID | `None` |

Responses include configuration, verified identity, health, and a credential
fragment, never the credentials. Health checks report `pass`, `fail`, or `unknown`;
verify unknown settings manually. A valid token alone does not prove delivery.

Creation defaults to enabled; the example keeps intake disabled during setup.
The returned `webhook_url` is read-only. Update changes the name, destinations,
or Telegram Business mode. Credential rotation requires the complete platform
bundle. Changing the Agent or bot requires a new connection. BA owns Telegram
registration; Slack setup remains manual.

If creation times out, list connections before retrying. See the
[REST reference](/api-reference/rest-api/chat-connections) for API errors.
