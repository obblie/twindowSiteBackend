import { env } from "../config/env.js";

type Level = "debug" | "info" | "warn" | "error";

const levelRank: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function shouldLog(level: Level): boolean {
  return levelRank[level] >= levelRank[env.LOG_LEVEL];
}

function log(level: Level, message: string, meta?: Record<string, unknown>): void {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta } : {})
  };

  if (level === "error" || level === "warn") {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(payload));
  } else {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload));
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta)
};

