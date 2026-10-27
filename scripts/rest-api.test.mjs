import { describe, expect, it } from "vitest";
import { loadRestApi, renderPage } from "./rest-api.mjs";

const pages = loadRestApi();

function operation(anchor) {
  const found = pages
    .flatMap((page) => page.operations)
    .find((candidate) => candidate.anchor === anchor);
  if (!found) {
    throw new Error(`no operation ${anchor}`);
  }
  return found;
}

function rendered(anchor) {
  const page = pages.find((candidate) =>
    candidate.operations.some((entry) => entry.anchor === anchor)
  );
  const text = renderPage(page);
  const start = text.indexOf(`[#${anchor}]`);
  return text.slice(start, text.indexOf("\n### ", start));
}

function row(anchor, name) {
  return operation(anchor).parameters.find((entry) => entry.name === name);
}

describe("REST API reference access", () => {
  it("names the key access and end-user scope of a scoped read", () => {
    const text = rendered("get-usage");
    expect(text).toContain("A read-only or full [API key]");
    expect(text).toContain("Accepts an [end-user scope]");
    expect(text).not.toContain("refuses an [end-user scope]");
  });

  it("says a write needs a full key", () => {
    expect(rendered("create-agent")).toContain("Needs a full [API key]");
    expect(rendered("create-agent")).not.toContain("read-only or full");
  });

  it("says a tenant operation refuses an end-user scope", () => {
    expect(rendered("get-usage-overview")).toContain(
      "refuses an [end-user scope]"
    );
  });

  it("treats a run operation as open to read-only keys", () => {
    expect(rendered("generate")).toContain("A read-only or full [API key]");
  });
});

describe("REST API reference request fields", () => {
  it("lists the fields of a nested request object", () => {
    expect(row("update-tenant-spending-limit", "spendingLimit.amountUsd")).toMatchObject({
      required: true,
      type: "number",
    });
    expect(
      row("update-tenant-spending-limit", "spendingLimit.resetInterval")
        .description
    ).toContain("`monthly`");
  });

  it("describes exclusive minimums, lone maximums and item counts", () => {
    expect(
      row("update-tenant-spending-limit", "spendingLimit.amountUsd").description
    ).toContain("More than 0, up to 1000000000.");
    expect(row("create-merchant-connection", "guard.productIds").description).toContain(
      "Up to 100 items."
    );
  });

  it("lists the variants of a oneOf body with their discriminator", () => {
    const create = operation("create-chat-connection");
    expect(create.parameters.find((entry) => entry.name === "(body)")).toBeUndefined();
    expect(row("create-chat-connection", "agentId")).toMatchObject({
      required: true,
    });
    expect(row("create-chat-connection", "agentId").description).not.toContain(
      "Only when"
    );
    const signingSecret = row(
      "create-chat-connection",
      "credentials.signingSecret"
    );
    expect(signingSecret.description).toContain(
      "Only when `platform` is `slack`."
    );
  });

  it("scopes a field only some variants have to their discriminator value", () => {
    expect(row("create-mcp-connection", "scope").description).toContain(
      "Only when `authType` is `oauth_authorization_code`."
    );
  });

  it("keeps a field's rows together when its variants differ", () => {
    const names = operation("create-chat-connection").parameters.map(
      (entry) => entry.name
    );
    const first = names.indexOf("credentials.botToken");
    expect(names.slice(first, first + 2)).toEqual([
      "credentials.botToken",
      "credentials.botToken",
    ]);
  });

  it("lists the variants of a nested oneOf field", () => {
    expect(row("create-task", "schedule.config.everyMs").description).toContain(
      "Only when `schedule.kind` is `interval`."
    );
    expect(row("create-workspace", "networkPolicy.allowedHosts")).toBeDefined();
  });

  it("lists the fields of objects inside an array", () => {
    expect(
      operation("continue-tool-approvals").parameters.some((entry) =>
        entry.name.startsWith("decisions[].")
      )
    ).toBe(true);
  });
});
