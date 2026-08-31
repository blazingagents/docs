import {
  Children,
  cloneElement,
  createElement,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type TableHTMLAttributes,
} from "react";
import type { ApiResponseExample } from "./api-code-rail.tsx";
import {
  type ApiResponseMetadata,
  ApiResponseProvider,
} from "./api-response-details.tsx";

const endpointHeading = /^(DELETE|GET|PATCH|POST|PUT) (\/v1\/\S+)$/;
const leadingHash = /^#/;
const parameterHeader =
  /^(Body field|Parameter|Path parameter|Query parameter)$/;
const booleanParameters = new Set(["approved", "forwardUserId"]);
const integerParameters = new Set(["limit", "version"]);
const stringArrayParameters = new Set(["forwardedMetadataKeys"]);
const preservedTerms = new Map([
  ["api", "API"],
  ["id", "ID"],
  ["mcp", "MCP"],
  ["oauth", "OAuth"],
  ["url", "URL"],
]);

export type HttpMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

export function HttpMethodBadge({
  method,
  compact = false,
}: {
  method: HttpMethod;
  compact?: boolean;
}) {
  return (
    <span
      className="api-method-badge"
      data-compact={compact || undefined}
      data-method={method.toLowerCase()}
    >
      {method}
    </span>
  );
}

export function ApiOperationRoute({
  method,
  path,
}: {
  method: HttpMethod;
  path: string;
}) {
  return (
    <span className="api-operation-route">
      <HttpMethodBadge method={method} />
      <code>{path}</code>
    </span>
  );
}

