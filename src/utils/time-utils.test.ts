import { describe, test, expect } from 'bun:test';
import { formatElapsedTime } from './time-utils';

describe('formatElapsedTime', () => {
  test('formats elapsed time under 1 minute correctly', () => {
    const startTime = Date.now() - 45000; // 45 seconds ago
    const result = formatElapsedTime(startTime);
    expect(result).toBe('0:45');
  });

  test('formats elapsed time over 1 minute correctly', () => {
    const startTime = Date.now() - 125000; // 2 minutes 5 seconds ago
    const result = formatElapsedTime(startTime);
    expect(result).toBe('2:05');
  });

  test('pads single digit seconds with zero', () => {
    const startTime = Date.now() - 63000; // 1 minute 3 seconds ago
    const result = formatElapsedTime(startTime);
    expect(result).toBe('1:03');
  });

  test('handles zero elapsed time', () => {
    const startTime = Date.now();
    const result = formatElapsedTime(startTime);
    expect(result).toBe('0:00');
  });

  test('formats long durations correctly', () => {
    const startTime = Date.now() - 3723000; // 62 minutes 3 seconds ago
    const result = formatElapsedTime(startTime);
    expect(result).toBe('62:03');
  });
});
