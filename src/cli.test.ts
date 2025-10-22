import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { parseCliArgs } from './cli';
import { join } from 'path';
import { writeFileSync, unlinkSync, existsSync } from 'fs';

describe('parseCliArgs', () => {
  const _originalArgv = Bun.argv;
  const _originalExit = process.exit;
  const testFilePath = join(process.cwd(), 'test-audio.mp3');

  beforeEach(() => {
    writeFileSync(testFilePath, 'fake audio content');
    process.exit = mock(() => {
      throw new Error('process.exit called');
    }) as any;
  });

  afterEach(() => {
    Bun.argv = _originalArgv;
    process.exit = _originalExit;
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
  });

  describe('default configuration', () => {
    test('returns default values when no arguments provided', () => {
      Bun.argv = ['bun', 'index.ts'];
      const config = parseCliArgs();

      expect(config.modelName).toBe('base.en');
      expect(config.chunkDuration).toBe(3);
      expect(config.sampleRate).toBe(16000);
      expect(config.logLevel).toBe('error');
      expect(config.inputFile).toBeUndefined();
    });
  });

  describe('model validation', () => {
    test('accepts valid model names', () => {
      Bun.argv = ['bun', 'index.ts', '--model', 'small.en'];
      const config = parseCliArgs();
      expect(config.modelName).toBe('small.en');
    });

    test('exits for invalid model names', () => {
      Bun.argv = ['bun', 'index.ts', '--model', 'invalid-model'];
      expect(() => parseCliArgs()).toThrow('process.exit called');
    });
  });

  describe('chunk duration validation', () => {
    test('accepts valid chunk duration', () => {
      Bun.argv = ['bun', 'index.ts', '--chunk', '5'];
      const config = parseCliArgs();
      expect(config.chunkDuration).toBe(5);
    });

    test('accepts decimal chunk duration', () => {
      Bun.argv = ['bun', 'index.ts', '--chunk', '2.5'];
      const config = parseCliArgs();
      expect(config.chunkDuration).toBe(2.5);
    });

    test('exits for chunk duration below minimum', () => {
      Bun.argv = ['bun', 'index.ts', '--chunk', '0.05'];
      expect(() => parseCliArgs()).toThrow('process.exit called');
    });

    test('exits for chunk duration above maximum', () => {
      Bun.argv = ['bun', 'index.ts', '--chunk', '61'];
      expect(() => parseCliArgs()).toThrow('process.exit called');
    });
  });

  describe('sample rate validation', () => {
    test('accepts valid sample rate', () => {
      Bun.argv = ['bun', 'index.ts', '--rate', '44100'];
      const config = parseCliArgs();
      expect(config.sampleRate).toBe(44100);
    });

    test('exits for sample rate below minimum', () => {
      Bun.argv = ['bun', 'index.ts', '--rate', '7999'];
      expect(() => parseCliArgs()).toThrow('process.exit called');
    });

    test('exits for sample rate above maximum', () => {
      Bun.argv = ['bun', 'index.ts', '--rate', '48001'];
      expect(() => parseCliArgs()).toThrow('process.exit called');
    });
  });

  describe('log level validation', () => {
    test('accepts valid log levels', () => {
      Bun.argv = ['bun', 'index.ts', '--log-level', 'debug'];
      const config = parseCliArgs();
      expect(config.logLevel).toBe('debug');
    });

    test('exits for invalid log level', () => {
      Bun.argv = ['bun', 'index.ts', '--log-level', 'invalid'];
      expect(() => parseCliArgs()).toThrow('process.exit called');
    });
  });

  describe('input file handling', () => {
    test('accepts existing input file', () => {
      Bun.argv = ['bun', 'index.ts', testFilePath];
      const config = parseCliArgs();
      expect(config.inputFile).toBe(testFilePath);
    });

    test('exits for non-existent input file', () => {
      Bun.argv = ['bun', 'index.ts', 'non-existent-file.mp3'];
      expect(() => parseCliArgs()).toThrow('process.exit called');
    });

    test('resolves relative file paths', () => {
      Bun.argv = ['bun', 'index.ts', 'test-audio.mp3'];
      const config = parseCliArgs();
      expect(config.inputFile).toBe(join(process.cwd(), 'test-audio.mp3'));
    });
  });

  describe('output and temp paths', () => {
    test('resolves relative output path', () => {
      Bun.argv = ['bun', 'index.ts', '--output', 'custom.txt'];
      const config = parseCliArgs();
      expect(config.outputFile).toBe(join(process.cwd(), 'custom.txt'));
    });

    test('resolves relative temp path', () => {
      Bun.argv = ['bun', 'index.ts', '--temp', 'custom-temp'];
      const config = parseCliArgs();
      expect(config.tempDir).toBe(join(process.cwd(), 'custom-temp'));
    });

    test('preserves absolute paths', () => {
      const absolutePath = '/tmp/output.txt';
      Bun.argv = ['bun', 'index.ts', '--output', absolutePath];
      const config = parseCliArgs();
      expect(config.outputFile).toBe(absolutePath);
    });
  });

  describe('combined arguments', () => {
    test('parses multiple arguments correctly', () => {
      Bun.argv = [
        'bun',
        'index.ts',
        testFilePath,
        '--model',
        'large-v3',
        '--output',
        'transcript.txt',
        '--log-level',
        'info',
      ];
      const config = parseCliArgs();

      expect(config.inputFile).toBe(testFilePath);
      expect(config.modelName).toBe('large-v3');
      expect(config.outputFile).toBe(join(process.cwd(), 'transcript.txt'));
      expect(config.logLevel).toBe('info');
    });
  });
});
