#!/bin/bash
# pi-paste-image.sh - Paste clipboard image as path for Pi
#
# Usage in Pi:
#   Run: pi-paste-image
#   Or bind to key: echo 'alias ppi="pi-paste-image"' >> ~/.zshrc

set -e

# Check for clipboard image
if ! command -v osascript &> /dev/null; then
    echo "Error: macOS required"
    exit 1
fi

# Create temp file with timestamp
TEMP_DIR="${TMPDIR:-/tmp}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_FILE="$TEMP_DIR/pi-clipboard-$TIMESTAMP.png"

# Try pngpaste first (best quality)
if command -v pngpaste &> /dev/null; then
    pngpaste "$OUTPUT_FILE" 2>/dev/null || {
        echo "Error: No image in clipboard or pngpaste failed"
        exit 1
    }
else
    # Fallback to AppleScript
    osascript <<EOF 2>/dev/null || {
        echo "Error: No image in clipboard"
        exit 1
    }
        tell application "System Events"
            set theClipboard to the clipboard
            if class of theClipboard is not picture then
                error "Clipboard does not contain an image"
            end if
        end tell
        
        set tempFile to "$OUTPUT_FILE"
        set theFile to open for access tempFile with write permission
        write theClipboard to theFile
        close access theFile
EOF
fi

# Output the path for Pi
if [ -f "$OUTPUT_FILE" ]; then
    echo "$OUTPUT_FILE"
else
    echo "Error: Failed to save image"
    exit 1
fi
