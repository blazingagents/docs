---
title: Resource IDs
description: Recognize the ID formats Blazing Agents returns and treat them as opaque values.
---

# Resource IDs

Every object Blazing Agents creates gets an ID with a readable prefix, such as
`ag_` for an agent. Use the formats below to reject obviously malformed input
early. Store and send the full value, and never read meaning from its body.

## Resource contract [#resource-contract]

IDs are case-sensitive. Base62 means `[0-9A-Za-z]`, and each random body is
exactly 16 characters. A well-formed ID can still point to something that is
missing, deleted, or owned by another tenant, and holding an ID never grants
access.

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
| `#cc`             | <span id="cc">Chat connection</span>            | `cc_` + 16 Base62 characters                               |
| `#cd`             | <span id="cd">Chat delivery</span>              | `cd_` + 16 Base62 characters                               |
| `#mch`            | <span id="mch">Merchant connection</span>       | `mch_` + 16 Base62 characters                              |
| `#mev`            | <span id="mev">Merchant usage event</span>      | `mev_` + 16 Base62 characters                              |

An API key is a credential, not an ID. It is `ba_` plus 40 Base62 characters
and is shown only once, when you create it. Its `ak_...` record ID lets you list
and delete keys but cannot authenticate a request. Display fragments such as
`ba_ab` are neither IDs nor credentials.

Blazing Agents creates every ID for you; the SDKs have no ID generator. When
you start a session, its `ss_...` ID comes back in the `Location` header.

Message IDs in the UI stream use a separate `msg_` prefix. Tool approval,
continuation, tool-call, and your own task-run idempotency keys keep their
native formats.

A `turn_...` ID identifies one metered turn. It is not the assistant message,
task run, HTTP request, trace, or provider request. A successful turn reports
it as `turnId` in its usage metadata; a request that fails before the turn
starts has none. A tool-approval continuation can keep its assistant message ID
and still get a new turn ID.

Do not infer status, ownership, or permission from an ID's prefix or body.

## Transport identity [#transport-identity]

| Anchor | Identifier                                      | Public shape                  |
| ------ | ----------------------------------------------- | ----------------------------- |
| `#req` | <span id="req">HTTP request attempt</span>      | `req_` + 16 Base62 characters |

A `req_...` ID labels one HTTP attempt, not a resource. It arrives in the
`X-Request-Id` response header, and you cannot choose or reuse it. Send
`X-Client-Request-Id` to attach your own correlation ID.

Trace IDs keep the W3C shape of 32 lowercase hex characters. When a provider
returns its own request ID, it appears as `providerRequestId`.

## Examples [#examples]

These are placeholders that match the formats, not real resources or usable
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
cc_0123456789abcdef
req_0123456789abcdef
```

A redacted API key looks like `ba_REDACTED`.

Check untrusted input locally, then let the API enforce ownership:

```typescript
import { agentIdSchema } from "@blazingagents/sdk/contracts";

const parsed = agentIdSchema.safeParse(input.agentId);
if (!parsed.success) {
  throw new Error("Malformed agent ID");
}

const agent = await client.agents.get({ agentId: parsed.data });
```

## Next [#next]

- [Objects and schemas](/api-reference/protocols/objects-and-schemas) for the objects these IDs identify.
- [Tenancy and attribution](/platform/tenancy-and-attribution) for how ownership works.
