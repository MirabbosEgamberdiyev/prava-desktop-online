/**
 * PRAVA DESKTOP ONLINE — STRUCTURED LOGGING ENGINE
 * High-performance, structured, secure logging with credential redaction & ring buffer.
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  context?: unknown;
}

const LEVEL_SEVERITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const SENSITIVE_KEYS = new Set([
  "token",
  "accesstoken",
  "refreshtoken",
  "password",
  "currentpassword",
  "newpassword",
  "secret",
  "authorization",
  "cookie",
  "key",
  "licensekey",
]);

function redactSensitive(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    if (obj.startsWith("Bearer ") && obj.length > 20) {
      return "Bearer [REDACTED]";
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item, depth + 1));
  }
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const lower = k.toLowerCase().replace(/[-_]/g, "");
      if (SENSITIVE_KEYS.has(lower)) {
        result[k] = "[REDACTED]";
      } else {
        result[k] = redactSensitive(v, depth + 1);
      }
    }
    return result;
  }
  return obj;
}

class Logger {
  private minLevel: LogLevel = "INFO";
  private readonly maxBufferSize = 500;
  private readonly ringBuffer: LogEntry[] = [];

  constructor() {
    if (import.meta.env?.DEV) {
      this.minLevel = "DEBUG";
    }
  }

  public setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private write(level: LogLevel, module: string, message: string, context?: unknown): void {
    if (LEVEL_SEVERITY[level] < LEVEL_SEVERITY[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      context: context !== undefined ? redactSensitive(context) : undefined,
    };

    this.ringBuffer.push(entry);
    if (this.ringBuffer.length > this.maxBufferSize) {
      this.ringBuffer.shift();
    }

    const prefix = `[${entry.timestamp}] [${level}] [${module}]:`;
    if (level === "ERROR") {
      console.error(prefix, message, entry.context ?? "");
    } else if (level === "WARN") {
      console.warn(prefix, message, entry.context ?? "");
    } else if (level === "INFO") {
      console.info(prefix, message, entry.context ?? "");
    } else {
      console.log(prefix, message, entry.context ?? "");
    }
  }

  public debug(module: string, message: string, context?: unknown): void {
    this.write("DEBUG", module, message, context);
  }

  public info(module: string, message: string, context?: unknown): void {
    this.write("INFO", module, message, context);
  }

  public warn(module: string, message: string, context?: unknown): void {
    this.write("WARN", module, message, context);
  }

  public error(module: string, message: string, context?: unknown): void {
    this.write("ERROR", module, message, context);
  }

  public getLogs(): readonly LogEntry[] {
    return this.ringBuffer;
  }

  public exportLogsJson(): string {
    return JSON.stringify(this.ringBuffer, null, 2);
  }

  public clear(): void {
    this.ringBuffer.length = 0;
  }
}

export const logger = new Logger();
export default logger;