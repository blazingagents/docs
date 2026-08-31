---
title: Resource IDs
description: Recognize opaque public resource identifiers and the separate server-owned HTTP request-attempt format.
---

# Resource IDs

Blazing Agents mints identifiers for public resources and HTTP request
attempts. Resource identity and transport correlation are distinct. Use each
format for basic boundary validation, but store and transmit the complete
value without parsing meaning from it.

## Resource contract [#resource-contract]

Resource IDs are case-sensitive opaque strings. Base62 means
`[0-9A-Za-z]`; each random body below is exactly 16 characters. A well-formed
ID may still be missing, deleted, or outside the authenticated Tenant, and an
ID never grants authorization.

| Anchor            | Resource                                        | Public shape                                               |
| ----------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| `#ten`            | <span id="ten">Tenant</span>                    | `ten_` + 16 Base62 characters                              |
| `#ag`             | <span id="ag">Agent</span>                      | `ag_` + 16 Base62 characters                               |
| `#ss`             | <span id="ss">Session</span>                    | `ss_` + 16 Base62 characters                               |
| `#ak`             | <span id="ak">API key record</span>             | `ak_` + 16 Base62 characters                               |
| `#prv`            | <span id="prv">Provider</span>                  | `prv_` + 16 Base62 characters                              |
| `#mcp`            | <span id="mcp">MCP Connection</span>            | `mcp_` + 16 Base62 characters                              |
| `#ws`             | <span id="ws">Workspace</span>                  | `ws_` + 16 Base62 characters                               |
| `#at`             | <span id="at">Artifact</span>                   | `at_` + 16 Base62 characters                               |
| `#tk`             | <span id="tk">Task</span>                       | `tk_` + 16 Base62 characters                               |
| `#tr`             | <span id="tr">Task run</span>                   | `tr_` + 16 Base62 characters                               |
| `#ca`             | <span id="ca">Checkout attempt</span>            | `ca_` + 16 Base62 characters                               |
| `#turn`           | <span id="turn">Metered Turn</span>             | `turn_` + 16 Base62 characters                             |
| `#mem`            | <span id="mem">Memory</span>                    | `mem_` + 16 Base62 characters                              |
| `#prompt`         | <span id="prompt">Prompt</span>                 | `prompt_` + 16 Base62 characters                           |
| `#skill`          | <span id="skill">Agent-owned Skill</span>       | `skill_` + 16 Base62 characters                            |
API keys are credentials, not resource IDs. An API key is `ba_` plus 40
Base62 characters and is shown only once; its `ak_...` record ID is used for
list/delete operations and cannot authenticate a request. Display fragments
such as `ba_ab` are neither IDs nor credentials.

The Session create path mints its `ss_...` ID and returns it in `Location`.
Other create operations also mint their own IDs. The SDK exports no public
resource-ID generator.

BA-owned UI messages use independent `msg_` IDs. Tool approval, continuation,
Tool-call, and caller-supplied Task-run idempotency values retain their native
opaque formats. Internal DBOS workflow IDs are not public contracts.

A `turn_...` value identifies one admitted, metered Turn. It is distinct from
the assistant message, Task run, HTTP request, trace, and Provider request.
Successful Turn usage metadata exposes it as `turnId`; pre-Turn failures do
not mint one. A Tool-approval continuation can reuse its assistant message ID
while receiving a new Turn ID.

Admin Agent IDs still validate as ordinary `ag_...` IDs. Do not infer Admin
status, ownership, or permission from an ID prefix or body.

## Transport identity [#transport-identity]

| Anchor | Identifier                                      | Public shape                  |
| ------ | ----------------------------------------------- | ----------------------------- |
| `#req` | <span id="req">HTTP request attempt</span>      | `req_` + 16 Base62 characters |

An `req_...` ID is transport correlation, never resource identity. The API
returns it in `X-Request-Id`; callers cannot choose or reuse it. Use
`X-Client-Request-Id` for caller-owned correlation.

Trace IDs retain their W3C 32-lowercase-hex shape. Provider-native request
identity, when available, is named `providerRequestId`; neither is a generic
`requestId`.

## Examples [#examples]

These are valid-looking placeholders, not existing resources or usable
credentials:

```text
ten_0123456789abcdef
ag_0123456789abcdef
ss_0123456789abcdef
ak_0123456789abcdef
prv_0123456789abcdef
mcp_0123456789abcdef
ws_0123456789abcdef
at_0123456789abcdef
tk_0123456789abcdef
tr_0123456789abcdef
ca_0123456789abcdef
turn_0123456789abcdef
mem_0123456789abcdef
prompt_0123456789abcdef
skill_0123456789abcdef
req_0123456789abcdef
```

Redacted API key (not a valid-looking credential): `ba_REDACTED`.

Validate untrusted input locally, then let the authenticated API enforce
Tenant ownership:

```typescript
import { agentIdSchema } from "@blazing-agents/core/ids";

const parsed = agentIdSchema.safeParse(input.agentId);
if (!parsed.success) {
  throw new Error("Malformed Agent ID");
}

const agent = await client.agents.get(parsed.data);
```

## Used by [#used-by]

- [Objects and schemas](/api-reference/protocols/objects-and-schemas)
- [REST API](/api-reference/rest-api)
- [Tenancy and attribution](/platform/tenancy-and-attribution)
- [Security and credentials](/platform/security-and-credentials)

## Source of truth [#source-of-truth]

- `packages/core/src/ids.ts`
- `packages/core/src/ids.test.ts`
- `packages/server-core/src/ids.ts`
- `packages/server-core/src/ids.test.ts`
- `supabase/migrations/20260705031901_tables_tenants.sql`
- `supabase/migrations/20260705031902_tables_apikeys.sql`
- `supabase/migrations/20260705031903_tables_providers.sql`
- `supabase/migrations/20260705031904_tables_skills.sql`
- `supabase/migrations/20260705031905_tables_agents.sql`
- `supabase/migrations/20260705031906_tables_sessions.sql`
- `supabase/migrations/20260705031909_tables_artifacts.sql`
- `supabase/migrations/20260705031910_tables_tasks.sql`
- `supabase/migrations/20260705163109_tables_prompts.sql`
- `supabase/migrations/20260705163122_tables_mcp_connections.sql`
- `supabase/migrations/20260719000000_tables_memories.sql`

## Related guides [#related-guides]

See the capability and guide links under [Used by](#used-by).

## Reference [#reference]

See the implementation inventory under [Source of truth](#source-of-truth).
