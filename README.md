# Whisper Bun

Transcribe speech to text in real-time. Speak, see text appear instantly, copy it automatically.

## Features

Real-time transcription with live performance metrics. Text saves to `result.txt` and copies to your clipboard. Works on macOS, Linux, and Windows.

Optimized for Apple Silicon, CUDA GPUs, and standard CPUs.

## Quick Start

```bash
brew install sox
bun install
./setup-whisper.sh
bun run start
```

Press `Ctrl+C` to stop. Find your transcription in `result.txt` or paste from clipboard.

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

Edit `index.ts` constants:

- `CHUNK_DURATION`: Recording length in seconds (default: 3)
- `MODEL_NAME`: Whisper model size (default: 'base.en')

Available models: `tiny.en`, `base.en`, `small.en`, `medium.en`, `large`

Smaller models process faster. Larger models transcribe more accurately.

## Requirements

- Bun runtime
- SoX audio tool
- Python 3.8+
- macOS or Linux

## License

MIT
