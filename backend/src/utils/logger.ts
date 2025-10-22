// Simple logging utility to control console output verbosity
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

class Logger {
  private level: LogLevel;

  constructor() {
    // Set log level based on environment
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'ERROR':
        this.level = LogLevel.ERROR;
        break;
      case 'WARN':
        this.level = LogLevel.WARN;
        break;
      case 'INFO':
        this.level = LogLevel.INFO;
        break;
      case 'DEBUG':
        this.level = LogLevel.DEBUG;
        break;
      default:
        // Default to INFO in production, DEBUG in development
        this.level = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.ERROR) {
      console.error(`❌ ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.WARN) {
      console.warn(`⚠️ ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.INFO) {
      console.log(`ℹ️ ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.DEBUG) {
      console.log(`🔍 ${message}`, ...args);
    }
  }

  // Database specific logging methods
  dbInfo(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.INFO) {
      console.log(`🗄️ ${message}`, ...args);
    }
  }

  dbDebug(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.DEBUG) {
      console.log(`🔍 ${message}`, ...args);
    }
  }

  success(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.INFO) {
      console.log(`✅ ${message}`, ...args);
    }
  }

  server(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.INFO) {
      console.log(`🚀 ${message}`, ...args);
    }
  }
}

export const logger = new Logger();
export default logger;
