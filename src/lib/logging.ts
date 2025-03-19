/**
 * Logging utility for the application
 * Provides different logging levels that can be configured based on environment
 */

/**
 * Available logging levels
 */
export enum LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR,
  NONE,
}

/**
 * Default log level based on environment
 */
const DEFAULT_LOG_LEVEL = import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.ERROR;

/**
 * Logger class that provides methods for different logging levels
 * Implements the Singleton pattern to ensure only one logger instance exists
 */
class Logger {
  private static instance: Logger | null = null;
  private level: LogLevel = DEFAULT_LOG_LEVEL;

  private constructor() {}

  /**
   * Get the singleton instance of the logger
   * @returns The logger instance
   */
  static getInstance(): Logger {
    if (this.instance === null) {
      this.instance = new Logger();
    }
    return this.instance;
  }

  /**
   * Set the logging level
   * @param level - The desired log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get current logging level
   * @returns The current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Log a debug message (lowest priority)
   * @param message - The message to log
   * @param args - Additional arguments to log
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      // eslint-disable-next-line no-console
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log an info message
   * @param message - The message to log
   * @param args - Additional arguments to log
   */
  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      // eslint-disable-next-line no-console
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Log a warning message
   * @param message - The message to log
   * @param args - Additional arguments to log
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * Log an error message (highest priority)
   * @param message - The message to log
   * @param args - Additional arguments to log
   */
  error(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}

// Export a singleton instance of the logger
export const logger = Logger.getInstance();

// Initialize logger level from environment
if (import.meta.env.PROD) {
  logger.setLevel(LogLevel.ERROR); // Only show errors in production
} else if (import.meta.env.VITE_APP_DEBUG === 'true') {
  logger.setLevel(LogLevel.DEBUG); // Show all logs in debug mode
} else {
  logger.setLevel(LogLevel.INFO); // Default to info level in development
}
