#!/bin/bash
set -e

echo "Setting up Faster Whisper..."
echo "=============================="
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

echo "✅ Python $(python3 --version) found"
echo ""

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

echo ""
echo "Installing faster-whisper..."
./venv/bin/pip install --upgrade pip
./venv/bin/pip install faster-whisper

echo ""
echo "✅ Setup complete!"
echo ""
echo "You can now run:"
echo "  bun run start"
