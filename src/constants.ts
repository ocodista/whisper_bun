/**
 * @deprecated This file is kept for backward compatibility with tests.
 * Use CLI arguments instead (see src/cli.ts).
 *
 * To pass custom configuration, use command-line flags:
 * - listen --model base.en
 * - listen --chunk 5
 * - listen --rate 16000
 *
 * See: listen --help
 */

import { join } from 'path';
import { homedir } from 'os';
import { createLogger } from './logger';

/**
 * Installation directory for Python scripts, venv, and models
 */
export const INSTALL_DIR = join(homedir(), '.listen');

/**
 * @deprecated Use --rate CLI flag instead
 */
export const SAMPLE_RATE = 16000;

/**
 * @deprecated Use --temp CLI flag instead
 */
export const TEMP_DIR = join(process.cwd(), 'temp');

/**
 * @deprecated Use --model CLI flag instead
 */
export const MODEL_NAME = 'base.en';

/**
 * @deprecated Use --chunk CLI flag instead
 */
export const CHUNK_DURATION = 3;

/**
 * @deprecated Use createLogger() from src/logger.ts instead
 */
export const logger = createLogger('error');
