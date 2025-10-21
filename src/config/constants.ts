import { join } from 'path';
import pino from 'pino';

export const SAMPLE_RATE = 16000;
export const TEMP_DIR = join(process.cwd(), 'temp');
export const MODEL_NAME = 'base.en';
export const CHUNK_DURATION = 3;

export const logger = pino({
  level: 'error',
  base: undefined
});
