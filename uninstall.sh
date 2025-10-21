#!/bin/bash

set -e

INSTALL_DIR="$HOME/.listen"
BIN_DIR="/usr/local/bin"
BINARY_PATH="$BIN_DIR/listen"

echo "🗑️  Uninstalling Listen..."
echo ""

# Remove binary
if [ -f "$BINARY_PATH" ]; then
    echo "📥 Removing binary from $BINARY_PATH..."
    if [ -w "$BIN_DIR" ]; then
        rm "$BINARY_PATH"
    else
        sudo rm "$BINARY_PATH"
    fi
    echo "✓ Binary removed"
else
    echo "⚠️  Binary not found at $BINARY_PATH"
fi

# Remove installation directory
if [ -d "$INSTALL_DIR" ]; then
    echo "📁 Removing installation directory: $INSTALL_DIR"
    rm -rf "$INSTALL_DIR"
    echo "✓ Installation directory removed"
else
    echo "⚠️  Installation directory not found at $INSTALL_DIR"
fi

echo ""
echo "✅ Uninstallation complete!"
echo ""
echo "Listen has been removed from your system."
