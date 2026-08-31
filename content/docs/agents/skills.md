---
title: Skills
description: Package reusable Agent-owned instructions and supporting files for progressive loading.
---

# Skills

A Skill is a reusable instruction directory owned by exactly one Agent. Use a
Skill to teach a workflow; use a [Tool](/agents/tools/built-in-tools) to perform
an action, or an [MCP Connection](/agents/tools/mcp-tools) for actions exposed
by a remote server.

## Ownership and storage [#ownership-and-storage]

A Skill inherits its Agent's Tenant and Attribution. Postgres stores identity,
indexed discovery metadata, and the file inventory; R2 stores authoritative
files. Skills have no separate attachment record and do not live in or
initialize a [Workspace](/agents/workspaces).

`SKILL.md` is required at the directory root. Its frontmatter requires `name`
and `description`, and may include `license`, `compatibility`, string-to-string
`metadata`, and experimental `allowed-tools`. Managed writes validate the file
and update its discovery index atomically.

## Build a minimal Skill [#build-a-minimal-skill]

Create the following directory and ZIP its contents with `SKILL.md` at the
archive root:

```text
release-notes/
├── SKILL.md
├── references/
│   └── style-guide.md
└── templates/
    └── release.md
```

Use this minimal entry file:

```markdown title="SKILL.md"
---
name: release-notes
description: Draft release notes from a list of changes.
---

# Release notes

When this Skill applies, begin the response with exactly `RELEASE NOTES READY`.
```

Supporting paths are relative to the archive root. Skill creation validates the
complete directory, assigns a stable ID, writes every file under the Tenant and
Agent scope, and indexes the frontmatter.

## Progressive runtime loading [#progressive-runtime-loading]

Agent preparation exposes only Skill names and descriptions. When one matches
the task, the model calls `activate_skill` to load its current `SKILL.md`.
Supporting files are then advertised as deterministic virtual locators for the
existing `read` Tool:

```text
<skill_resources>
- references/guide.md → read /.ba-agents/{agentId}/skills/{skillId}/references/guide.md
</skill_resources>
```

These locators read R2 without starting Workspace compute. They are not mounted
filesystem paths and work only with `read`; `grep`, `glob`, `write`, `edit`, and
`bash` keep their ordinary Workspace behavior.

To execute a supporting script, read its advertised locator, inspect the
content, copy it into the Workspace with `write`, then run that Workspace copy
with `bash`. Authoritative Skill files remain read-only to model-facing Tools.

## Lifecycle and copies [#lifecycle-and-copies]

Skills are current resources outside Agent Versions. Replacing files changes
the current Skill. Copying creates an independent ID and file set for each
destination Agent; one failed destination does not roll back successful copies.
Deletion removes metadata and files without a detach step.

Review Skill instructions like code. Keep secrets out of Skill content, keep
the entry file focused, and load larger references progressively.

## SDK and API [#sdk-and-api]

- [TypeScript Skills SDK](/sdk/typescript/skills)
- [Python Skills SDK](/sdk/python/skills)
- [Skills REST API](/api-reference/rest-api/skills)
- [CLI Assist](/cli/assist)
