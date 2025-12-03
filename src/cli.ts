import { parseArgs } from "util";
import { join } from "path";
import { execSync, spawnSync } from "child_process";
import chalk from "chalk";

export interface CliConfig {
  sampleRate: number;
  tempDir: string;
  modelName: string;
  chunkDuration: number;
  logLevel: "error" | "warn" | "info" | "debug";
  outputFile: string;
  noCopy: boolean;
  append: boolean;
}

const DEFAULT_CONFIG: CliConfig = {
  sampleRate: 16000,
  tempDir: join(process.cwd(), "temp"),
  modelName: "base.en",
  chunkDuration: 3,
  logLevel: "error",
  outputFile: join(process.cwd(), "result.txt"),
  noCopy: false,
  append: false,
};

export const VALID_MODELS = [
  "tiny.en",
  "tiny",
  "base.en",
  "base",
  "small.en",
  "small",
  "medium.en",
  "medium",
  "large-v1",
  "large-v2",
  "large-v3",
] as const;

type ModelName = typeof VALID_MODELS[number];

export const MODEL_INFO: Record<ModelName, { size: string; speed: string; accuracy: string }> = {
  "tiny.en": { size: "~75MB", speed: "fastest", accuracy: "good for clear speech" },
  "tiny": { size: "~75MB", speed: "fastest", accuracy: "multilingual, basic" },
  "base.en": { size: "~140MB", speed: "fast", accuracy: "good balance" },
  "base": { size: "~140MB", speed: "fast", accuracy: "multilingual, good" },
  "small.en": { size: "~460MB", speed: "medium", accuracy: "very good" },
  "small": { size: "~460MB", speed: "medium", accuracy: "multilingual, very good" },
  "medium.en": { size: "~1.5GB", speed: "slow", accuracy: "excellent" },
  "medium": { size: "~1.5GB", speed: "slow", accuracy: "multilingual, excellent" },
  "large-v1": { size: "~3GB", speed: "slowest", accuracy: "best (original)" },
  "large-v2": { size: "~3GB", speed: "slowest", accuracy: "best (improved)" },
  "large-v3": { size: "~3GB", speed: "slowest", accuracy: "best (latest)" },
};

const VALID_LOG_LEVELS = ["error", "warn", "info", "debug"] as const;

const VERSION = "1.0.0";

const HELP_TEXT = `
${chalk.bold.cyan("Listen")} - Real-time speech transcription

${chalk.bold("USAGE:")}
  listen [options]

${chalk.bold("OPTIONS:")}
  -m, --model <name>        Model name (default: base.en)
                            Run --list-models to see all available models
  -c, --chunk <seconds>     Chunk duration (default: 3, range: 0.1-60)
  -r, --rate <hz>           Sample rate (default: 16000, range: 8000-48000)
  -o, --output <path>       Output file path (default: result.txt)
  -t, --temp <path>         Temp directory (default: ./temp)
  -l, --log-level <level>   Log level (default: error)
                            Options: ${VALID_LOG_LEVELS.join(", ")}
      --no-copy             Disable automatic clipboard copy
      --append              Append to output file instead of overwriting
      --list-models         List all available Whisper models
      --list-devices        List available audio input devices
  -h, --help                Show this help message
  -v, --version             Show version

${chalk.bold("EXAMPLES:")}
  listen                                  # Start with defaults
  listen --model small.en                 # Use higher quality model
  listen --chunk 5 --output notes.txt     # Longer chunks, custom output
  listen --model large-v3 --no-copy       # Best model, no clipboard
  listen --append --output journal.txt    # Append to existing file
`;

const parseChunkDuration = (value: string | undefined): number => {
  if (!value) return DEFAULT_CONFIG.chunkDuration;

  const parsed = parseFloat(value);
  if (isNaN(parsed) || parsed < 0.1 || parsed > 60) {
    throw new Error(
      `Invalid chunk duration: "${value}". Must be between 0.1 and 60 seconds.`
    );
  }

  return parsed;
};

const parseSampleRate = (value: string | undefined): number => {
  if (!value) return DEFAULT_CONFIG.sampleRate;

  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 8000 || parsed > 48000) {
    throw new Error(
      `Invalid sample rate: "${value}". Must be between 8000 and 48000 Hz.`
    );
  }

  return parsed;
};

const parseModelName = (value: string | undefined): string => {
  if (!value) return DEFAULT_CONFIG.modelName;

  if (!VALID_MODELS.includes(value as any)) {
    throw new Error(
      `Invalid model: "${value}". Must be one of: ${VALID_MODELS.join(", ")}`
    );
  }

  return value;
};

const parseLogLevel = (value: string | undefined): CliConfig["logLevel"] => {
  if (!value) return DEFAULT_CONFIG.logLevel;

  if (!VALID_LOG_LEVELS.includes(value as any)) {
    throw new Error(
      `Invalid log level: "${value}". Must be one of: ${VALID_LOG_LEVELS.join(", ")}`
    );
  }

  return value as CliConfig["logLevel"];
};

