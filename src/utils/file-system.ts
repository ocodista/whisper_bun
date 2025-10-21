import { mkdirSync, existsSync } from 'fs';
import { TEMP_DIR } from '../config/constants';

export const ensureTempDir = (): void => {
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true });
  }
};
