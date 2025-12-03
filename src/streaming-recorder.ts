import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import chalk from 'chalk';
import type { ChunkInfo } from './types';
import type { Logger } from './logger';

export const createStreamingRecorder = (
  onChunkReady: (chunk: ChunkInfo) => void,
  sampleRate: number,
  tempDir: string,
  chunkDuration: number,
  logger: Logger
) => {
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
    currentChunkPath = join(tempDir, `chunk-${Date.now()}-${currentChunkNumber}.wav`);
    chunkStartTime = Date.now();

    logger.debug(`Recording chunk ${currentChunkNumber} to ${currentChunkPath}`);

    soxProcess = spawn('sox', [
      '-d',
      '-t', 'wav',
      '-r', sampleRate.toString(),
      '-c', '1',
      '-b', '16',
      currentChunkPath,
      'trim', '0', chunkDuration.toString()
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
      logger.error({ err: error }, 'Recording error');

      if (error.message.includes('ENOENT') || error.message.includes('spawn sox')) {
        console.error(chalk.red('\n❌ SoX not found'));
        console.error(chalk.dim('SoX is required for audio recording.\n'));
        console.error(chalk.bold('Install SoX:'));
        console.error(chalk.dim('  macOS:   brew install sox'));
        console.error(chalk.dim('  Ubuntu:  sudo apt install sox libsox-fmt-all'));
        console.error(chalk.dim('  Fedora:  sudo dnf install sox\n'));
      } else if (error.message.includes('permission') || error.message.includes('EACCES')) {
        console.error(chalk.red('\n❌ Microphone access denied'));
        console.error(chalk.dim('Grant microphone permission to your terminal app.\n'));
        console.error(chalk.bold('macOS:'));
        console.error(chalk.dim('  System Preferences > Security & Privacy > Privacy > Microphone'));
        console.error(chalk.dim('  Enable access for Terminal/iTerm/your terminal app\n'));
      } else {
        console.error(chalk.red('\n❌ Recording error:'), error.message);
        console.error(chalk.dim('\nTry: listen --log-level debug for more info\n'));
      }

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
