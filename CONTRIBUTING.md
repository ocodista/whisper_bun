# Contributing to Listen

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) v1.0.0+
- [SoX](http://sox.sourceforge.net) audio recorder
- Python 3.8+ with pip

### Quick Start

```bash
# Clone the repository
git clone https://github.com/ocodista/whisper_bun.git
cd whisper_bun

# Install dependencies
bun install

# Set up Python environment (creates venv, installs faster-whisper)
./setup-whisper.sh

# Run locally
bun run start

# Run with options
bun run start -- --model small.en --log-level debug
```

### Project Structure

```
.
├── bin/
│   └── cli.ts              # CLI entry point
├── src/
│   ├── index.ts            # Main application
│   ├── cli.ts              # Argument parsing
│   ├── tui.ts              # Terminal UI (blessed)
│   ├── streaming-recorder.ts  # Audio capture (SoX)
│   ├── transcription/
│   │   ├── transcriber.ts     # Python process spawning
│   │   └── streaming-transcriber.ts  # Chunk queue management
│   └── utils/
│       ├── file-system.ts
│       └── exit-handler.ts
├── scripts/
│   └── postinstall.mjs     # npm postinstall setup
├── transcribe.py           # Faster Whisper backend
└── .github/workflows/
    ├── ci.yml              # Tests on PR
    └── release.yml         # npm publish on tag
```

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLI Entry                          │
│                    (bin/cli.ts)                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Main Process                         │
│                   (src/index.ts)                        │
├─────────────────────────────────────────────────────────┤
│  StreamingRecorder    StreamingTranscriber      TUI     │
│  (SoX subprocess)     (Python subprocess)    (blessed)  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Python Backend                         │
│                  (transcribe.py)                        │
├─────────────────────────────────────────────────────────┤
│  Faster Whisper │ CTranslate2 │ Hardware Detection      │
└─────────────────────────────────────────────────────────┘
```

## Making Changes

### Code Style

- TypeScript with strict mode
- No implicit any
- Run `bun run typecheck` before committing

### Testing

```bash
# Run tests
bun test

# Type check
bun run typecheck
```

### Commit Messages

Use conventional commits:

```
feat: add --no-copy flag to disable clipboard
fix: handle missing SoX with helpful error message
docs: add troubleshooting section to README
```

### Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run tests: `bun test && bun run typecheck`
5. Commit with a clear message
6. Push and create a PR

## Release Process

Releases are automated via GitHub Actions:

1. Update version in `package.json`
2. Create a git tag: `git tag v1.0.1`
3. Push the tag: `git push origin v1.0.1`
4. GitHub Actions will publish to npm

## Common Tasks

### Adding a CLI Flag

1. Add the flag to `src/cli.ts`:
   - Add to `CliConfig` interface
   - Add to `DEFAULT_CONFIG`
   - Add to `parseArgs` options
   - Add to help text

2. Use the flag in the appropriate module

3. Update README with the new option

### Improving Error Messages

When adding error handling, follow this pattern:

```typescript
if (error.message.includes('ENOENT')) {
  console.error(chalk.red('\n❌ Component not found'));
  console.error(chalk.dim('Description of what happened\n'));
  console.error(chalk.bold('How to fix:'));
  console.error(chalk.dim('  Step-by-step instructions'));
}
```

### Testing Hardware Detection

The Python backend auto-detects hardware:

- **NVIDIA GPU**: Requires CUDA toolkit
- **Apple Silicon**: Uses Accelerate framework
- **CPU**: Falls back to int8 quantization

Test on different hardware by running:

```bash
bun run start -- --log-level debug
```

Watch for the device info in the TUI status bar.

## Questions?

Open an issue at https://github.com/ocodista/whisper_bun/issues
