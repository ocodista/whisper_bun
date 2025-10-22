import { $ } from 'bun';
import { join } from 'path';
import { existsSync } from 'fs';
import { INSTALL_DIR } from '../constants';
import type { ChunkInfo, TranscriptionResult } from '../types';
import type { Logger } from '../logger';

let deviceInfo = 'Detecting...';
let deviceInfoReceived = false;

export const getDeviceInfo = (): string => {
  return deviceInfo;
};

export const transcribeChunk = async (
  chunk: ChunkInfo,
  modelName: string,
  logger: Logger
): Promise<TranscriptionResult> => {
  const pythonScript = join(INSTALL_DIR, 'transcribe.py');
  const venvPython = join(INSTALL_DIR, 'venv', 'bin', 'python3');
  const pythonCmd = existsSync(venvPython) ? venvPython : 'python3';

  logger.debug(`Executing transcription: ${pythonCmd} ${pythonScript} ${chunk.path} ${modelName}`);

  const proc = await $`${pythonCmd} ${pythonScript} ${chunk.path} ${modelName}`.nothrow().quiet();

  const stdoutData = proc.stdout.toString();
  const stderrData = proc.stderr.toString();
  const code = proc.exitCode;

  if (!deviceInfoReceived && (stderrData.includes('[GPU]') || stderrData.includes('[CPU]'))) {
    if (stderrData.includes('CUDA')) {
      deviceInfo = 'GPU (CUDA)';
    } else if (stderrData.includes('Apple Silicon optimized')) {
      deviceInfo = 'macOS (Optimized)';
    } else if (stderrData.includes('[CPU]')) {
      deviceInfo = 'CPU (int8)';
    }
    deviceInfoReceived = true;
  }

  if (code !== 0) {
    try {
      const errorResult = JSON.parse(stderrData) as TranscriptionResult;
      throw new Error(errorResult.error || 'Unknown error');
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(stderrData || `Process exited with code ${code}`);
      }
      throw error;
    }
  }

  try {
    const result = JSON.parse(stdoutData) as TranscriptionResult;

    if (result.success) {
      return result;
    }
    throw new Error(result.error || 'Unknown error');
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON response: ${stdoutData}`);
    }
    throw error;
  }
};
