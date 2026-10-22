---
title: Tenancy and end-user attribution
description: Label sessions, tasks, and usage with your own user IDs so you can filter and report per user.
---

# Tenancy and end-user attribution

Tag each turn with your own user ID, then filter sessions and break down usage per user. Your API key has tenant-wide authority by default. For requests from one signed-in user, scope the client to that user's ID so Blazing Agents checks ownership.

## Label a turn and filter by user [#label-a-turn-and-filter-by-user]

Pass `userId` and optional `metadata` when you call the agent. Later, pass the same `userId` as a filter. Set `AGENT_ID` to an agent with a provider and model, such as the one from the [quickstart](/getting-started/quickstart).

```typescript tab="TypeScript"
import { BlazingAgents } from "@blazingagents/sdk";

const client = new BlazingAgents({
  apiKey: process.env.BLAZING_AGENTS_API_KEY!,
});
const agentId = process.env.AGENT_ID!;
const userId = "app:user-42";

const result = await client.chat({
  agentId,
  message: {
    id: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: "Summarize my open items." }],
  },
  userId,
  metadata: { plan: "pro" },
});
const sessionId = await result.sessionId;
await result.toResponse().text();

const sessions = await client.sessions.list({ agentId, userId });
console.log(sessions.data.some((session) => session.id === sessionId));

const usage = await client.usage.get({ userId, groupBy: "day" });
console.log(usage.totals.inputTokens + usage.totals.outputTokens);
```

```python tab="Python"
import os
import uuid

from blazing_agents import BlazingAgents

client = BlazingAgents()
agent_id = os.environ["AGENT_ID"]
user_id = "app:user-42"

message = {
    "id": str(uuid.uuid4()),
    "role": "user",
    "parts": [{"type": "text", "text": "Summarize my open items."}],
}
with client.chat(
    agent_id=agent_id, message=message, user_id=user_id, metadata={"plan": "pro"}
) as stream:
    session_id = stream.session_id
    for _ in stream:
        pass

sessions = client.sessions.list(agent_id=agent_id, user_id=user_id)
print(any(session.id == session_id for session in sessions.data))

usage = client.usage.get(user_id=user_id, group_by="day")
print(usage.totals.input_tokens + usage.totals.output_tokens)
```

```rust tab="Rust"
use blazing_agents::messages::UserMessage;
use blazing_agents::types::Metadata;
use blazing_agents::usage::UsageGroupBy;
use blazing_agents::Client;
use futures_util::TryStreamExt;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::from_env()?;
    let agent_id = std::env::var("AGENT_ID")?;
    let user_id = "app:user-42";

    let mut stream = client
        .chat(&agent_id, UserMessage::text("Summarize my open items."))
        .user_id(user_id)
        .metadata(Metadata::new().insert("plan", "pro"))
        .await?;
    let session_id = stream.session_id().clone();
    while stream.try_next().await?.is_some() {}

    let sessions = client
        .sessions()
        .list(&agent_id)
        .user_id(user_id)
        .await?;
    println!("{}", sessions.data.iter().any(|s| s.id == session_id));

    let usage = client
        .usage()
        .get()
        .user_id(user_id)
        .group_by(UsageGroupBy::Day)
        .await?;
    println!("{}", usage.totals.input_tokens + usage.totals.output_tokens);
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
	userID := "app:user-42"

	stream, err := client.Chat.Send(ctx, agentID, ba.Messages(ba.TextMessage("Summarize my open items.")), ba.ChatParams{
		UserID:   &userID,
		Metadata: ba.Metadata{"plan": "pro"},
	})
	if err != nil {
		log.Fatal(err)
	}
	sessionID := stream.SessionID()
	for _, err := range stream.Events() {
		if err != nil {
			log.Fatal(err)
		}
	}
	stream.Close()

	sessions, err := client.Sessions.List(ctx, agentID, ba.ListSessionsParams{UserID: &userID})
	if err != nil {
		log.Fatal(err)
	}
	found := false
	for _, session := range sessions.Data {
		if session.ID == sessionID {
			found = true
		}
	}
	fmt.Println(found)

	usage, err := client.Usage.Get(ctx, ba.UsageParams{UserID: &userID, GroupBy: new(ba.UsageGroupByDay)})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(usage.Totals.InputTokens + usage.Totals.OutputTokens)
}
```

