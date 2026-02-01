/**
 * MiniMax MCP Configuration
 * 
 * Handles configuration loading from files and environment variables
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { DEFAULT_CONFIG, type MiniMaxMcpConfig } from "./types.js";

const CONFIG_PATHS = [
  join(process.cwd(), ".pi", "extensions", "minimax-mcp.json"),
  join(homedir(), ".pi", "agent", "extensions", "minimax-mcp.json"),
];

export function resolveConfigPath(customPath?: string): string | null {
  if (customPath) {
    return customPath.startsWith("~")
      ? join(homedir(), customPath.slice(1))
      : customPath;
  }
  return null;
}

export function loadConfig(customPath?: string): MiniMaxMcpConfig {
  const paths = customPath 
    ? [resolveConfigPath(customPath)!]
    : CONFIG_PATHS;

  for (const path of paths) {
    if (existsSync(path)) {
      try {
        const raw = readFileSync(path, "utf-8");
        const parsed = JSON.parse(raw);
        return mergeConfig(parsed);
      } catch (error) {
        console.warn(`[pi-minimax-mcp] Failed to load config from ${path}:`, error);
      }
    }
  }

  return mergeConfig({});
}

export function mergeConfig(overrides: Partial<MiniMaxMcpConfig>): MiniMaxMcpConfig {
  const parseEnvInt = (val: string | undefined, fallback: number): number => {
    if (!val) return fallback;
    const parsed = parseInt(val, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  return {
    apiKey: overrides.apiKey ?? process.env.MINIMAX_API_KEY ?? DEFAULT_CONFIG.apiKey,
    apiHost: overrides.apiHost ?? process.env.MINIMAX_API_HOST ?? DEFAULT_CONFIG.apiHost,
    basePath: overrides.basePath ?? process.env.MINIMAX_MCP_BASE_PATH ?? DEFAULT_CONFIG.basePath,
    resourceMode: (overrides.resourceMode ?? process.env.MINIMAX_API_RESOURCE_MODE ?? DEFAULT_CONFIG.resourceMode) as "url" | "local",
    timeoutMs: overrides.timeoutMs ?? parseEnvInt(process.env.MINIMAX_MCP_TIMEOUT_MS, DEFAULT_CONFIG.timeoutMs!),
    maxBytes: overrides.maxBytes ?? parseEnvInt(process.env.MINIMAX_MCP_MAX_BYTES, DEFAULT_CONFIG.maxBytes!),
    maxLines: overrides.maxLines ?? parseEnvInt(process.env.MINIMAX_MCP_MAX_LINES, DEFAULT_CONFIG.maxLines!),
  };
}

export function ensureDefaultConfig(): void {
  const globalPath = CONFIG_PATHS[1];
  if (existsSync(globalPath)) return;

  try {
    mkdirSync(dirname(globalPath), { recursive: true });
    writeFileSync(
      globalPath,
      JSON.stringify(
        {
          apiKey: null,
          apiHost: "https://api.minimax.io",
          basePath: null,
          resourceMode: "url",
          timeoutMs: 60000,
          maxBytes: 51200,
          maxLines: 2000,
        },
        null,
        2
      ) + "\n",
      "utf-8"
    );
    console.log(`[pi-minimax-mcp] Created default config at ${globalPath}`);
  } catch (error) {
    console.warn(`[pi-minimax-mcp] Failed to create default config:`, error);
  }
}

export function validateConfig(config: MiniMaxMcpConfig): void {
  if (!config.apiKey) {
    throw new Error(
      "MiniMax API key is required. Set MINIMAX_API_KEY environment variable or add to config file.\n" +
      "Get your key at: https://platform.minimax.io/subscribe/coding-plan"
    );
  }
}