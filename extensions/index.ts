/**
 * MiniMax MCP Pi Extension
 *
 * Provides MiniMax MCP tools via Pi's ExtensionAPI:
 * - web_search: Real-time web search
 * - understand_image: Image analysis and description
 *
 * Setup:
 * 1. Install: pi install npm:ameno-/pi-minimax-mcp
 * 2. Get API key: https://platform.minimax.io/subscribe/coding-plan
 * 3. Set env: MINIMAX_API_KEY=your-key
 *
 * Or use config file: ~/.pi/agent/extensions/minimax-mcp.json
 *
 * Usage:
 *   "Search the web for quantum computing breakthroughs"
 *   "What does this image show? ./screenshot.png"
 */

import { Type } from "@sinclair/typebox";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { MiniMaxMcpClient } from "../src/client.js";
import { ensureDefaultConfig, loadConfig, mergeConfig, validateConfig } from "../src/config.js";
import { formatToolOutput, redactSensitiveData } from "../src/utils.js";

// =============================================================================
// Extension Entry Point
// =============================================================================

export default function minimaxMcp(pi: ExtensionAPI) {
  // Register CLI flags
  pi.registerFlag("--minimax-api-key", {
    description: "MiniMax API key (overrides env/config)",
    type: "string",
  });
  pi.registerFlag("--minimax-api-host", {
    description: "MiniMax API host (default: https://api.minimax.io)",
    type: "string",
  });
  pi.registerFlag("--minimax-mcp-config", {
    description: "Path to JSON config file",
    type: "string",
  });
  pi.registerFlag("--minimax-mcp-max-bytes", {
    description: "Max bytes to keep from tool output (default: 51200)",
    type: "string",
  });
  pi.registerFlag("--minimax-mcp-max-lines", {
    description: "Max lines to keep from tool output (default: 2000)",
    type: "string",
  });

  // Ensure default config exists
  ensureDefaultConfig();

  // Get effective configuration
  const getConfig = () => {
    const configFlag = pi.getFlag("--minimax-mcp-config");
    const baseConfig = loadConfig(
      typeof configFlag === "string" ? configFlag : undefined
    );

    const apiKeyFlag = pi.getFlag("--minimax-api-key");
    const hostFlag = pi.getFlag("--minimax-api-host");
    const maxBytesFlag = pi.getFlag("--minimax-mcp-max-bytes");
    const maxLinesFlag = pi.getFlag("--minimax-mcp-max-lines");

    return mergeConfig({
      apiKey: typeof apiKeyFlag === "string" ? apiKeyFlag : baseConfig.apiKey,
      apiHost: typeof hostFlag === "string" ? hostFlag : baseConfig.apiHost,
      maxBytes:
        typeof maxBytesFlag === "string"
          ? parseInt(maxBytesFlag, 10)
          : baseConfig.maxBytes,
      maxLines:
        typeof maxLinesFlag === "string"
          ? parseInt(maxLinesFlag, 10)
          : baseConfig.maxLines,
    });
  };

  // Tool parameter schemas
  const webSearchParams = Type.Object(
    {
      query: Type.String({ description: "Search query" }),
      numResults: Type.Optional(
        Type.Integer({
          description: "Number of results to return (default: 5)",
          minimum: 1,
          maximum: 10,
        })
      ),
      recencyDays: Type.Optional(
        Type.Integer({
          description: "Limit results to recent days",
          minimum: 1,
        })
      ),
    },
    { additionalProperties: false }
  );

  const understandImageParams = Type.Object(
    {
      imagePath: Type.String({
        description: "Path to image file (relative or absolute)",
      }),
      prompt: Type.Optional(
        Type.String({
          description: "Optional prompt to guide image understanding",
        })
      ),
    },
    { additionalProperties: false }
  );

  // Register web_search tool
  pi.registerTool({
    name: "web_search",
    label: "MiniMax Web Search",
    description:
      "Real-time web search via MiniMax. Best for current information, news, documentation, and facts.",
    parameters: webSearchParams,
    async execute(_toolCallId, params, onUpdate, _ctx, signal) {
      const config = getConfig();

      try {
        validateConfig(config);
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text:
                err instanceof Error
                  ? err.message
                  : "MiniMax configuration error",
            },
          ],
          isError: true,
        };
      }

      if (signal?.aborted) {
        return { content: [{ type: "text", text: "Cancelled" }] };
      }

      onUpdate?.({
        content: [{ type: "text", text: `Searching: "${params.query}"...` }],
        details: { status: "pending" },
      });

      const client = new MiniMaxMcpClient(config);

      try {
        const result = await client.webSearch({
          query: params.query,
          numResults: params.numResults,
          recencyDays: params.recencyDays,
        });

        if (signal?.aborted) {
          return { content: [{ type: "text", text: "Cancelled" }] };
        }

        const formatted = formatToolOutput(result, {
          maxBytes: config.maxBytes,
          maxLines: config.maxLines,
        });

        return {
          content: [{ type: "text", text: formatted.text }],
          details: {
            ...formatted.details,
            config: redactSensitiveData(config),
          },
          isError: result.isError,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `MiniMax MCP error: ${message}` }],
          isError: true,
          details: {
            error: message,
            config: redactSensitiveData(config),
          },
        };
      } finally {
        client.disconnect();
      }
    },
  });

  // Register understand_image tool
  pi.registerTool({
    name: "understand_image",
    label: "MiniMax Image Understanding",
    description:
      "Analyze and describe image content via MiniMax. Best for screenshots, diagrams, photos, and visual analysis.",
    parameters: understandImageParams,
    async execute(_toolCallId, params, onUpdate, _ctx, signal) {
      const config = getConfig();

      try {
        validateConfig(config);
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text:
                err instanceof Error
                  ? err.message
                  : "MiniMax configuration error",
            },
          ],
          isError: true,
        };
      }

      if (signal?.aborted) {
        return { content: [{ type: "text", text: "Cancelled" }] };
      }

      onUpdate?.({
        content: [{ type: "text", text: "Analyzing image..." }],
        details: { status: "pending" },
      });

      const client = new MiniMaxMcpClient(config);

      try {
        const result = await client.understandImage({
          imagePath: params.imagePath,
          prompt: params.prompt,
        });

        if (signal?.aborted) {
          return { content: [{ type: "text", text: "Cancelled" }] };
        }

        const formatted = formatToolOutput(result, {
          maxBytes: config.maxBytes,
          maxLines: config.maxLines,
        });

        return {
          content: [{ type: "text", text: formatted.text }],
          details: {
            ...formatted.details,
            config: redactSensitiveData(config),
          },
          isError: result.isError,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `MiniMax MCP error: ${message}` }],
          isError: true,
          details: {
            error: message,
            config: redactSensitiveData(config),
          },
        };
      } finally {
        client.disconnect();
      }
    },
  });
}
