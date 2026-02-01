#!/usr/bin/env node
/**
 * pi-minimax-mcp CLI
 *
 * Command-line interface for MiniMax MCP tools
 *
 * Usage:
 *   pi-minimax-mcp search "quantum computing latest"
 *   pi-minimax-mcp understand ./screenshot.png
 *   pi-minimax-mcp config        # Show current config
 *   pi-minimax-mcp init          # Create default config
 */

import { MiniMaxMcpClient } from "../dist/client.js";
import { loadConfig, mergeConfig, validateConfig, ensureDefaultConfig } from "../dist/config.js";
import { formatToolOutput } from "../dist/utils.js";

const USAGE = `
Usage: pi-minimax-mcp <command> [options]

Commands:
  search <query>      Perform web search
  understand <path>   Analyze image
  config              Show current configuration
  init                Create default config file
  --help, -h          Show this help
  --version, -v       Show version

Environment Variables:
  MINIMAX_API_KEY         Required. Get from https://platform.minimax.io/subscribe/coding-plan
  MINIMAX_API_HOST        Optional. Default: https://api.minimax.io
  MINIMAX_MCP_BASE_PATH   Optional. Local output directory
  MINIMAX_API_RESOURCE_MODE  Optional. "url" or "local"

Examples:
  pi-minimax-mcp search "Rust async/await patterns"
  pi-minimax-mcp search "OpenAI GPT-5 rumors" --num-results 10
  pi-minimax-mcp understand ./error-screenshot.png
  pi-minimax-mcp understand ./chart.png --prompt "What trends does this show?"
`;

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = {};
  const positional = [];

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2).replace(/-/g, "");
      const value = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : "true";
      options[key] = value;
    } else {
      positional.push(arg);
    }
  }

  return { command, options, positional };
}

async function main() {
  const { command, options, positional } = parseArgs();

  if (!command || command === "--help" || command === "-h") {
    console.log(USAGE);
    process.exit(0);
  }

  if (command === "--version" || command === "-v") {
    console.log("1.0.0");
    process.exit(0);
  }

  if (command === "init") {
    ensureDefaultConfig();
    process.exit(0);
  }

  if (command === "config") {
    const config = loadConfig(options.config);
    console.log("Current configuration:");
    console.log(JSON.stringify({ ...config, apiKey: config.apiKey ? "***REDACTED***" : undefined }, null, 2));
    process.exit(0);
  }

  // Validate we have an API key before proceeding
  const config = mergeConfig({});
  try {
    validateConfig(config);
  } catch (err) {
    console.error(err instanceof Error ? err.message : "Configuration error");
    process.exit(1);
  }

  const client = new MiniMaxMcpClient(config);

  try {
    if (command === "search") {
      const query = positional[0] || options.query;
      if (!query) {
        console.error("Error: Search query required");
        console.log("\nUsage: pi-minimax-mcp search <query> [--num-results N]");
        process.exit(1);
      }

      console.log(`Searching: "${query}"...\n`);

      const result = await client.webSearch({
        query,
        numResults: parseInt(options.numresults || options.numResults, 10) || undefined,
        recencyDays: parseInt(options.recencydays || options.recencyDays, 10) || undefined,
      });

      const formatted = formatToolOutput(result, {
        maxBytes: config.maxBytes,
        maxLines: config.maxLines,
      });

      console.log(formatted.text);

      if (formatted.details.truncated && formatted.details.tempFile) {
        console.log(`\n[Full output saved to: ${formatted.details.tempFile}]`);
      }
    } else if (command === "understand" || command === "image") {
      const imagePath = positional[0] || options.image || options.path;
      if (!imagePath) {
        console.error("Error: Image path required");
        console.log("\nUsage: pi-minimax-mcp understand <image-path> [--prompt \"question\"]");
        process.exit(1);
      }

      console.log(`Analyzing: ${imagePath}...\n`);

      const result = await client.understandImage({
        imagePath,
        prompt: options.prompt,
      });

      const formatted = formatToolOutput(result, {
        maxBytes: config.maxBytes,
        maxLines: config.maxLines,
      });

      console.log(formatted.text);

      if (formatted.details.truncated && formatted.details.tempFile) {
        console.log(`\n[Full output saved to: ${formatted.details.tempFile}]`);
      }
    } else {
      console.error(`Unknown command: ${command}`);
      console.log(USAGE);
      process.exit(1);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    client.disconnect();
  }
}

main();
