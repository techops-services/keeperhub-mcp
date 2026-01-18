#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import { fileURLToPath } from 'url';
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
  searchPluginsSchema,
  getPluginSchema,
  validatePluginConfigSchema,
  handleSearchPlugins,
  handleGetPlugin,
  handleValidatePluginConfig,
  searchTemplatesSchema,
  getTemplateSchema,
  deployTemplateSchema,
  handleSearchTemplates,
  handleGetTemplate,
  handleDeployTemplate,
  toolsDocumentationSchema,
  handleToolsDocumentation,
} from './tools/index.js';
import {
  handleWorkflowsResource,
  handleWorkflowResource,
} from './resources/index.js';
import { startHTTPServer } from './http-server.js';
import { createDatabaseAdapter } from './database/database-adapter.js';
import { PluginRepository } from './database/plugin-repository.js';
import { TemplateRepository } from './database/template-repository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEEPERHUB_API_KEY = process.env.KEEPERHUB_API_KEY;
const KEEPERHUB_API_URL = process.env.KEEPERHUB_API_URL || 'https://app.keeperhub.com';
const MCP_API_KEY = process.env.MCP_API_KEY;
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;

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

const client = new KeeperHubClient(KEEPERHUB_API_KEY, KEEPERHUB_API_URL);

let pluginRepo: PluginRepository | null = null;
let templateRepo: TemplateRepository | null = null;

async function initRepositories() {
  if (!pluginRepo || !templateRepo) {
    const dbPath = path.join(__dirname, '../plugins.db');
    const db = await createDatabaseAdapter(dbPath);
    pluginRepo = new PluginRepository(db);
    templateRepo = new TemplateRepository(db);
  }
  return { pluginRepo, templateRepo };
}

