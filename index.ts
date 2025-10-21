import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { mkdirSync, existsSync, unlinkSync } from 'fs';
import chalk from 'chalk';
import blessed from 'blessed';

const SAMPLE_RATE = 16000;
const TEMP_DIR = join(process.cwd(), 'temp');
const MODEL_NAME = 'base.en';
const CHUNK_DURATION = 3;

let deviceInfo = 'Detecting...';
let deviceInfoReceived = false;

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

const createTUI = () => {
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Whisper Transcription'
  });

  const headerBox = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    content: chalk.cyan.bold('╔═══════════════════════════════════════╗\n║   Streaming Whisper Transcription    ║\n╚═══════════════════════════════════════╝'),
    tags: true,
    style: {
      fg: 'cyan'
    }
  });

  const statsBox = blessed.box({
    top: 3,
    left: 0,
    width: '100%',
    height: 3,
    content: '',
    tags: true,
    style: {
      fg: 'white'
    }
  });

  const separatorBox = blessed.box({
    top: 6,
    left: 0,
    width: '100%',
    height: 1,
    content: chalk.gray('─'.repeat(80)),
    tags: true
  });

  const transcriptionBox = blessed.log({
    top: 7,
    left: 0,
    width: '100%',
    height: '100%-7',
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      style: {
        bg: 'gray'
      }
    },
    keys: true,
    vi: true,
    mouse: true,
    tags: true,
    style: {
      fg: 'white'
    }
  });

  screen.append(headerBox);
  screen.append(statsBox);
  screen.append(separatorBox);
  screen.append(transcriptionBox);

  screen.key(['C-c'], () => {
    process.exit(0);
  });

  const updateStats = (stats: {
    status: string;
    time: string;
    device: string;
    chunks: number;
    queue: number;
  }) => {
    const statusColor = stats.status.includes('Recording') ? 'green' : 'yellow';
    const deviceColor = stats.device.includes('GPU') ? 'green' : 'cyan';

    statsBox.setContent(
      `{${statusColor}-fg}Status:{/} ${stats.status}  ` +
      `{yellow-fg}Time:{/} ${stats.time}  ` +
      `{${deviceColor}-fg}Device:{/} ${stats.device}  ` +
      `{blue-fg}Chunks:{/} ${stats.chunks}  ` +
      `{magenta-fg}Queue:{/} ${stats.queue}`
    );
    screen.render();
  };

  const addTranscription = (text: string) => {
    if (text && text.trim()) {
      transcriptionBox.log(text.trim());
      screen.render();
    }
  };

  const render = () => {
    screen.render();
  };

  const destroy = () => {
    screen.destroy();
  };

  return { updateStats, addTranscription, render, destroy, screen };
};

