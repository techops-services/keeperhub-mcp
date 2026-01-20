import type {
  Workflow,
  WorkflowExecution,
  ExecutionLog,
  ListWorkflowsParams,
  CreateWorkflowParams,
  UpdateWorkflowParams,
  ExecuteWorkflowParams,
  GenerateWorkflowRequest,
  GenerateWorkflowResponse,
  WorkflowNode,
  WorkflowEdge,
} from '../types/index.js';

type StreamMessage = {
  type: 'operation' | 'complete' | 'error';
  operation?: {
    op:
      | 'setName'
      | 'setDescription'
      | 'addNode'
      | 'addEdge'
      | 'removeNode'
      | 'removeEdge'
      | 'updateNode';
    name?: string;
    description?: string;
    node?: WorkflowNode;
    edge?: WorkflowEdge;
    nodeId?: string;
    edgeId?: string;
    updates?: {
      position?: { x: number; y: number };
      data?: Record<string, unknown>;
    };
  };
  error?: string;
};

type WorkflowData = {
  name?: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export interface CloudflareAccessConfig {
  clientId: string;
  clientSecret: string;
}

export class KeeperHubClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private cfAccess?: CloudflareAccessConfig;

  constructor(
    apiKey: string,
    baseUrl: string = 'https://app.keeperhub.com',
    timeout: number = 30000,
    cfAccess?: CloudflareAccessConfig
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = timeout;
    this.cfAccess = cfAccess;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    // Add Cloudflare Access headers if configured
    if (this.cfAccess) {
      headers['CF-Access-Client-Id'] = this.cfAccess.clientId;
      headers['CF-Access-Client-Secret'] = this.cfAccess.clientSecret;
    }

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        // Check content-type before trying to parse JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch {
            // Failed to parse error response, use default message
          }
        }

        throw new Error(errorMessage);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      // Check content-type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON response but got ${contentType}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }

      throw error;
    }
  }

  async listWorkflows(params?: ListWorkflowsParams): Promise<Workflow[]> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());

    const query = queryParams.toString();
    const path = `/api/workflows${query ? `?${query}` : ''}`;

    return this.request<Workflow[]>(path);
  }

  async getWorkflow(workflowId: string): Promise<Workflow> {
    return this.request<Workflow>(`/api/workflows/${workflowId}`);
  }

  async createWorkflow(params: CreateWorkflowParams): Promise<Workflow> {
    return this.request<Workflow>('/api/workflows/create', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async updateWorkflow(params: UpdateWorkflowParams): Promise<Workflow> {
    const { workflowId, ...updateData } = params;
    return this.request<Workflow>(`/api/workflows/${workflowId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    return this.request<void>(`/api/workflows/${workflowId}`, {
      method: 'DELETE',
    });
  }

  async executeWorkflow(params: ExecuteWorkflowParams): Promise<WorkflowExecution> {
    const { workflowId, input } = params;
    return this.request<WorkflowExecution>(`/api/workflow/${workflowId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ input }),
    });
  }

  async getExecutionStatus(executionId: string): Promise<WorkflowExecution> {
    return this.request<WorkflowExecution>(`/api/executions/${executionId}`);
  }

  async getExecutionLogs(executionId: string): Promise<ExecutionLog[]> {
    return this.request<ExecutionLog[]>(`/api/executions/${executionId}/logs`);
  }

  async generateWorkflow(params: GenerateWorkflowRequest): Promise<GenerateWorkflowResponse> {
    const url = `${this.baseUrl}/api/ai/generate`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    if (this.cfAccess) {
      headers['CF-Access-Client-Id'] = this.cfAccess.clientId;
      headers['CF-Access-Client-Secret'] = this.cfAccess.clientSecret;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: params.prompt,
          existingWorkflow: params.existingWorkflowId ? { id: params.existingWorkflowId } : undefined,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch {
            // Failed to parse error response
          }
        }
        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Handle streaming NDJSON response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const workflowData: WorkflowData = { nodes: [], edges: [] };
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // Process complete NDJSON lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const message = JSON.parse(line) as StreamMessage;

              if (message.type === 'error') {
                throw new Error(message.error || 'Generation failed');
              }

              if (message.type === 'operation' && message.operation) {
                this.applyOperation(message.operation, workflowData);
              }
            } catch (parseError) {
              // Skip invalid JSON lines
              console.warn('[KeeperHubClient] Skipping invalid NDJSON line');
            }
          }
        }

        // Process any remaining buffer content
        if (buffer.trim()) {
          try {
            const message = JSON.parse(buffer) as StreamMessage;
            if (message.type === 'operation' && message.operation) {
              this.applyOperation(message.operation, workflowData);
            }
          } catch {
            // Ignore final buffer parse errors
          }
        }
      } finally {
        reader.releaseLock();
      }

      return {
        workflow: {
          name: workflowData.name || 'Generated Workflow',
          description: workflowData.description,
          nodes: workflowData.nodes,
          edges: workflowData.edges,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }

      throw error;
    }
  }

  private applyOperation(
    op: NonNullable<StreamMessage['operation']>,
    data: WorkflowData
  ): void {
    switch (op.op) {
      case 'setName':
        if (op.name) data.name = op.name;
        break;
      case 'setDescription':
        if (op.description) data.description = op.description;
        break;
      case 'addNode':
        if (op.node) data.nodes.push(op.node);
        break;
      case 'addEdge':
        if (op.edge) data.edges.push(op.edge);
        break;
      case 'removeNode':
        if (op.nodeId) {
          data.nodes = data.nodes.filter((n) => n.id !== op.nodeId);
          data.edges = data.edges.filter(
            (e) => e.source !== op.nodeId && e.target !== op.nodeId
          );
        }
        break;
      case 'removeEdge':
        if (op.edgeId) {
          data.edges = data.edges.filter((e) => e.id !== op.edgeId);
        }
        break;
      case 'updateNode':
        if (op.nodeId && op.updates) {
          data.nodes = data.nodes.map((n) => {
            if (n.id === op.nodeId) {
              return {
                ...n,
                ...(op.updates?.position ? { position: op.updates.position } : {}),
                ...(op.updates?.data
                  ? { data: { ...n.data, ...op.updates.data } }
                  : {}),
              };
            }
            return n;
          });
        }
        break;
    }
  }
}
