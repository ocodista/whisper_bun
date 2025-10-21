import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { mkdirSync, existsSync, unlinkSync } from 'fs';
import chalk from 'chalk';

const SAMPLE_RATE = 16000;
const TEMP_DIR = join(process.cwd(), 'temp');
const MODEL_NAME = 'base.en';
const CHUNK_DURATION = 3; // seconds per chunk

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

interface TranscriptionResult {
  success: boolean;
  text?: string;
  segments?: TranscriptSegment[];
  language?: string;
  language_probability?: number;
  error?: string;
}

interface ChunkInfo {
  path: string;
  chunkNumber: number;
  timestamp: number;
}

const ensureTempDir = (): void => {
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true });
  }
};

class StreamingRecorder {
  private soxProcess: ChildProcess | null = null;
  private currentChunkNumber = 0;
  private isRecording = false;
  private currentChunkPath: string | null = null;
  private chunkStartTime = 0;
  private onChunkReady: (chunk: ChunkInfo) => void;
  private sessionStartTime = Date.now();

  constructor(onChunkReady: (chunk: ChunkInfo) => void) {
    this.onChunkReady = onChunkReady;
  }

  getElapsedTime(): string {
    const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  start(): void {
    if (this.isRecording) {
      return;
    }

    this.isRecording = true;
    this.sessionStartTime = Date.now();
    this.recordNextChunk();
  }

  private recordNextChunk(): void {
    if (!this.isRecording) {
      return;
    }

    this.currentChunkNumber++;
    this.currentChunkPath = join(TEMP_DIR, `chunk-${Date.now()}-${this.currentChunkNumber}.wav`);
    this.chunkStartTime = Date.now();

    this.soxProcess = spawn('sox', [
      '-d',
      '-t', 'wav',
      '-r', SAMPLE_RATE.toString(),
      '-c', '1',
      '-b', '16',
      this.currentChunkPath,
      'trim', '0', CHUNK_DURATION.toString()
    ]);

    let stderrBuffer = '';

    this.soxProcess.stderr?.on('data', (data) => {
      // Silently consume stderr output from sox
      stderrBuffer += data.toString();
    });

    this.soxProcess.on('close', (code) => {
      if (code === 0 && this.currentChunkPath && this.isRecording) {
        const chunkInfo: ChunkInfo = {
          path: this.currentChunkPath,
          chunkNumber: this.currentChunkNumber,
          timestamp: this.chunkStartTime
        };

        this.onChunkReady(chunkInfo);

        // Record next chunk immediately
        setImmediate(() => this.recordNextChunk());
      }
    });

    this.soxProcess.on('error', (error) => {
      console.error(chalk.red('\n❌ Recording error:'), error.message);
      this.stop();
    });
  }

  stop(): void {
    this.isRecording = false;

    if (this.soxProcess && !this.soxProcess.killed) {
      this.soxProcess.kill('SIGTERM');
    }
  }
}

class StreamingTranscriber {
  private queue: ChunkInfo[] = [];
  private isProcessing = false;
  private recorder: StreamingRecorder;

  constructor(recorder: StreamingRecorder) {
    this.recorder = recorder;
  }

  async addChunk(chunk: ChunkInfo): Promise<void> {
    this.queue.push(chunk);
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const chunk = this.queue.shift();

    if (!chunk) {
      this.isProcessing = false;
      return;
    }

    try {
      const result = await this.transcribeChunk(chunk);

      if (result.text && result.text.trim()) {
        console.log(result.text);
      }

      // Clean up the audio file
      try {
        unlinkSync(chunk.path);
      } catch {
        // Ignore cleanup errors
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`\n❌ Transcription failed:`), error.message);
      }
    }

    // Process next chunk
    await this.processQueue();
  }

  private async transcribeChunk(chunk: ChunkInfo): Promise<TranscriptionResult> {
    return new Promise((resolve, reject) => {
      const pythonScript = join(process.cwd(), 'transcribe.py');
      const venvPython = join(process.cwd(), 'venv', 'bin', 'python3');
      const pythonCmd = existsSync(venvPython) ? venvPython : 'python3';

      const transcribe = spawn(pythonCmd, [pythonScript, chunk.path, MODEL_NAME]);

      let stdoutData = '';
      let stderrData = '';

      transcribe.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      transcribe.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      transcribe.on('close', (code) => {
        if (code !== 0) {
          try {
            const errorResult = JSON.parse(stderrData) as TranscriptionResult;
            reject(new Error(errorResult.error || 'Unknown error'));
          } catch {
            reject(new Error(stderrData || `Process exited with code ${code}`));
          }
          return;
        }

        try {
          const result = JSON.parse(stdoutData) as TranscriptionResult;

          if (result.success) {
            resolve(result);
          } else {
            reject(new Error(result.error || 'Unknown error'));
          }
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${stdoutData}`));
        }
      });

      transcribe.on('error', (error) => {
        reject(error);
      });
    });
  }
}

const main = async (): Promise<void> => {
  console.clear();
  console.log(chalk.cyan.bold('╔═══════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║   Streaming Whisper Transcription    ║'));
  console.log(chalk.cyan.bold('╚═══════════════════════════════════════╝'));
  console.log();
  console.log(chalk.gray(`Recording in ${CHUNK_DURATION}s chunks`));
  console.log(chalk.gray(`Press ${chalk.yellow('CTRL+C')} to stop`));
  console.log();

  ensureTempDir();

  const recorder = new StreamingRecorder((chunk) => {
    transcriber.addChunk(chunk);
  });

  const transcriber = new StreamingTranscriber(recorder);

  // Handle CTRL+C gracefully
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n🛑 Stopping recording...'));
    recorder.stop();

    setTimeout(() => {
      console.log(chalk.green('\n✅ Recording stopped. Goodbye!\n'));
      process.exit(0);
    }, 1000);
  });

  recorder.start();
};

main().catch((error) => {
  console.error(chalk.red.bold('\n❌ Fatal error:'), error.message);
  process.exit(1);
});
