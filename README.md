# Listen

[![CI](https://github.com/ocodista/whisper_bun/actions/workflows/ci.yml/badge.svg)](https://github.com/ocodista/whisper_bun/actions/workflows/ci.yml)

Transcribe speech to text in real-time. Speak, see text appear instantly, copy it automatically.

## Installation

### Global Installation (Recommended)

Install globally to use `listen` from anywhere, just like `npm install -g`:

```bash
# Clone and setup
git clone https://github.com/ocodista/whisper_bun.git
cd whisper_bun
bun install
./setup-whisper.sh

# Install globally
bun link
```

Now run `listen` from any directory.

**Note for asdf users:** If you manage Bun with asdf, ensure your directories have a `.tool-versions` file with `bun 1.3.0` to avoid version errors when running `listen` globally.

### Alternative: Direct Install from GitHub

Once you've set up the project locally, you can also install it globally using:

```bash
bun add -g .
```

Or directly from GitHub (after pushing this branch):

```bash
bun add -g github:ocodista/whisper_bun#feature/listen-cli
```

### Uninstall

```bash
bun unlink listen
# or
bun remove -g listen
```

## Features

Real-time transcription with live performance metrics. Text saves to `result.txt` and copies to your clipboard. Works on macOS, Linux, and Windows.

Optimized for Apple Silicon, CUDA GPUs, and standard CPUs.

## Quick Start (Development)

For local development without global installation:

<details>
<summary><strong>macOS</strong></summary>

### Prerequisites

1. **Install Bun** ([https://bun.sh](https://bun.sh))
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Install SoX** ([http://sox.sourceforge.net](http://sox.sourceforge.net))
   ```bash
   brew install sox
   ```

3. **Install Python 3.8+** (usually pre-installed on macOS)
   ```bash
   python3 --version
   ```
   If not installed: `brew install python3`

### Setup and Run

```bash
bun install
./setup-whisper.sh
bun run start
```

Press `Ctrl+C` to stop. Find your transcription in `result.txt` or paste from clipboard.

</details>

<details>
<summary><strong>Linux</strong></summary>

### Prerequisites

1. **Install Bun** ([https://bun.sh](https://bun.sh))
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Install SoX**

   **Ubuntu/Debian:**
   ```bash
   sudo apt-get update
   sudo apt-get install sox libsox-fmt-all
   ```

   **Fedora/RHEL:**
   ```bash
   sudo dnf install sox
   ```

   **Arch:**
   ```bash
   sudo pacman -S sox
   ```

3. **Install Python 3.8+**

   **Ubuntu/Debian:**
   ```bash
   sudo apt-get install python3 python3-pip python3-venv
   ```

   **Fedora/RHEL:**
   ```bash
   sudo dnf install python3 python3-pip
   ```

   **Arch:**
   ```bash
   sudo pacman -S python python-pip
   ```

### Setup and Run

```bash
bun install
./setup-whisper.sh
bun run start
```

Press `Ctrl+C` to stop. Find your transcription in `result.txt` or paste from clipboard.

</details>

<details>
<summary><strong>Windows</strong></summary>

### Prerequisites

1. **Install Bun** ([https://bun.sh](https://bun.sh))
   ```powershell
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```

2. **Install SoX** ([http://sox.sourceforge.net](http://sox.sourceforge.net))
   - Download from [SourceForge](https://sourceforge.net/projects/sox/files/sox/)
   - Or use Chocolatey:
     ```powershell
     choco install sox.portable
     ```
   - Or use Scoop:
     ```powershell
     scoop install sox
     ```

3. **Install Python 3.8+** ([https://www.python.org/downloads](https://www.python.org/downloads))
   - Download and install from official website
   - Make sure to check "Add Python to PATH" during installation

### Setup and Run

```bash
bun install
bash setup-whisper.sh
bun run start
```

Press `Ctrl+C` to stop. Find your transcription in `result.txt` or paste from clipboard.

**Note:** On Windows, you may need to run commands in Git Bash or WSL for the setup script to work properly.

</details>

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
