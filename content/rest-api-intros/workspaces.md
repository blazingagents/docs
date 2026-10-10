---
title: Workspaces
description: Create, list, inspect, update, and delete the private file systems your agents work in.
---

## Overview [#overview]

A workspace is a private file system with an immutable `tier`. Core (`core`) is the default and loses its files when the workspace stops. Plus (`plus`) keeps them when it stops while idle. Several
agents can share one. These endpoints manage the workspace record: its name,
metadata, and network policy. None of them start the workspace or add compute
cost. The workspace starts only when an agent first reads, writes, or runs
something in it. Every request is scoped to your tenant.

## Next [#next]

- [Workspaces](/agents/workspaces) to share files between agents and sessions.
- [Workspace object](/api-reference/protocols/objects-and-schemas#workspace) for every field.
