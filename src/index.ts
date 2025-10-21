import chalk from 'chalk';
import { ensureTempDir } from './utils/file-system';
import { createTUI } from './tui';
import { createStreamingTranscriber } from './transcription/streaming-transcriber';
import { createStreamingRecorder } from './streaming-recorder';
import { handleExit } from './utils/exit-handler';
import { getDeviceInfo } from './transcription/transcriber';

const main = async (): Promise<void> => {
  ensureTempDir();

  const tui = createTUI();

  const transcriber = createStreamingTranscriber((text) => {
    tui.addTranscription(text);
  });

  const recorder = createStreamingRecorder((chunk) => {
    transcriber.addChunk(chunk);
  });

  const updateInterval = setInterval(() => {
    const elapsedSeconds = recorder.getElapsedSeconds();
    const wordCount = tui.getWordCount();
    const tokensPerSecond = elapsedSeconds > 0 ? (wordCount / elapsedSeconds).toFixed(2) : '0.00';

    tui.updateStats({
      status: 'Recording',
      time: recorder.getElapsedTime(),
      device: getDeviceInfo(),
      tokensPerSecond
    });
  }, 100);

  const exitHandler = () => handleExit(updateInterval, recorder, transcriber, tui);

  tui.screen.key(['C-c'], exitHandler);
  process.on('SIGINT', exitHandler);

  recorder.start();
  tui.render();
};

main().catch((error) => {
  console.error(chalk.red.bold('\n❌ Fatal error:'), error.message);
  process.exit(1);
});
