import { writeFileSync } from 'fs';
import chalk from 'chalk';
import clipboardy from 'clipboardy';
import { createStreamingRecorder } from '../streaming-recorder';
import { createStreamingTranscriber } from '../transcription/streaming-transcriber';
import { createTUI } from '../tui';
import { getDeviceInfo } from '../transcription/transcriber';
import type { Logger } from '../logger';

export const handleExit = (
  updateInterval: NodeJS.Timeout,
  recorder: ReturnType<typeof createStreamingRecorder>,
  transcriber: ReturnType<typeof createStreamingTranscriber>,
  tui: ReturnType<typeof createTUI>,
  outputFile: string,
  logger: Logger
) => {
  clearInterval(updateInterval);
  recorder.stop();

  const elapsedSeconds = recorder.getElapsedSeconds();
  const failedDeletions = transcriber.getFailedDeletions();
  const finalStats = {
    time: recorder.getElapsedTime(),
    elapsedSeconds,
    device: getDeviceInfo(),
    chunks: recorder.getChunkCount(),
    queue: transcriber.getQueueSize(),
    failedDeletions: failedDeletions.length
  };

  setTimeout(() => {
    tui.destroy();

    const fullTranscription = tui.getAllTranscriptions();
    const wordCount = fullTranscription ? fullTranscription.split(/\s+/).filter(word => word.length > 0).length : 0;
    const wordsPerSecond = elapsedSeconds > 0 ? (wordCount / elapsedSeconds).toFixed(2) : '0.00';

    if (fullTranscription) {
      logger.info(`Writing transcription to ${outputFile}`);
      writeFileSync(outputFile, fullTranscription, 'utf-8');

      clipboardy.writeSync(fullTranscription);
      logger.info('Transcription copied to clipboard');
    }

    console.log(chalk.yellow('\n🛑 Recording stopped'));
    console.log(chalk.gray('─'.repeat(40)));

    if (fullTranscription) {
      console.log(chalk.cyan('Transcription:'));
      console.log(fullTranscription);
      console.log(chalk.gray('─'.repeat(40)));
    }

    console.log(chalk.cyan('Summary:'));
    console.log(chalk.gray(`  Recorded time: ${finalStats.time}`));
    console.log(chalk.gray(`  Words: ${wordCount}`));
    console.log(chalk.gray(`  Words/s: ${wordsPerSecond}`));
    console.log();
    console.log(chalk.cyan('Details:'));
    console.log(chalk.gray(`  Device: ${finalStats.device}`));
    console.log(chalk.gray(`  Chunks processed: ${finalStats.chunks}`));
    console.log(chalk.gray(`  Queue remaining: ${finalStats.queue}`));

    if (finalStats.failedDeletions > 0) {
      console.log(chalk.yellow(`  ⚠️  Failed file deletions: ${finalStats.failedDeletions}`));
      logger.warn(`Failed to delete ${finalStats.failedDeletions} chunk file(s). Manual cleanup may be needed.`);
    }

    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.green('✅ Goodbye!\n'));
    process.exit(0);
  }, 500);
};
