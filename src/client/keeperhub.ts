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
} from '../types/index.js';

export class KeeperHubClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://app.keeperhub.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Failed to parse error response, use default message
      }
      throw new Error(errorMessage);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
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
    return this.request<Workflow>('/api/workflows', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async updateWorkflow(params: UpdateWorkflowParams): Promise<Workflow> {
    const { workflowId, ...updateData } = params;
    return this.request<Workflow>(`/api/workflows/${workflowId}`, {
      method: 'PUT',
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
    return this.request<GenerateWorkflowResponse>('/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }
}
