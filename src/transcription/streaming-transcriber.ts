import { unlinkSync } from 'fs';
import chalk from 'chalk';
import type { ChunkInfo } from '../types';
import { transcribeChunk } from './transcriber';

export const createStreamingTranscriber = (onTranscription: (text: string) => void) => {
  const queue: ChunkInfo[] = [];
  let isProcessing = false;

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
      const result = await transcribeChunk(chunk);

      if (result.text && result.text.trim()) {
        onTranscription(result.text);
      }

      try {
        unlinkSync(chunk.path);
      } catch {

      }
    } catch (error) {
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

  return { addChunk, getQueueSize };
};
