#!/usr/bin/env node
/**
 * pi-paste-image - Paste clipboard image as path for Pi
 * 
 * Works around Ghostty/terminal keybinding conflicts with Pi's Ctrl+V
 * 
 * Usage:
 *   pi-paste-image                    # Saves image and prints path
 *   pi-paste-image --install-alias    # Add alias to ~/.zshrc
 *   ppi                               # Short alias (after install)
 */

import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { spawnSync } from "child_process";

const VERSION = "1.0.0";

function showHelp() {
  console.log(`
pi-paste-image v${VERSION}

Paste clipboard image as file path for Pi.
Works around Ghostty/terminal keybinding conflicts.

Usage:
  pi-paste-image [options]

Options:
  --install-alias    Add 'ppi' alias to ~/.zshrc
  --help, -h         Show this help
  --version, -v      Show version

Examples:
  pi-paste-image                    # Output: /tmp/pi-clipboard-xxxxx.png
  pi-paste-image --install-alias    # Add alias
  ppi                               # Use alias (after restart)

In Pi TUI:
  1. Take screenshot (Cmd+Shift+Control+4 for clipboard)
  2. Run: pi-paste-image
  3. Copy output path
  4. Paste into Pi with: ./path/from/output

macOS Screenshot Shortcuts:
  Cmd+Shift+3          - Full screen to file
  Cmd+Ctrl+Shift+3     - Full screen to clipboard ✓
  Cmd+Shift+4          - Selection to file  
  Cmd+Ctrl+Shift+4     - Selection to clipboard ✓ (use this!)
`);
}

async function installAlias() {
  const { appendFileSync, existsSync } = await import("fs");
  const { homedir } = await import("os");
  
  const zshrc = join(homedir(), ".zshrc");
  const aliasLine = '\n# Pi paste image alias\nalias ppi="pi-paste-image"\n';
  
  if (existsSync(zshrc)) {
    appendFileSync(zshrc, aliasLine);
    console.log("✓ Added 'ppi' alias to ~/.zshrc");
    console.log("  Restart terminal or run: source ~/.zshrc");
  } else {
    console.error("Error: ~/.zshrc not found");
    process.exit(1);
  }
}

function hasClipboardImage() {
  try {
    const result = spawnSync("osascript", ["-e", 'tell application "System Events" to return (clipboard info) contains "class PNGf" or (clipboard info) contains "class TIFF"'], {
      encoding: "utf-8",
      timeout: 5000,
    });
    return result.status === 0 && result.stdout.trim() === "true";
  } catch {
    return false;
  }
}

function saveClipboardImage(outputPath) {
  // Try pngpaste first (if installed)
  const pngpaste = spawnSync("which", ["pngpaste"], { encoding: "utf-8" });
  if (pngpaste.status === 0) {
    const result = spawnSync("pngpaste", [outputPath], { timeout: 10000 });
    if (result.status === 0) return true;
  }
  
  // Fallback to AppleScript
  const script = `
    try
      set theClipboard to the clipboard
      if class of theClipboard is picture then
        set fileRef to open for access POSIX file "${outputPath}" with write permission
        write theClipboard to fileRef
        close access fileRef
        return "success"
      else
        return "no image"
      end if
    on error errMsg
      return "error: " & errMsg
    end try
  `;
  
  const result = spawnSync("osascript", ["-e", script], {
    encoding: "utf-8",
    timeout: 10000,
  });
  
  return result.stdout.trim() === "success";
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    process.exit(0);
  }
  
  if (args.includes("--version") || args.includes("-v")) {
    console.log(VERSION);
    process.exit(0);
  }
  
  if (args.includes("--install-alias")) {
    await installAlias();
    process.exit(0);
  }
  
  // Check if on macOS
  if (process.platform !== "darwin") {
    console.error("Error: This tool is macOS only");
    console.error("Linux users: use Ctrl+V in Pi directly (requires wl-paste or xclip)");
    process.exit(1);
  }
  
  try {
    // Check for image in clipboard
    if (!hasClipboardImage()) {
      console.error("Error: No image found in clipboard");
      console.error("");
      console.error("To copy screenshot to clipboard (not file):");
      console.error("  Cmd+Control+Shift+4  - Select area, copy to clipboard");
      console.error("  Cmd+Control+Shift+3  - Full screen, copy to clipboard");
      console.error("");
      console.error("Note: Regular Cmd+Shift+4 saves to Desktop, not clipboard");
      process.exit(1);
    }
    
    // Save to temp file
    const fileName = `pi-clipboard-${randomUUID()}.png`;
    const filePath = join(tmpdir(), fileName);
    
    if (!saveClipboardImage(filePath)) {
      console.error("Error: Failed to save clipboard image");
      process.exit(1);
    }
    
    // Output the path
    console.log(filePath);
    
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
