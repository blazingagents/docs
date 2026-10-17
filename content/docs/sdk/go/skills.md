---
title: Skills
description: Create, upload, edit, copy, and delete an agent's skills with the Go SDK.
---

# Skills

`client.Skills` manages each agent's skills: instruction packs with a `SKILL.md` frontmatter file and any supporting files. Every method takes the owning agent's ID first.

Examples are function bodies that receive `ctx context.Context`, `client *ba.Client`, `agentID ba.AgentID`, and `sessionID ba.SessionID`, and return an `error`. Every method also takes the per-call options `ba.WithRequestTimeout`, `ba.WithRequestHeader`, `ba.WithClientRequestID`, and `ba.CaptureResponse`.

```go
skill, err := client.Skills.Create(ctx, agentID, ba.CreateSkillParams{
	Content: "---\nname: refund-policy\ndescription: Answer refund questions.\n---\n\nQuote the matching rule.\n",
})
if err != nil {
	return err
}
fmt.Println(skill.ID, skill.Name)
return nil
```

## Available operations [#available-operations]

| Method | Description | Returns |
| --- | --- | --- |
| [`Create`](#create) | Create a skill from its `SKILL.md` | [`*Skill`](#skill-and-skilldetail) |
| [`Upload`](#upload) | Create a skill from an archive | [`*Skill`](#skill-and-skilldetail) |
| [`List`](#list), `All` | List the agent's skills | [`*Page[SkillSummary]`](#skill-and-skilldetail) |
| [`Get`](#get) | Get one skill with its files | [`*Skill`](#skill-and-skilldetail) |
| [`Delete`](#delete) | Permanently delete a skill | `error` |
| [`ReadFile`](#read-file) | Stream one file | `*Download` |
| [`ReplaceFile`](#replace-file) | Create or replace one file | [`*Skill`](#skill-and-skilldetail) |
| [`DeleteFile`](#delete-file) | Delete one file | [`*Skill`](#skill-and-skilldetail) |
| [`Copy`](#copy) | Copy the skill to other agents | `[]SkillCopyResult` |

## Methods [#methods]

### `Create` [#create]

Creates a skill from its `SKILL.md`. `Content` must start with YAML frontmatter that sets `name` and `description`, and the SDK sends it as the skill's `SKILL.md`.

```go
skill, err := client.Skills.Create(ctx, agentID, ba.CreateSkillParams{
	Content: "---\nname: refund-policy\ndescription: Answer refund questions.\n---\n\nQuote the matching rule.\n",
})
if err != nil {
	return err
}
fmt.Println(skill.ID)
return nil
```

**Signature:** `func (s *SkillsService) Create(ctx context.Context, agentID AgentID, params CreateSkillParams, opts ...RequestOption) (*Skill, error)`

Returns [`*ba.Skill`](#skill-and-skilldetail). Fails with `*ba.APIError` whose `Code` is [`validation_failed`](/api-reference/protocols/errors#validation_failed), [`skill_invalid_markdown`](/api-reference/protocols/errors#skill_invalid_markdown), [`skill_name_conflict`](/api-reference/protocols/errors#skill_name_conflict), [`skill_limit_reached`](/api-reference/protocols/errors#skill_limit_reached), or [`not_found`](/api-reference/protocols/errors#not_found) when the agent does not exist.

### `Upload` [#upload]

Creates a skill from an archive that contains `SKILL.md` at its root.

```go
skill, err := client.Skills.Upload(ctx, agentID, ba.UploadSkillParams{
	Type: ba.ArchiveTypeTarGz,
	File: ba.UploadFile("refund-policy.tar.gz"),
})
if err != nil {
	return err
}
fmt.Println(skill.ID)
return nil
```

**Signature:** `func (s *SkillsService) Upload(ctx context.Context, agentID AgentID, params UploadSkillParams, opts ...RequestOption) (*Skill, error)`

`Type` is `ba.ArchiveTypeZip`, `ba.ArchiveTypeTar`, or `ba.ArchiveTypeTarGz`. `ba.UploadFile` sends the file under its base name; an upload with no name, such as `ba.UploadBytes("", data)`, is sent as `skill.<type>`, such as `skill.tar.gz`.

Returns [`*ba.Skill`](#skill-and-skilldetail). Fails with `validation_failed`, [`skill_invalid_archive`](/api-reference/protocols/errors#skill_invalid_archive), `skill_invalid_markdown`, `skill_name_conflict`, `skill_limit_reached`, [`skill_too_many_files`](/api-reference/protocols/errors#skill_too_many_files), or [`skill_uncompressed_too_large`](/api-reference/protocols/errors#skill_uncompressed_too_large), and `not_found` when the agent does not exist.

### `List` [#list]

Lists the agent's skills, newest first, without their files.

```go
page, err := client.Skills.List(ctx, agentID, ba.ListSkillsParams{})
if err != nil {
	return err
}
for _, skill := range page.Data {
	fmt.Println(skill.ID, skill.Name)
}
return nil
```

**Signature:** `func (s *SkillsService) List(ctx context.Context, agentID AgentID, params ListSkillsParams, opts ...RequestOption) (*Page[SkillSummary], error)`

| Field | Type | Description |
| --- | --- | --- |
| `Cursor` | `*string` | The `NextCursor` of the previous page |
| `Limit` | `*int` | Page size, 1 to 100; defaults to 50 |

Returns [`*ba.Page[SkillSummary]`](#skill-and-skilldetail); `All` walks every page lazily. Fails with `validation_failed`, [`invalid_cursor`](/api-reference/protocols/errors#invalid_cursor), or `not_found` when the agent does not exist.

### `Get` [#get]

Gets one skill, with its files.

```go
skill, err := client.Skills.Get(ctx, agentID, "skill_0123456789abcdef")
if err != nil {
	return err
}
for _, file := range skill.Files {
	fmt.Println(file.Path, file.SizeBytes)
}
return nil
```

**Signature:** `func (s *SkillsService) Get(ctx context.Context, agentID AgentID, skillID SkillID, opts ...RequestOption) (*Skill, error)`

Returns [`*ba.Skill`](#skill-and-skilldetail). Fails with `validation_failed` or [`skill_not_found`](/api-reference/protocols/errors#skill_not_found).

### `Delete` [#delete]

Permanently deletes a skill and all its files.

```go
return client.Skills.Delete(ctx, agentID, "skill_0123456789abcdef")
```

**Signature:** `func (s *SkillsService) Delete(ctx context.Context, agentID AgentID, skillID SkillID, opts ...RequestOption) error`

Fails with `validation_failed` or `skill_not_found`.

### `ReadFile` [#read-file]

Streams one file of a skill. `path` is relative to the skill's root, such as `policy.md` or `scripts/refund.sh`.

```go
file, err := client.Skills.ReadFile(ctx, agentID, "skill_0123456789abcdef", "policy.md")
if err != nil {
	return err
}
defer file.Close()
data, err := io.ReadAll(file)
if err != nil {
	return err
}
fmt.Println(len(data))
return nil
```

**Signature:** `func (s *SkillsService) ReadFile(ctx context.Context, agentID AgentID, skillID SkillID, path string, opts ...RequestOption) (*Download, error)`

Returns a `*ba.Download`, an `io.ReadCloser` over the file's bytes. `ContentType()`, `ContentLength()` (`-1` when unknown), and `Meta()` describe the response, and `Close` ends the connection. A read that fails, or a body shorter than its declared length, returns a `*ba.StreamError`. Fails with `validation_failed` or `skill_not_found`.

### `ReplaceFile` [#replace-file]

Creates or replaces the file at `path` and returns the updated skill. Replacing `SKILL.md` rereads its frontmatter, so the skill's `Name`, `Description`, and `Metadata` follow it.

```go
content, err := os.Open("policy.md")
if err != nil {
	return err
}
defer content.Close()
skill, err := client.Skills.ReplaceFile(ctx, agentID, "skill_0123456789abcdef", "policy.md", content)
if err != nil {
	return err
}
fmt.Println(len(skill.Files))
return nil
```

**Signature:** `func (s *SkillsService) ReplaceFile(ctx context.Context, agentID AgentID, skillID SkillID, path string, content io.Reader, opts ...RequestOption) (*Skill, error)`

The content is sent as raw bytes whatever the file's name. Returns [`*ba.Skill`](#skill-and-skilldetail). Fails with `validation_failed`, `skill_invalid_markdown`, `skill_name_conflict`, [`skill_too_many_files`](/api-reference/protocols/errors#skill_too_many_files), [`skill_uncompressed_too_large`](/api-reference/protocols/errors#skill_uncompressed_too_large), or `skill_not_found`.

### `DeleteFile` [#delete-file]

Deletes the file at `path` and returns the updated skill. Deleting a file that does not exist succeeds. `SKILL.md` cannot be deleted; delete the skill instead.

```go
skill, err := client.Skills.DeleteFile(ctx, agentID, "skill_0123456789abcdef", "policy.md")
if err != nil {
	return err
}
fmt.Println(len(skill.Files))
return nil
```

**Signature:** `func (s *SkillsService) DeleteFile(ctx context.Context, agentID AgentID, skillID SkillID, path string, opts ...RequestOption) (*Skill, error)`

Returns [`*ba.Skill`](#skill-and-skilldetail). Fails with [`invalid_request`](/api-reference/protocols/errors#invalid_request), `validation_failed`, or `skill_not_found`.

### `Copy` [#copy]

Copies the skill, with all its files, to each agent in `AgentIDs`: 1 to 30 IDs, each listed once. Each copy is a new skill with its own ID.

```go
results, err := client.Skills.Copy(ctx, agentID, "skill_0123456789abcdef", ba.CopySkillParams{
	AgentIDs: []ba.AgentID{"ag_abcdef0123456789"},
})
if err != nil {
	return err
}
for _, result := range results {
	switch r := result.(type) {
	case ba.SkillCopyCreated:
		fmt.Println("copied to", r.AgentID, r.Skill.ID)
	case ba.SkillCopyFailed:
		fmt.Println("failed for", r.AgentID, r.Error.Code, r.Error.Message)
	}
}
return nil
```

**Signature:** `func (s *SkillsService) Copy(ctx context.Context, agentID AgentID, skillID SkillID, params CopySkillParams, opts ...RequestOption) ([]SkillCopyResult, error)`

Returns one `ba.SkillCopyResult` per destination, in request order. A `ba.SkillCopyCreated` result carries the destination `AgentID` and the new `Skill`; a `ba.SkillCopyFailed` result carries the `AgentID` and a `ba.SkillCopyError` with `Code`, `Message`, and `Details`, so one bad destination does not fail the call. A status this version does not know arrives as `ba.UnknownSkillCopyResult`. An empty `AgentIDs` fails client-side with `*ba.ArgumentError`. The call itself fails only with `validation_failed` or `skill_not_found`.

## Response models [#response-models]

### `Skill` and `SkillSummary` [#skill-and-skilldetail]

| Field | Type | Description |
| --- | --- | --- |
| `ID` | `ba.SkillID` | Skill ID (`skill_...`) |
| `TenantID` | `ba.TenantID` | Your tenant ID |
| `AgentID` | `ba.AgentID` | The agent that owns the skill |
| `Name` | `string` | Name from `SKILL.md` frontmatter |
| `Description` | `string` | What the skill does, from the frontmatter |
| `Metadata` | `map[string]string` | The frontmatter `metadata` map, or nil when it is not set |
| `Files` | `[]ba.SkillFile` | Only on `Skill`: the skill's files, each with `Path` and `SizeBytes` |
| `CreatedAt`, `UpdatedAt` | `time.Time` | Timestamps |

## Errors [#errors]

| Code | Meaning |
| --- | --- |
| `skill_not_found` | The skill does not belong to this agent |
| `skill_invalid_markdown` | `SKILL.md` frontmatter is missing or invalid |
| `skill_invalid_archive` | The archive is invalid or contains unsafe paths |
| `skill_name_conflict` | The agent already has a skill with that name |
| `skill_limit_reached` | The agent already has 100 skills |
| `skill_too_many_files` | The skill would have more than 100 files |
| `skill_uncompressed_too_large` | The skill would exceed 10 MiB |

## Next [#next]

- [Skills guide](/agents/skills)
- [Agents](/sdk/go/agents)
