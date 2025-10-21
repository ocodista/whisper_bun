import { join } from 'path';
import { writeFileSync } from 'fs';
import chalk from 'chalk';
import clipboardy from 'clipboardy';
import { createStreamingRecorder } from '../recording/streaming-recorder';
import { createStreamingTranscriber } from '../transcription/streaming-transcriber';
import { createTUI } from '../ui/tui';
import { getDeviceInfo } from '../transcription/transcriber';

export const handleExit = (
  updateInterval: NodeJS.Timeout,
  recorder: ReturnType<typeof createStreamingRecorder>,
  transcriber: ReturnType<typeof createStreamingTranscriber>,
  tui: ReturnType<typeof createTUI>
) => {
  clearInterval(updateInterval);
  recorder.stop();

  const elapsedSeconds = recorder.getElapsedSeconds();
  const finalStats = {
    time: recorder.getElapsedTime(),
    elapsedSeconds,
    device: getDeviceInfo(),
    chunks: recorder.getChunkCount(),
    queue: transcriber.getQueueSize()
  };

  setTimeout(() => {
    tui.destroy();

    const fullTranscription = tui.getAllTranscriptions();
    const wordCount = fullTranscription ? fullTranscription.split(/\s+/).filter(word => word.length > 0).length : 0;
    const wordsPerSecond = elapsedSeconds > 0 ? (wordCount / elapsedSeconds).toFixed(2) : '0.00';

    if (fullTranscription) {
      const resultPath = join(process.cwd(), 'result.txt');
      writeFileSync(resultPath, fullTranscription, 'utf-8');

      clipboardy.writeSync(fullTranscription);
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
    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.green('✅ Goodbye!\n'));
    process.exit(0);
  }, 500);
};
