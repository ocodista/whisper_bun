import { mkdirSync, existsSync } from 'fs';

export const ensureTempDir = (tempDir: string): void => {
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }
};