export function ApiReferenceTable({
  children,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  const headers = getTableHeaders(children);
  const layout = getParameterTableLayout(headers);
  if (!layout) {
    return <table {...props}>{children}</table>;
  }
  const normalizedLayout =
    layout === "location-first" ? "field-location" : layout;
  const normalizedChildren =
    layout === "location-first"
      ? normalizeLegacyParameterRows(children)
      : children;
  return (
    <div className="api-parameter-table-scroll">
      <table
        {...props}
        data-api-parameter-layout={normalizedLayout}
        data-api-parameter-required={headers.includes("Required") || undefined}
      >
        {normalizedChildren}
      </table>
    </div>
  );
}

export function ApiOperationContent({
  children,
  operation,
  responseMetadata,
  responses,
}: {
  children: ReactNode;
  operation: string;
  responseMetadata: ApiResponseMetadata;
  responses: readonly ApiResponseExample[];
}) {
  const selector = `#${operation}`;
  const operationScope = `.api-single-operation[data-api-operation="${operation}"]`;
  const styles = [
    ".api-single-operation > *, .api-single-operation > .api-operation-heading { display: none; }",
    `.api-single-operation > ${selector} ~ * { display: revert; }`,
    `.api-single-operation > ${selector}, .api-single-operation > ${selector} + p { display: none; }`,
    `.api-single-operation > ${selector} ~ h4[id^="response"] ~ figure:has(~ h4[id^="errors"]) { display: none !important; }`,
    `.api-single-operation > ${selector} ~ .api-response-details ~ :not(h4) { display: none !important; }`,
    `.api-single-operation > ${selector} ~ .api-response-details ~ h4, .api-single-operation > ${selector} ~ .api-response-details ~ h4 ~ * { display: revert !important; }`,
    `.api-single-operation > ${selector} ~ h4[id^="curl"] + figure { display: none !important; }`,
    `.api-single-operation > ${selector} ~ h4[id^="curl"] { display: none !important; }`,
    `${operationScope} > ${selector} ~ :is(h2, .api-operation-heading), ${operationScope} > ${selector} ~ :is(h2, .api-operation-heading) ~ * { display: none !important; }`,
  ].join(" ");

  return (
    <div className="api-single-operation" data-api-operation={operation}>
      <style>{styles}</style>
      <ApiResponseProvider metadata={responseMetadata} responses={responses}>
        {children}
      </ApiResponseProvider>
    </div>
  );
}

export function ApiReferenceHeading({
  children,
  className,
  id,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  const rawHeading = getText(children);
  const match = rawHeading.match(endpointHeading);
  if (!match) {
    return (
      <h3 className={className} id={id} {...props}>
        {children}
      </h3>
    );
  }

  const method = match[1] as HttpMethod;
  const path = match[2] ?? "";

  return (
    <h3
      className={["api-operation-heading", className].filter(Boolean).join(" ")}
      id={id}
      {...props}
    >
      <span className="api-operation-title">
        {formatOperationName(id ?? rawHeading)}
      </span>
      <ApiOperationRoute method={method} path={path} />
    </h3>
  );
}

export function formatOperationName(value: string): string {
  const words = value
    .replace(leadingHash, "")
    .split("-")
    .filter(Boolean)
    .map((word) => preservedTerms.get(word) ?? word);
  const [first, ...rest] = words;
  if (!first) {
    return value;
  }
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(" ");
}

function getText(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(getText).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(value)) {
    return getText(value.props.children);
  }
  return "";
}

function getTableHeaders(children: ReactNode): string[] {
  const headers: string[] = [];
  const visit = (nodes: ReactNode) => {
    Children.forEach(nodes, (node) => {
      if (!isValidElement<{ children?: ReactNode }>(node)) {
        return;
      }
      if (node.type === "th") {
        headers.push(getText(node.props.children).trim());
        return;
      }
      visit(node.props.children);
    });
  };
  visit(children);
  return headers;
}

function getParameterTableLayout(headers: string[]): string | undefined {
  if (!(headers.includes("Description") || headers.includes("Default"))) {
    return;
  }
  if (headers[0] === "Location" && headers[1] === "Field") {
    return "location-first";
  }
  if (
    headers[0] === "Field" &&
    headers.includes("Location") &&
    headers.includes("Required")
  ) {
    return "field-location";
  }
  if (parameterHeader.test(headers[0] ?? "")) {
    if (!headers.includes("Description") && headers.includes("Default")) {
      return "field-default";
    }
    return headers.length === 3 ? "field-compact" : "field-first";
  }
}

function normalizeLegacyParameterRows(nodes: ReactNode): ReactNode {
  return Children.map(nodes, (node) => {
    if (!isValidElement<{ children?: ReactNode }>(node)) {
      return node;
    }
    if (node.type !== "tr") {
      return cloneElement(
        node,
        undefined,
        normalizeLegacyParameterRows(node.props.children)
      );
    }
    const cells = Children.toArray(node.props.children).filter(
      (cell): cell is ReactElement<{ children?: ReactNode }> =>
        isValidElement(cell)
    );
    if (cells.length !== 4) {
      return node;
    }
    const [locationCell, fieldCell, requiredCell, descriptionCell] = cells;
    const isHeader = fieldCell.type === "th";
    const fieldName = getText(fieldCell.props.children).trim();
    const type = isHeader ? "Type" : getLegacyParameterType(fieldName);
    const location = isHeader
      ? "Location"
      : getText(locationCell.props.children).trim().toLowerCase();
    const requirement = isHeader
      ? "Required"
      : getLegacyRequirement(getText(requiredCell.props.children).trim());
    const cellType = isHeader ? "th" : "td";

    return cloneElement(node, undefined, [
      cloneElement(fieldCell, { key: "field" }),
      createElement(cellType, { key: "type" }, type),
      cloneElement(locationCell, { key: "location" }, location),
      cloneElement(requiredCell, { key: "required" }, requirement),
      cloneElement(descriptionCell, { key: "description" }),
    ]);
  });
}

function getLegacyParameterType(field: string): string {
  if (booleanParameters.has(field)) {
    return "boolean";
  }
  if (integerParameters.has(field)) {
    return "integer";
  }
  if (stringArrayParameters.has(field)) {
    return "string[]";
  }
  return "string";
}

function getLegacyRequirement(value: string): string {
  if (value === "yes") {
    return "required";
  }
  if (value === "no") {
    return "";
  }
  return value;
}
