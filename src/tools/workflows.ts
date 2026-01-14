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
  const workflow = await client.createWorkflow(args);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(workflow, null, 2),
      },
    ],
  };
}

export async function handleUpdateWorkflow(
  client: KeeperHubClient,
  args: z.infer<typeof updateWorkflowSchema>
) {
  const { workflow_id, ...updateData } = args;
  const workflow = await client.updateWorkflow({
    workflowId: workflow_id,
    ...updateData,
  });
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(workflow, null, 2),
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
