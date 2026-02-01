/**
 * MiniMax MCP Utilities
 *
 * Output formatting, truncation, and helper functions
 */

import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import type { McpToolResult, MiniMaxMcpConfig } from "./types.js";

export interface FormatOptions {
  maxBytes?: number;
  maxLines?: number;
}

export interface FormattedOutput {
  text: string;
  details: {
    truncated: boolean;
    totalLines: number;
    totalBytes: number;
    outputLines: number;
    outputBytes: number;
    tempFile?: string;
  };
}

export function formatToolOutput(
  result: McpToolResult,
  options: FormatOptions = {}
): FormattedOutput {
  const { maxBytes = 51200, maxLines = 2000 } = options;

  const contentBlocks = Array.isArray(result.content) ? result.content : [];
  const textBlocks = contentBlocks
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text!);

  const rawText = textBlocks.join("\n\n") || JSON.stringify(result, null, 2);

  const lines = rawText.split("\n");
  const totalLines = lines.length;
  const totalBytes = Buffer.byteLength(rawText, "utf-8");

  // Check if truncation needed
  const truncateByLines = totalLines > maxLines;
  const truncateByBytes = totalBytes > maxBytes;

  let outputText = rawText;
  let tempFile: string | undefined;

  if (truncateByLines || truncateByBytes) {
    // Determine truncation strategy
    if (truncateByBytes && totalBytes > maxBytes) {
      // Truncate by bytes (keep from end)
      const buffer = Buffer.from(rawText, "utf-8");
      const truncated = buffer.slice(-maxBytes).toString("utf-8");
      // Clean up partial UTF-8 character at start
      outputText = truncated.replace(/^[^\n]*\n/, "");
    }

    if (truncateByLines) {
      outputText = lines.slice(-maxLines).join("\n");
    }

    // Write full output to temp file
    tempFile = writeTempFile(rawText);

    const truncationInfo = `\n\n[Output truncated: ${Math.min(totalLines, maxLines)} of ${totalLines} lines (${formatBytes(Math.min(totalBytes, maxBytes))} of ${formatBytes(totalBytes)}). Full output: ${tempFile}]`;
    outputText += truncationInfo;
  }

  const outputLines = outputText.split("\n").length;
  const outputBytes = Buffer.byteLength(outputText, "utf-8");

  return {
    text: outputText,
    details: {
      truncated: truncateByLines || truncateByBytes,
      totalLines,
      totalBytes,
      outputLines,
      outputBytes,
      tempFile,
    },
  };
}

export function writeTempFile(content: string): string {
  const timestamp = Date.now();
  const filename = `pi-minimax-mcp-${timestamp}.txt`;
  const filepath = join(tmpdir(), filename);
  writeFileSync(filepath, content, "utf-8");
  return filepath;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function redactSensitiveData(
  config: MiniMaxMcpConfig
): Partial<MiniMaxMcpConfig> {
  return {
    ...config,
    apiKey: config.apiKey ? "***REDACTED***" : undefined,
  };
}

export function truncateHead(
  text: string,
  options: { maxBytes?: number; maxLines?: number }
): {
  content: string;
  truncated: boolean;
  outputLines: number;
  outputBytes: number;
  totalLines: number;
  totalBytes: number;
  firstLineExceedsLimit: boolean;
} {
  const maxBytes = options.maxBytes ?? 51200;
  const maxLines = options.maxLines ?? 2000;

  const totalBytes = Buffer.byteLength(text, "utf-8");
  const lines = text.split("\n");
  const totalLines = lines.length;

  let content = text;
  let truncated = false;
  let firstLineExceedsLimit = false;

  // Check if first line alone exceeds byte limit
  if (lines[0] && Buffer.byteLength(lines[0], "utf-8") > maxBytes) {
    firstLineExceedsLimit = true;
    content = lines[0].slice(0, maxBytes) + "... [truncated]";
    truncated = true;
  } else if (totalLines > maxLines || totalBytes > maxBytes) {
    truncated = true;

    // Keep from the end (most recent content)
    if (totalLines > maxLines) {
      content = lines.slice(-maxLines).join("\n");
    }

    // Apply byte limit if still over
    const contentBytes = Buffer.byteLength(content, "utf-8");
    if (contentBytes > maxBytes) {
      const buffer = Buffer.from(content, "utf-8");
      content = buffer.slice(-maxBytes).toString("utf-8");
      // Remove potential partial line at start
      const newlineIdx = content.indexOf("\n");
      if (newlineIdx > 0) {
        content = content.slice(newlineIdx + 1);
      }
    }
  }

  return {
    content,
    truncated,
    outputLines: content.split("\n").length,
    outputBytes: Buffer.byteLength(content, "utf-8"),
    totalLines,
    totalBytes,
    firstLineExceedsLimit,
  };
}
