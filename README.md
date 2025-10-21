# Whisper Bun

Stream your microphone to text in real-time.

## What It Does

Records your voice in 3-second chunks and transcribes it continuously using Faster Whisper. Press CTRL+C to stop.

## Setup

**Install dependencies:**
```bash
brew install sox
bun install
./setup-whisper.sh
```

**Run:**
```bash
bun run start
```

## How It Works

The program records audio, transcribes it, and displays the text. Each chunk takes 3 seconds to record. Transcription happens in the background while the next chunk records.

Output appears as continuous plain text—easy to select and copy.

## Configuration

Edit `index.ts` to change settings:

- `CHUNK_DURATION`: Recording length in seconds (default: 3)
- `MODEL_NAME`: Whisper model size (default: 'base.en')

Available models: `tiny.en`, `base.en`, `small.en`, `medium.en`, `large`

Smaller models are faster. Larger models are more accurate.

## Requirements

- [Bun](https://bun.sh)
- [SoX](http://sox.sourceforge.net)
- Python 3.8+
- macOS or Linux

## How Faster Whisper Helps

Faster Whisper runs 4-5x faster than the original Whisper. It uses CTranslate2 for optimized inference and consumes less memory.

The program automatically detects your hardware:
- **NVIDIA GPU**: Uses CUDA with float16
- **macOS (Apple Silicon)**: Uses optimized CPU with float32 and Accelerate framework
- **Other**: Standard CPU with int8

### macOS Optimizations Explained

On Apple Silicon (M1/M2/M3), the application is specifically optimized for maximum performance:

**Why float32 instead of int8?**
- Apple's Accelerate framework provides hardware-accelerated BLAS operations
- Float32 leverages the Apple Neural Engine and AMX (Apple Matrix coprocessor)
- Significantly faster than quantized int8 on Apple Silicon while maintaining accuracy
- Trade-off: Higher memory usage for better performance and quality

**Multi-core optimization:**
- Uses `cpu_threads=0` to automatically utilize all available performance cores
- Apple's GCD (Grand Central Dispatch) efficiently distributes workload
- Optimal for real-time streaming transcription

**Proof:**
Check `transcribe.py` lines 46-56 to see the platform detection and optimization logic. The stderr output will show `[CPU] Running on macOS (Apple Silicon optimized) with float32` when running on Apple Silicon.

## Features

- **Real-time TUI**: Live statistics showing recording time, device type, and transcription speed
- **Auto-save**: Transcription automatically saved to `result.txt` on exit
- **Clipboard integration**: Text copied to clipboard automatically (macOS)
- **Performance metrics**: Live tokens/second display
- **Voice activity detection**: Filters silence for cleaner transcripts

## License

MIT
