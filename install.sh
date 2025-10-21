#!/bin/bash

set -e

INSTALL_DIR="$HOME/.listen"
BIN_DIR="/usr/local/bin"

echo "🎙️  Installing Listen..."
echo ""

# Create installation directory
echo "📁 Creating installation directory: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"

# Copy Python script
echo "📄 Copying transcription script..."
cp transcribe.py "$INSTALL_DIR/"

# Setup Python virtual environment
echo "🐍 Setting up Python virtual environment..."
python3 -m venv "$INSTALL_DIR/venv"

# Install Python dependencies
echo "📦 Installing Python dependencies..."
"$INSTALL_DIR/venv/bin/pip3" install --upgrade pip > /dev/null
"$INSTALL_DIR/venv/bin/pip3" install faster-whisper ctranslate2 > /dev/null

# Download default model
echo "📥 Downloading base.en model..."
MODEL_DIR="$INSTALL_DIR/models"
mkdir -p "$MODEL_DIR"

"$INSTALL_DIR/venv/bin/python3" -c "
from faster_whisper import WhisperModel
import os
os.makedirs('$MODEL_DIR', exist_ok=True)
print('Downloading model...')
model = WhisperModel('base.en', device='cpu', compute_type='int8', download_root='$MODEL_DIR')
print('✓ Model downloaded successfully')
"

# Install Node.js dependencies for the CLI
echo "📦 Installing Node.js dependencies to $INSTALL_DIR..."
cp package.json "$INSTALL_DIR/"
cd "$INSTALL_DIR"
bun install --production > /dev/null
cd - > /dev/null

# Build the binary
echo "🔨 Building standalone binary..."
bun build --compile --minify --sourcemap=none --external blessed --outfile=listen-bin ./bin/cli.ts

# Move binary to install directory
mv listen-bin "$INSTALL_DIR/"

# Create wrapper script
echo "📝 Creating wrapper script..."
cat > "$BIN_DIR/listen.tmp" << 'EOF'
#!/bin/bash
export NODE_PATH="$HOME/.listen/node_modules:$NODE_PATH"
exec "$HOME/.listen/listen-bin" "$@"
EOF

# Install wrapper script
echo "📥 Installing to $BIN_DIR..."
if [ -w "$BIN_DIR" ]; then
    mv "$BIN_DIR/listen.tmp" "$BIN_DIR/listen"
    chmod +x "$BIN_DIR/listen"
else
    echo "Need sudo permissions to install to $BIN_DIR"
    sudo mv "$BIN_DIR/listen.tmp" "$BIN_DIR/listen"
    sudo chmod +x "$BIN_DIR/listen"
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "Run 'listen' from anywhere to start transcribing."
echo "Run 'listen --help' to see available options."
echo ""
echo "Files installed to: $INSTALL_DIR"
echo "Binary installed to: $BIN_DIR/listen"
