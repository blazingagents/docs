import { useRouterState } from "@tanstack/react-router";
import { DocsLayout, useDocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { BookOpen, Boxes, Braces, Command, Menu } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { PUBLIC_SITE_ORIGIN } from "../../brand.ts";
import { restApiOperations } from "../generated/documentation-manifest.ts";
import {
  formatOperationName,
  type HttpMethod,
  HttpMethodBadge,
} from "./api-reference.tsx";

const documentationSections = [
  {
    icon: BookOpen,
    label: "Docs",
    matches: undefined,
    nodeIds: [
      "index.mdx",
      "getting-started",
      "agents",
      "platform",
      "automation",
    ],
    url: "/",
  },
  {
    icon: Braces,
    label: "API Reference",
    matches: ["/api-reference"],
    nodeIds: ["api-reference"],
    url: "/api-reference",
  },
  {
    icon: Boxes,
    label: "SDK",
    matches: ["/sdk"],
    nodeIds: ["sdk"],
    url: "/sdk",
  },
  {
    icon: Command,
    label: "CLI",
    matches: ["/cli"],
    nodeIds: ["cli"],
    url: "/cli",
  },
] as const;

type DocumentationTree = ComponentProps<typeof DocsLayout>["tree"];
type DocumentationNode = DocumentationTree["children"][number];

export function DocumentationProvider({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      search={{
        enabled: true,
        options: { api: "/api/search", type: "static" },
      }}
      theme={{
        defaultTheme: "dark",
        enableSystem: false,
        storageKey: "blazing-docs-theme",
      }}
    >
      {children}
    </RootProvider>
  );
}

export function DocumentationLayout({
  children,
  tree,
}: {
  children: ReactNode;
  tree: DocumentationTree;
}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const section = getDocumentationSection(pathname);
  const sectionTree = getSectionTree(tree, section, pathname);

  return (
    <DocsLayout
      links={[
        {
          type: "button",
          text: "Dashboard",
          url:
            import.meta.env.VITE_DASHBOARD_URL ??
            "https://app.blazingagents.com",
          external: true,
        },
      ]}
      nav={{
        title: DocumentationHomeLink,
        url: PUBLIC_SITE_ORIGIN,
      }}
      searchToggle={{ enabled: true }}
      sidebar={{ collapsible: true }}
      slots={{ header: DocumentationHeader }}
      tabs={false}
      themeSwitch={{ enabled: true, mode: "light-dark" }}
      tree={sectionTree}
    >
      {children}
    </DocsLayout>
  );
}

function DocumentationHomeLink({
  href = PUBLIC_SITE_ORIGIN,
  ...props
}: ComponentProps<"a">) {
  return (
    <a {...props} aria-label="Blazing Agents homepage" href={href}>
      <img
        alt=""
        className="size-6"
        height="24"
        src="/favicon.svg"
        width="24"
      />
      <span className="hidden sm:inline">Blazing Agents</span>
    </a>
  );
}

function DocumentationHeader() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const activeSection = getDocumentationSection(pathname);
  const { slots } = useDocsLayout();
  const SearchTrigger = slots.searchTrigger ? slots.searchTrigger.full : null;
  const SidebarTrigger = slots.sidebar.trigger;
  const ThemeSwitch = slots.themeSwitch;

  return (
    <header className="docs-header sticky top-0 z-30 border-fd-border border-b bg-fd-background/90 backdrop-blur [grid-area:header]">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        <DocumentationHomeLink className="inline-flex items-center gap-2.5 font-medium text-[0.9375rem]" />
        <div className="ml-auto flex items-center gap-2">
          {SearchTrigger ? (
            <SearchTrigger
              aria-label="Search documentation"
              className="md:w-[26rem]"
            />
          ) : null}
          {ThemeSwitch ? <ThemeSwitch /> : null}
          <SidebarTrigger
            aria-label="Toggle documentation navigation"
            className="inline-flex size-9 items-center justify-center rounded-md border border-fd-border md:hidden"
          >
            <Menu aria-hidden="true" className="size-4" />
          </SidebarTrigger>
        </div>
      </div>
      <nav
        aria-label="Documentation sections"
        className="flex h-12 items-end gap-6 overflow-x-auto px-4 md:px-6"
      >
        {documentationSections.map((section) => {
          const { icon: Icon, label, url } = section;

          return (
            <a
              aria-current={activeSection === section ? "page" : undefined}
              className="docs-section-link"
              href={url}
              key={label}
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </a>
          );
        })}
      </nav>
    </header>
  );
}

