---
title: Usage
description: See how many tokens, requests, and minutes your agents use, by day, agent, model, session, or user.
---

## Overview [#overview]

See how much your agents use: tokens, requests, and run time, added up over UTC date ranges within the [usage query window](/api-reference/protocols/service-limits#usage-query-window). Look at your whole tenant or narrow it to one agent, session, or end user.

With a [user-scoped request](/api-reference/rest-api/authentication#end-user-scope), `GET /v1/usage`, `GET /v1/agents/:agentId/usage`, and `POST /v1/usage/sessions` return only that user's usage, and a `userId` filter that names another user returns `400 invalid_request`. `GET /v1/usage/overview` is a tenant operation and returns `403 forbidden`.

`POST /v1/usage/sessions` returns exact totals for a [batch of session IDs](/api-reference/protocols/service-limits#usage-exact-session-batch). It preserves input order, includes zero totals for visible sessions without usage, and returns `not_found` if any session is missing or outside your user scope.

## Next [#next]

- [Usage and quotas](/platform/usage-and-quotas) to track spend and set a quota.
- [Tenant API](/api-reference/rest-api/tenant#update-tenant-settings) to change your quota.
