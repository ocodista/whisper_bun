import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { mkdirSync, existsSync, unlinkSync, writeFileSync } from 'fs';
import chalk from 'chalk';
import blessed from 'blessed';
import pino from 'pino';

const SAMPLE_RATE = 16000;
const TEMP_DIR = join(process.cwd(), 'temp');
const MODEL_NAME = 'base.en';
const CHUNK_DURATION = 3;

const logger = pino({
  level: 'error',
  base: undefined
});

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

  const transcriptionBuffer: string[] = [];

  const statsBox = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: 2,
    content: '',
    tags: true,
    style: {
      fg: 'white'
    }
  });

  const separatorBox = blessed.box({
    top: 2,
    left: 0,
    width: '100%',
    height: 1,
    content: chalk.gray('─'.repeat(80)),
    tags: true
  });

  const transcriptionBox = blessed.log({
    top: 3,
    left: 0,
    width: '100%',
    height: '100%-3',
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

  screen.append(statsBox);
  screen.append(separatorBox);
  screen.append(transcriptionBox);

  const updateStats = (stats: {
    status: string;
    time: string;
    device: string;
    tokensPerSecond: string;
  }) => {
    const statusColor = stats.status.includes('Recording') ? 'green' : 'yellow';
    const deviceColor = stats.device.includes('GPU') ? 'green' : 'cyan';

    statsBox.setContent(
      `{${statusColor}-fg}Status:{/} ${stats.status}  {yellow-fg}Time:{/} ${stats.time}  {${deviceColor}-fg}Device:{/} ${stats.device}  {blue-fg}Tokens/s:{/} ${stats.tokensPerSecond}`
    );
    screen.render();
  };

  const addTranscription = (text: string) => {
    if (!text || !text.trim()) {
      return;
    }

    const cleanText = text.trim();
    transcriptionBuffer.push(cleanText);
    transcriptionBox.log(cleanText);
    screen.render();
  };

  const render = () => {
    screen.render();
  };

  const destroy = () => {
    screen.destroy();
  };

  const getAllTranscriptions = (): string => {
    return transcriptionBuffer.join(' ');
  };

  const getWordCount = (): number => {
    const fullText = transcriptionBuffer.join(' ');
    return fullText ? fullText.split(/\s+/).filter(word => word.length > 0).length : 0;
  };

  return { updateStats, addTranscription, render, destroy, screen, getAllTranscriptions, getWordCount };
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

  const getElapsedSeconds = (): number => {
    return Math.floor((Date.now() - sessionStartTime) / 1000);
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

  return { start, stop, getElapsedTime, getElapsedSeconds, getChunkCount };
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

const handleExit = (
  updateInterval: NodeJS.Timeout,
  recorder: ReturnType<typeof createStreamingRecorder>,
  transcriber: ReturnType<typeof createStreamingTranscriber>,
  tui: ReturnType<typeof createTUI>
) => {
  clearInterval(updateInterval);
  recorder.stop();

  const elapsedSeconds = recorder.getElapsedSeconds();
  const finalStats = {
    time: recorder.getElapsedTime(),
    elapsedSeconds,
    device: deviceInfo,
    chunks: recorder.getChunkCount(),
    queue: transcriber.getQueueSize()
  };

  setTimeout(() => {
    tui.destroy();

    const fullTranscription = tui.getAllTranscriptions();
    const wordCount = fullTranscription ? fullTranscription.split(/\s+/).filter(word => word.length > 0).length : 0;
    const wordsPerSecond = elapsedSeconds > 0 ? (wordCount / elapsedSeconds).toFixed(2) : '0.00';

    if (fullTranscription) {
      const resultPath = join(process.cwd(), 'result.txt');
      writeFileSync(resultPath, fullTranscription, 'utf-8');

      const pbcopy = spawn('pbcopy');
      pbcopy.stdin.write(fullTranscription);
      pbcopy.stdin.end();
    }

    console.log(chalk.yellow('\n🛑 Recording stopped'));
    console.log(chalk.gray('─'.repeat(40)));

    if (fullTranscription) {
      console.log(chalk.cyan('Transcription:'));
      console.log(fullTranscription);
      console.log(chalk.gray('─'.repeat(40)));
    }

    console.log(chalk.cyan('Summary:'));
    console.log(chalk.gray(`  Recorded time: ${finalStats.time}`));
    console.log(chalk.gray(`  Words: ${wordCount}`));
    console.log(chalk.gray(`  Words/s: ${wordsPerSecond}`));
    console.log();
    console.log(chalk.cyan('Details:'));
    console.log(chalk.gray(`  Device: ${finalStats.device}`));
    console.log(chalk.gray(`  Chunks processed: ${finalStats.chunks}`));
    console.log(chalk.gray(`  Queue remaining: ${finalStats.queue}`));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.green('✅ Goodbye!\n'));
    process.exit(0);
  }, 500);
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
    const elapsedSeconds = recorder.getElapsedSeconds();
    const wordCount = tui.getWordCount();
    const tokensPerSecond = elapsedSeconds > 0 ? (wordCount / elapsedSeconds).toFixed(2) : '0.00';

    tui.updateStats({
      status: 'Recording',
      time: recorder.getElapsedTime(),
      device: deviceInfo,
      tokensPerSecond
    });
  }, 100);

  const exitHandler = () => handleExit(updateInterval, recorder, transcriber, tui);

  tui.screen.key(['C-c'], exitHandler);
  process.on('SIGINT', exitHandler);

  recorder.start();
  tui.render();
};

main().catch((error) => {
  console.error(chalk.red.bold('\n❌ Fatal error:'), error.message);
  process.exit(1);
});
