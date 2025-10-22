# Listen

[![CI](https://github.com/ocodista/whisper_bun/actions/workflows/ci.yml/badge.svg)](https://github.com/ocodista/whisper_bun/actions/workflows/ci.yml)

Speak. See text appear. Copy automatically.

## Install

### macOS

Prerequisites: [Bun](https://bun.sh), [SoX](http://sox.sourceforge.net), Python 3.8+

```bash
# Install SoX
brew install sox

# Install Listen
git clone https://github.com/ocodista/whisper_bun.git
cd whisper_bun
bun install
./install.sh
```

### Linux

Prerequisites: [Bun](https://bun.sh), [SoX](http://sox.sourceforge.net), Python 3.8+

```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y sox libsox-fmt-all

# Fedora/RHEL
sudo dnf install sox

# Arch
sudo pacman -S sox

# Install Listen
git clone https://github.com/ocodista/whisper_bun.git
cd whisper_bun
bun install
./install.sh
```

### Windows

Prerequisites: [Bun](https://bun.sh), [SoX](http://sox.sourceforge.net), Python 3.8+

```powershell
# Install SoX using Chocolatey
choco install sox.portable

# Or download from http://sox.sourceforge.net and add to PATH

# Install Listen
git clone https://github.com/ocodista/whisper_bun.git
cd whisper_bun
bun install
bash install.sh  # Run in Git Bash or WSL
```

---

Now run `listen` from anywhere.

Uninstall: `./uninstall.sh`

## Usage

```bash
listen                              # Record from microphone
listen audio.mp3                    # Transcribe audio file
listen --model small.en             # Use different model
listen --output notes.txt           # Save to custom file
listen interview.wav --model large-v3  # Transcribe file with specific model
listen --help                       # See all options
```

Output saves to `result.txt` and copies to clipboard.

## How It Works

Records 3-second audio chunks. Transcribes with Faster Whisper while recording the next chunk. Runs 4-5x faster than original Whisper.

**Hardware Detection:**
- NVIDIA GPU: CUDA with float16
- Apple Silicon: Accelerate framework with float32
- Standard CPU: int8 quantization

## Options

```
-m, --model <name>      Model: tiny.en, base.en, small.en, medium.en, large
-c, --chunk <seconds>   Chunk duration (default: 3)
-o, --output <path>     Output file (default: result.txt)
-t, --temp <path>       Temp directory (default: ./temp)
-l, --log-level <level> Log level: error, warn, info, debug
```

## Development

Run locally without installing:

```bash
bun install
./setup-whisper.sh
bun run start
```

## License

MIT
