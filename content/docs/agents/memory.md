---
title: Memory
description: Let an agent remember facts about each user across sessions.
---

# Memory

Memory lets an agent keep short notes that outlast a single conversation, such as "prefers concise status updates" or "works in the Berlin office". A note can belong to the whole agent or to one of your end users. The agent can save and look up notes itself, or you can have every turn start with the newest notes already in context.

Memory is for facts that change over time. A [session's messages](/platform/sessions-and-turns) cover one conversation, and [skills](/agents/skills) hold reusable instructions.

## Remember a user's preference [#remember-a-users-preference]

This turns on automatic memory, saves a note for one user, and then asks a fresh question as that user. Set `AGENT_ID` to one of your `ag_...` agents.

```typescript tab="TypeScript" tab-group="sdk-language"
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});
const agentId = process.env.AGENT_ID!;
const userId = "app-user-42";

await client.agents.update({ agentId, memoryInjectionEnabled: true });

await client.memories.create({
  agentId,
  userId,
  text: "Prefers concise status updates.",
});

const result = await client.completion({
  agentId,
  userId,
  prompt: "How should you format my status updates?",
});
console.log(await result.text);
```

```python tab="Python"
import os

from blazing_agents import BlazingAgents

client = BlazingAgents()
agent_id = os.environ["AGENT_ID"]
user_id = "app-user-42"

client.agents.update(agent_id, memory_injection_enabled=True)

client.memories.create(
    agent_id=agent_id,
    user_id=user_id,
    text="Prefers concise status updates.",
)

print(
    client.completion(
        agent_id=agent_id,
        user_id=user_id,
        prompt="How should you format my status updates?",
    )
)
```

```rust tab="Rust"
use blazing_agents::Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::from_env()?;
    let agent_id = std::env::var("AGENT_ID")?;
    let user_id = "app-user-42";

    client
        .agents()
        .update(&agent_id)
        .memory_injection_enabled(true)
        .await?;

    client
        .memories()
        .create(&agent_id, "Prefers concise status updates.")
        .user_id(user_id)
        .await?;

    let answer = client
        .completion(&agent_id, "How should you format my status updates?")
        .user_id(user_id)
        .await?;
    println!("{answer}");
    Ok(())
}
```

```go tab="Go"
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	ba "github.com/blazingagents/golang-sdk"
)

func main() {
	ctx := context.Background()
	client, err := ba.NewClient()
	if err != nil {
		log.Fatal(err)
	}
	agentID := ba.AgentID(os.Getenv("AGENT_ID"))
	userID := "app-user-42"

	_, err = client.Agents.Update(ctx, agentID, ba.UpdateAgentParams{MemoryInjectionEnabled: new(true)})
	if err != nil {
		log.Fatal(err)
	}

	_, err = client.Memories.Create(ctx, agentID, ba.CreateMemoryParams{
		Text:   "Prefers concise status updates.",
		UserID: &userID,
	})
	if err != nil {
		log.Fatal(err)
	}

	answer, err := client.Generation.Completion(ctx, agentID, ba.Text("How should you format my status updates?"),
		ba.GenerateParams{UserID: &userID})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(answer)
}
```

The answer mentions keeping updates concise, even though the question never said so. The same note reaches every later turn, in any session, that passes `userId: "app-user-42"`.

## Who sees which notes [#who-sees-which-notes]

Each note belongs to one agent. A note saved with `userId: ""` is general. A note saved with a user ID belongs to that end user. Which notes a turn sees depends on how your backend calls Blazing Agents:

- A turn with no `userId` sees only general notes.
- A turn with a `userId`, made with your tenant-wide client, sees the general notes and that user's notes.
- A turn made with a client scoped to one user with `forUser(userId)` sees only that user's notes. It never sees general notes, either at the start of the turn or through the memory tools.

So if you scope requests with `forUser()`, save every note your agent needs with that user's ID. With a tenant-wide client, a `userId` only sorts notes. It is not a security boundary, so your backend decides which user is which. See [user labels and user scope](/platform/tenancy-and-attribution#user-labels-and-user-scope).

## Choose how the agent recalls notes [#choose-how-the-agent-recalls-notes]

- **Automatic.** With `memoryInjectionEnabled`, each turn starts with the newest visible notes, up to 4,000 words. The last note that fits may be cut short.
- **Tools.** The memory tools let the agent save, look up, search, update, and delete notes on its own during a turn. Turn on the ones you want, such as `save_memory` and `search_memories`, with `tools` on the [agent](/agents/agents#change-an-agent).

Use either one or both. Automatic recall suits a handful of stable preferences. Tools suit an agent that should decide what is worth remembering.

## Search and clean up [#search-and-clean-up]

List a user's notes, optionally filtered by words they contain:

```typescript tab="TypeScript" tab-group="sdk-language"
const { data } = await client.memories.list({
  agentId,
  userId,
  search: "status updates",
  limit: 10,
});
for (const memory of data) console.log(memory.id, memory.text);
```

```python tab="Python"
page = client.memories.list(
    agent_id=agent_id, user_id=user_id, search="status updates", limit=10
)
for memory in page.data:
    print(memory.id, memory.text)
```

```rust tab="Rust"
let memories = client
    .memories()
    .list(agent_id)
    .user_id("app-user-42")
    .search("status updates")
    .limit(10)
    .await?;
for memory in &memories.data {
    println!("{} {}", memory.id, memory.text);
}
```

```go tab="Go"
memories, err := client.Memories.List(ctx, agentID, ba.ListMemoriesParams{
	UserID: new("app-user-42"),
	Search: new("status updates"),
	Limit:  new(10),
})
if err != nil {
	return err
}
for _, memory := range memories.Data {
	fmt.Println(memory.ID, memory.Text)
}
return nil
```

Search matches words, not meaning, so "status updates" finds notes containing those words but not "progress reports".

An agent holds a [fixed number of notes](/api-reference/protocols/service-limits#memories-per-agent) across all its users. Saving a note at that limit removes the one used least recently. A save through a client scoped with `forUser()` removes only that user's own notes, so when other users' notes or general notes fill the agent, it fails with [`invalid_request`](/api-reference/protocols/errors#invalid_request) (HTTP `400`) instead, and the agent's memory tool reports the same failure during a scoped turn. Give each user their own agent, or delete notes you no longer need. Notes never expire on their own, so delete stale or sensitive notes yourself. Deleting the agent deletes its notes.

## Next [#next]

- [Tenancy and attribution](/platform/tenancy-and-attribution) to pass the right `userId` for each end user.
- [Built-in tools](/agents/tools/built-in-tools#memory) for what each memory tool does.
- Memories SDK reference for [TypeScript](/sdk/typescript/memories), [Python](/sdk/python/memories), [Rust](/sdk/rust/memories), or [Go](/sdk/go/memories).
