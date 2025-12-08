# Listen

[![CI](https://github.com/ocodista/whisper_bun/actions/workflows/ci.yml/badge.svg)](https://github.com/ocodista/whisper_bun/actions/workflows/ci.yml)

Speak. See text appear. Copy automatically.

## Install

Prerequisites: [Bun](https://bun.sh), [SoX](http://sox.sourceforge.net), Python 3.8+

```bash
git clone https://github.com/ocodista/whisper_bun.git && cd whisper_bun
bun install && ./install.sh
```

Run `listen` from anywhere. Uninstall with `./uninstall.sh`.

## Usage

```bash
listen                      # Start transcribing
listen --model small.en     # Use different model
listen --output notes.txt   # Save to custom file
listen --help               # See all options
```

Output saves to `result.txt` and copies to clipboard.

## How It Works

Records 3-second chunks while transcribing the previous one using Faster Whisper (4-5x faster than original). Auto-detects hardware: CUDA for NVIDIA GPUs, Accelerate for Apple Silicon, int8 for CPU.

## Options

```
-m, --model <name>      Model: tiny.en, base.en, small.en, medium.en, large
-c, --chunk <seconds>   Chunk duration (default: 3)
-o, --output <path>     Output file (default: result.txt)
-t, --temp <path>       Temp directory (default: ./temp)
-l, --log-level <level> Log level: error, warn, info, debug
```

## Development

```bash
bun install && ./setup-whisper.sh && bun run start
```

## License

MIT
