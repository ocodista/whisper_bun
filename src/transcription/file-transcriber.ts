import { join, resolve, relative } from 'path';
import { existsSync } from 'fs';
import { INSTALL_DIR } from '../constants';
import type { TranscriptionResult } from '../types';
import type { Logger } from '../logger';

const getPythonPath = (): string => {
  const isWindows = process.platform === 'win32';
  const venvPath = isWindows
    ? join(INSTALL_DIR, 'venv', 'Scripts', 'python.exe')
    : join(INSTALL_DIR, 'venv', 'bin', 'python3');

  return existsSync(venvPath) ? venvPath : (isWindows ? 'python' : 'python3');
};

const validateFilePath = (filePath: string): void => {
  const resolvedPath = resolve(filePath);
  const relativePath = relative(process.cwd(), resolvedPath);

  if (relativePath.startsWith('..')) {
    throw new Error(`Invalid file path: access denied to "${filePath}"`);
  }

  if (!existsSync(resolvedPath)) {
    throw new Error(`File not found: "${filePath}"`);
  }
};

const isTranscriptionResult = (value: unknown): value is TranscriptionResult => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const result = value as Record<string, unknown>;
  return (
    typeof result.success === 'boolean' &&
    (result.text === undefined || typeof result.text === 'string') &&
    (result.error === undefined || typeof result.error === 'string')
  );
};

export const transcribeFile = async (
  filePath: string,
  modelName: string,
  logger: Logger
): Promise<TranscriptionResult> => {
  validateFilePath(filePath);

  const pythonScript = join(INSTALL_DIR, 'transcribe.py');
  const pythonCmd = getPythonPath();

  logger.debug(`Transcribing file: ${pythonCmd} ${pythonScript} ${filePath} ${modelName}`);

  const proc = Bun.spawn([pythonCmd, pythonScript, filePath, modelName], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (stderr) {
    logger.debug(`Python stderr: ${stderr}`);
  }

  if (exitCode !== 0) {
    try {
      const errorResult = JSON.parse(stderr);

      if (isTranscriptionResult(errorResult)) {
        throw new Error(
          `Failed to transcribe "${filePath}" with model "${modelName}": ${errorResult.error || 'Unknown error'}`
        );
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(
          `Failed to transcribe "${filePath}" with model "${modelName}": ${stderr || `Process exited with code ${exitCode}`}`
        );
      }
      throw error;
    }
  }

  try {
    const result = JSON.parse(stdout);

    if (!isTranscriptionResult(result)) {
      throw new Error(
        `Invalid transcription response format for file "${filePath}"`
      );
    }

    if (!result.success) {
      throw new Error(
        `Failed to transcribe "${filePath}" with model "${modelName}": ${result.error || 'Unknown error'}`
      );
    }

    return result;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Invalid JSON response from transcription of "${filePath}": ${stdout}`
      );
    }
    throw error;
  }
};
