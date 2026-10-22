---
title: Prompts
description: Save reusable message templates and run them with variables, using the Go SDK.
---

# Prompts

`client.Prompts` saves reusable message templates. Run one through the generation methods with `ba.SavedPrompt`.

In a route that serves a signed-in end user, call these methods on the [scoped client](/sdk/go/client#for-user) from `client.ForUser(userID)`, which returns only that user's prompts. The tenant client sees every user's prompts and is for your backend's administration.

Examples are function bodies that receive `ctx context.Context`, `client *ba.Client`, `agentID ba.AgentID`, and `sessionID ba.SessionID`, and return an `error`. Every method also takes the per-call options `ba.WithRequestTimeout`, `ba.WithRequestHeader`, `ba.WithClientRequestID`, and `ba.CaptureResponse`.

```go
prompt, err := client.Prompts.Create(ctx, ba.CreatePromptParams{
	Name:     "Greeting",
	Template: "Greet {{name}} in one sentence.",
})
if err != nil {
	return err
}
answer, err := client.Generation.Completion(ctx, agentID, ba.SavedPrompt{
	ID:        prompt.ID,
	Variables: map[string]string{"name": "Ada"},
}, ba.GenerateParams{})
if err != nil {
	return err
}
fmt.Println(answer)
return nil
```

## Templates and variables [#templates-and-variables]

A template is text with `{{variable}}` placeholders, within the [prompt field limits](/api-reference/protocols/service-limits#prompt-fields) for length and variable count. The created prompt lists the placeholder names in `Variables`, in first-seen order. `ba.SavedPrompt{ID: id, Variables: values}` supplies the values when you run it; missing or unknown variables fail with `prompt_variable_missing` or `prompt_variable_unknown`.

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`Create`](#create) | Save a prompt | [`*Prompt`](#prompt) |
| [`List`](#list), `All` | List prompts | [`*Page[Prompt]`](#prompt) |
| [`Get`](#get) | Get one prompt | [`*Prompt`](#prompt) |
| [`Update`](#update) | Change a prompt | [`*Prompt`](#prompt) |
| [`Delete`](#delete) | Permanently delete a prompt | `error` |

## Methods [#methods]

### `Create` [#create]

Saves a prompt. `Name` must fit the [prompt field limits](/api-reference/protocols/service-limits#prompt-fields), and prompts can share one.

```go
prompt, err := client.Prompts.Create(ctx, ba.CreatePromptParams{
	Name:     "Release summary",
	Template: "Summarize {{version}} for {{audience}}.",
	AgentID:  ba.Value(agentID),
})
if err != nil {
	return err
}
fmt.Println(prompt.Variables)
return nil
```

**Signature:** `func (s *PromptsService) Create(ctx context.Context, params CreatePromptParams, opts ...RequestOption) (*Prompt, error)`

| Field | Type | Description |
| --- | --- | --- |
| `Name` | `string` | Display name |
| `Template` | `string` | The template text |
| `AgentID` | `ba.Nullable[ba.AgentID]` | Links the prompt to an agent. Deleting that agent deletes the prompt |
| `UserID` | `*string` | The end user the prompt belongs to. Fixed after creation. A scoped client fills it in |
| `Metadata` | `ba.Metadata` | Your own data |

Returns [`*ba.Prompt`](#prompt). Fails with `*ba.APIError` whose `Code` is [`validation_failed`](/api-reference/protocols/errors#validation_failed) or [`not_found`](/api-reference/protocols/errors#not_found).

### `List` [#list]

Lists prompts, newest first. Without filters it returns every prompt.

```go
user, err := client.ForUser("user_0123456789abcdef")
if err != nil {
	return err
}
page, err := user.Prompts.List(ctx, ba.ListPromptsParams{AgentID: &agentID})
if err != nil {
	return err
}
fmt.Println(len(page.Data))
return nil
```

**Signature:** `func (s *PromptsService) List(ctx context.Context, params ListPromptsParams, opts ...RequestOption) (*Page[Prompt], error)`

| Field | Type | Description |
| --- | --- | --- |
| `UserID` | `*string` | For a tenant-wide view on the tenant client: only prompts of this end user; `new("")` selects tenant-level prompts. Leave it unset on a scoped client |
| `AgentID` | `*ba.AgentID` | Only prompts linked to this agent |
| `Cursor` | `*string` | The `NextCursor` of the previous page |
| `Limit` | `*int` | Page size, within the [prompt page limit](/api-reference/protocols/service-limits#prompt-page) |

Returns [`*ba.Page[Prompt]`](#prompt); `All` walks every page lazily. Fails with `validation_failed`, [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor), or `not_found` when a `*ba.UserClient` filters by an agent it does not own.

### `Get` [#get]

Gets one prompt.

```go
prompt, err := client.Prompts.Get(ctx, "prompt_0123456789abcdef")
if err != nil {
	return err
}
fmt.Println(prompt.Template)
return nil
```

**Signature:** `func (s *PromptsService) Get(ctx context.Context, promptID PromptID, opts ...RequestOption) (*Prompt, error)`

Returns [`*ba.Prompt`](#prompt). Fails with `validation_failed` or `not_found`.

### `Update` [#update]

Changes a prompt in place. Fields you leave unset keep their values, and a new template recomputes `Variables`.

```go
prompt, err := client.Prompts.Update(ctx, "prompt_0123456789abcdef", ba.UpdatePromptParams{
	Template: new("Summarize {{version}} briefly."),
})
if err != nil {
	return err
}
fmt.Println(prompt.Variables)
return nil
```

**Signature:** `func (s *PromptsService) Update(ctx context.Context, promptID PromptID, params UpdatePromptParams, opts ...RequestOption) (*Prompt, error)`

| Field | Type | Description |
| --- | --- | --- |
| `AgentID` | `ba.Nullable[ba.AgentID]` | `ba.Value(id)` links the prompt to an agent; `ba.Null[ba.AgentID]()` removes the link |
| `Name` | `*string` | A new display name, within the [prompt field limits](/api-reference/protocols/service-limits#prompt-fields) |
| `Template` | `*string` | A new template; `Variables` is recomputed |
| `Metadata` | `ba.Metadata` | Replaces the metadata completely |

Returns [`*ba.Prompt`](#prompt). Fails with `validation_failed` or `not_found`.

### `Delete` [#delete]

Permanently deletes a prompt. Transcripts keep the text it produced.

```go
return client.Prompts.Delete(ctx, "prompt_0123456789abcdef")
```

**Signature:** `func (s *PromptsService) Delete(ctx context.Context, promptID PromptID, opts ...RequestOption) error`

Fails with `validation_failed` or `not_found`.

## Response models [#response-models]

### `Prompt` [#prompt]

| Field | Type | Description |
| --- | --- | --- |
| `ID` | `ba.PromptID` | Prompt ID (`prompt_...`) |
| `TenantID` | `ba.TenantID` | Your tenant ID |
| `AgentID` | `*ba.AgentID` | The linked agent, if any |
| `Name` | `string` | Display name |
| `Template` | `string` | The template text |
| `Variables` | `[]string` | The placeholder names, in first-seen order |
| `UserID` | `string` | End user, or `""` for tenant level |
| `Metadata` | `ba.Metadata` | Your own data |
| `CreatedAt`, `UpdatedAt` | `time.Time` | Timestamps |

## Next [#next]

- [Prompts guide](/agents/prompts)
- [Client](/sdk/go/client)