function getDocumentationSection(pathname: string) {
  const matchingSection = documentationSections.find((section) =>
    section.matches?.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  );

  if (matchingSection) {
    return matchingSection;
  }
  if (pathname === "/api-reference") {
    return documentationSections[1];
  }
  return documentationSections[0];
}

function getSectionTree(
  tree: DocumentationTree,
  section: (typeof documentationSections)[number],
  pathname: string
): DocumentationTree {
  if (section === documentationSections[1]) {
    return getApiReferenceTree(tree, section, pathname);
  }

  const children = section.nodeIds
    .flatMap((nodeId) => {
      const node = getRequiredDocumentationNode(tree, nodeId);
      return section !== documentationSections[0] && node.type === "folder"
        ? node.children
        : [node];
    })
    .filter((node) => node.$id !== "sdk/index.mdx")
    .map((node) => {
      if (node.$id === "cli/index.mdx") {
        return { ...node, name: "Install" };
      }
      if (node.$id === "automation" && node.type === "folder") {
        return {
          ...node,
          children: node.children.map((child) =>
            child.$id === "automation/index.mdx"
              ? { ...child, name: "Overview" }
              : child
          ),
        };
      }
      return node;
    });

  return {
    ...tree,
    $id: `section-${section.label}`,
    children,
    name: section.label,
  };
}

function getApiReferenceTree(
  tree: DocumentationTree,
  section: (typeof documentationSections)[1],
  pathname: string
): DocumentationTree {
  const apiReference = getRequiredDocumentationNode(tree, "api-reference");
  const restApi = getRequiredDocumentationNode(tree, "api-reference/rest-api");
  const protocols = getRequiredDocumentationNode(
    tree,
    "api-reference/protocols"
  );
  if (
    apiReference.type !== "folder" ||
    restApi.type !== "folder" ||
    protocols.type !== "folder"
  ) {
    throw new Error("API reference navigation roots must be folders");
  }

  const overview = getRequiredDocumentationNode(
    restApi,
    "api-reference/rest-api/index.mdx"
  );
  const authentication = getRequiredDocumentationNode(
    restApi,
    "api-reference/rest-api/authentication.md"
  );
  const resources: DocumentationNode[] = restApiOperations.map((resource) => ({
    $id: `rest-api-resource-${resource.pageId}`,
    type: "folder",
    name: resource.title,
    defaultOpen:
      pathname === resource.url || pathname.startsWith(`${resource.url}/`),
    children: resource.operations.map((operation) => ({
      $id: `rest-api-operation-${operation.operation}`,
      type: "page",
      name: formatOperationName(operation.operation),
      url: operation.url,
      icon: <HttpMethodBadge compact method={operation.method as HttpMethod} />,
    })),
  }));

  return {
    ...tree,
    $id: `section-${section.label}`,
    children: [
      { ...overview, name: "Overview" },
      authentication,
      {
        $id: "rest-api-resources",
        type: "folder",
        name: "REST API",
        defaultOpen: pathname.startsWith("/api-reference/rest-api/"),
        children: resources,
      },
      protocols,
    ],
    name: section.label,
  };
}

function getRequiredDocumentationNode(
  tree: Pick<DocumentationTree, "children">,
  nodeId: string
): DocumentationNode {
  const node = findDocumentationNode(tree.children, nodeId);
  if (!node) {
    throw new Error(`Missing documentation navigation node ${nodeId}`);
  }
  return node;
}

function findDocumentationNode(
  nodes: DocumentationNode[],
  nodeId: string
): DocumentationNode | undefined {
  for (const node of nodes) {
    if (node.$id === nodeId) {
      return node;
    }
    if (node.type === "folder") {
      const child = findDocumentationNode(node.children, nodeId);
      if (child) {
        return child;
      }
    }
  }
}
