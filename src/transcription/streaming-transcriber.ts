import { unlinkSync } from 'fs';
import chalk from 'chalk';
import type { ChunkInfo } from '../types';
import { transcribeChunk } from './transcriber';
import type { Logger } from '../logger';

export const createStreamingTranscriber = (
  onTranscription: (text: string) => void,
  modelName: string,
  logger: Logger
) => {
  const queue: ChunkInfo[] = [];
  let isProcessing = false;
  const failedDeletions: string[] = [];

  const processQueue = async (): Promise<void> => {
    if (queue.length === 0) {
      isProcessing = false;
      return;
    }

    isProcessing = true;
    const chunk = queue.shift();

    if (!chunk) {
      isProcessing = false;
      return;
    }

    try {
      logger.debug(`Transcribing chunk ${chunk.chunkNumber}`);
      const result = await transcribeChunk(chunk, modelName, logger);

      if (result.text && result.text.trim()) {
        onTranscription(result.text);
        logger.debug(`Transcribed chunk ${chunk.chunkNumber}: ${result.text.substring(0, 50)}...`);
      }

      try {
        unlinkSync(chunk.path);
        logger.debug(`Deleted chunk file: ${chunk.path}`);
      } catch (unlinkError) {
        logger.warn({ err: unlinkError }, `Failed to delete chunk file: ${chunk.path}`);
        failedDeletions.push(chunk.path);
      }
    } catch (error) {
      logger.error({ err: error }, `Transcription error for chunk ${chunk.chunkNumber}`);
      if (error instanceof Error) {
        onTranscription(chalk.red(`❌ Error: ${error.message}`));
      }
    }

    await processQueue();
  };

  const addChunk = async (chunk: ChunkInfo): Promise<void> => {
    queue.push(chunk);
    if (!isProcessing) {
      await processQueue();
    }
  };

  const getQueueSize = (): number => {
    return queue.length;
  };

  const getFailedDeletions = (): string[] => {
    return [...failedDeletions];
  };

  return { addChunk, getQueueSize, getFailedDeletions };
};
