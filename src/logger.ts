import pino from 'pino';

export const createLogger = (logLevel: string = 'error') => {
  return pino({ level: logLevel, base: undefined });
};

export type Logger = ReturnType<typeof createLogger>;
