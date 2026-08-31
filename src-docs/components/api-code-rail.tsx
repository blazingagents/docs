"use client";

import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu as DropdownMenuPrimitive,
  Tabs as TabsPrimitive,
} from "radix-ui";
import { type ReactNode, useCallback, useEffect, useState } from "react";

const LANGUAGE_STORAGE_KEY = "blazing-agents-api-language";
const LANGUAGE_CHANGE_EVENT = "blazing-agents-api-language-change";

export interface ApiRequestExample {
  code: string;
  label: string;
  language: string;
}

export interface ApiResponseExample {
  code?: string;
  contentType?: string;
  language?: string;
  note?: string;
  status: string;
}

export function ApiCodeRail({
  className,
  operation,
  requests,
  responses,
}: {
  className?: string;
  operation: string;
  requests: readonly ApiRequestExample[];
  responses: readonly ApiResponseExample[];
}) {
  const defaultLanguage = requests[0]?.language ?? "curl";
  const [language, setLanguage] = useState(defaultLanguage);
  const request =
    requests.find((candidate) => candidate.language === language) ??
    requests[0];

  useEffect(() => {
    const selectStoredLanguage = () => {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && requests.some((example) => example.language === stored)) {
        setLanguage(stored);
      }
    };
    selectStoredLanguage();
    window.addEventListener("storage", selectStoredLanguage);
    window.addEventListener(LANGUAGE_CHANGE_EVENT, selectStoredLanguage);
    return () => {
      window.removeEventListener("storage", selectStoredLanguage);
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, selectStoredLanguage);
    };
  }, [requests]);

  const selectLanguage = useCallback((value: string) => {
    setLanguage(value);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  }, []);

  if (!request) {
    return null;
  }

  return (
    <aside
      aria-label={`Code examples for ${operation}`}
      className={["api-code-rail", className].filter(Boolean).join(" ")}
    >
      <div className="api-code-rail-inner">
        <ApiExamplePanel
          actions={
            <LanguageMenu
              examples={requests}
              onSelect={selectLanguage}
              value={request.language}
            />
          }
          code={request.code}
          language={request.language}
          title={operation}
        />
        {responses.length > 0 ? (
          <ApiResponsePanel
            key={operation}
            operation={operation}
            responses={responses}
          />
        ) : null}
      </div>
    </aside>
  );
}

function LanguageMenu({
  examples,
  onSelect,
  value,
}: {
  examples: readonly ApiRequestExample[];
  onSelect: (value: string) => void;
  value: string;
}) {
  const selected = examples.find((example) => example.language === value);

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger
        aria-label="Select request language"
        className="api-language-trigger"
      >
        <span>{selected?.label ?? value}</span>
        <ChevronDown aria-hidden="true" size={14} strokeWidth={1.8} />
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          className="api-language-menu"
          collisionPadding={12}
          sideOffset={7}
        >
          <DropdownMenuPrimitive.RadioGroup
            onValueChange={onSelect}
            value={value}
          >
            {examples.map((example) => (
              <DropdownMenuPrimitive.RadioItem
                className="api-language-option"
                key={example.language}
                value={example.language}
              >
                <span
                  aria-hidden="true"
                  className="api-language-monogram"
                  data-language={example.language}
                >
                  {getLanguageMonogram(example.language)}
                </span>
                <span>{example.label}</span>
                <DropdownMenuPrimitive.ItemIndicator className="api-language-check">
                  <Check aria-hidden="true" size={14} strokeWidth={2.2} />
                </DropdownMenuPrimitive.ItemIndicator>
              </DropdownMenuPrimitive.RadioItem>
            ))}
          </DropdownMenuPrimitive.RadioGroup>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

function ApiResponsePanel({
  operation,
  responses,
}: {
  operation: string;
  responses: readonly ApiResponseExample[];
}) {
  const firstResponse = responses[0];
  if (!firstResponse) {
    return null;
  }

  return (
    <TabsPrimitive.Root
      className="api-example-panel api-response-panel"
      defaultValue={getResponseKey(firstResponse)}
    >
      <TabsPrimitive.List
        aria-label="Response examples"
        className="api-response-tabs"
      >
        {responses.map((response, index) => {
          const key = getResponseKey(response);
          return (
            <TabsPrimitive.Trigger
              className="api-response-tab"
              key={key}
              value={key}
            >
              {response.status}
              {responses.some(
                (candidate, candidateIndex) =>
                  candidateIndex < index && candidate.status === response.status
              )
                ? ` · ${index + 1}`
                : ""}
            </TabsPrimitive.Trigger>
          );
        })}
      </TabsPrimitive.List>
      {responses.map((response) => {
        const key = getResponseKey(response);
        return (
          <TabsPrimitive.Content
            className="api-response-content"
            key={key}
            value={key}
          >
            {response.code ? (
              <ApiCode
                code={response.code}
                language={response.language ?? "json"}
              />
            ) : (
              <div className="api-response-note">
                <span>{response.note ?? "No response body"}</span>
              </div>
            )}
          </TabsPrimitive.Content>
        );
      })}
      <span className="sr-only">{operation} response</span>
    </TabsPrimitive.Root>
  );
}

function ApiExamplePanel({
  actions,
  code,
  language,
  title,
}: {
  actions?: ReactNode;
  code: string;
  language: string;
  title: string;
}) {
  return (
    <section className="api-example-panel">
      <header className="api-example-toolbar">
        <span className="api-example-title">{title}</span>
        {actions}
      </header>
      <ApiCode code={code} language={language} />
    </section>
  );
}

function ApiCode({ code, language }: { code: string; language: string }) {
  return (
    <div className="api-example-code">
      <DynamicCodeBlock
        code={code}
        codeblock={{
          className: "api-example-shiki",
          keepBackground: false,
          viewportProps: { className: "api-example-code-viewport" },
        }}
        lang={language}
      />
    </div>
  );
}

function getLanguageMonogram(language: string): string {
  const monograms: Record<string, string> = {
    bash: "›_",
    curl: "›_",
    go: "Go",
    java: "Jv",
    javascript: "JS",
    php: "PHP",
    python: "Py",
    ruby: "Rb",
  };
  return monograms[language] ?? language.slice(0, 2);
}

function getResponseKey(response: ApiResponseExample): string {
  return [
    response.status,
    response.language ?? "",
    response.code ?? response.note ?? "",
  ].join(":");
}
