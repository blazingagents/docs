"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";

export function DocumentationMarkdownCopyButton({
  markdownUrl,
}: {
  markdownUrl: string;
}) {
  const [state, setState] = useState<"copied" | "error" | "idle" | "loading">(
    "idle"
  );
  const [copyError, setCopyError] = useState("");

  const copyMarkdown = useCallback(async () => {
    setState("loading");
    setCopyError("");
    try {
      const markdown = fetch(markdownUrl).then((response) => {
        if (!response.ok) {
          throw new Error(`Markdown request failed with ${response.status}`);
        }
        return response.text();
      });
      await navigator.clipboard.write([
        new ClipboardItem({ "text/plain": markdown }),
      ]);
      setState("copied");
    } catch (error) {
      setCopyError(error instanceof Error ? error.message : String(error));
      setState("error");
    }
  }, [markdownUrl]);

  let label = "Copy Markdown";
  if (state === "copied") {
    label = "Markdown copied";
  } else if (state === "error") {
    label = "Unable to copy Markdown";
  }

  return (
    <button
      aria-live="polite"
      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border bg-fd-secondary px-2 py-1.5 font-medium text-fd-secondary-foreground text-xs transition-colors duration-100 hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring disabled:pointer-events-none disabled:opacity-50 max-sm:gap-0 max-sm:text-[0px] [&_svg]:size-3.5 [&_svg]:text-fd-muted-foreground max-sm:[&_svg]:size-4"
      disabled={state === "loading"}
      onClick={copyMarkdown}
      title={copyError || undefined}
      type="button"
    >
      {state === "copied" ? (
        <Check aria-hidden="true" />
      ) : (
        <Copy aria-hidden="true" />
      )}
      {label}
    </button>
  );
}
