/**
 * pi-minimax-mcp
 *
 * MiniMax MCP integration for Pi coding agent
 * Provides web search and image understanding capabilities
 *
 * @example
 * // As Pi extension
 * import minimaxMcp from "ameno-/pi-minimax-mcp/extensions";
 *
 * // As library
 * import { MiniMaxMcpClient } from "ameno-/pi-minimax-mcp";
 * const client = new MiniMaxMcpClient({ apiKey: "..." });
 * const results = await client.webSearch({ query: "..." });
 */

export { MiniMaxMcpClient } from "./client.js";
export { loadConfig, mergeConfig, validateConfig, ensureDefaultConfig } from "./config.js";
export { formatToolOutput, formatBytes, redactSensitiveData, truncateHead } from "./utils.js";
export type {
  JsonRpcRequest,
  JsonRpcResponse,
  McpToolResult,
  MiniMaxMcpConfig,
  WebSearchParams,
  UnderstandImageParams,
} from "./types.js";