const createStreamingRecorder = (onChunkReady: (chunk: ChunkInfo) => void) => {
  let soxProcess: ChildProcess | null = null;
  let currentChunkNumber = 0;
  let isRecording = false;
  let currentChunkPath: string | null = null;
  let chunkStartTime = 0;
  const sessionStartTime = Date.now();

  const getElapsedTime = (): string => {
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getChunkCount = (): number => {
    return currentChunkNumber;
  };

  const recordNextChunk = (): void => {
    if (!isRecording) {
      return;
    }

    currentChunkNumber++;
    currentChunkPath = join(TEMP_DIR, `chunk-${Date.now()}-${currentChunkNumber}.wav`);
    chunkStartTime = Date.now();

    soxProcess = spawn('sox', [
      '-d',
      '-t', 'wav',
      '-r', SAMPLE_RATE.toString(),
      '-c', '1',
      '-b', '16',
      currentChunkPath,
      'trim', '0', CHUNK_DURATION.toString()
    ]);

    let stderrBuffer = '';

    soxProcess.stderr?.on('data', (data) => {
      stderrBuffer += data.toString();
    });

    soxProcess.on('close', (code) => {
      if (code === 0 && currentChunkPath && isRecording) {
        const chunkInfo: ChunkInfo = {
          path: currentChunkPath,
          chunkNumber: currentChunkNumber,
          timestamp: chunkStartTime
        };

        onChunkReady(chunkInfo);
        setImmediate(() => recordNextChunk());
      }
    });

    soxProcess.on('error', (error) => {
      console.error(chalk.red('\n❌ Recording error:'), error.message);
      stop();
    });
  };

  const start = (): void => {
    if (isRecording) {
      return;
    }

    isRecording = true;
    recordNextChunk();
  };

  const stop = (): void => {
    isRecording = false;

    if (soxProcess && !soxProcess.killed) {
      soxProcess.kill('SIGTERM');
    }
  };

  return { start, stop, getElapsedTime, getChunkCount };
};

const transcribeChunk = async (chunk: ChunkInfo): Promise<TranscriptionResult> => {
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
      const message = data.toString();
      stderrData += message;

      if (!deviceInfoReceived && (message.includes('[GPU]') || message.includes('[CPU]'))) {
        if (message.includes('CUDA')) {
          deviceInfo = 'GPU (CUDA)';
        } else if (message.includes('Apple Silicon optimized')) {
          deviceInfo = 'macOS (Optimized)';
        } else if (message.includes('[CPU]')) {
          deviceInfo = 'CPU (int8)';
        }
        deviceInfoReceived = true;
      }
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
};

const createStreamingTranscriber = (onTranscription: (text: string) => void) => {
  const queue: ChunkInfo[] = [];
  let isProcessing = false;

  const processQueue = async (): Promise<void> => {
    if (queue.length === 0) {
      isProcessing = false;
      return;
    }

    isProcessing = true;
    const chunk = queue.shift();

    if (!chunk) {
      isProcessing = false;
      return;
    }

    try {
      const result = await transcribeChunk(chunk);

      if (result.text && result.text.trim()) {
        onTranscription(result.text);
      }

      try {
        unlinkSync(chunk.path);
      } catch {
        // Ignore cleanup errors
      }
    } catch (error) {
      if (error instanceof Error) {
        onTranscription(chalk.red(`❌ Error: ${error.message}`));
      }
    }

    await processQueue();
  };

  const addChunk = async (chunk: ChunkInfo): Promise<void> => {
    queue.push(chunk);
    if (!isProcessing) {
      await processQueue();
    }
  };

  const getQueueSize = (): number => {
    return queue.length;
  };

  return { addChunk, getQueueSize };
};

const main = async (): Promise<void> => {
  ensureTempDir();

  const tui = createTUI();

  const transcriber = createStreamingTranscriber((text) => {
    tui.addTranscription(text);
  });

  const recorder = createStreamingRecorder((chunk) => {
    transcriber.addChunk(chunk);
  });

  const updateInterval = setInterval(() => {
    tui.updateStats({
      status: 'Recording',
      time: recorder.getElapsedTime(),
      device: deviceInfo,
      chunks: recorder.getChunkCount(),
      queue: transcriber.getQueueSize()
    });
  }, 100);

  process.on('SIGINT', () => {
    clearInterval(updateInterval);
    recorder.stop();

    const finalStats = {
      time: recorder.getElapsedTime(),
      device: deviceInfo,
      chunks: recorder.getChunkCount(),
      queue: transcriber.getQueueSize()
    };

    setTimeout(() => {
      tui.destroy();
      console.log(chalk.yellow('\n🛑 Recording stopped'));
      console.log(chalk.gray('─'.repeat(40)));
      console.log(chalk.cyan('Final Statistics:'));
      console.log(chalk.gray(`  Time: ${finalStats.time}`));
      console.log(chalk.gray(`  Device: ${finalStats.device}`));
      console.log(chalk.gray(`  Chunks processed: ${finalStats.chunks}`));
      console.log(chalk.gray(`  Queue remaining: ${finalStats.queue}`));
      console.log(chalk.gray('─'.repeat(40)));
      console.log(chalk.green('✅ Goodbye!\n'));
      process.exit(0);
    }, 500);
  });

  recorder.start();
  tui.render();
};

main().catch((error) => {
  console.error(chalk.red.bold('\n❌ Fatal error:'), error.message);
  process.exit(1);
});
