---
title: MCP connections
description: Connect remote MCP tool servers, then test, update, and reconnect them.
---

## Overview [#overview]

An MCP connection gives your agents the tools on a remote MCP server that speaks Streamable HTTP. Store the server URL and its credentials once, then attach the connection to any agent in your tenant. Credentials are never returned. Connections have no `userId`. Servers that sign in with OAuth finish connecting in the [dashboard](https://www.blazingagents.com/app).

## Next [#next]

- [MCP connections](/agents/tools/mcp-tools) to give an agent remote tools.
- [Agents API](/api-reference/rest-api/agents#update-agent-mcp-attachment) to control what each attachment forwards.
