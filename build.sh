#!/bin/bash

set -e

echo "🔨 Building Listen binary..."
echo ""

bun build --compile --minify --sourcemap=none --external blessed --outfile=listen-bin ./bin/cli.ts

echo ""
echo "✅ Build complete!"
echo "Binary: ./listen-bin"
echo ""
echo "To install globally, run: ./install.sh"
