import chalk from 'chalk';
import { writeFileSync } from 'fs';
import { basename } from 'path';
import clipboardy from 'clipboardy';
import { parseCliArgs, type CliConfig } from './cli';
import { ensureTempDir } from './utils/file-system';
import { createTUI } from './tui';
import { createStreamingTranscriber } from './transcription/streaming-transcriber';
import { createStreamingRecorder } from './streaming-recorder';
import { handleExit } from './utils/exit-handler';
import { getDeviceInfo } from './transcription/transcriber';
import { transcribeFile } from './transcription/file-transcriber';
import { createLogger, type Logger } from './logger';
import { formatElapsedTime } from './utils/time-utils';

const WORDS_PER_BATCH = 5;
const BATCH_ANIMATION_DELAY_MS = 50;
const COMPLETION_DISPLAY_DURATION_MS = 2000;
const STATS_UPDATE_INTERVAL_MS = 100;

const transcribeFromFile = async (
  inputFile: string,
  modelName: string,
  outputFile: string,
  logger: Logger
): Promise<void> => {
  const tui = createTUI();
  const startTime = Date.now();

  tui.updateStats({
    status: 'Transcribing',
    time: '0:00',
    device: 'Loading...',
    tokensPerSecond: '0.00'
  });

  tui.render();

  const exitHandler = () => {
    tui.destroy();
    process.exit(0);
  };

  tui.screen.key(['C-c'], exitHandler);
  process.on('SIGINT', exitHandler);

  try {
    logger.info(`Transcribing file: ${inputFile}`);
    const result = await transcribeFile(inputFile, modelName, logger);

    if (!result.success || !result.text) {
      throw new Error(result.error || 'Transcription failed');
    }

    const words = result.text.split(/\s+/).filter(word => word.length > 0);

    for (let i = 0; i < words.length; i += WORDS_PER_BATCH) {
      const batch = words.slice(i, i + WORDS_PER_BATCH).join(' ');
      tui.addTranscription(batch);

      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const timeStr = formatElapsedTime(startTime);
      const wordCount = tui.getWordCount();
      const tokensPerSecond = elapsed > 0 ? (wordCount / elapsed).toFixed(2) : '0.00';

      tui.updateStats({
        status: 'Transcribing',
        time: timeStr,
        device: basename(inputFile),
        tokensPerSecond
      });

      await new Promise(resolve => setTimeout(resolve, BATCH_ANIMATION_DELAY_MS));
    }

    const finalElapsed = Math.floor((Date.now() - startTime) / 1000);
    const finalTimeStr = formatElapsedTime(startTime);
    const finalWordCount = tui.getWordCount();
    const finalTokensPerSecond = finalElapsed > 0 ? (finalWordCount / finalElapsed).toFixed(2) : '0.00';

    tui.updateStats({
      status: 'Complete',
      time: finalTimeStr,
      device: basename(inputFile),
      tokensPerSecond: finalTokensPerSecond
    });

    const fullTranscription = tui.getAllTranscriptions();
    writeFileSync(outputFile, fullTranscription, 'utf-8');
    await clipboardy.write(fullTranscription);

    logger.info(`Transcription saved to: ${outputFile}`);
    logger.info(`Word count: ${finalWordCount}`);
    logger.info(`Transcription copied to clipboard`);

    await new Promise(resolve => setTimeout(resolve, COMPLETION_DISPLAY_DURATION_MS));
    tui.destroy();

    console.log(chalk.green.bold('\n✅ Transcription complete!'));
    console.log(chalk.cyan(`📄 Output: ${outputFile}`));
    console.log(chalk.cyan(`📊 Words: ${finalWordCount}`));
    console.log(chalk.cyan(`⏱️  Time: ${finalTimeStr}`));
    console.log(chalk.cyan(`📋 Copied to clipboard\n`));

  } catch (error) {
    tui.destroy();
    throw error;
  }
};

const transcribeFromMicrophone = async (
  config: CliConfig,
  logger: Logger
): Promise<void> => {
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
  }, STATS_UPDATE_INTERVAL_MS);

  const exitHandler = () => handleExit(
    updateInterval,
    recorder,
    transcriber,
    tui,
    config.outputFile,
    logger
  );

  tui.screen.key(['C-c'], exitHandler);
  process.on('SIGINT', exitHandler);

  recorder.start();
  tui.render();
};

const main = async (): Promise<void> => {
  const config = parseCliArgs();
  const logger = createLogger(config.logLevel);

  if (config.inputFile) {
    await transcribeFromFile(config.inputFile, config.modelName, config.outputFile, logger);
    return;
  }

  await transcribeFromMicrophone(config, logger);
};

main().catch((error) => {
  console.error(chalk.red.bold('\n❌ Fatal error:'), error.message);
  process.exit(1);
});
