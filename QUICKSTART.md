# Quick Start: pi-minimax-mcp

Complete Pi-compatible MiniMax MCP package for web search and image understanding.

## 📦 Project Structure

```
~/dev/pi-minimax-mcp/
├── bin/
│   └── pi-minimax-mcp.js      # CLI entry point
├── src/
│   ├── index.ts                # Library exports
│   ├── client.ts               # MCP client (stdio via uvx)
│   ├── config.ts               # Configuration management
│   ├── types.ts                # TypeScript types
│   └── utils.ts                # Utilities (format, truncate)
├── extensions/
│   └── index.ts                # Pi ExtensionAPI entry
├── skill/
│   └── SKILL.md                # Pi skill definition
├── dist/                       # Compiled JavaScript
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

## 🚀 Installation

### Prerequisites

```bash
# Install uvx (required for MiniMax MCP)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Verify
which uvx  # Should show path like /Users/ameno/.local/bin/uvx
```

### Setup API Key

```bash
# Get key from: https://platform.minimax.io/subscribe/coding-plan
export MINIMAX_API_KEY="your-api-key-here"

# Optional: Add to ~/.zshrc for persistence
echo 'export MINIMAX_API_KEY="your-api-key"' >> ~/.zshrc
```

### Install Package

```bash
# Link for local development
cd ~/dev/pi-minimax-mcp
pnpm link --global

# Or install from npm (once published)
pnpm add -g @ameno/pi-minimax-mcp
```

## 🔧 Usage

### CLI

```bash
# Web search
pi-minimax-mcp search "latest TypeScript features"
pi-minimax-mcp search "quantum computing 2024" --num-results 10

# Image understanding
pi-minimax-mcp understand ./screenshot.png
pi-minimax-mcp understand ./diagram.png --prompt "Explain this architecture"

# Configuration
pi-minimax-mcp config      # Show current config
pi-minimax-mcp init        # Create default config file
```

### In Pi (as Extension)

Once installed in Pi, tools are automatically available:

```
# Web search
"Search for React 19 server components documentation"

# Image analysis
"What error does this screenshot show? [path/to/error.png]"
```

### Programmatic

```typescript
import { MiniMaxMcpClient } from "@ameno/pi-minimax-mcp";

const client = new MiniMaxMcpClient({
  apiKey: process.env.MINIMAX_API_KEY!,
});

// Search
const results = await client.webSearch({
  query: "Rust ownership patterns",
  numResults: 5,
});

// Analyze image
const analysis = await client.understandImage({
  imagePath: "./chart.png",
  prompt: "What trends does this show?",
});

client.disconnect();
```

## ⚙️ Configuration Options

### Priority Order
1. CLI flags (`--minimax-api-key`)
2. Environment variables
3. Config files (project → global)
4. Defaults

### Config Files

**Global:** `~/.pi/agent/extensions/minimax-mcp.json`

**Project:** `./.pi/extensions/minimax-mcp.json`

```json
{
  "apiKey": "your-api-key",
  "apiHost": "https://api.minimax.io",
  "basePath": "/tmp/minimax",
  "resourceMode": "url",
  "timeoutMs": 60000,
  "maxBytes": 51200,
  "maxLines": 2000
}
```

### Environment Variables

```bash
MINIMAX_API_KEY              # Required
MINIMAX_API_HOST             # Optional (default: https://api.minimax.io)
MINIMAX_MCP_BASE_PATH        # Optional (local output dir)
MINIMAX_API_RESOURCE_MODE    # Optional: "url" | "local"
MINIMAX_MCP_TIMEOUT_MS       # Optional (default: 60000)
MINIMAX_MCP_MAX_BYTES        # Optional (default: 51200)
MINIMAX_MCP_MAX_LINES        # Optional (default: 2000)
```

## 🔍 Architecture

```
┌─────────────┐     ┌────────────────────┐     ┌──────────────────┐
│   Pi Agent  │────▶│  pi-minimax-mcp    │────▶│  uvx minimax-    │
│             │     │  (Extension/CLI)   │     │  coding-plan-mcp │
│             │◄────│                    │◄────│  (MCP Server)    │
└─────────────┘     └────────────────────┘     └──────────────────┘
                                                         │
                              ┌──────────────────────────┘
                              ▼
                       ┌─────────────┐
                       │  MiniMax    │
                       │    API      │
                       └─────────────┘
```

**Protocol:** MCP over stdio (JSON-RPC 2.0)

**Tools:**
- `web_search` - Real-time web search
- `understand_image` - Image analysis

## 🛠️ Development

```bash
cd ~/dev/pi-minimax-mcp

# Install dependencies
pnpm install

# Build
pnpm run build

# Test CLI
./test-cli.sh

# Local link
pnpm link --global
```

## 📤 Publishing

```bash
# Build
pnpm run build

# Version bump
pnpm version patch|minor|major

# Publish
pnpm publish --access public
```

## 🔄 Comparison with OpenAI Web Search

| Feature | OpenAI Web Search | MiniMax MCP |
|---------|-------------------|-------------|
| **Integration** | Native to model | External MCP server |
| **Setup** | API key only | API key + uvx |
| **Image search** | No | Yes (understand_image) |
| **Latency** | Lower (native) | Higher (stdio spawn) |
| **Cost** | Per-query | MiniMax pricing |
| **Pi Compatible** | Via API | ✅ Native extension |

## 📝 Next Steps

1. **Test with real API key:**
   ```bash
   export MINIMAX_API_KEY="your-key"
   pi-minimax-mcp search "test query"
   ```

2. **Publish to npm:**
   ```bash
   pnpm publish --access public
   ```

3. **Share with community:**
   - Post in Pi Discord
   - Submit to Pi extensions registry
   - Update README with installation instructions

## 🐛 Troubleshooting

### `uvx: command not found`
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
# Restart shell or source ~/.zshrc
```

### `MINIMAX_API_KEY required`
```bash
export MINIMAX_API_KEY="your-key"
# Or create config file
pi-minimax-mcp init
```

### Spawn errors
```bash
# Check uvx is in PATH
which uvx

# Try absolute path
export MINIMAX_MCP_UV_PATH="/Users/ameno/.local/bin/uvx"
```

---

Built for Pi. Powered by MiniMax.
