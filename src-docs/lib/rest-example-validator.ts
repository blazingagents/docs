// biome-ignore-all lint/performance/noNamespaceImport: response examples resolve their documented public schema export at runtime.
import * as contracts from "@blazingagents/sdk/contracts";
import {
  approveMcpOauthAuthorizationBodySchema,
  chatRequestBodySchema,
  copySkillBodySchema,
  createAgentBodySchema,
  createMcpConnectionBodySchema,
  createMemoryBodySchema,
  createPromptBodySchema,
  createProviderBodySchema,
  createSkillBodySchema,
  createTaskBodySchema,
  createTaskRunBodySchema,
  createWorkspaceBodySchema,
  decideToolApprovalBodySchema,
  generationRequestBodySchema,
  reconnectMcpConnectionBodySchema,
  updateAgentBodySchema,
  updateMcpAttachmentBodySchema,
  updateMcpConnectionBodySchema,
  updateMemoryBodySchema,
  updatePromptBodySchema,
  updateProviderBodySchema,
  updateTaskBodySchema,
  updateTenantSettingsBodySchema,
  updateWorkspaceBodySchema,
} from "@blazingagents/sdk/contracts";
import { expect } from "vitest";
import type { z } from "zod";

const JSON_DATA = /--data(?:-raw)?(?:\s|=)'(?<json>[^']+)'/;
const SHELL_JSON_VALUE = /'"\$[A-Z][A-Z0-9_]*"'/g;
const ALPHABETICAL = (left: string, right: string) => left.localeCompare(right);
const RESPONSE_SECTION = /#### Response\n(?<body>[\s\S]*?)(?=\n#### )/;
const RESPONSE_STATUS = /`(?<status>2\d{2})(?: [^`]+)?`/g;
const RESPONSE_SCHEMA_LINK =
  /\[`(?<schema>[a-zA-Z][a-zA-Z0-9]+Schema)`\]\(\/api-reference\/protocols\/objects-and-schemas#(?<anchor>[a-z0-9-]+)\)/g;
const RESPONSE_JSON = /```json\n(?<body>[\s\S]*?)\n```/g;
const EMPTY_BODY = /(?:empty body|Empty)/;
const responseSchemas: Record<string, unknown> = {
  ...contracts,
};
const requiredResponseSemantics: Record<string, string[]> = {
  "create-session-turn": ["Location:", "text/event-stream"],
  generate: ["text/plain"],
  "join-tool-approval-continuation": ["SSE"],
  "resume-session-turn": ["text/event-stream", "X-Vercel-AI-UI-Message-Stream"],
};

const responseSchemaAssignments: Record<
  string,
  { anchor: string; schema: string; statuses: number[] }
> = {
  "approve-mcp-oauth-authorization": {
    anchor: "mcp-oauth-authorization-launch-response",
    schema: "mcpOauthAuthorizationLaunchResponseSchema",
    statuses: [200],
  },
  "connect-mcp-connection": {
    anchor: "mcp-connection-oauth-connect-response",
    schema: "mcpConnectionOauthConnectResponseSchema",
    statuses: [200],
  },
  "create-agent": {
    anchor: "agent-response",
    schema: "agentResponseSchema",
    statuses: [201],
  },
  "create-artifact-download-url": {
    anchor: "artifactdownloadurlresponse",
    schema: "artifactDownloadUrlResponseSchema",
    statuses: [200],
  },
  "get-artifact": {
    anchor: "artifactlistitem",
    schema: "artifactListItemSchema",
    statuses: [200],
  },
  "create-mcp-connection": {
    anchor: "mcp-connection-response",
    schema: "mcpConnectionResponseSchema",
    statuses: [201],
  },
  "create-memory": {
    anchor: "memory-response",
    schema: "memoryResponseSchema",
    statuses: [201],
  },
  "create-prompt": {
    anchor: "prompt-response",
    schema: "promptResponseSchema",
    statuses: [201],
  },
  "create-provider": {
    anchor: "provider-response",
    schema: "providerResponseSchema",
    statuses: [201],
  },
  "create-task": {
    anchor: "create-task-response",
    schema: "createTaskResponseSchema",
    statuses: [201],
  },
  "create-task-run": {
    anchor: "create-task-run-response",
    schema: "createTaskRunResponseSchema",
    statuses: [202],
  },
  "create-workspace": {
    anchor: "workspace",
    schema: "workspaceSchema",
    statuses: [201],
  },
  "decide-tool-approval": {
    anchor: "tool-approval-decision-response",
    schema: "toolApprovalDecisionResponseSchema",
    statuses: [202],
  },
  "delete-agent-avatar": {
    anchor: "agent",
    schema: "agentSchema",
    statuses: [200],
  },
  "disable-agent": { anchor: "agent", schema: "agentSchema", statuses: [200] },
  "enable-agent": { anchor: "agent", schema: "agentSchema", statuses: [200] },
  "get-agent": {
    anchor: "agent-response",
    schema: "agentResponseSchema",
    statuses: [200],
  },
  "get-agent-usage": {
    anchor: "usage-response",
    schema: "usageResponseSchema",
    statuses: [200],
  },
  "get-agent-version": {
    anchor: "agent-version",
    schema: "agentVersionSchema",
    statuses: [200],
  },
  "get-current-identity": {
    anchor: "tenant-response",
    schema: "tenantResponseSchema",
    statuses: [200],
  },
  "get-mcp-connection": {
    anchor: "mcp-connection-response",
    schema: "mcpConnectionResponseSchema",
    statuses: [200],
  },
  "get-memory": {
    anchor: "memory-response",
    schema: "memoryResponseSchema",
    statuses: [200],
  },
  "get-prompt": {
    anchor: "prompt-response",
    schema: "promptResponseSchema",
    statuses: [200],
  },
  "get-provider": {
    anchor: "provider-response",
    schema: "providerResponseSchema",
    statuses: [200],
  },
  "list-provider-models": {
    anchor: "provider-models-response",
    schema: "providerModelsResponseSchema",
    statuses: [200],
  },
  "get-task": {
    anchor: "task-response",
    schema: "taskResponseSchema",
    statuses: [200],
  },
  "get-task-run": {
    anchor: "task-run-response",
    schema: "taskRunResponseSchema",
    statuses: [200],
  },
  "get-tenant-settings": {
    anchor: "tenant-settings-response",
    schema: "tenantSettingsResponseSchema",
    statuses: [200],
  },
  "get-usage": {
    anchor: "usage-response",
    schema: "usageResponseSchema",
    statuses: [200],
  },
  "get-workspace": {
    anchor: "workspace",
    schema: "workspaceSchema",
    statuses: [200],
  },
  "list-agents": {
    anchor: "agents-response",
    schema: "agentsResponseSchema",
    statuses: [200],
  },
  "list-agent-mcp-attachments": {
    anchor: "mcp-attachments-response",
    schema: "mcpAttachmentsResponseSchema",
    statuses: [200],
  },
  "list-agent-versions": {
    anchor: "agent-versions-response",
    schema: "agentVersionsResponseSchema",
    statuses: [200],
  },
  "list-artifacts": {
    anchor: "artifacts-list-response",
    schema: "artifactsListResponseSchema",
    statuses: [200],
  },
  "list-mcp-connections": {
    anchor: "mcp-connections-response",
    schema: "mcpConnectionsResponseSchema",
    statuses: [200],
  },
  "list-memories": {
    anchor: "memories-list-response",
    schema: "memoriesListResponseSchema",
    statuses: [200],
  },
  "list-prompts": {
    anchor: "prompts-response",
    schema: "promptsResponseSchema",
    statuses: [200],
  },
  "list-providers": {
    anchor: "providers-response",
    schema: "providersResponseSchema",
    statuses: [200],
  },
  "list-session-messages": {
    anchor: "session-messages-response",
    schema: "sessionMessagesResponseSchema",
    statuses: [200],
  },
  "list-sessions": {
    anchor: "sessions-list-response",
    schema: "sessionsListResponseSchema",
    statuses: [200],
  },
  "list-task-run-messages": {
    anchor: "task-run-messages-response",
    schema: "taskRunMessagesResponseSchema",
    statuses: [200],
  },
  "list-task-runs": {
    anchor: "task-runs-list-response",
    schema: "taskRunsListResponseSchema",
    statuses: [200],
  },
  "list-tasks": {
    anchor: "tasks-list-response",
    schema: "tasksListResponseSchema",
    statuses: [200],
  },
  "list-tool-approvals": {
    anchor: "tool-approvals-response",
    schema: "toolApprovalsResponseSchema",
    statuses: [200],
  },
  "list-workspaces": {
    anchor: "workspaces-list-response",
    schema: "workspacesListResponseSchema",
    statuses: [200],
  },
  "reconnect-mcp-connection": {
    anchor: "mcp-connection-reconnect-result",
    schema: "mcpConnectionReconnectResultSchema",
    statuses: [200],
  },
  "test-mcp-connection": {
    anchor: "mcp-connection-test-response",
    schema: "mcpConnectionTestResponseSchema",
    statuses: [200],
  },
  "update-agent": {
    anchor: "agent-response",
    schema: "agentResponseSchema",
    statuses: [200],
  },
  "update-agent-mcp-attachment": {
    anchor: "mcp-attachment-response",
    schema: "mcpAttachmentResponseSchema",
    statuses: [200],
  },
  "update-mcp-connection": {
    anchor: "mcp-connection-response",
    schema: "mcpConnectionResponseSchema",
    statuses: [200],
  },
  "update-memory": {
    anchor: "memory-response",
    schema: "memoryResponseSchema",
    statuses: [200],
  },
  "update-prompt": {
    anchor: "prompt-response",
    schema: "promptResponseSchema",
    statuses: [200],
  },
  "update-provider": {
    anchor: "provider-response",
    schema: "providerResponseSchema",
    statuses: [200],
  },
  "update-task": { anchor: "task", schema: "taskSchema", statuses: [200] },
  "update-tenant-settings": {
    anchor: "tenant-settings-response",
    schema: "tenantSettingsResponseSchema",
    statuses: [200],
  },
  "update-workspace": {
    anchor: "workspace",
    schema: "workspaceSchema",
    statuses: [200],
  },
  "upload-agent-avatar": {
    anchor: "agent",
    schema: "agentSchema",
    statuses: [200],
  },
};

const noBodyResponseAssignments: Record<string, number[]> = {
  "cancel-task-run": [204],
  "delete-agent": [204],
  "delete-artifact": [204],
  "delete-mcp-connection": [204],
  "delete-memory": [204],
  "delete-prompt": [204],
  "delete-provider": [204],
  "delete-session": [204],
  "delete-skill": [204],
  "delete-task": [204],
  "delete-workspace": [202, 204],
};

const rawResponseAssignments: Record<
  string,
  { required: string[]; statuses: number[] }
> = {
  "copy-skill": { required: ["application/json"], statuses: [200] },
  "create-skill": { required: ["application/json"], statuses: [201] },
  "delete-skill-file": {
    required: ["application/json"],
    statuses: [200],
  },
  "get-skill": { required: ["application/json"], statuses: [200] },
  "get-skill-file": {
    required: ["application/octet-stream"],
    statuses: [200],
  },
  "list-skills": { required: ["application/json"], statuses: [200] },
  "put-skill-file": {
    required: ["application/json"],
    statuses: [200],
  },
  "upload-skill": { required: ["application/json"], statuses: [201] },
  generate: { required: ["text/plain"], statuses: [200] },
};

const streamingResponseAssignments: Record<
  string,
  { required: string[]; statuses: number[] }
> = {
  "create-session-turn": {
    required: ["text/event-stream", "X-Vercel-AI-UI-Message-Stream: v1"],
    statuses: [201],
  },
  "join-tool-approval-continuation": {
    required: [
      "Content-Type: text/event-stream",
      "X-Vercel-AI-UI-Message-Stream: v1",
      "Cache-Control: no-cache",
      "Connection: keep-alive",
      "X-Accel-Buffering: no",
    ],
    statuses: [200],
  },
  "resume-session-turn": {
    required: ["text/event-stream", "X-Vercel-AI-UI-Message-Stream: v1"],
    statuses: [200],
  },
};

const requestSchemas: Record<string, z.ZodType> = {
  "approve-mcp-oauth-authorization": approveMcpOauthAuthorizationBodySchema,
  "create-agent": createAgentBodySchema,
  "create-mcp-connection": createMcpConnectionBodySchema,
  "create-memory": createMemoryBodySchema,
  "create-prompt": createPromptBodySchema,
  "create-provider": createProviderBodySchema,
  "create-session-turn": chatRequestBodySchema,
  "create-skill": createSkillBodySchema,
  "create-task": createTaskBodySchema,
  "create-task-run": createTaskRunBodySchema,
  "create-workspace": createWorkspaceBodySchema,
  "decide-tool-approval": decideToolApprovalBodySchema,
  "copy-skill": copySkillBodySchema,
  generate: generationRequestBodySchema,
  "reconnect-mcp-connection": reconnectMcpConnectionBodySchema,
  "resume-session-turn": chatRequestBodySchema,
  "update-agent": updateAgentBodySchema,
  "update-agent-mcp-attachment": updateMcpAttachmentBodySchema,
  "update-mcp-connection": updateMcpConnectionBodySchema,
  "update-memory": updateMemoryBodySchema,
  "update-prompt": updatePromptBodySchema,
  "update-provider": updateProviderBodySchema,
  "update-task": updateTaskBodySchema,
  "update-tenant-settings": updateTenantSettingsBodySchema,
  "update-workspace": updateWorkspaceBodySchema,
};

const requiredCurlSemantics: Record<string, string[]> = {
  "create-session-turn": ["--include", "--no-buffer"],
  generate: ["--no-buffer", '"output":{"type":"text"}'],
  "join-tool-approval-continuation": ["--no-buffer"],
  "get-usage": ["from=", "to="],
  "list-memories": ["userId=", "search="],
  "list-task-run-messages": ["after=", "limit="],
  "resume-session-turn": ["--no-buffer"],
};

export function validateRestRequestExample(
  file: string,
  operation: string,
  body: string
): void {
  const normalized = body.replace(SHELL_JSON_VALUE, "example");
  const jsonSource = normalized.match(JSON_DATA)?.groups?.json;
  const schema = requestSchemas[operation];
  if (schema) {
    expect(jsonSource, `${file}: ${operation} JSON request body`).toBeDefined();
    const parsed = JSON.parse(jsonSource ?? "null");
    expect(
      schema.safeParse(parsed).success,
      `${file}: ${operation} request body matches its public Zod contract`
    ).toBe(true);
  } else {
    expect(
      jsonSource,
      `${file}: ${operation} has no unvalidated JSON body`
    ).toBeUndefined();
  }
  for (const required of requiredCurlSemantics[operation] ?? []) {
    expect(body, `${file}: ${operation} requires ${required}`).toContain(
      required
    );
  }
}

export function validateRestRequestSchemaInventory(
  operationsWithJsonBodies: string[],
  plannedOperations: string[]
): void {
  expect(operationsWithJsonBodies.sort(ALPHABETICAL)).toEqual(
    Object.keys(requestSchemas).sort(ALPHABETICAL)
  );
  for (const operation of Object.keys(requiredCurlSemantics)) {
    expect(
      plannedOperations,
      `REST semantic assignment ${operation} belongs to a canonical operation`
    ).toContain(operation);
  }
}

export function validateRestResponseSchemaInventory(
  plannedOperations: string[]
): void {
  const classifiedOperations = [
    ...Object.keys(responseSchemaAssignments),
    ...Object.keys(noBodyResponseAssignments),
    ...Object.keys(rawResponseAssignments),
    ...Object.keys(streamingResponseAssignments),
  ];
  expect(
    new Set(classifiedOperations).size,
    "REST response classifications do not overlap"
  ).toBe(classifiedOperations.length);
  expect(classifiedOperations.sort(ALPHABETICAL)).toEqual(
    [...plannedOperations].sort(ALPHABETICAL)
  );
  for (const [operation, { schema }] of Object.entries(
    responseSchemaAssignments
  )) {
    expect(
      responseSchemas[schema],
      `${operation} response schema is a public export`
    ).toBeDefined();
  }
}

export function validateRestResponseContract(
  file: string,
  operation: string,
  endpointBody: string
): void {
  const response = endpointBody.match(RESPONSE_SECTION)?.groups?.body;
  expect(response, `${file}: ${operation} response section`).toBeDefined();
  const statuses = [...(response ?? "").matchAll(RESPONSE_STATUS)].map(
    (match) => Number(match.groups?.status)
  );
  expect(
    statuses.length,
    `${file}: ${operation} success status`
  ).toBeGreaterThan(0);

  for (const required of requiredResponseSemantics[operation] ?? []) {
    expect(
      response,
      `${file}: ${operation} response requires ${required}`
    ).toContain(required);
  }
  const distinctStatuses = [...new Set(statuses)].sort(
    (left, right) => left - right
  );
  const jsonExamples = [...(response ?? "").matchAll(RESPONSE_JSON)];
  const schemaLinks = [...(response ?? "").matchAll(RESPONSE_SCHEMA_LINK)].map(
    (match) => match.groups
  );
  const assignment = responseSchemaAssignments[operation];
  if (assignment) {
    const { statuses: assignedStatuses, ...assignedSchemaLink } = assignment;
    expect(
      schemaLinks,
      `${file}: ${operation} exact public response schema`
    ).toEqual([assignedSchemaLink]);
    expect(distinctStatuses, `${file}: ${operation} success statuses`).toEqual(
      assignedStatuses
    );
    if (assignedStatuses.includes(204)) {
      expect(response, `${file}: ${operation} empty 204 body`).toMatch(
        EMPTY_BODY
      );
    }
  } else if (noBodyResponseAssignments[operation]) {
    expect(schemaLinks, `${file}: ${operation} has no response schema`).toEqual(
      []
    );
    expect(distinctStatuses, `${file}: ${operation} success statuses`).toEqual(
      noBodyResponseAssignments[operation]
    );
    expect(response, `${file}: ${operation} empty response body`).toMatch(
      EMPTY_BODY
    );
  } else {
    expect(schemaLinks, `${file}: ${operation} has no response schema`).toEqual(
      []
    );
    const transport =
      rawResponseAssignments[operation] ??
      streamingResponseAssignments[operation];
    expect(distinctStatuses, `${file}: ${operation} success statuses`).toEqual(
      transport?.statuses
    );
    for (const required of transport?.required ?? []) {
      expect(
        response,
        `${file}: ${operation} response requires ${required}`
      ).toContain(required);
    }
  }
  if (jsonExamples.length === 0) {
    return;
  }
  expect(
    assignment,
    `${file}: ${operation} response schema assignment`
  ).toBeDefined();
  const schema = responseSchemas[assignment?.schema ?? ""] as
    | z.ZodType
    | undefined;
  expect(
    schema,
    `${file}: ${operation} exported response schema`
  ).toBeDefined();
  for (const example of jsonExamples) {
    const value = JSON.parse(example.groups?.body ?? "null");
    expect(
      schema?.safeParse(value).success,
      `${file}: ${operation} response body matches ${assignment?.schema}`
    ).toBe(true);
  }
}
