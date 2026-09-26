---
title: Skills
description: Manage Agent-owned Skills, supporting files, archives, and copies.
---

## Overview [#overview]

Skills teach an agent how to do a specific job. Each skill is a folder of files
that belongs to one agent and must have a `SKILL.md` at its root. Create a
skill from Markdown or upload an archive, then edit, copy, or delete its files.
Every request is scoped to your tenant and to the agent in the path.

Skill files are separate from the agent's workspace. During a turn, the agent
reads them at `/.ba-agents/{agentId}/skills/{skillId}/{relativePath}` with its
`read` tool; that path is not a real file in the workspace. JSON skill
responses include the skill's metadata and its current list of files.

## Next [#next]

- [Skills](/agents/skills) to write a skill your agent can use.
- [Service limits](/api-reference/protocols/service-limits#skill-bundle) for size and file limits.
