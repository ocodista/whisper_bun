# Listen

[![CI](https://github.com/ocodista/whisper_bun/actions/workflows/ci.yml/badge.svg)](https://github.com/ocodista/whisper_bun/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/listen-cli.svg)](https://www.npmjs.com/package/listen-cli)

Real-time speech transcription. Speak, see text appear, copy automatically.

<!-- TODO: Add demo GIF showing:
1. Running `listen` command
2. Speaking into microphone
3. Text appearing in real-time in the TUI
4. Pressing Ctrl+C to stop
5. Summary output with word count and timing
-->

## Install

### via npm (recommended)

```bash
npm install -g listen-cli
```

The postinstall script will:
- Check for Python 3.8+ and SoX
- Create a Python virtual environment
- Install faster-whisper
- Download the tiny.en model

### via Bun

```bash
bun install -g listen-cli
```

### Manual Installation

Prerequisites: [Bun](https://bun.sh), [SoX](http://sox.sourceforge.net), Python 3.8+

```bash
git clone https://github.com/ocodista/whisper_bun.git
cd whisper_bun
bun install
./install.sh
```

## Usage

```bash
listen                              # Start transcribing
listen --model small.en             # Use higher quality model
listen --output notes.txt           # Save to custom file
listen --no-copy                    # Don't copy to clipboard
listen --append --output log.txt    # Append to existing file
listen --help                       # See all options
```

Press `Ctrl+C` to stop. Output saves to `result.txt` and copies to clipboard.

## Options

```
-m, --model <name>        Model name (default: base.en)
-c, --chunk <seconds>     Chunk duration (default: 3, range: 0.1-60)
-r, --rate <hz>           Sample rate (default: 16000)
-o, --output <path>       Output file (default: result.txt)
-t, --temp <path>         Temp directory (default: ./temp)
-l, --log-level <level>   Log level: error, warn, info, debug
    --no-copy             Disable automatic clipboard copy
    --append              Append to output file instead of overwriting
    --list-models         Show available Whisper models
    --list-devices        Show audio input device info
-h, --help                Show help
-v, --version             Show version
```

## Models

| Model | Size | Speed | Best For |
|-------|------|-------|----------|
| tiny.en | ~75MB | Fastest | Quick drafts, clear speech |
| base.en | ~140MB | Fast | **Default** - good balance |
| small.en | ~460MB | Medium | Higher accuracy |
| medium.en | ~1.5GB | Slow | Professional transcription |
| large-v3 | ~3GB | Slowest | Best quality, multilingual |

Use `.en` models for English-only (faster and more accurate).

```bash
listen --list-models  # See all models with details
```

## How It Works

1. Records 3-second audio chunks using SoX
2. Sends each chunk to faster-whisper for transcription
3. Displays results in real-time TUI
4. On exit, saves full transcription and copies to clipboard

**Hardware Acceleration:**
- **NVIDIA GPU**: CUDA with float16 (fastest)
- **Apple Silicon**: Accelerate framework with float32
- **CPU**: int8 quantization (works everywhere)

## Troubleshooting

### SoX not found

```
❌ SoX not found
```

Install SoX:
```bash
# macOS
brew install sox

# Ubuntu/Debian
sudo apt install sox libsox-fmt-all

# Fedora
sudo dnf install sox
```

### Python not found

```
❌ Python 3 not found
```

Install Python 3.8+:
```bash
# macOS
brew install python3

# Ubuntu/Debian
sudo apt install python3 python3-venv python3-pip

# Fedora
sudo dnf install python3 python3-pip
```

### Microphone access denied (macOS)

```
❌ Microphone access denied
```

Grant microphone permission:
1. System Preferences → Security & Privacy → Privacy → Microphone
2. Enable access for Terminal/iTerm/your terminal app
3. Restart your terminal

### Model download fails

Models are downloaded on first use to `~/.listen/models`. If download fails:

```bash
# Retry with debug logging
listen --model base.en --log-level debug

# Or manually trigger postinstall
npm rebuild listen-cli
```

### Virtual environment issues

If faster-whisper fails to load:

```bash
# Recreate the environment
rm -rf ~/.listen/venv
npm rebuild listen-cli
```

## API

Listen exports its CLI configuration for programmatic use:

```typescript
import { parseCliArgs, VALID_MODELS, MODEL_INFO } from 'listen-cli/cli';

// Get CLI config
const config = parseCliArgs();

// Access model information
console.log(VALID_MODELS);  // ['tiny.en', 'base.en', ...]
console.log(MODEL_INFO['base.en']);  // { size: '~140MB', speed: 'fast', ... }
```

## Development

```bash
# Install dependencies
bun install

# Set up Python environment
./setup-whisper.sh

# Run locally
bun run start

# Run with options
bun run start -- --model small.en --log-level debug

# Type check
bun run typecheck

# Run tests
bun test

# Build binary
bun run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed development guidelines.

## License

MIT