The first line prints `true`: the new session carries the user's label. The second prints the tokens this user used over the [default usage window](/api-reference/protocols/service-limits#usage-query-window).

## What carries a user label [#what-carries-a-user-label]

Agents, workspaces, prompts, sessions, and tasks accept `userId` and `metadata`. Memories accept `userId` only. Task runs, artifacts, and usage records inherit those labels from the work that creates them. A skill takes its agent's label. Account-wide settings such as API keys, providers, and quotas have no user label.

Labels flow to the work they produce:

- A session takes the `userId` and `metadata` of its first turn, and that turn's usage record gets the same values.
- A task run takes its task's label, and so do the run's session, usage, and artifacts.
- An artifact saved during a chat takes the session's label.

Once set, a `userId` never changes. Some resources let you update `metadata` later.

## Filter and report [#filter-and-report]

Session lists, task lists, and usage queries accept a `userId` filter. Usage can also be grouped by `user`, and the usage overview ranks your top users. See [usage and quotas](/platform/usage-and-quotas).

The filter has three modes:

- Omit `userId` to include everything in your account.
- Pass `userId: ""` to select only activity with no user label.
- Pass any other value to select that exact user.

If you forget to pass `userId`, the activity is recorded with the empty label. Decide whether that is acceptable, or require a user ID in your backend.

## User labels and user scope [#user-labels-and-user-scope]

A `userId` in a request body or list filter labels or selects data. It does not change the API key's authority. To let Blazing Agents enforce ownership, derive the user ID from a session your backend verified, then call [`forUser()`](/sdk/typescript/client#for-user) in TypeScript, [`for_user()`](/sdk/python/client#for-user) in Python, [`for_user()`](/sdk/rust/client#for-user) in Rust, or [`ForUser()`](/sdk/go/client#for-user) in Go. The scoped client sends [`X-BA-User-Id`](/api-reference/rest-api/authentication#end-user-scope) with each request.

A scoped client acts only for that user:

