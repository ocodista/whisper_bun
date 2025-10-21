# Listen

[![CI](https://github.com/ocodista/whisper_bun/actions/workflows/ci.yml/badge.svg)](https://github.com/ocodista/whisper_bun/actions/workflows/ci.yml)

Transcribe speech to text in real-time. Speak, see text appear instantly, copy it automatically.

## Prerequisites

- **Bun runtime** ([install](https://bun.sh))
- **SoX** audio tool
  - macOS: `brew install sox`
  - Linux: `sudo apt-get install sox libsox-fmt-all`
  - Windows: [Download](https://sourceforge.net/projects/sox/)
- **Python 3.8+** (usually pre-installed)

## Installation

### Quick Install (Compiled Binary)

The easiest way to install Listen is using the compiled binary:

```bash
git clone https://github.com/ocodista/whisper_bun.git
cd whisper_bun
bun install
./install.sh
```

This will:
- Set up Python dependencies in `~/.listen/`
- Download the Whisper model
- Compile a standalone binary
- Install `listen` to `/usr/local/bin`

Now run `listen` from anywhere, no Bun runtime required!

### Uninstall

```bash
./uninstall.sh
```

Or manually:
```bash
sudo rm /usr/local/bin/listen
rm -rf ~/.listen
```

### Alternative: Development Mode

For local development without global installation:

```bash
git clone https://github.com/ocodista/whisper_bun.git
cd whisper_bun
bun install
./setup-whisper.sh
bun run start
```

## Features

Real-time transcription with live performance metrics. Text saves to `result.txt` and copies to your clipboard. Works on macOS, Linux, and Windows.

Optimized for Apple Silicon, CUDA GPUs, and standard CPUs.

## How It Works

Records audio in 3-second chunks. Transcribes with Faster Whisper while recording the next chunk. Displays text and metrics in a terminal interface.

Live stats show recording time, device type, and transcription speed in tokens per second.

## Performance

Powered by [Faster Whisper](https://github.com/SYSTRAN/faster-whisper) - runs 4-5x faster than original Whisper. Uses CTranslate2 for optimized inference with lower memory usage.

Detects your hardware automatically:

**NVIDIA GPU**
Uses CUDA with float16 precision.

**Apple Silicon (M1/M2/M3)**
Leverages Accelerate framework with float32. Exploits Apple Neural Engine and AMX coprocessor. Float32 outperforms int8 quantization on Apple Silicon while maintaining accuracy. Trade-off: higher memory usage for better performance and quality.

Multi-core optimization uses `cpu_threads=0` to utilize all performance cores. Apple's GCD distributes workload efficiently for real-time streaming.

**Standard CPU**
Uses int8 quantization for efficient processing.

Verification: Check `transcribe.py` lines 46-56 for platform detection logic.

## Configuration

Use command-line arguments:

```bash
# Use different model
listen --model small.en

# Change chunk duration
listen --chunk 5

# Custom output file
listen --output transcript.txt

# Multiple options
listen --model large-v3 --chunk 4 --output notes.txt
```

Available options:
- `-m, --model` - Model name (tiny.en, base.en, small.en, medium.en, large)
- `-c, --chunk` - Chunk duration in seconds
- `-r, --rate` - Sample rate in Hz
- `-o, --output` - Output file path
- `-t, --temp` - Temp directory
- `-l, --log-level` - Log level (error, warn, info, debug)

## Requirements

- Bun runtime
- SoX audio tool
- Python 3.8+
- macOS or Linux

## License

MIT
