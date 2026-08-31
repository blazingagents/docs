"use client";

import { Check, ChevronDown, ChevronRight } from "lucide-react";
import {
  Collapsible as CollapsiblePrimitive,
  DropdownMenu as DropdownMenuPrimitive,
} from "radix-ui";
import {
  createContext,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ApiResponseExample } from "./api-code-rail.tsx";

export interface ApiResponseMetadata {
  description: string;
  schema?: {
    href?: string;
    name: string;
  };
}

interface ApiResponseDetailsProps {
  metadata: ApiResponseMetadata;
  responses: readonly ApiResponseExample[];
}

const ApiResponseContext = createContext<ApiResponseDetailsProps | undefined>(
  undefined
);

export function ApiResponseProvider({
  children,
  metadata,
  responses,
}: ApiResponseDetailsProps & { children: ReactNode }) {
  return (
    <ApiResponseContext.Provider value={{ metadata, responses }}>
      {children}
    </ApiResponseContext.Provider>
  );
}

export function ApiReferenceSectionHeading({
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  const response = useContext(ApiResponseContext);
  if (getText(children).trim() === "Response" && response) {
    return <ApiResponseDetails {...response} />;
  }
  return <h4 {...props}>{children}</h4>;
}

export function ApiResponseDetails({
  metadata,
  responses,
}: ApiResponseDetailsProps) {
  const statusOptions = useMemo(
    () => [
      ...new Set(responses.map(({ status: responseStatus }) => responseStatus)),
    ],
    [responses]
  );
  const [selectedStatus, setSelectedStatus] = useState(
    statusOptions[0] ?? "200"
  );
  const responsesForStatus = responses.filter(
    (candidate) => candidate.status === selectedStatus
  );
  const contentTypeOptions = [
    ...new Set(
      responsesForStatus
        .map(({ contentType: responseContentType }) => responseContentType)
        .filter((value): value is string => Boolean(value))
    ),
  ];
  const [selectedContentType, setSelectedContentType] = useState<
    string | undefined
  >(contentTypeOptions[0]);
  const activeContentType = contentTypeOptions.includes(
    selectedContentType ?? ""
  )
    ? selectedContentType
    : contentTypeOptions[0];
  const response =
    responsesForStatus.find(
      (candidate) => candidate.contentType === activeContentType
    ) ??
    responsesForStatus[0] ??
    responses[0];
  const isSuccess = selectedStatus.startsWith("2");
  const isEmpty = response?.note === "No response body";
  const fields = useMemo(
    () => getResponseFields(response?.code),
    [response?.code]
  );
  const schema = isSuccess ? metadata.schema : { name: "error" };
  const selectStatus = useCallback(
    (value: string) => {
      setSelectedStatus(value);
      setSelectedContentType(
        responses.find((candidate) => candidate.status === value)?.contentType
      );
    },
    [responses]
  );

  return (
    <section className="api-response-details">
      <header className="api-response-details-header">
        <h4 className="api-response-details-title">Response</h4>
        <div className="api-response-details-controls">
          <ResponseMenu
            label="Select response status"
            onSelect={selectStatus}
            options={statusOptions}
            value={selectedStatus}
          />
          {activeContentType && contentTypeOptions.length > 0 ? (
            <ResponseMenu
              label="Select response content type"
              onSelect={setSelectedContentType}
              options={contentTypeOptions}
              value={activeContentType}
            />
          ) : null}
        </div>
      </header>

      <p className="api-response-details-summary">
        {isSuccess
          ? metadata.description
          : `Returns an HTTP ${selectedStatus} error response.`}
      </p>

      {isEmpty ? (
        <p className="api-response-empty">This response has no body.</p>
      ) : (
        <div className="api-response-schema-field">
          <div className="api-response-schema-heading">
            {schema?.href ? (
              <a className="api-response-schema-name" href={schema.href}>
                {schema.name}
              </a>
            ) : (
              <span className="api-response-schema-name">
                {schema?.name ?? response?.note ?? "response"}
              </span>
            )}
            <span className="api-response-schema-type">
              {getRootType(response)}
            </span>
            <span className="api-response-schema-required">required</span>
          </div>
          <p className="api-response-schema-description">
            {isSuccess
              ? getSchemaDescription(metadata, response)
              : "The structured API error body."}
          </p>

          {fields.length > 0 ? (
            <CollapsiblePrimitive.Root className="api-response-schema-collapsible">
              <CollapsiblePrimitive.Trigger className="api-response-schema-trigger">
                <ChevronRight
                  aria-hidden="true"
                  className="api-response-schema-chevron"
                  size={14}
                  strokeWidth={1.8}
                />
                <span>Show child attributes</span>
              </CollapsiblePrimitive.Trigger>
              <CollapsiblePrimitive.Content className="api-response-schema-children">
                {fields.map(({ description, name, type }) => (
                  <div className="api-response-schema-child" key={name}>
                    <div>
                      <span className="api-response-schema-name">{name}</span>
                      <span className="api-response-schema-type">{type}</span>
                    </div>
                    <p className="api-response-schema-description">
                      {description}
                    </p>
                  </div>
                ))}
              </CollapsiblePrimitive.Content>
            </CollapsiblePrimitive.Root>
          ) : null}
        </div>
      )}
    </section>
  );
}

function ResponseMenu({
  label,
  onSelect,
  options,
  value,
}: {
  label: string;
  onSelect?: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger
        aria-label={label}
        className="api-response-selector-trigger"
      >
        <span>{value}</span>
        <ChevronDown aria-hidden="true" size={13} strokeWidth={1.8} />
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          className="api-response-selector-menu"
          collisionPadding={12}
          sideOffset={7}
        >
          <DropdownMenuPrimitive.RadioGroup
            onValueChange={onSelect}
            value={value}
          >
            {options.map((option) => (
              <DropdownMenuPrimitive.RadioItem
                className="api-response-selector-option"
                key={option}
                value={option}
              >
                <span>{option}</span>
                <DropdownMenuPrimitive.ItemIndicator>
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

function getResponseFields(code?: string) {
  if (!code) {
    return [];
  }
  try {
    const value: unknown = JSON.parse(code);
    if (!value || typeof value !== "object") {
      return [];
    }
    const record = Array.isArray(value)
      ? { data: value }
      : (value as Record<string, unknown>);
    return Object.entries(record).map(([name, fieldValue]) => ({
      description: getFieldDescription(fieldValue),
      name,
      type: getValueType(fieldValue),
    }));
  } catch {
    return [];
  }
}

function getFieldDescription(value: unknown): string {
  if (Array.isArray(value)) {
    return `${value.length} example ${value.length === 1 ? "item" : "items"}.`;
  }
  if (value && typeof value === "object") {
    return `${Object.keys(value).length} child attributes.`;
  }
  return `Example: ${JSON.stringify(value)}.`;
}

function getRootType(response?: ApiResponseExample): string {
  if (!response?.code) {
    return response?.contentType === "application/json" ? "object" : "body";
  }
  try {
    const value: unknown = JSON.parse(response.code);
    return Array.isArray(value) ? "array" : typeof value;
  } catch {
    return "body";
  }
}

function getSchemaDescription(
  metadata: ApiResponseMetadata,
  response?: ApiResponseExample
): string {
  if (response?.note && response.note !== metadata.schema?.name) {
    return response.note;
  }
  return metadata.description;
}

function getValueType(value: unknown): string {
  if (Array.isArray(value)) {
    const item = value[0];
    return item === undefined ? "array" : `${getValueType(item)}[]`;
  }
  if (value === null) {
    return "null";
  }
  return typeof value;
}

function getText(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(getText).join("");
  }
  return "";
}
