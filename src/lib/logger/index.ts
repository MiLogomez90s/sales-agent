import { getDb, prepare } from '@/lib/db';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

export async function log(level: LogLevel, category: string, message: string, metadata?: unknown) {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[MIN_LEVEL]) return;

  try {
    const stmt = await prepare(
      'INSERT INTO logs (level, category, message, metadata) VALUES (?, ?, ?, ?)'
    );
    await stmt.run(level, category, message, metadata ? JSON.stringify(metadata) : null);
  } catch {
    // Fallback to console if DB is unavailable
    console.log(`[${level}] ${category}: ${message}`);
  }
}

export const logger = {
  debug: (category: string, message: string, metadata?: unknown) =>
    log('debug', category, message, metadata),
  info: (category: string, message: string, metadata?: unknown) =>
    log('info', category, message, metadata),
  warn: (category: string, message: string, metadata?: unknown) =>
    log('warn', category, message, metadata),
  error: (category: string, message: string, metadata?: unknown) =>
    log('error', category, message, metadata),
};
