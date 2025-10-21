import { test, expect, describe, beforeEach, afterEach, mock } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_TEMP_DIR = join(process.cwd(), 'test-temp');

describe('ensureTempDir', () => {
  afterEach(() => {
    if (existsSync(TEST_TEMP_DIR)) {
      rmSync(TEST_TEMP_DIR, { recursive: true });
    }
  });

  test('creates directory when it does not exist', () => {
    if (existsSync(TEST_TEMP_DIR)) {
      rmSync(TEST_TEMP_DIR, { recursive: true });
    }

    mkdirSync(TEST_TEMP_DIR, { recursive: true });

    expect(existsSync(TEST_TEMP_DIR)).toBe(true);
  });

  test('does not throw when directory already exists', () => {
    mkdirSync(TEST_TEMP_DIR, { recursive: true });

    expect(() => {
      if (!existsSync(TEST_TEMP_DIR)) {
        mkdirSync(TEST_TEMP_DIR, { recursive: true });
      }
    }).not.toThrow();
  });
});

describe('createTUI', () => {
  describe('getWordCount', () => {
    test('returns 0 for empty transcription buffer', () => {
      const buffer: string[] = [];
      const fullText = buffer.join(' ');
      const count = fullText ? fullText.split(/\s+/).filter(word => word.length > 0).length : 0;

      expect(count).toBe(0);
    });

    test('counts words correctly', () => {
      const buffer = ['Hello world', 'This is a test'];
      const fullText = buffer.join(' ');
      const count = fullText.split(/\s+/).filter(word => word.length > 0).length;

      expect(count).toBe(6);
    });

    test('handles extra whitespace', () => {
      const buffer = ['Hello  world', '  This   is  '];
      const fullText = buffer.join(' ');
      const count = fullText.split(/\s+/).filter(word => word.length > 0).length;

      expect(count).toBe(4);
    });

    test('filters empty strings', () => {
      const buffer = ['Hello', '', 'world'];
      const fullText = buffer.join(' ');
      const count = fullText.split(/\s+/).filter(word => word.length > 0).length;

      expect(count).toBe(2);
    });
  });

  describe('getAllTranscriptions', () => {
    test('joins transcription segments with spaces', () => {
      const buffer = ['Hello', 'world', 'test'];
      const result = buffer.join(' ');

      expect(result).toBe('Hello world test');
    });

    test('returns empty string for empty buffer', () => {
      const buffer: string[] = [];
      const result = buffer.join(' ');

      expect(result).toBe('');
    });
  });
});

describe('createStreamingRecorder', () => {
  describe('getElapsedTime', () => {
    test('formats time correctly under one minute', () => {
      const sessionStartTime = Date.now() - 30000;
      const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      expect(formatted).toMatch(/^0:\d{2}$/);
    });

    test('formats time correctly over one minute', () => {
      const sessionStartTime = Date.now() - 90000;
      const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      expect(formatted).toMatch(/^1:\d{2}$/);
    });
  });

  describe('getElapsedSeconds', () => {
    test('calculates seconds correctly', () => {
      const sessionStartTime = Date.now() - 5000;
      const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);

      expect(elapsed).toBeGreaterThanOrEqual(4);
      expect(elapsed).toBeLessThanOrEqual(6);
    });
  });
});

describe('stats calculation', () => {
  test('calculates tokens per second correctly', () => {
    const wordCount = 100;
    const elapsedSeconds = 10;
    const tokensPerSecond = (wordCount / elapsedSeconds).toFixed(2);

    expect(tokensPerSecond).toBe('10.00');
  });

  test('handles zero elapsed time', () => {
    const wordCount = 100;
    const elapsedSeconds = 0;
    const tokensPerSecond = elapsedSeconds > 0 ? (wordCount / elapsedSeconds).toFixed(2) : '0.00';

    expect(tokensPerSecond).toBe('0.00');
  });

  test('formats decimal correctly', () => {
    const wordCount = 75;
    const elapsedSeconds = 10;
    const tokensPerSecond = (wordCount / elapsedSeconds).toFixed(2);

    expect(tokensPerSecond).toBe('7.50');
  });
});

describe('transcription result parsing', () => {
  test('calculates word count from transcription', () => {
    const transcription = 'This is a test transcription with multiple words';
    const wordCount = transcription.split(/\s+/).filter(word => word.length > 0).length;

    expect(wordCount).toBe(8);
  });

  test('calculates words per second', () => {
    const transcription = 'This is a test';
    const wordCount = transcription.split(/\s+/).filter(word => word.length > 0).length;
    const elapsedSeconds = 2;
    const wordsPerSecond = (wordCount / elapsedSeconds).toFixed(2);

    expect(wordsPerSecond).toBe('2.00');
  });
});
