#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { KeeperHubClient } from './client/keeperhub.js';
import {
  listWorkflowsSchema,
  getWorkflowSchema,
  createWorkflowSchema,
  updateWorkflowSchema,
  deleteWorkflowSchema,
  handleListWorkflows,
  handleGetWorkflow,
  handleCreateWorkflow,
  handleUpdateWorkflow,
  handleDeleteWorkflow,
  executeWorkflowSchema,
  getExecutionStatusSchema,
  getExecutionLogsSchema,
  handleExecuteWorkflow,
  handleGetExecutionStatus,
  handleGetExecutionLogs,
  generateWorkflowSchema,
  handleGenerateWorkflow,
  listActionSchemasSchema,
  handleListActionSchemas,
} from './tools/index.js';
import {
  handleWorkflowsResource,
  handleWorkflowResource,
} from './resources/index.js';
import { startHTTPServer } from './http-server.js';

const KEEPERHUB_API_KEY = process.env.KEEPERHUB_API_KEY;
const KEEPERHUB_API_URL = process.env.KEEPERHUB_API_URL || 'https://app.keeperhub.com';
const MCP_API_KEY = process.env.MCP_API_KEY;
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;

// Cloudflare Access credentials (optional)
const CF_ACCESS_CLIENT_ID = process.env.CF_ACCESS_CLIENT_ID;
const CF_ACCESS_CLIENT_SECRET = process.env.CF_ACCESS_CLIENT_SECRET;

if (!KEEPERHUB_API_KEY) {
  console.error('Error: KEEPERHUB_API_KEY environment variable is required');
  process.exit(1);
}

if (PORT !== undefined) {
  if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
    console.error('Error: PORT must be a valid number between 1 and 65535');
    process.exit(1);
  }

  if (!MCP_API_KEY) {
    console.error('Error: MCP_API_KEY environment variable is required when running in HTTP mode (PORT is set)');
    process.exit(1);
  }
}

// Build CF Access config if both credentials are provided
const cfAccessConfig = CF_ACCESS_CLIENT_ID && CF_ACCESS_CLIENT_SECRET
  ? { clientId: CF_ACCESS_CLIENT_ID, clientSecret: CF_ACCESS_CLIENT_SECRET }
  : undefined;

