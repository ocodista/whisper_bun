import chalk from 'chalk';
import { parseCliArgs } from './cli';
import { ensureTempDir } from './utils/file-system';
import { createTUI } from './tui';
import { createStreamingTranscriber } from './transcription/streaming-transcriber';
import { createStreamingRecorder } from './streaming-recorder';
import { handleExit } from './utils/exit-handler';
import { getDeviceInfo } from './transcription/transcriber';
import { createLogger } from './logger';

const main = async (): Promise<void> => {
  const config = parseCliArgs();
  const logger = createLogger(config.logLevel);

  ensureTempDir(config.tempDir);

  const tui = createTUI();

  const transcriber = createStreamingTranscriber(
    (text) => {
      tui.addTranscription(text);
    },
    config.modelName,
    logger
  );

  const recorder = createStreamingRecorder(
    (chunk) => {
      transcriber.addChunk(chunk);
    },
    config.sampleRate,
    config.tempDir,
    config.chunkDuration,
    logger
  );

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

  const exitHandler = () => handleExit(
    updateInterval,
    recorder,
    transcriber,
    tui,
    config.outputFile,
    logger,
    { noCopy: config.noCopy, append: config.append }
  );

  tui.screen.key(['C-c'], exitHandler);
  process.on('SIGINT', exitHandler);

  recorder.start();
  tui.render();
};

main().catch((error) => {
  console.error(chalk.red.bold('\n❌ Fatal error:'), error.message);
  process.exit(1);
});
