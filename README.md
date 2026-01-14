# KeeperHub MCP Server

Model Context Protocol (MCP) server for KeeperHub that enables AI agents to create, manage, and execute blockchain automation workflows.

## Features

- **Full CRUD operations** for workflows (create, read, update, delete)
- **AI-powered workflow generation** via natural language prompts
- **Async execution** with status polling and log retrieval
- **MCP Resources** for exposing workflow definitions
- **API Key authentication** for secure access

## Installation

### Using Docker (Recommended)

```bash
# Build the Docker image
docker build -t keeperhub-mcp .

# Run the server
docker run -i --rm \
  -e KEEPERHUB_API_KEY=your_api_key_here \
  keeperhub-mcp
```

### Using Node.js

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run the server
KEEPERHUB_API_KEY=your_api_key_here pnpm start
```

### Development Mode

```bash
# Run with tsx for hot reloading
KEEPERHUB_API_KEY=your_api_key_here pnpm dev
```

## Configuration

The server requires the following environment variables:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `KEEPERHUB_API_KEY` | Your KeeperHub API key | Yes | - |
| `KEEPERHUB_API_URL` | KeeperHub API base URL | No | `https://app.keeperhub.com` |

## MCP Client Configuration

Add this to your MCP client configuration (e.g., Claude Code config):

```json
{
  "mcpServers": {
    "keeperhub": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "KEEPERHUB_API_KEY",
        "keeperhub-mcp"
      ]
    }
  }
}
```

Or for local development:

```json
{
  "mcpServers": {
    "keeperhub": {
      "command": "node",
      "args": [
        "/absolute/path/to/keeperhub-mcp/dist/index.js"
      ],
      "env": {
        "KEEPERHUB_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Available Tools

### Workflow Management

#### `list_workflows`
List workflows in the organization.

**Parameters:**
- `limit` (optional): Maximum number of workflows to return
- `offset` (optional): Number of workflows to skip

**Example:**
```typescript
{
  "limit": 10,
  "offset": 0
}
```

#### `get_workflow`
Get workflow details by ID.

**Parameters:**
- `workflow_id` (required): The ID of the workflow to retrieve

**Example:**
```typescript
{
  "workflow_id": "wf_abc123"
}
```

#### `create_workflow`
Create a new workflow.

**Parameters:**
- `name` (required): Name of the workflow
- `description` (optional): Optional description
- `nodes` (optional): Workflow nodes array
- `edges` (optional): Workflow edges array

**Example:**
```typescript
{
  "name": "My Workflow",
  "description": "A simple workflow",
  "nodes": [
    {
      "id": "1",
      "type": "trigger",
      "data": { "type": "manual" }
    }
  ],
  "edges": []
}
```

#### `update_workflow`
Update workflow nodes/edges.

**Parameters:**
- `workflow_id` (required): The ID of the workflow to update
- `name` (optional): New name for the workflow
- `description` (optional): New description
- `nodes` (optional): Updated workflow nodes
- `edges` (optional): Updated workflow edges

**Example:**
```typescript
{
  "workflow_id": "wf_abc123",
  "name": "Updated Workflow Name",
  "nodes": [...]
}
```

#### `delete_workflow`
Delete a workflow.

**Parameters:**
- `workflow_id` (required): The ID of the workflow to delete

**Example:**
```typescript
{
  "workflow_id": "wf_abc123"
}
```

### AI Generation

#### `generate_workflow`
AI-powered workflow generation from natural language.

**Parameters:**
- `prompt` (required): Natural language description of the workflow
- `existing_workflow_id` (optional): ID of an existing workflow to modify

**Example:**
```typescript
{
  "prompt": "Create a workflow that monitors Ethereum wallet balance and sends a Discord notification when it changes"
}
```

### Execution

#### `execute_workflow`
Start async execution of a workflow.

**Parameters:**
- `workflow_id` (required): The ID of the workflow to execute
- `input` (optional): Input data for the workflow

**Example:**
```typescript
{
  "workflow_id": "wf_abc123",
  "input": {
    "walletAddress": "0x1234..."
  }
}
```

#### `get_execution_status`
Poll execution status.

**Parameters:**
- `execution_id` (required): The ID of the execution to check

**Example:**
```typescript
{
  "execution_id": "exec_xyz789"
}
```

#### `get_execution_logs`
Get execution logs.

**Parameters:**
- `execution_id` (required): The ID of the execution to get logs for

**Example:**
```typescript
{
  "execution_id": "exec_xyz789"
}
```

## Available Resources

### `keeperhub://workflows`
Returns a list of all workflows in the organization.

**URI:** `keeperhub://workflows`

**MIME Type:** `application/json`

### `keeperhub://workflows/{id}`
Returns details for a specific workflow.

**URI:** `keeperhub://workflows/{workflow_id}`

**MIME Type:** `application/json`

## API Key Management

To use this MCP server, you need to generate an API key from the KeeperHub application:

1. Log in to [app.keeperhub.com](https://app.keeperhub.com)
2. Navigate to Organization Settings
3. Go to the API Keys section
4. Click "Create API Key"
5. Give it a name and copy the key (it will only be shown once)
6. Use the key in the `KEEPERHUB_API_KEY` environment variable

## Development

### Project Structure

```
keeperhub-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── tools/
│   │   ├── index.ts          # Tool exports
│   │   ├── workflows.ts      # Workflow CRUD tools
│   │   ├── executions.ts     # Execution tools
│   │   └── generate.ts       # AI generation tool
│   ├── resources/
│   │   ├── index.ts          # Resource exports
│   │   └── workflows.ts      # Workflow resources
│   ├── client/
│   │   └── keeperhub.ts      # KeeperHub API client
│   └── types/
│       └── index.ts          # Type definitions
├── Dockerfile
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

### Building

```bash
pnpm build
```

### Type Checking

```bash
pnpm type-check
```

### Building Docker Image

```bash
docker build -t keeperhub-mcp .
```

## Error Handling

All tools return errors in the following format:

```typescript
{
  "content": [
    {
      "type": "text",
      "text": "Error: <error message>"
    }
  ],
  "isError": true
}
```

Common errors:
- `401 Unauthorized`: Invalid or missing API key
- `404 Not Found`: Workflow or execution not found
- `400 Bad Request`: Invalid parameters
- `500 Internal Server Error`: Server error

## Security

- API keys are transmitted via Bearer authentication
- Keys are scoped to a single organization
- All communication with KeeperHub API is over HTTPS
- Keys are never logged or exposed in error messages

## License

MIT

## Support

For issues or questions:
- GitHub Issues: [techops-services/keeperhub-mcp](https://github.com/techops-services/keeperhub-mcp/issues)
- Documentation: [KeeperHub Docs](https://docs.keeperhub.com)