const listModels = (): void => {
  console.log(chalk.bold.cyan("\nAvailable Whisper Models\n"));

  console.log(chalk.bold("English-optimized models:"));
  for (const model of ["tiny.en", "base.en", "small.en", "medium.en"] as const) {
    const info = MODEL_INFO[model];
    console.log(
      `  ${chalk.green(model.padEnd(12))} ${chalk.dim(info.size.padEnd(10))} ${info.speed.padEnd(10)} ${info.accuracy}`
    );
  }

  console.log(chalk.bold("\nMultilingual models:"));
  for (const model of ["tiny", "base", "small", "medium", "large-v1", "large-v2", "large-v3"] as const) {
    const info = MODEL_INFO[model];
    console.log(
      `  ${chalk.green(model.padEnd(12))} ${chalk.dim(info.size.padEnd(10))} ${info.speed.padEnd(10)} ${info.accuracy}`
    );
  }

  console.log(chalk.dim("\nTip: Use .en models for English-only transcription (faster and more accurate)"));
  console.log(chalk.dim("Tip: Models are downloaded on first use to ~/.listen/models\n"));
};

const listDevices = (): void => {
  console.log(chalk.bold.cyan("\nAudio Input Devices\n"));

  try {
    // Try to list devices using SoX
    const result = spawnSync("sox", ["-V6", "-n", "-n"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    // SoX doesn't have a great way to list devices, so we give platform-specific advice
    const platform = process.platform;

    if (platform === "darwin") {
      console.log(chalk.bold("macOS:"));
      console.log("  Default input device is used automatically.");
      console.log("  Change default in: System Preferences > Sound > Input");
      console.log("");
      console.log(chalk.dim("  To see devices: system_profiler SPAudioDataType"));
    } else if (platform === "linux") {
      console.log(chalk.bold("Linux:"));
      console.log("  Default ALSA device is used automatically.");
      console.log("");
      console.log(chalk.dim("  List devices: arecord -l"));
      console.log(chalk.dim("  List cards:   cat /proc/asound/cards"));

      // Try to show actual devices
      try {
        const arecord = spawnSync("arecord", ["-l"], { encoding: "utf8" });
        if (arecord.status === 0 && arecord.stdout) {
          console.log(chalk.bold("\n  Available recording devices:"));
          console.log(arecord.stdout.split("\n").map(line => "  " + line).join("\n"));
        }
      } catch {
        // arecord not available
      }
    } else {
      console.log("  Default system audio input device is used.");
    }

    console.log("");
  } catch (error) {
    console.log(chalk.yellow("Could not detect audio devices."));
    console.log(chalk.dim("Ensure SoX is installed: brew install sox (macOS) or apt install sox (Linux)\n"));
  }
};

export const parseCliArgs = (): CliConfig => {
  try {
    const { values } = parseArgs({
      args: Bun.argv.slice(2),
      options: {
        model: { type: "string", short: "m" },
        chunk: { type: "string", short: "c" },
        rate: { type: "string", short: "r" },
        output: { type: "string", short: "o" },
        temp: { type: "string", short: "t" },
        "log-level": { type: "string", short: "l" },
        "no-copy": { type: "boolean" },
        append: { type: "boolean" },
        "list-models": { type: "boolean" },
        "list-devices": { type: "boolean" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
      strict: false,
    });

    if (values.help) {
      console.log(HELP_TEXT);
      process.exit(0);
    }

    if (values.version) {
      console.log(`Listen v${VERSION}`);
      console.log(`Bun ${Bun.version}`);
      process.exit(0);
    }

    if (values["list-models"]) {
      listModels();
      process.exit(0);
    }

    if (values["list-devices"]) {
      listDevices();
      process.exit(0);
    }

    return {
      modelName: parseModelName(typeof values.model === 'string' ? values.model : undefined),
      chunkDuration: parseChunkDuration(typeof values.chunk === 'string' ? values.chunk : undefined),
      sampleRate: parseSampleRate(typeof values.rate === 'string' ? values.rate : undefined),
      outputFile: typeof values.output === 'string' ? join(process.cwd(), values.output) : DEFAULT_CONFIG.outputFile,
      tempDir: typeof values.temp === 'string' ? join(process.cwd(), values.temp) : DEFAULT_CONFIG.tempDir,
      logLevel: parseLogLevel(typeof values["log-level"] === 'string' ? values["log-level"] : undefined),
      noCopy: values["no-copy"] === true,
      append: values.append === true,
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red.bold("\n❌ Error:"), error.message);
      console.error(chalk.dim("\nRun with --help for usage information\n"));
    }
    process.exit(1);
  }
};
