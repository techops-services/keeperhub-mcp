import { z } from 'zod';
import type { KeeperHubClient } from '../client/keeperhub.js';

const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.record(z.unknown()),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
});

const WorkflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

export const listWorkflowsSchema = z.object({
  limit: z.number().optional().describe('Maximum number of workflows to return'),
  offset: z.number().optional().describe('Number of workflows to skip'),
});

export const getWorkflowSchema = z.object({
  workflow_id: z.string().describe('The ID of the workflow to retrieve'),
});

export const createWorkflowSchema = z.object({
  name: z.string().describe('Name of the workflow'),
  description: z.string().optional().describe('Optional description'),
  nodes: z.array(WorkflowNodeSchema).optional().describe('Workflow nodes'),
  edges: z.array(WorkflowEdgeSchema).optional().describe('Workflow edges'),
});

export const updateWorkflowSchema = z.object({
  workflow_id: z.string().describe('The ID of the workflow to update'),
  name: z.string().optional().describe('New name for the workflow'),
  description: z.string().optional().describe('New description'),
  nodes: z.array(WorkflowNodeSchema).optional().describe('Updated workflow nodes'),
  edges: z.array(WorkflowEdgeSchema).optional().describe('Updated workflow edges'),
});

export const deleteWorkflowSchema = z.object({
  workflow_id: z.string().describe('The ID of the workflow to delete'),
});

/**
 * Field name corrections for common mistakes.
 * Maps wrong field names to correct ones based on action type.
 */
const FIELD_CORRECTIONS: Record<string, Record<string, string>> = {
  // Condition action
  Condition: {
    conditionExpression: 'condition',
    expression: 'condition',
  },
  // HTTP Request action
  'HTTP Request': {
    url: 'endpoint',
    method: 'httpMethod',
    headers: 'httpHeaders',
    body: 'httpBody',
  },
  // Webhook action
  'webhook/send-webhook': {
    url: 'webhookUrl',
    endpoint: 'webhookUrl',
    method: 'webhookMethod',
    headers: 'webhookHeaders',
    body: 'webhookPayload',
    payload: 'webhookPayload',
  },
  // Discord action
  'discord/send-message': {
    message: 'discordMessage',
    content: 'discordMessage',
  },
  // Web3 actions
  'web3/check-balance': {
    chainId: 'network',
  },
  'web3/check-token-balance': {
    chainId: 'network',
  },
  'web3/transfer-funds': {
    chainId: 'network',
    to: 'toAddress',
  },
  'web3/transfer-token': {
    chainId: 'network',
    to: 'toAddress',
  },
  'web3/read-contract': {
    chainId: 'network',
    contract: 'contractAddress',
    function: 'functionName',
    args: 'functionArgs',
  },
  'web3/write-contract': {
    chainId: 'network',
    contract: 'contractAddress',
    function: 'functionName',
    args: 'functionArgs',
  },
};

/**
 * Validates that all edges reference existing node IDs.
 * Returns warnings for any orphaned edges.
 */
function validateEdges(
  nodes: z.infer<typeof WorkflowNodeSchema>[] | undefined,
  edges: z.infer<typeof WorkflowEdgeSchema>[] | undefined
): string[] {
  if (!edges || edges.length === 0) {
    return [];
  }

  const nodeIds = new Set(nodes?.map((n) => n.id) ?? []);
  const warnings: string[] = [];

  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      warnings.push(
        `Edge "${edge.id}": source "${edge.source}" does not exist in nodes`
      );
    }
    if (!nodeIds.has(edge.target)) {
      warnings.push(
        `Edge "${edge.id}": target "${edge.target}" does not exist in nodes`
      );
    }
  }

  return warnings;
}

/**
 * Normalizes node configs by correcting common field name mistakes.
 * Returns the corrected nodes and a list of corrections made.
 */
