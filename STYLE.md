# Documentation style guide

This guide applies to everything under `content/docs/`, whether a person or a
coding agent writes it. Run `npm run lint:docs` to catch the mechanical rules
below before you open a pull request.

The docs serve two readers at once.

- A new developer or team lead deciding whether to adopt Blazing Agents. They
  need to see what Blazing Agents takes off their plate and reach working code
  fast.
- An existing tenant who wants to get a job done. They need the shortest
  correct path to that job.

Write a guide for the person using the platform, not a contract written by the
people who built it.

## Voice

- Lead with what the reader gets or does, then how. "Give your agent a
  persistent file system" before "A Workspace is a Tenant-owned durable
  mutable filesystem".
- Second person, active voice, present tense. Short sentences.
- Plain lowercase nouns in prose: agent, admin agent, session, turn,
  workspace, skill, tenant, provider. Keep code identifiers in backticks (`client.chat()`,
  `sessionId`). Page titles and nav labels use sentence case.
- One idea per paragraph. Three to five sentences at most.
- No spec phrasing ("materialized after admission", "atomically creates",
  "ordinary shared-filesystem semantics"). Say what the reader observes.
- No long dashes. No "simply", "just", "seamless", "powerful", "robust",
  "leverage", "unlock".

## Content rules

- No internals. Never mention R2, Containers, Cloudflare, DBOS, Supabase,
  the dispatcher, or other implementation details. Describe
  the behavior the tenant sees instead ("files survive between sessions").
- No changelog notes in guides ("available starting in v0.8.0", "SDK 0.8.0 or
  later", "older SDK releases", "(SDK 0.7.0+)"). The SDK version pinned in
  `package.json` is the version the docs describe.
- Every claim must be true of the current platform. Verify against the
  TypeScript SDK, Python SDK, and platform source when unsure. Never invent a
  feature, number, price, or competitor claim.
- Real URLs: API `https://api.blazingagents.com` (the SDK default, so
  examples omit `baseUrl`), dashboard `https://www.blazingagents.com/app`,
  API keys at `https://www.blazingagents.com/app/keys`.
- Examples use OpenRouter: `providerType: "openrouter"` (Python
  `provider_type="openrouter"`, Rust `ProviderType::OpenRouter`, Go
  `ba.ProviderTypeOpenRouter`), `baseUrl: null` (Python, Rust, and Go leave
  the endpoint override unset), the key from `OPENROUTER_API_KEY` (Rust
  `std::env::var("OPENROUTER_API_KEY")?`, Go
  `ba.NewSecret(os.Getenv("OPENROUTER_API_KEY"))`), and
  model `openai/gpt-6-luna`. Always write the model with its `openai/`
  prefix, and never pair `gpt-6-luna` with the `openai` provider type.
- Code comes in TypeScript, Python, Rust, and Go tabs when the SDKs support
  the operation:

  ````md
  ```typescript tab="TypeScript"
  ...
  ```
  ```python tab="Python"
  ...
  ```
  ```rust tab="Rust"
  ...
  ```
  ```go tab="Go"
  ...
  ```
  ````

  `npm run check:rust-snippets` compiles every `rust` block against the
  pinned SDK and runs as its own CI job, separate from `npm run check`.
  A block with `fn main` compiles as written, so a full program needs
  `#[tokio::main] async fn main`. Any other block compiles as the body of
  an async function that receives `client: blazing_agents::Client`,
  `agent_id: &str` and `session_id: &str` and returns a boxed error, like a
  continuation of the page's earlier examples, so it may use `client`,
  `agent_id`, `session_id`, `?`, `.await`, `use` lines and item definitions,
  and it must declare every other value with a full placeholder ID
  (`let task_id = "tk_0123456789abcdef";`, never `"ag_..."`).
  To bump the pinned SDK, change `rev` in `snippets-rust/Cargo.toml` and in
  the pages' `cargo add blazing-agents ... --rev` commands, then run
  `cargo update -p blazing-agents --manifest-path snippets-rust/Cargo.toml`.

  `npm run check:go-snippets` compiles and vets every `go` block against the
  pinned SDK and runs as its own CI job, separate from `npm run check`.
  A `go` block that contains a line starting with `func main()` is a full
  program and compiles as written. Any other `go` block is the body of `func snippet(ctx context.Context, client *ba.Client,
  agentID ba.AgentID, sessionID ba.SessionID) error`, with `ba` imported from
  `github.com/blazingagents/golang-sdk`. It may use `ctx`, `client`,
  `agentID`, and `sessionID`, local type definitions, and the standard
  library without import lines: the check adds the standard library imports
  a block names, as `goimports` would. It must end in a `return`, use every
  variable it declares, and declare every other value with a full
  placeholder ID (`taskID := ba.TaskID("tk_0123456789abcdef")`). Format Go
  blocks with `gofmt`. To bump the pinned SDK, run
  `go get github.com/blazingagents/golang-sdk@<commit>` in `snippets-go`
  and put the pseudo-version it prints in the pages' `go get` commands.

- No `as` type casts in snippets (for example on `await request.json()`).
  Let inference or the SDK's own types carry the shape.
- Never hand-parse the event stream in a snippet. Print the raw chunks or
  relay `result.toResponse()`, and say the reader can take it from there.
- Every snippet must run as written against the pinned SDK. The first
  snippet a reader sees must succeed, so an agent that generates text needs
  a provider and model.
- Internal links use site paths such as `/agents/workspaces`. A link to an
  anchor needs an explicit heading id (`## Setup [#setup]`) or an element id
  on the target page.

## Page template

1. Title and one-sentence description of the outcome.
2. Opening paragraph: what this lets you do and why you would want it.
3. The working example, as early as possible.
4. Explanation of what happened and the options that matter.
5. Pitfalls or production notes, only if real.
6. One short "Next" list of two to four links. No "Reference" link dumps
   that list both SDKs and REST for everything.

## Before you submit

- The REST API resource pages under `content/docs/api-reference/rest-api/` are
  generated from `openapi/openapi.json`. Edit their intro prose in
  `content/rest-api-intros/`, then run `npm run generate:rest-api`. Fix
  operation, field, and example text in the platform's OpenAPI contract.

- `src-docs/documentation-contract.json` holds a presentation entry per page
  that the tests validate. Update the entries for the pages you change.
- Run `npm run lint:docs` and `npm run check`. Both must pass.