const SERVER_INSTRUCTIONS = `KeeperHub MCP provides Web3 workflow automation tools for blockchain operations.

Use these tools when the user wants to:
- Create, list, update, or delete Web3 automation workflows
- Monitor smart contracts, blockchain events, or wallet activity
- Automate token transfers, swaps, or DeFi operations
- Execute workflows for blockchain automation tasks
- Generate workflows from natural language for Web3 use cases

Available operations: workflow CRUD, AI-powered workflow generation, async execution with status polling and logs.`;

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
    instructions: SERVER_INSTRUCTIONS,
  }
);

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_workflows',
        description:
          'List Web3 automation workflows in the organization. Returns workflows for smart contract monitoring, token transfers, DeFi operations, and blockchain event handling.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of workflows to return',
            },
            offset: {
              type: 'number',
              description: 'Number of workflows to skip for pagination',
            },
          },
        },
      },
      {
        name: 'get_workflow',
        description:
          'Get detailed configuration of a Web3 workflow by ID, including triggers (smart contract events, schedules, webhooks) and actions (token transfers, notifications, API calls).',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: {
              type: 'string',
              description: 'The unique identifier of the workflow',
            },
          },
          required: ['workflow_id'],
        },
      },
      {
        name: 'create_workflow',
        description:
          'Create a new Web3 automation workflow for blockchain operations like smart contract monitoring, token transfers, wallet tracking, or DeFi automation.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description:
                'Descriptive name for the workflow (e.g., "ETH Price Alert", "USDC Transfer Monitor")',
            },
            description: {
              type: 'string',
              description: 'Optional description of what the workflow automates',
            },
            nodes: {
              type: 'array',
              description:
                'Workflow nodes defining triggers and actions (smart contract events, conditions, token operations)',
            },
            edges: {
              type: 'array',
              description: 'Connections between workflow nodes defining execution flow',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_workflow',
        description:
          'Update an existing Web3 workflow configuration, including triggers, actions, conditions, and blockchain parameters.',
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
              description: 'Updated description',
            },
            nodes: {
              type: 'array',
              description: 'Updated workflow nodes (triggers, actions, conditions)',
            },
            edges: {
              type: 'array',
              description: 'Updated connections between nodes',
            },
          },
          required: ['workflow_id'],
        },
      },
      {
        name: 'delete_workflow',
        description:
          'Permanently delete a Web3 automation workflow. This stops all monitoring and scheduled executions.',
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
        name: 'generate_workflow',
        description:
          'AI-powered Web3 workflow generation from natural language. Describe blockchain automation needs like "monitor USDC transfers over $10k" or "alert when ETH gas drops below 20 gwei" and get a complete workflow.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description:
                'Natural language description of the Web3 automation (e.g., "Send Discord alert when my wallet receives tokens")',
            },
            existing_workflow_id: {
              type: 'string',
              description: 'Optional: ID of an existing workflow to modify or extend',
            },
          },
          required: ['prompt'],
        },
      },
      {
        name: 'execute_workflow',
        description:
          'Manually trigger a Web3 workflow execution. Useful for testing blockchain automations or running on-demand operations like batch transfers.',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: {
              type: 'string',
              description: 'The ID of the workflow to execute',
            },
            input: {
              type: 'object',
              description:
                'Optional input data (e.g., token amounts, addresses, chain parameters)',
            },
          },
          required: ['workflow_id'],
        },
      },
      {
        name: 'get_execution_status',
        description:
          'Check the status of a running or completed workflow execution. Returns state (pending, running, completed, failed) and results.',
        inputSchema: {
          type: 'object',
          properties: {
            execution_id: {
              type: 'string',
              description: 'The execution ID returned from execute_workflow',
            },
          },
          required: ['execution_id'],
        },
      },
      {
        name: 'get_execution_logs',
        description:
          'Get detailed execution logs for a workflow run, including blockchain transaction hashes, API responses, and error details.',
        inputSchema: {
          type: 'object',
          properties: {
            execution_id: {
              type: 'string',
              description: 'The execution ID to retrieve logs for',
            },
          },
          required: ['execution_id'],
        },
      },
      {
        name: 'search_plugins',
        description:
          'Search for KeeperHub plugins by name, description, or functionality. Returns Web3, messaging, and integration plugins available in KeeperHub.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search keywords (e.g., "web3", "discord", "email", "webhook")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10, max: 50)',
            },
            category: {
              type: 'string',
              enum: ['all', 'web3', 'messaging', 'integration', 'notification'],
              description: 'Filter by plugin category (default: all)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_plugin',
        description:
          'Get complete documentation for a KeeperHub plugin including all available steps, input/output schemas, and credential requirements.',
        inputSchema: {
          type: 'object',
          properties: {
            plugin_type: {
              type: 'string',
              description: 'Plugin type identifier (e.g., "web3", "discord", "sendgrid", "webhook")',
            },
            include_examples: {
              type: 'boolean',
              description: 'Include configuration examples for each step (default: false)',
            },
          },
          required: ['plugin_type'],
        },
      },
      {
        name: 'validate_plugin_config',
        description:
          'Validate a plugin step configuration against its schema. Checks required fields, data types, and plugin-specific constraints (e.g., ETH address format, network compatibility).',
        inputSchema: {
          type: 'object',
          properties: {
            plugin_type: {
              type: 'string',
              description: 'Plugin type (e.g., "web3", "discord")',
            },
            step_slug: {
              type: 'string',
              description: 'Step slug (e.g., "check-balance", "send-message")',
            },
            config: {
              type: 'object',
              description: 'Configuration object to validate',
            },
            validation_mode: {
              type: 'string',
              enum: ['strict', 'runtime', 'minimal'],
              description: 'Validation strictness level (default: runtime)',
            },
          },
          required: ['plugin_type', 'step_slug', 'config'],
        },
      },
      {
        name: 'search_templates',
        description:
          'Search for pre-built Web3 workflow templates. Find templates for wallet monitoring, token transfers, DeFi alerts, and more.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search keywords (e.g., "wallet monitor", "eth balance", "token transfer")',
            },
            category: {
              type: 'string',
              enum: ['all', 'monitoring', 'transfers', 'defi', 'notifications', 'analytics'],
              description: 'Filter by template category (default: all)',
            },
            difficulty: {
              type: 'string',
              enum: ['all', 'beginner', 'intermediate', 'advanced'],
              description: 'Filter by difficulty level (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 10, max: 50)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_template',
        description:
          'Get complete workflow template configuration including nodes, edges, and setup instructions.',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: {
              type: 'string',
              description: 'Template ID from search_templates',
            },
            include_setup_guide: {
              type: 'boolean',
              description: 'Include step-by-step setup instructions (default: true)',
            },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'deploy_template',
        description:
          'Deploy a workflow template to KeeperHub with customization options. Validates configuration before deployment.',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: {
              type: 'string',
              description: 'Template ID to deploy',
            },
            workflow_name: {
              type: 'string',
              description: 'Custom name for the deployed workflow',
            },
            customizations: {
              type: 'object',
              description: 'Node-specific customizations (e.g., {"node-1": {"network": "ethereum"}})',
            },
            validate_before_deploy: {
              type: 'boolean',
              description: 'Validate template before deployment (default: true)',
            },
          },
          required: ['template_id', 'workflow_name'],
        },
      },
      {
        name: 'tools_documentation',
        description:
          'Get comprehensive documentation for KeeperHub MCP tools. Explains all available tools, their parameters, use cases, and best practices.',
        inputSchema: {
          type: 'object',
          properties: {
            tool_name: {
              type: 'string',
              description: 'Specific tool to document (omit for all tools)',
            },
            format: {
              type: 'string',
              enum: ['essentials', 'full'],
              description: 'Documentation detail level (default: essentials)',
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
      case 'generate_workflow': {
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
      case 'search_plugins': {
        const { pluginRepo: repo } = await initRepositories();
        const args = searchPluginsSchema.parse(request.params.arguments);
        return await handleSearchPlugins(repo!, args);
      }
      case 'get_plugin': {
        const { pluginRepo: repo } = await initRepositories();
        const args = getPluginSchema.parse(request.params.arguments);
        return await handleGetPlugin(repo!, args);
      }
      case 'validate_plugin_config': {
        const { pluginRepo: repo } = await initRepositories();
        const args = validatePluginConfigSchema.parse(request.params.arguments);
        return await handleValidatePluginConfig(repo!, args);
      }
      case 'search_templates': {
        const { templateRepo: repo } = await initRepositories();
        const args = searchTemplatesSchema.parse(request.params.arguments);
        return await handleSearchTemplates(repo!, args);
      }
      case 'get_template': {
        const { templateRepo: repo } = await initRepositories();
        const args = getTemplateSchema.parse(request.params.arguments);
        return await handleGetTemplate(repo!, args);
      }
      case 'deploy_template': {
        const { templateRepo: repo } = await initRepositories();
        const args = deployTemplateSchema.parse(request.params.arguments);
        return await handleDeployTemplate(client, repo!, args);
      }
      case 'tools_documentation': {
        const args = toolsDocumentationSchema.parse(request.params.arguments);
        return await handleToolsDocumentation(args);
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
