import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { parseCliArgs } from './cli';
import { join } from 'path';
import { writeFileSync, unlinkSync, existsSync } from 'fs';

describe('parseCliArgs', () => {
  const _originalExit = process.exit;
  const testFilePath = join(process.cwd(), 'test-audio.mp3');

  beforeEach(() => {
    writeFileSync(testFilePath, 'fake audio content');
    process.exit = mock(() => {
      throw new Error('process.exit called');
    }) as any;
  });

  afterEach(() => {
    process.exit = _originalExit;
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
  });

  describe('default configuration', () => {
    test('returns default values when no arguments provided', () => {
      const config = parseCliArgs(['bun', 'index.ts']);

      expect(config.modelName).toBe('base.en');
      expect(config.chunkDuration).toBe(3);
      expect(config.sampleRate).toBe(16000);
      expect(config.logLevel).toBe('error');
      expect(config.inputFile).toBeUndefined();
    });
  });

  describe('model validation', () => {
    test('accepts valid model names', () => {
      const config = parseCliArgs(['bun', 'index.ts', '--model', 'small.en']);
      expect(config.modelName).toBe('small.en');
    });

    test('exits for invalid model names', () => {
      expect(() => parseCliArgs(['bun', 'index.ts', '--model', 'invalid-model'])).toThrow('process.exit called');
    });
  });

  describe('chunk duration validation', () => {
    test('accepts valid chunk duration', () => {
      const config = parseCliArgs(['bun', 'index.ts', '--chunk', '5']);
      expect(config.chunkDuration).toBe(5);
    });

    test('accepts decimal chunk duration', () => {
      const config = parseCliArgs(['bun', 'index.ts', '--chunk', '2.5']);
      expect(config.chunkDuration).toBe(2.5);
    });

    test('exits for chunk duration below minimum', () => {
      expect(() => parseCliArgs(['bun', 'index.ts', '--chunk', '0.05'])).toThrow('process.exit called');
    });

    test('exits for chunk duration above maximum', () => {
      expect(() => parseCliArgs(['bun', 'index.ts', '--chunk', '61'])).toThrow('process.exit called');
    });
  });

  describe('sample rate validation', () => {
    test('accepts valid sample rate', () => {
      const config = parseCliArgs(['bun', 'index.ts', '--rate', '44100']);
      expect(config.sampleRate).toBe(44100);
    });

    test('exits for sample rate below minimum', () => {
      expect(() => parseCliArgs(['bun', 'index.ts', '--rate', '7999'])).toThrow('process.exit called');
    });

    test('exits for sample rate above maximum', () => {
      expect(() => parseCliArgs(['bun', 'index.ts', '--rate', '48001'])).toThrow('process.exit called');
    });
  });

  describe('log level validation', () => {
    test('accepts valid log levels', () => {
      const config = parseCliArgs(['bun', 'index.ts', '--log-level', 'debug']);
      expect(config.logLevel).toBe('debug');
    });

    test('exits for invalid log level', () => {
      expect(() => parseCliArgs(['bun', 'index.ts', '--log-level', 'invalid'])).toThrow('process.exit called');
    });
  });

  describe('input file handling', () => {
    test('accepts existing input file', () => {
      const config = parseCliArgs(['bun', 'index.ts', testFilePath]);
      expect(config.inputFile).toBe(testFilePath);
    });

    test('exits for non-existent input file', () => {
      expect(() => parseCliArgs(['bun', 'index.ts', 'non-existent-file.mp3'])).toThrow('process.exit called');
    });

    test('resolves relative file paths', () => {
      const config = parseCliArgs(['bun', 'index.ts', 'test-audio.mp3']);
      expect(config.inputFile).toBe(join(process.cwd(), 'test-audio.mp3'));
    });
  });

  describe('output and temp paths', () => {
    test('resolves relative output path', () => {
      const config = parseCliArgs(['bun', 'index.ts', '--output', 'custom.txt']);
      expect(config.outputFile).toBe(join(process.cwd(), 'custom.txt'));
    });

    test('resolves relative temp path', () => {
      const config = parseCliArgs(['bun', 'index.ts', '--temp', 'custom-temp']);
      expect(config.tempDir).toBe(join(process.cwd(), 'custom-temp'));
    });

    test('preserves absolute paths', () => {
      const absolutePath = '/tmp/output.txt';
      const config = parseCliArgs(['bun', 'index.ts', '--output', absolutePath]);
      expect(config.outputFile).toBe(absolutePath);
    });
  });

  describe('combined arguments', () => {
    test('parses multiple arguments correctly', () => {
      const config = parseCliArgs([
        'bun',
        'index.ts',
        testFilePath,
        '--model',
        'large-v3',
        '--output',
        'transcript.txt',
        '--log-level',
        'info',
      ]);

      expect(config.inputFile).toBe(testFilePath);
      expect(config.modelName).toBe('large-v3');
      expect(config.outputFile).toBe(join(process.cwd(), 'transcript.txt'));
      expect(config.logLevel).toBe('info');
    });
  });
});
