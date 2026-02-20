import { z } from 'zod';
import type { KeeperHubClient } from '../client/keeperhub.js';

export const listProjectsSchema = z.object({});

export const listTagsSchema = z.object({});

export async function handleListProjects(client: KeeperHubClient) {
  const projects = await client.listProjects();

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(projects, null, 2),
      },
    ],
  };
}

export async function handleListTags(client: KeeperHubClient) {
  const tags = await client.listTags();

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(tags, null, 2),
      },
    ],
  };
}
