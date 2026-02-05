// Re-export action schemas for reference when creating workflows
export * from './action-schemas.js';

export interface WorkflowNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ExecutionLog {
  id: string;
  executionId: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface GenerateWorkflowRequest {
  prompt: string;
  existingWorkflowId?: string;
}

export interface GenerateWorkflowResponse {
  workflow: {
    name: string;
    description?: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
}

export interface ListWorkflowsParams {
  limit?: number;
  offset?: number;
}

export interface CreateWorkflowParams {
  name: string;
  description?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
}

export interface UpdateWorkflowParams {
  workflowId: string;
  name?: string;
  description?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
}

export interface ExecuteWorkflowParams {
  workflowId: string;
  input?: Record<string, unknown>;
}

// Integration types
export type IntegrationType =
  | 'ai-gateway'
  | 'clerk'
  | 'database'
  | 'discord'
  | 'linear'
  | 'resend'
  | 'sendgrid'
  | 'slack'
  | 'v0'
  | 'web3'
  | 'webflow'
  | 'webhook';

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  isManaged?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListIntegrationsParams {
  type?: IntegrationType;
}

// MCP Schemas response from /api/mcp/schemas
export interface MCPActionSchema {
  actionType: string;
  label: string;
  description: string;
  category?: string;
  integration?: string;
  requiresCredentials?: boolean;
  requiredFields: Record<string, string>;
  optionalFields: Record<string, string>;
  outputFields?: Record<string, string>;
  behavior?: string;
}

export interface MCPTriggerSchema {
  triggerType: string;
  label: string;
  description: string;
  requiredFields: Record<string, string>;
  optionalFields: Record<string, string>;
  outputFields?: Record<string, string>;
}

export interface MCPChain {
  chainId: number;
  name: string;
  symbol: string;
  chainType: string;
  isTestnet: boolean;
  explorerUrl: string | null;
}

export interface MCPSchemasResponse {
  version: string;
  generatedAt: string;
  actions: Record<string, MCPActionSchema>;
  triggers: Record<string, MCPTriggerSchema>;
  chains: MCPChain[];
  platform: {
    wallet: {
      provider: string;
      features: string[];
      description: string;
    } | null;
    proxyContracts: {
      supported: boolean;
      autoDetectImplementation?: boolean;
      supportedPatterns?: string[];
      description?: string;
    };
    abiHandling: {
      autoFetchVerified: boolean;
      manualAbiSupported: boolean;
      description: string;
    } | null;
  };
  templateSyntax: {
    pattern: string;
    description: string;
    examples: Array<{ template: string; description: string }>;
    notes: string[];
  };
  workflowStructure: {
    nodeStructure: Record<string, unknown>;
    edgeStructure: Record<string, unknown>;
  };
  tips: string[];
}
