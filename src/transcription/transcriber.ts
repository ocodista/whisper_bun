import { spawn } from 'child_process';
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
  return new Promise((resolve, reject) => {
    const pythonScript = join(INSTALL_DIR, 'transcribe.py');
    const venvPython = join(INSTALL_DIR, 'venv', 'bin', 'python3');
    const pythonCmd = existsSync(venvPython) ? venvPython : 'python3';

    logger.debug(`Executing transcription: ${pythonCmd} ${pythonScript} ${chunk.path} ${modelName}`);

    const transcribe = spawn(pythonCmd, [pythonScript, chunk.path, modelName]);

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
