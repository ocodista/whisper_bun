import blessed from 'blessed';
import chalk from 'chalk';

export const createTUI = () => {
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Whisper Transcription'
  });

  const transcriptionBuffer: string[] = [];

  const statsBox = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: 2,
    content: '',
    tags: true,
    style: {
      fg: 'white'
    }
  });

  const separatorBox = blessed.box({
    top: 2,
    left: 0,
    width: '100%',
    height: 1,
    content: chalk.gray('─'.repeat(80)),
    tags: true
  });

  const transcriptionBox = blessed.log({
    top: 3,
    left: 0,
    width: '100%',
    height: '100%-3',
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      style: {
        bg: 'gray'
      }
    },
    keys: true,
    vi: true,
    mouse: true,
    tags: true,
    style: {
      fg: 'white'
    }
  });

  screen.append(statsBox);
  screen.append(separatorBox);
  screen.append(transcriptionBox);

  const updateStats = (stats: {
    status: string;
    time: string;
    device: string;
    tokensPerSecond: string;
  }) => {
    const statusColor = stats.status.includes('Recording') ? 'green' : 'yellow';
    const deviceColor = stats.device.includes('GPU') ? 'green' : 'cyan';

    statsBox.setContent(
      `{${statusColor}-fg}Status:{/} ${stats.status}  {yellow-fg}Time:{/} ${stats.time}  {${deviceColor}-fg}Device:{/} ${stats.device}  {blue-fg}Tokens/s:{/} ${stats.tokensPerSecond}`
    );
    screen.render();
  };

  const addTranscription = (text: string) => {
    if (!text || !text.trim()) {
      return;
    }

    const cleanText = text.trim();
    transcriptionBuffer.push(cleanText);
    transcriptionBox.log(cleanText);
    screen.render();
  };

  const render = () => {
    screen.render();
  };

  const destroy = () => {
    screen.destroy();
  };

  const getAllTranscriptions = (): string => {
    return transcriptionBuffer.join(' ');
  };

  const getWordCount = (): number => {
    const fullText = transcriptionBuffer.join(' ');
    return fullText ? fullText.split(/\s+/).filter(word => word.length > 0).length : 0;
  };

  return { updateStats, addTranscription, render, destroy, screen, getAllTranscriptions, getWordCount };
};
