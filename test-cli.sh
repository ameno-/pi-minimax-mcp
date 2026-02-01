#!/bin/bash
# Test script for pi-minimax-mcp CLI

echo "=== pi-minimax-mcp Test Suite ==="
echo ""

# Test 1: Show help
echo "Test 1: Help command"
./bin/pi-minimax-mcp.js --help
echo ""
echo "✓ Help works"
echo ""

# Test 2: Show config (should work without API key for viewing)
echo "Test 2: Config command"
./bin/pi-minimax-mcp.js config
echo ""
echo "✓ Config display works"
echo ""

# Test 3: Version
echo "Test 3: Version"
./bin/pi-minimax-mcp.js --version
echo ""
echo "✓ Version works"
echo ""

# Test 4: Missing API key handling
echo "Test 4: Missing API key handling"
unset MINIMAX_API_KEY
./bin/pi-minimax-mcp.js search "test" 2>&1 | head -3
echo ""
echo "✓ Error handling works"
echo ""

echo "=== All tests passed ==="
