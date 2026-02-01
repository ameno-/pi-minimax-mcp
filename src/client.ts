/**
 * MiniMax MCP Client
 *
 * Manages the MCP connection to MiniMax via stdio (uvx minimax-coding-plan-mcp)
 */

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  McpToolResult,
  MiniMaxMcpConfig,
  UnderstandImageParams,
  WebSearchParams,
} from "./types.js";

interface PendingRequest {
  resolve: (value: JsonRpcResponse) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class MiniMaxMcpClient {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<string | number, PendingRequest>();
  private buffer = "";
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(private readonly config: MiniMaxMcpConfig) {}

  async connect(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doConnect();
    return this.initPromise;
  }

  private async doConnect(): Promise<void> {
    const env = {
      ...process.env,
      MINIMAX_API_KEY: this.config.apiKey!,
      MINIMAX_API_HOST: this.config.apiHost,
      ...(this.config.basePath && { MINIMAX_MCP_BASE_PATH: this.config.basePath }),
      ...(this.config.resourceMode && { MINIMAX_API_RESOURCE_MODE: this.config.resourceMode }),
    };

    this.process = spawn("uvx", ["minimax-coding-plan-mcp", "-y"], {
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.process.stdout?.on("data", (data: Buffer) => this.handleData(data));
    this.process.stderr?.on("data", (data: Buffer) => {
      const msg = data.toString();
      if (msg.includes("error") || msg.includes("Error")) {
        console.error(`[pi-minimax-mcp] ${msg.trim()}`);
      }
    });

    this.process.on("error", (err) => this.handleProcessError(err));
    this.process.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[pi-minimax-mcp] Process exited with code ${code}`);
      }
      this.cleanup();
    });

    // Wait for process to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("MCP process startup timeout")), 10000);
      const checkReady = setInterval(() => {
        if (this.process?.pid) {
          clearTimeout(timeout);
          clearInterval(checkReady);
          resolve();
        }
      }, 100);
    });

    // Initialize MCP protocol
    await this.initialize();
    this.initialized = true;
  }

  private async initialize(): Promise<void> {
    const response = await this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "pi-minimax-mcp",
        version: "1.0.0",
      },
    });

    if (response.error) {
      throw new Error(`MCP initialize failed: ${response.error.message}`);
    }

    // Send initialized notification
    await this.sendNotification("notifications/initialized", {});
  }

  private handleData(data: Buffer): void {
    this.buffer += data.toString();

    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (!line) continue;

      try {
        const message = JSON.parse(line) as JsonRpcResponse;
        this.handleMessage(message);
      } catch {
        // Not JSON, might be logging
        console.log(`[pi-minimax-mcp] ${line}`);
      }
    }
  }

  private handleMessage(message: JsonRpcResponse): void {
    if (message.id != null && this.pendingRequests.has(message.id)) {
      const request = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);
      clearTimeout(request.timer);
      request.resolve(message);
    }
  }

  private handleProcessError(err: Error): void {
    for (const [, request] of this.pendingRequests) {
      request.reject(err);
    }
    this.pendingRequests.clear();
    this.cleanup();
  }

  private cleanup(): void {
    this.initialized = false;
    this.initPromise = null;
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  private async sendRequest(method: string, params: Record<string, unknown>): Promise<JsonRpcResponse> {
    if (!this.process?.stdin) {
      throw new Error("MCP process not connected");
    }

    const id = ++this.requestId;
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`MCP request timeout after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });

      try {
        this.process!.stdin!.write(JSON.stringify(request) + "\n");
      } catch (err) {
        this.pendingRequests.delete(id);
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  private async sendNotification(method: string, params: Record<string, unknown>): Promise<void> {
    if (!this.process?.stdin) {
      throw new Error("MCP process not connected");
    }

    const notification = {
      jsonrpc: "2.0",
      method,
      params,
    };

    this.process.stdin.write(JSON.stringify(notification) + "\n");
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
    await this.connect();

    const response = await this.sendRequest("tools/call", {
      name,
      arguments: args,
    });

    if (response.error) {
      throw new Error(`Tool call failed: ${response.error.message}`);
    }

    return (response.result as McpToolResult) ?? { content: [] };
  }

  async webSearch(params: WebSearchParams): Promise<McpToolResult> {
    return this.callTool("web_search", {
      query: params.query,
      ...(params.numResults && { num_results: params.numResults }),
      ...(params.recencyDays && { recency_days: params.recencyDays }),
    });
  }

  async understandImage(params: UnderstandImageParams): Promise<McpToolResult> {
    return this.callTool("understand_image", {
      image_source: params.imagePath,
      prompt: params.prompt || "Describe this image in detail",
    });
  }

  disconnect(): void {
    this.cleanup();
  }
}
