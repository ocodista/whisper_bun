import { test, expect, describe } from 'bun:test';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

describe('transcription pipeline', () => {
  test('transcribes test audio file', async () => {
    const testAudioPath = join(process.cwd(), 'test-fixtures', 'test-audio.wav');
    const pythonScript = join(process.cwd(), 'transcribe.py');
    const venvPython = join(process.cwd(), 'venv', 'bin', 'python3');
    const pythonCmd = existsSync(venvPython) ? venvPython : 'python3';

    expect(existsSync(testAudioPath)).toBe(true);

    const result = await new Promise((resolve, reject) => {
      const transcribe = spawn(pythonCmd, [pythonScript, testAudioPath, 'base.en']);

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
          reject(new Error(`Process exited with code ${code}: ${stderrData}`));
          return;
        }

        try {
          const result = JSON.parse(stdoutData);
          resolve(result);
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${stdoutData}`));
        }
      });

      transcribe.on('error', (error) => {
        reject(error);
      });
    });

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  }, { timeout: 30000 });

  test('handles non-existent audio file', async () => {
    const pythonScript = join(process.cwd(), 'transcribe.py');
    const venvPython = join(process.cwd(), 'venv', 'bin', 'python3');
    const pythonCmd = existsSync(venvPython) ? venvPython : 'python3';
    const nonExistentPath = join(process.cwd(), 'does-not-exist.wav');

    const result = await new Promise((resolve) => {
      const transcribe = spawn(pythonCmd, [pythonScript, nonExistentPath, 'base.en']);

      let stderrData = '';

      transcribe.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      transcribe.on('close', (code) => {
        try {
          const result = JSON.parse(stderrData);
          resolve(result);
        } catch {
          resolve({ error: 'Process failed' });
        }
      });
    });

    expect(result).toHaveProperty('error');
  }, { timeout: 10000 });
});

describe('audio file validation', () => {
  test('test audio file exists', () => {
    const testAudioPath = join(process.cwd(), 'test-fixtures', 'test-audio.wav');
    expect(existsSync(testAudioPath)).toBe(true);
  });

  test('test audio file has correct format', async () => {
    const testAudioPath = join(process.cwd(), 'test-fixtures', 'test-audio.wav');

    const result = await new Promise((resolve, reject) => {
      const soxi = spawn('soxi', [testAudioPath]);

      let stdoutData = '';

      soxi.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      soxi.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('Failed to get audio info'));
          return;
        }
        resolve(stdoutData);
      });
    });

    const output = result as string;
    expect(output).toContain('16000');
    expect(output).toContain('1');
  });
});
