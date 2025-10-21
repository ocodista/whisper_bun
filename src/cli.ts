import { parseArgs } from "util";
import { join } from "path";
import chalk from "chalk";

export interface CliConfig {
  sampleRate: number;
  tempDir: string;
  modelName: string;
  chunkDuration: number;
  logLevel: "error" | "warn" | "info" | "debug";
  outputFile: string;
}

const DEFAULT_CONFIG: CliConfig = {
  sampleRate: 16000,
  tempDir: join(process.cwd(), "temp"),
  modelName: "base.en",
  chunkDuration: 3,
  logLevel: "error",
  outputFile: join(process.cwd(), "result.txt"),
};

const VALID_MODELS = [
  "tiny.en",
  "base.en",
  "small.en",
  "medium.en",
  "large-v1",
  "large-v2",
  "large-v3",
] as const;

const VALID_LOG_LEVELS = ["error", "warn", "info", "debug"] as const;

const VERSION = "1.0.0";

const HELP_TEXT = `
${chalk.bold.cyan("Whisper Bun")} - Real-time speech transcription

${chalk.bold("USAGE:")}
  bun run start [options]

${chalk.bold("OPTIONS:")}
  -m, --model <name>        Model name (default: base.en)
                            Available: ${VALID_MODELS.join(", ")}
  -c, --chunk <seconds>     Chunk duration (default: 3, range: 0.1-60)
  -r, --rate <hz>           Sample rate (default: 16000, range: 8000-48000)
  -o, --output <path>       Output file path (default: result.txt)
  -t, --temp <path>         Temp directory (default: ./temp)
  -l, --log-level <level>   Log level (default: error)
                            Options: ${VALID_LOG_LEVELS.join(", ")}
  -h, --help                Show this help message
  -v, --version             Show version

${chalk.bold("EXAMPLES:")}
  bun run start
  bun run start --model small.en
  bun run start --chunk 5 --output transcript.txt
  bun run start --model large-v3 --log-level debug
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
      console.log(`Whisper Bun v${VERSION}`);
      console.log(`Bun ${Bun.version}`);
      process.exit(0);
    }

    return {
      modelName: parseModelName(typeof values.model === 'string' ? values.model : undefined),
      chunkDuration: parseChunkDuration(typeof values.chunk === 'string' ? values.chunk : undefined),
      sampleRate: parseSampleRate(typeof values.rate === 'string' ? values.rate : undefined),
      outputFile: typeof values.output === 'string' ? join(process.cwd(), values.output) : DEFAULT_CONFIG.outputFile,
      tempDir: typeof values.temp === 'string' ? join(process.cwd(), values.temp) : DEFAULT_CONFIG.tempDir,
      logLevel: parseLogLevel(typeof values["log-level"] === 'string' ? values["log-level"] : undefined),
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red.bold("\n❌ Error:"), error.message);
      console.error(chalk.dim("\nRun with --help for usage information\n"));
    }
    process.exit(1);
  }
};
