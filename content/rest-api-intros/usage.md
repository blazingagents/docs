---
title: Usage
description: See how many tokens, requests, and minutes your agents use, by day, agent, model, session, or user.
---

## Overview [#overview]

See how much your agents use: tokens, requests, and run time, added up over UTC date ranges of up to 31 days. Look at your whole tenant or narrow it to one agent, session, or end user.

`POST /v1/usage/sessions` returns exact totals for 1 to 100 session IDs. It preserves input order, includes zero totals for visible sessions without usage, and returns `not_found` if any session is missing or outside your user scope.

## Next [#next]

- [Usage and quotas](/platform/usage-and-quotas) to track spend and set a quota.
- [Tenant API](/api-reference/rest-api/tenant#update-tenant-settings) to change your quota.