- Lists and reads return only that user's records. Records with no user label, such as an agent's general memories, stay hidden.
- Agents, workspaces, sessions, and other records it creates get that user's `userId`.
- Naming another user's agent, session, workspace, skill, or task fails with that record's not-found error. Providers and MCP connections belong to your account and stay usable.
- Account-wide operations, such as providers, spending limits, monetization, and the usage overview, return [`forbidden`](/api-reference/protocols/errors#forbidden).

Blazing Agents does not authenticate your product's users. Your backend still signs in the user and decides whether they may use a feature or reach an application record.

### What a scoped turn needs [#scoped-turn-requirements]

A turn from a scoped client runs only when the agent and its workspace both belong to that user:

- The agent's `userId` is that user. A shared agent with no user label, or the admin agent, returns [`not_found`](/api-reference/protocols/errors#not_found).
- The agent's workspace has the same `userId`. Otherwise the turn returns [`workspace_not_found`](/api-reference/protocols/errors#workspace_not_found).
- A session you resume was started by that user. Otherwise it returns `not_found`, so one user cannot continue another user's chat by guessing its ID.

Give each user their own agent once, with the scoped client. When you leave out `workspaceId`, the agent gets a new workspace with the same user label:

```typescript tab="TypeScript"
const agent = await client.forUser("app:user-42").agents.create({
  name: "Assistant for user 42",
  providerId: "prv_0123456789abcdef",
  model: "openai/gpt-6-luna",
});
console.log(agent.userId, agent.workspaceId);
```

```python tab="Python"
agent = client.for_user("app:user-42").agents.create(
    name="Assistant for user 42",
    provider_id="prv_0123456789abcdef",
    model="openai/gpt-6-luna",
)
print(agent.user_id, agent.workspace_id)
```

```rust tab="Rust"
let provider_id = "prv_0123456789abcdef";
let agent = client
    .for_user("app:user-42")?
    .agents()
    .create("Assistant for user 42")
    .model(provider_id, "openai/gpt-6-luna")
    .await?;
println!("{} {}", agent.user_id, agent.workspace_id);
```

```go tab="Go"
userClient, err := client.ForUser("app:user-42")
if err != nil {
	return err
}
agent, err := userClient.Agents.Create(ctx, ba.CreateAgentParams{
	Name:       "Assistant for user 42",
	ProviderID: ba.Value(ba.ProviderID("prv_0123456789abcdef")),
	Model:      ba.Value("openai/gpt-6-luna"),
})
if err != nil {
	return err
}
fmt.Println(agent.UserID, agent.WorkspaceID)
return nil
```

Save the agent ID with the user in your database, and create it only once per user. Agent creation has a [rate limit]({SL}#tenant-resource-creation-rate), so provision when a user signs up rather than on every request.

### Every turn of an agent shares its workspace [#shared-workspaces]

<Callout type="warn" title="One agent for many users shares its files">
  An agent has one workspace, and every turn of that agent runs in it at `/workspace`. If many of your users chat with one shared agent through a tenant-wide client, each user's turns can read and change files that another user's turns wrote. Sessions do not separate files. For isolation, give each user their own agent and workspace and call them through a scoped client.
</Callout>

All sessions of one user's agent still share that user's workspace, which is usually what you want for a personal assistant. A workspace attached to several agents shares its files across all of them. A shared, tenant-wide agent fits work that has no per-user files, such as answering from a fixed knowledge base.

## Multi-tenant application pattern [#multi-tenant-application-pattern]

When your product serves many customers, derive every ID on the server and run each user's turns on that user's own agent:

```typescript tab="TypeScript"
import { type UIMessage } from "@blazingagents/sdk";
import { client } from "./client.ts";
import * as app from "./app.ts";

export async function runAuthorizedTurn(
  principal: app.Principal,
  appChatId: string,
  message: UIMessage,
) {
  const chat = await app.resolveAuthorizedChat(principal, appChatId);
  const result = await client.forUser(`app:${principal.subject}`).chat({
    agentId: chat.agentId,
    ...(chat.sessionId ? { sessionId: chat.sessionId } : {}),
    message,
    metadata: { organizationId: principal.organizationId },
  });
  if (!chat.sessionId) {
    await app.saveAuthorizedSession(appChatId, await result.sessionId);
  }
  return result.toResponse();
}
```

```python tab="Python"
from collections.abc import Iterator

import app
from client import client


def run_authorized_turn(
    principal: app.Principal, app_chat_id: str, message: dict
) -> Iterator[bytes]:
    chat = app.resolve_authorized_chat(principal, app_chat_id)
    user_client = client.for_user(f"app:{principal.subject}")
    metadata = {"organizationId": principal.organization_id}
    if chat.session_id:
        stream = user_client.chat(
            agent_id=chat.agent_id,
            session_id=chat.session_id,
            message=message,
            metadata=metadata,
        )
    else:
        stream = user_client.chat(
            agent_id=chat.agent_id, message=message, metadata=metadata
        )
        app.save_authorized_session(app_chat_id, stream.session_id)
    with stream:
        yield from stream
```

```rust tab="Rust"
use axum::body::Body;
use axum::http::{header, HeaderValue, StatusCode};
use axum::response::Response;
use blazing_agents::ids::SessionId;
use blazing_agents::messages::UserMessage;
use blazing_agents::types::Metadata;
use blazing_agents::Client;

struct Principal {
    subject: String,
    organization_id: String,
}

struct AuthorizedChat {
    agent_id: String,
    session_id: Option<String>,
}

trait App {
    async fn resolve_authorized_chat(
        &self,
        principal: &Principal,
        app_chat_id: &str,
    ) -> Result<AuthorizedChat, StatusCode>;
    async fn save_authorized_session(&self, app_chat_id: &str, session_id: &SessionId);
}

async fn run_authorized_turn(
    app: &impl App,
    client: &Client,
    principal: &Principal,
    app_chat_id: &str,
    message: UserMessage,
) -> Result<Response, StatusCode> {
    let chat = app.resolve_authorized_chat(principal, app_chat_id).await?;
    let user_id = format!("app:{}", principal.subject);
    let metadata = Metadata::new().insert("organizationId", principal.organization_id.clone());
    let user_client = client
        .for_user(&user_id)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let stream = match &chat.session_id {
        Some(session_id) => {
            user_client
                .chat(&chat.agent_id, message)
                .session(session_id.clone())
                .metadata(metadata)
                .await
        }
        None => match user_client
            .chat(&chat.agent_id, message)
            .metadata(metadata)
            .await
        {
            Ok(stream) => {
                app.save_authorized_session(app_chat_id, stream.session_id())
                    .await;
                Ok(stream)
            }
            Err(error) => Err(error),
        },
    }
    .map_err(|error| {
        error
            .status()
            .and_then(|status| StatusCode::from_u16(status).ok())
            .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR)
    })?;

    let location = stream.meta().headers().get(header::LOCATION).cloned();
    let mut response = Response::new(Body::from_stream(stream));
    let headers = response.headers_mut();
    headers.insert(
        "x-vercel-ai-ui-message-stream",
        HeaderValue::from_static("v1"),
    );
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/event-stream"),
    );
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));
    if let Some(location) = location {
        headers.insert(header::LOCATION, location);
    }
    Ok(response)
}
```

```go tab="Go"
type Principal struct {
	Subject        string
	OrganizationID string
}

type AuthorizedChat struct {
	AgentID   ba.AgentID
	SessionID ba.SessionID
}

type App interface {
	ResolveAuthorizedChat(ctx context.Context, principal Principal, appChatID string) (AuthorizedChat, error)
	SaveAuthorizedSession(ctx context.Context, appChatID string, sessionID ba.SessionID) error
}

runAuthorizedTurn := func(app App, w http.ResponseWriter, r *http.Request, principal Principal, appChatID string, message ba.UserMessage) {
	chat, err := app.ResolveAuthorizedChat(r.Context(), principal, appChatID)
	if err != nil {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	userClient, err := client.ForUser("app:" + principal.Subject)
	if err != nil {
		http.Error(w, "invalid user", http.StatusInternalServerError)
		return
	}
	stream, err := userClient.Chat.Send(r.Context(), chat.AgentID, ba.Messages(message), ba.ChatParams{
		SessionID: chat.SessionID,
		Metadata:  ba.Metadata{"organizationId": principal.OrganizationID},
	})
	if err != nil {
		status := http.StatusInternalServerError
		var apiErr *ba.APIError
		if errors.As(err, &apiErr) {
			status = apiErr.Status
		}
		http.Error(w, http.StatusText(status), status)
		return
	}
	if chat.SessionID == "" {
		if err := app.SaveAuthorizedSession(r.Context(), appChatID, stream.SessionID()); err != nil {
			stream.Close()
			http.Error(w, "storage error", http.StatusInternalServerError)
			return
		}
	}
	defer stream.Close()

	stream.SetRelayHeaders(w.Header())
	if location := stream.Meta().Header.Get("Location"); location != "" {
		w.Header().Set("Location", location)
	}
	stream.WriteTo(w)
}
_ = runAuthorizedTurn
return nil
```

`app` is your own code. `resolveAuthorizedChat` throws unless the signed-in principal owns the chat, and it returns that user's agent ID and the session ID from your database. The scoped client makes Blazing Agents check the same ownership, so a session or agent of another user returns `not_found`. Test that one user cannot reach another user's chat ID.

## Production notes [#production-notes]

- Use a stable, opaque `userId` such as `app:<internal id>`. Keep the mapping to real people in your own system.
- Treat `metadata` as product data. Keep personal information out of it where you can, and validate it in your backend.
- Derive user scope from your verified session for end-user requests. A matching list filter is not an authorization check.
- Keep tenant-wide clients for your own administration, such as creating providers, reading the usage overview, and setting spending limits.

## Next [#next]

- [Usage and quotas](/platform/usage-and-quotas) to report per user and set monthly ceilings.
- [Security and credentials](/platform/security-and-credentials) to keep your API key on the server.
- [Bill your users for model tokens](/platform/monetization) using the same `userId`.