function normalizeNodeConfigs(
  nodes: z.infer<typeof WorkflowNodeSchema>[] | undefined
): {
  nodes: z.infer<typeof WorkflowNodeSchema>[] | undefined;
  corrections: string[];
} {
  if (!nodes) {
    return { nodes: undefined, corrections: [] };
  }

  const corrections: string[] = [];

  const normalizedNodes = nodes.map((node) => {
    const data = node.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown> | undefined;

    if (!config) {
      return node;
    }

    const actionType = config.actionType as string | undefined;
    if (!actionType) {
      return node;
    }

    const fieldCorrections = FIELD_CORRECTIONS[actionType];
    if (!fieldCorrections) {
      return node;
    }

    const newConfig = { ...config };
    let hasCorrections = false;

    for (const [wrongField, correctField] of Object.entries(fieldCorrections)) {
      if (wrongField in newConfig && !(correctField in newConfig)) {
        newConfig[correctField] = newConfig[wrongField];
        delete newConfig[wrongField];
        corrections.push(
          `Node "${node.id}": Corrected "${wrongField}" to "${correctField}" for ${actionType}`
        );
        hasCorrections = true;
      }
    }

    if (hasCorrections) {
      return {
        ...node,
        data: {
          ...data,
          config: newConfig,
        },
      };
    }

    return node;
  });

  return { nodes: normalizedNodes, corrections };
}

export async function handleListWorkflows(
  client: KeeperHubClient,
  args: z.infer<typeof listWorkflowsSchema>
) {
  const workflows = await client.listWorkflows(args);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(workflows, null, 2),
      },
    ],
  };
}

export async function handleGetWorkflow(
  client: KeeperHubClient,
  args: z.infer<typeof getWorkflowSchema>
) {
  const workflow = await client.getWorkflow(args.workflow_id);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(workflow, null, 2),
      },
    ],
  };
}

export async function handleCreateWorkflow(
  client: KeeperHubClient,
  args: z.infer<typeof createWorkflowSchema>
) {
  // Normalize node configs to fix common field name mistakes
  const { nodes: normalizedNodes, corrections } = normalizeNodeConfigs(args.nodes);

  // Validate edges reference existing nodes
  const edgeWarnings = validateEdges(normalizedNodes, args.edges);
  if (edgeWarnings.length > 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `ERROR: Invalid edges detected. Please fix before creating workflow:\n${edgeWarnings.join('\n')}\n\nTip: Use get_workflow first to see existing node IDs when updating.`,
        },
      ],
    };
  }

  const workflow = await client.createWorkflow({
    ...args,
    nodes: normalizedNodes,
  });

  // Include corrections in the response if any were made
  const responseText = corrections.length > 0
    ? `Auto-corrected field names:\n${corrections.join('\n')}\n\nWorkflow created:\n${JSON.stringify(workflow, null, 2)}`
    : JSON.stringify(workflow, null, 2);

  return {
    content: [
      {
        type: 'text' as const,
        text: responseText,
      },
    ],
  };
}

export async function handleUpdateWorkflow(
  client: KeeperHubClient,
  args: z.infer<typeof updateWorkflowSchema>
) {
  const { workflow_id, ...updateData } = args;

  // Normalize node configs to fix common field name mistakes
  const { nodes: normalizedNodes, corrections } = normalizeNodeConfigs(updateData.nodes);

  // Validate edges reference existing nodes
  const edgeWarnings = validateEdges(normalizedNodes, updateData.edges);
  if (edgeWarnings.length > 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `ERROR: Invalid edges detected. Please fix before updating workflow:\n${edgeWarnings.join('\n')}\n\nTip: Use get_workflow first to see existing node IDs.`,
        },
      ],
    };
  }

  const workflow = await client.updateWorkflow({
    workflowId: workflow_id,
    ...updateData,
    nodes: normalizedNodes,
  });

  // Include corrections in the response if any were made
  const responseText = corrections.length > 0
    ? `Auto-corrected field names:\n${corrections.join('\n')}\n\nWorkflow updated:\n${JSON.stringify(workflow, null, 2)}`
    : JSON.stringify(workflow, null, 2);

  return {
    content: [
      {
        type: 'text' as const,
        text: responseText,
      },
    ],
  };
}

export async function handleDeleteWorkflow(
  client: KeeperHubClient,
  args: z.infer<typeof deleteWorkflowSchema>
) {
  await client.deleteWorkflow(args.workflow_id);
  return {
    content: [
      {
        type: 'text' as const,
        text: `Workflow ${args.workflow_id} deleted successfully`,
      },
    ],
  };
}
