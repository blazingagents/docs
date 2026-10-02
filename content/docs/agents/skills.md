---
title: Skills
description: Teach an agent a workflow it loads only when a task needs it, so long instructions stay out of every prompt.
---

# Skills

A skill teaches an agent how to do one kind of job, such as drafting release notes or triaging a bug report. The agent sees only each skill's name and description until a task matches, then loads the full instructions and any reference files it needs. You can give an agent many detailed skills without paying for them in every prompt.

Use a skill to teach a workflow. Use a [tool](/agents/tools/built-in-tools) or an [MCP connection](/agents/tools/mcp-tools) when the agent needs to take an action.

## Add a skill [#add-a-skill]

A skill is a folder with a `SKILL.md` file at its root. The simplest skill is that one file. Set `AGENT_ID` to one of your `ag_...` agents.

```typescript tab="TypeScript" tab-group="sdk-language"
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});
const agentId = process.env.AGENT_ID!;

const skill = await client.agent({ agentId }).skills.create({
  path: "SKILL.md",
  content: `---
name: release-notes
description: Draft release notes from a list of changes.
---

# Release notes

Begin the response with exactly RELEASE NOTES READY, then group the changes
under Added, Changed, and Fixed.
`,
});
console.log(`Skill: ${skill.id}`);

const result = await client.completion({
  agentId,
  prompt: "Write release notes for: dark mode, faster search, fixed login bug.",
});
console.log(await result.text);
```

```python tab="Python"
import os

from blazing_agents import BlazingAgents

client = BlazingAgents()
agent_id = os.environ["AGENT_ID"]

skill = client.agent(agent_id).skills.create(
    path="SKILL.md",
    content="""---
name: release-notes
description: Draft release notes from a list of changes.
---

# Release notes

Begin the response with exactly RELEASE NOTES READY, then group the changes
under Added, Changed, and Fixed.
""",
)
print(f"Skill: {skill.id}")

print(
    client.completion(
        agent_id=agent_id,
        prompt="Write release notes for: dark mode, faster search, fixed login bug.",
    )
)
```

The answer starts with `RELEASE NOTES READY`, which shows the agent loaded the skill. Skill names are unique per agent, so delete the skill or change its name before you run this again.

`SKILL.md` needs frontmatter with a `name` and a `description`. The name uses lowercase letters, digits, and hyphens, up to 64 characters. Write the description for the model: it is all the agent sees when deciding whether to load the skill. You can also add `license`, `compatibility`, string `metadata`, and the experimental `allowed-tools`.

## Add reference files [#add-reference-files]

Longer skills keep details in extra files next to `SKILL.md`:

```text
release-notes/
├── SKILL.md
├── references/
│   └── style-guide.md
└── templates/
    └── release.md
```

ZIP the folder's contents so `SKILL.md` sits at the archive root, then upload it. Tar and gzipped tar archives work too.

```typescript tab="TypeScript" tab-group="sdk-language"
import { readFile } from "node:fs/promises";

await client.agent({ agentId }).skills.upload({
  source: { file: await readFile("release-notes.zip"), type: "zip" },
});
```

```python tab="Python"
client.agent(agent_id).skills.upload(archive_type="zip", file="release-notes.zip")
```

Blazing Agents checks the whole archive before it saves anything, so a bad `SKILL.md` leaves the agent unchanged.

## How the agent uses a skill [#how-the-agent-uses-a-skill]

On every turn the agent sees the name and description of each of its skills. When one fits the task, it loads that skill's current `SKILL.md`. It then sees a list of the skill's other files and can open any of them with the `read` tool. This works even when the agent has no tool groups enabled.

Skill files are read-only to the agent and are not part of its [workspace](/agents/workspaces). Other file tools such as `grep`, `write`, and `bash` see only the workspace. To run a script that ships with a skill, the agent reads it, writes a copy into the workspace, and runs the copy.

## Manage skills [#manage-skills]

- **Edit.** Replace or delete single files, or upload a new archive. The agent uses the new content on its next turn. Existing sessions use the current skill content on their next turn. The saved [agent configuration](/agents/configuration-snapshots) does not copy skill files.
- **Copy.** Copy a skill to other agents. Each copy is independent, and if one destination fails the others still succeed.
- **Delete.** Deleting a skill removes all its files. Deleting the agent deletes its skills.

Each agent can have up to 100 skills. Treat skill content like code: review changes, and keep secrets out of it. For every method, see the [TypeScript](/sdk/typescript/skills) or [Python](/sdk/python/skills) SDK.

## Skills for your coding assistant [#skills-for-your-coding-assistant]

The [Blazing Agents skill catalog](https://skills.sh/blazingagents/skills) is a different thing: skills that help your local coding assistant write code against Blazing Agents. Installing one sets up your assistant and does not add anything to your agents.

```bash
npx skills add blazingagents/skills --skill blazing-agents
```

Run `npx skills add blazingagents/skills --list` to see the whole catalog. See the [`skills` CLI docs](https://skills.sh/docs/cli) and the [catalog source](https://github.com/blazingagents/skills).

## Next [#next]

- [Memory](/agents/memory) to let the agent remember facts across sessions.
- [Built-in tools](/agents/tools/built-in-tools) to give the agent actions to go with its skills.
- Skills SDK reference for [TypeScript](/sdk/typescript/skills) or [Python](/sdk/python/skills).
