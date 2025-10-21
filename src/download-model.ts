import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

const MODELS_DIR = join(process.cwd(), 'models');
const MODEL_NAME = 'ggml-base.en.bin';
const MODEL_URL = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_NAME}`;

const downloadModel = async (): Promise<void> => {
  console.log('📥 Whisper Model Downloader');
  console.log('===========================\n');

  if (!existsSync(MODELS_DIR)) {
    console.log('Creating models directory...');
    mkdirSync(MODELS_DIR, { recursive: true });
  }

  const modelPath = join(MODELS_DIR, MODEL_NAME);

  if (existsSync(modelPath)) {
    console.log('✅ Model already exists at:', modelPath);
    console.log('\nYou can now run: bun run index.ts');
    return;
  }

  console.log(`Downloading ${MODEL_NAME}...`);
  console.log(`From: ${MODEL_URL}`);
  console.log(`To: ${modelPath}\n`);

  return new Promise((resolve, reject) => {
    const download = spawn('curl', [
      '-L',
      '-o', modelPath,
      '--progress-bar',
      MODEL_URL
    ], {
      stdio: 'inherit'
    });

    download.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Download complete!');
        console.log('\nYou can now run: bun run index.ts');
        resolve();
      } else {
        reject(new Error(`Download failed with code ${code}`));
      }
    });

    download.on('error', (error) => {
      reject(error);
    });
  });
};

downloadModel().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