const client = new KeeperHubClient(KEEPERHUB_API_KEY, KEEPERHUB_API_URL, 30000, cfAccessConfig);
const server = new Server(
  {
    name: 'keeperhub-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_workflows',
        description: 'List workflows in the organization',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of workflows to return',
            },
            offset: {
              type: 'number',
              description: 'Number of workflows to skip',
            },
          },
        },
      },
      {
        name: 'get_workflow',
        description: 'Get workflow details by ID',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: {
              type: 'string',
              description: 'The ID of the workflow to retrieve',
            },
          },
          required: ['workflow_id'],
        },
      },
      {
        name: 'create_workflow',
        description: 'Create a new workflow with explicit nodes and edges. This is the DEFAULT method for creating workflows. ALWAYS call list_action_schemas first to get correct actionType values and required field names for each node.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the workflow',
            },
            description: {
              type: 'string',
              description: 'Optional description',
            },
            nodes: {
              type: 'array',
              description: 'Workflow nodes',
            },
            edges: {
              type: 'array',
              description: 'Workflow edges',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_workflow',
        description: 'Update workflow nodes/edges',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: {
              type: 'string',
              description: 'The ID of the workflow to update',
            },
            name: {
              type: 'string',
              description: 'New name for the workflow',
            },
            description: {
              type: 'string',
              description: 'New description',
            },
            nodes: {
              type: 'array',
              description: 'Updated workflow nodes',
            },
            edges: {
              type: 'array',
              description: 'Updated workflow edges',
            },
          },
          required: ['workflow_id'],
        },
      },
      {
        name: 'delete_workflow',
        description: 'Delete a workflow',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: {
              type: 'string',
              description: 'The ID of the workflow to delete',
            },
          },
          required: ['workflow_id'],
        },
      },
      {
        name: 'ai_generate_workflow',
        description: 'Delegate workflow creation to KeeperHub\'s internal AI service (/api/ai/generate). Only use this when user EXPLICITLY requests "use KeeperHub AI" or "let KeeperHub generate it". For normal workflow creation, use create_workflow with list_action_schemas instead.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Natural language description of the workflow to generate',
            },
            existing_workflow_id: {
              type: 'string',
              description: 'Optional ID of an existing workflow to modify',
            },
          },
          required: ['prompt'],
        },
      },
      {
        name: 'execute_workflow',
        description: 'Start async execution of a workflow',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: {
              type: 'string',
              description: 'The ID of the workflow to execute',
            },
            input: {
              type: 'object',
              description: 'Optional input data for the workflow',
            },
          },
          required: ['workflow_id'],
        },
      },
      {
        name: 'get_execution_status',
        description: 'Poll execution status',
        inputSchema: {
          type: 'object',
          properties: {
            execution_id: {
              type: 'string',
              description: 'The ID of the execution to check',
            },
          },
          required: ['execution_id'],
        },
      },
      {
        name: 'get_execution_logs',
        description: 'Get execution logs',
        inputSchema: {
          type: 'object',
          properties: {
            execution_id: {
              type: 'string',
              description: 'The ID of the execution to get logs for',
            },
          },
          required: ['execution_id'],
        },
      },
      {
        name: 'list_action_schemas',
        description: 'List available action types and their required configuration fields. Call this before creating workflows to ensure correct node configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Filter by category (e.g., "web3", "discord", "sendgrid", "webhook", "system")',
            },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case 'list_workflows': {
        const args = listWorkflowsSchema.parse(request.params.arguments);
        return await handleListWorkflows(client, args);
      }
      case 'get_workflow': {
        const args = getWorkflowSchema.parse(request.params.arguments);
        return await handleGetWorkflow(client, args);
      }
      case 'create_workflow': {
        const args = createWorkflowSchema.parse(request.params.arguments);
        return await handleCreateWorkflow(client, args);
      }
      case 'update_workflow': {
        const args = updateWorkflowSchema.parse(request.params.arguments);
        return await handleUpdateWorkflow(client, args);
      }
      case 'delete_workflow': {
        const args = deleteWorkflowSchema.parse(request.params.arguments);
        return await handleDeleteWorkflow(client, args);
      }
      case 'ai_generate_workflow': {
        const args = generateWorkflowSchema.parse(request.params.arguments);
        return await handleGenerateWorkflow(client, args);
      }
      case 'execute_workflow': {
        const args = executeWorkflowSchema.parse(request.params.arguments);
        return await handleExecuteWorkflow(client, args);
      }
      case 'get_execution_status': {
        const args = getExecutionStatusSchema.parse(request.params.arguments);
        return await handleGetExecutionStatus(client, args);
      }
      case 'get_execution_logs': {
        const args = getExecutionLogsSchema.parse(request.params.arguments);
        return await handleGetExecutionLogs(client, args);
      }
      case 'list_action_schemas': {
        const args = listActionSchemasSchema.parse(request.params.arguments);
        return await handleListActionSchemas(args);
      }
      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Register resource handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'keeperhub://workflows',
        name: 'All Workflows',
        description: 'List all workflows in the organization',
        mimeType: 'application/json',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  try {
    if (uri === 'keeperhub://workflows') {
      return await handleWorkflowsResource(client);
    }

    // Handle workflow by ID: keeperhub://workflows/{id}
    const workflowMatch = uri.match(/^keeperhub:\/\/workflows\/(.+)$/);
    if (workflowMatch) {
      const workflowId = workflowMatch[1];
      return await handleWorkflowResource(client, workflowId);
    }

    throw new Error(`Unknown resource URI: ${uri}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read resource: ${errorMessage}`);
  }
});

async function main() {
  if (PORT) {
    startHTTPServer({
      server,
      port: PORT,
      apiKey: MCP_API_KEY!,
    });
    console.error(`KeeperHub API URL: ${KEEPERHUB_API_URL}`);
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('KeeperHub MCP server running on stdio');
    console.error(`KeeperHub API URL: ${KEEPERHUB_API_URL}`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
