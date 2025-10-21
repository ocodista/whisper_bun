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

The program records audio, transcribes it, and displays the text. Each chunk takes 3 seconds to record. While transcribing, you'll see `[[ PAUSE 🤚 ]]`.

Output appears as plain text with line breaks between chunks—easy to select and copy.

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

## License

MIT
