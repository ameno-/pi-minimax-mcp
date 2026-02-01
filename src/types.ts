/**
 * MiniMax MCP Types
 * 
 * Type definitions for MiniMax MCP protocol
 */

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface McpToolResult {
  content?: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>;
  isError?: boolean;
}

export interface MiniMaxMcpConfig {
  apiKey?: string;
  apiHost?: string;
  basePath?: string;
  resourceMode?: "url" | "local";
  timeoutMs?: number;
  maxBytes?: number;
  maxLines?: number;
}

export interface WebSearchParams {
  query: string;
  numResults?: number;
  recencyDays?: number;
}

export interface UnderstandImageParams {
  imagePath: string;
  prompt?: string;
}

export const DEFAULT_CONFIG: MiniMaxMcpConfig = {
  apiHost: "https://api.minimax.io",
  resourceMode: "url",
  timeoutMs: 60000,
  maxBytes: 51200,
  maxLines: 2000,
};