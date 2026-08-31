// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { DocumentationMarkdownCopyButton } from "./markdown-copy-button.tsx";

class TestClipboardItem {
  readonly data: Record<string, Promise<string>>;

  constructor(data: Record<string, Promise<string>>) {
    this.data = data;
  }
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("DocumentationMarkdownCopyButton", () => {
  test("copies fetched Markdown and confirms success", async () => {
    const write = vi.fn(async ([item]: TestClipboardItem[]) => {
      expect(await item.data["text/plain"]).toBe("# Operation");
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("# Operation"))
    );
    vi.stubGlobal("ClipboardItem", TestClipboardItem);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { write },
    });

    render(
      createElement(DocumentationMarkdownCopyButton, {
        markdownUrl: "/operation.md",
      })
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy Markdown" }));

    await screen.findByRole("button", { name: "Markdown copied" });
    expect(fetch).toHaveBeenCalledWith("/operation.md");
    expect(write).toHaveBeenCalledOnce();
  });

  test("reports HTTP and clipboard failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("missing", { status: 404 }))
    );
    vi.stubGlobal("ClipboardItem", TestClipboardItem);
    const write = vi.fn(async ([item]: TestClipboardItem[]) => {
      await item.data["text/plain"];
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { write },
    });

    render(
      createElement(DocumentationMarkdownCopyButton, {
        markdownUrl: "/missing.md",
      })
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy Markdown" }));
    const failed = await screen.findByRole("button", {
      name: "Unable to copy Markdown",
    });
    expect(failed.getAttribute("title")).toBe(
      "Markdown request failed with 404"
    );

    vi.mocked(fetch).mockResolvedValue(new Response("# Operation"));
    write.mockRejectedValue("clipboard denied");
    fireEvent.click(failed);
    await waitFor(() => {
      expect(failed.getAttribute("title")).toBe("clipboard denied");
    });
  });
});
