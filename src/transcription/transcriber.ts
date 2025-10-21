import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import type { ChunkInfo, TranscriptionResult } from '../types/transcription';
import { MODEL_NAME } from '../config/constants';

let deviceInfo = 'Detecting...';
let deviceInfoReceived = false;

export const getDeviceInfo = (): string => {
  return deviceInfo;
};

export const transcribeChunk = async (chunk: ChunkInfo): Promise<TranscriptionResult> => {
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
