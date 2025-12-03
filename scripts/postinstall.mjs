#!/usr/bin/env node

/**
 * Postinstall script for listen-cli
 *
 * This script runs after `npm install` or `bun install` to set up the Python
 * environment and download the default transcription model.
 *
 * It performs the following steps:
 * 1. Checks for Python 3.8+
 * 2. Checks for SoX audio recorder
 * 3. Creates a Python virtual environment
 * 4. Installs faster-whisper and dependencies
 * 5. Downloads the default model (tiny.en for quick setup)
 */

import { execSync, spawnSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir, platform } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const INSTALL_DIR = join(homedir(), '.listen');
const MODELS_DIR = join(INSTALL_DIR, 'models');
const VENV_DIR = join(INSTALL_DIR, 'venv');
const DEFAULT_MODEL = 'tiny.en';
const MIN_PYTHON_VERSION = [3, 8];

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}info${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}done${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}warn${colors.reset} ${msg}`),
  error: (msg) => console.error(`${colors.red}error${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.dim}  -> ${msg}${colors.reset}`),
};

function checkCommand(command, args = ['--version']) {
  try {
    const result = spawnSync(command, args, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return result.status === 0 ? result.stdout.trim() : null;
  } catch {
    return null;
  }
}

function getPythonCommand() {
  // Try python3 first, then python
  for (const cmd of ['python3', 'python']) {
    const version = checkCommand(cmd, ['--version']);
    if (version) {
      const match = version.match(/Python (\d+)\.(\d+)/);
      if (match) {
        const [, major, minor] = match.map(Number);
        if (major >= MIN_PYTHON_VERSION[0] && (major > MIN_PYTHON_VERSION[0] || minor >= MIN_PYTHON_VERSION[1])) {
          return { cmd, version };
        }
      }
    }
  }
  return null;
}

function checkSox() {
  const version = checkCommand('sox', ['--version']);
  if (version) {
    const match = version.match(/SoX v?([\d.]+)/i) || version.match(/sox:?\s*SoX v?([\d.]+)/i);
    return match ? match[1] : 'installed';
  }

  // On some systems, sox --version returns non-zero but still works
  const help = checkCommand('sox', ['-h']);
  return help ? 'installed' : null;
}

function getPythonPath() {
  const isWindows = platform() === 'win32';
  const binDir = isWindows ? 'Scripts' : 'bin';
  const pythonExe = isWindows ? 'python.exe' : 'python3';
  return join(VENV_DIR, binDir, pythonExe);
}

function getPipPath() {
  const isWindows = platform() === 'win32';
  const binDir = isWindows ? 'Scripts' : 'bin';
  const pipExe = isWindows ? 'pip.exe' : 'pip3';
  return join(VENV_DIR, binDir, pipExe);
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: options.silent ? 'pipe' : 'inherit',
    ...options,
  });

  if (result.status !== 0) {
    const error = result.stderr || result.error?.message || 'Unknown error';
    throw new Error(`Command failed: ${command} ${args.join(' ')}\n${error}`);
  }

  return result;
}

async function main() {
  console.log('\nlisten-cli postinstall\n');

  // Skip in CI environments
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    log.info('CI environment detected, skipping postinstall setup');
    log.step('Run "listen --setup" after installation to complete setup');
    return;
  }

  // Step 1: Check Python
  log.info('Checking Python installation...');
  const python = getPythonCommand();
  if (!python) {
    log.error('Python 3.8+ is required but not found');
    console.log(`
  Install Python:
    macOS:   brew install python3
    Ubuntu:  sudo apt install python3 python3-venv python3-pip
    Fedora:  sudo dnf install python3 python3-pip

  Then run: npm rebuild listen-cli
`);
    process.exit(1);
  }
  log.step(`Found ${python.version}`);

  // Step 2: Check SoX
  log.info('Checking SoX installation...');
  const sox = checkSox();
  if (!sox) {
    log.warn('SoX not found - required for audio recording');
    console.log(`
  Install SoX:
    macOS:   brew install sox
    Ubuntu:  sudo apt install sox libsox-fmt-all
    Fedora:  sudo dnf install sox

  You can still install listen-cli, but recording won't work without SoX.
`);
  } else {
    log.step(`Found SoX ${sox}`);
  }

  // Step 3: Create installation directory
  log.info('Setting up installation directory...');
  mkdirSync(INSTALL_DIR, { recursive: true });
  mkdirSync(MODELS_DIR, { recursive: true });
  log.step(`Created ${INSTALL_DIR}`);

  // Step 4: Copy transcribe.py to install directory
  const packageRoot = join(__dirname, '..');
  const transcribeSrc = join(packageRoot, 'transcribe.py');
  const transcribeDest = join(INSTALL_DIR, 'transcribe.py');

  if (existsSync(transcribeSrc)) {
    try {
      // Remove existing file if present (handles permission issues)
      if (existsSync(transcribeDest)) {
        const { unlinkSync } = await import('fs');
        try {
          unlinkSync(transcribeDest);
        } catch {
          // Ignore if can't delete, will try to overwrite
        }
      }
      copyFileSync(transcribeSrc, transcribeDest);
      log.step('Copied transcribe.py');
    } catch (error) {
      log.warn(`Could not copy transcribe.py: ${error.message}`);
      log.step('Transcribe script may need manual setup');
    }
  }

  // Step 5: Create virtual environment
  log.info('Creating Python virtual environment...');
  if (!existsSync(VENV_DIR)) {
    runCommand(python.cmd, ['-m', 'venv', VENV_DIR], { silent: true });
    log.step(`Created venv at ${VENV_DIR}`);
  } else {
    log.step('Virtual environment already exists');
  }

  // Step 6: Install Python dependencies
  log.info('Installing Python dependencies...');
  const pip = getPipPath();

  try {
    runCommand(pip, ['install', '--upgrade', 'pip'], { silent: true });
    log.step('Upgraded pip');
  } catch {
    log.warn('Could not upgrade pip, continuing...');
  }

  log.step('Installing faster-whisper (this may take a few minutes)...');
  runCommand(pip, ['install', 'faster-whisper', 'ctranslate2'], { silent: true });
  log.success('Installed faster-whisper');

  // Step 7: Download default model
  log.info(`Downloading ${DEFAULT_MODEL} model...`);
  const pythonPath = getPythonPath();

  const downloadScript = `
import sys
sys.path.insert(0, '${INSTALL_DIR}')
from faster_whisper import WhisperModel
import os
os.makedirs('${MODELS_DIR}', exist_ok=True)
print('Downloading model...', flush=True)
model = WhisperModel('${DEFAULT_MODEL}', device='cpu', compute_type='int8', download_root='${MODELS_DIR}')
print('Model downloaded successfully', flush=True)
`;

  try {
    runCommand(pythonPath, ['-c', downloadScript], { silent: true });
    log.success(`Downloaded ${DEFAULT_MODEL} model`);
  } catch (error) {
    log.warn(`Could not download model: ${error.message}`);
    log.step('Model will be downloaded on first use');
  }

  // Done!
  console.log(`
${colors.green}Setup complete!${colors.reset}

Run ${colors.blue}listen${colors.reset} to start transcribing.
Run ${colors.blue}listen --help${colors.reset} for all options.

Files installed to: ${INSTALL_DIR}
`);
}

main().catch((error) => {
  log.error(error.message);
  process.exit(1);
});
