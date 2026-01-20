/**
 * Action Schemas for KeeperHub Workflow Builder
 *
 * This file documents the expected config field names for each action type.
 * Use these schemas when creating workflows via the MCP to ensure correct field names.
 *
 * IMPORTANT: Field names must match exactly - the UI expects specific field names
 * and will not display values if the wrong field name is used.
 */

/**
 * System Actions (built-in, no plugin required)
 */
export interface ConditionConfig {
  actionType: "Condition";
  /** The condition expression - MUST be "condition", NOT "conditionExpression" */
  condition: string; // e.g., "{{@nodeId:Label.balance}} < 0.5"
}

export interface HttpRequestConfig {
  actionType: "HTTP Request";
  endpoint: string;
  httpMethod: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  httpHeaders?: string; // JSON string
  httpBody?: string; // JSON string
}

export interface DatabaseQueryConfig {
  actionType: "Database Query";
  integrationId: string;
  query: string;
}

/**
 * Web3 Plugin Actions
 */
export interface CheckBalanceConfig {
  actionType: "web3/check-balance";
  network: string; // Chain ID as string, e.g., "1" for mainnet
  address: string; // Ethereum address
}

export interface CheckTokenBalanceConfig {
  actionType: "web3/check-token-balance";
  network: string;
  address: string;
  tokenAddress: string;
}

export interface TransferFundsConfig {
  actionType: "web3/transfer-funds";
  network: string;
  toAddress: string;
  amount: string;
  walletId: string;
}

export interface TransferTokenConfig {
  actionType: "web3/transfer-token";
  network: string;
  toAddress: string;
  tokenAddress: string;
  amount: string;
  walletId: string;
}

export interface ReadContractConfig {
  actionType: "web3/read-contract";
  network: string;
  contractAddress: string;
  functionName: string;
  functionArgs?: string; // JSON array string
  abi?: string; // JSON string
}

export interface WriteContractConfig {
  actionType: "web3/write-contract";
  network: string;
  contractAddress: string;
  functionName: string;
  functionArgs?: string;
  abi?: string;
  walletId: string;
  value?: string; // ETH value to send
}

/**
 * Webhook Plugin Actions
 */
export interface SendWebhookConfig {
  actionType: "webhook/send-webhook";
  webhookUrl: string;
  webhookMethod: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  webhookHeaders?: string; // JSON string, e.g., '{"Content-Type": "application/json"}'
  webhookPayload?: string; // JSON string
}

/**
 * Discord Plugin Actions
 */
export interface SendDiscordMessageConfig {
  actionType: "discord/send-message";
  integrationId: string;
  discordMessage: string;
}

/**
 * SendGrid Plugin Actions
 */
export interface SendEmailConfig {
  actionType: "sendgrid/send-email";
  integrationId?: string; // Optional - uses KeeperHub default if not provided
  emailTo: string;
  emailSubject: string;
  emailBody: string;
}

/**
 * Trigger Configuration
 */
export interface ManualTriggerConfig {
  triggerType: "Manual";
}

export interface ScheduleTriggerConfig {
  triggerType: "Schedule";
  schedule: string; // Cron expression, e.g., "*/5 * * * *" for every 5 minutes
}

export interface WebhookTriggerConfig {
  triggerType: "Webhook";
}

export interface EventTriggerConfig {
  triggerType: "Event";
  eventNetwork: string; // Chain ID
  eventAddress: string; // Contract address to watch
  eventName: string; // Event name to listen for
}

/**
 * Union types for convenience
 */
export type ActionConfig =
  | ConditionConfig
  | HttpRequestConfig
  | DatabaseQueryConfig
  | CheckBalanceConfig
  | CheckTokenBalanceConfig
  | TransferFundsConfig
  | TransferTokenConfig
  | ReadContractConfig
  | WriteContractConfig
  | SendWebhookConfig
  | SendDiscordMessageConfig
  | SendEmailConfig;

export type TriggerConfig =
  | ManualTriggerConfig
  | ScheduleTriggerConfig
  | WebhookTriggerConfig
  | EventTriggerConfig;

/**
 * Common field name mistakes to avoid:
 *
 * WRONG                    CORRECT
 * -----                    -------
 * conditionExpression  ->  condition
 * url                  ->  webhookUrl (for webhook) or endpoint (for HTTP Request)
 * method               ->  webhookMethod (for webhook) or httpMethod (for HTTP Request)
 * headers              ->  webhookHeaders (for webhook) or httpHeaders (for HTTP Request)
 * body/payload         ->  webhookPayload (for webhook) or httpBody (for HTTP Request)
 * message              ->  discordMessage (for Discord)
 * to/subject/body      ->  emailTo/emailSubject/emailBody (for SendGrid)
 * scheduleCron         ->  schedule (for Schedule trigger)
 * chainId              ->  network (use string, not number)
 */

/**
 * Example: Creating a condition node with correct field names
 *
 * ```typescript
 * const conditionNode = {
 *   id: "condition-1",
 *   type: "action",
 *   data: {
 *     type: "action",
 *     label: "Check Balance",
 *     config: {
 *       actionType: "Condition",
 *       condition: "{{@check-balance:Check Balance.balance}} < 0.5", // NOT conditionExpression!
 *     },
 *   },
 *   position: { x: 0, y: 0 },
 * };
 * ```
 */

/**
 * Edge structure - IMPORTANT: Do NOT use sourceHandle or targetHandle
 *
 * KeeperHub nodes use simple handles without IDs. Using sourceHandle
 * or targetHandle will cause edges to not render.
 *
 * ```typescript
 * const edge = {
 *   id: "edge-1",
 *   source: "node-1",
 *   target: "node-2",
 *   // Do NOT include: sourceHandle, targetHandle
 * };
 * ```
 */
