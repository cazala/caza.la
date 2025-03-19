/**
 * Application configuration settings
 */
import { logger, LogLevel } from './logging';

/**
 * Application environment
 */
export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Application configuration
 */
class Config {
  private env: Environment;
  private debug: boolean;
  private apiUrl: string;

  constructor() {
    // Set environment
    this.env = (import.meta.env.VITE_APP_ENV as Environment) || Environment.Development;

    // Set debug mode
    this.debug = import.meta.env.VITE_APP_DEBUG === 'true';

    // Set API URL
    this.apiUrl = import.meta.env.VITE_APP_API_URL || 'http://localhost:3000';

    // Configure logger based on environment and debug setting
    this.configureLogger();
  }

  /**
   * Get current environment
   */
  getEnvironment(): Environment {
    return this.env;
  }

  /**
   * Check if running in development environment
   */
  isDevelopment(): boolean {
    return this.env === Environment.Development;
  }

  /**
   * Check if running in production environment
   */
  isProduction(): boolean {
    return this.env === Environment.Production;
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugEnabled(): boolean {
    return this.debug;
  }

  /**
   * Get API URL
   */
  getApiUrl(): string {
    return this.apiUrl;
  }

  /**
   * Configure logger based on environment and debug settings
   */
  configureLogger(): void {
    if (this.isProduction()) {
      // In production, only show errors by default
      logger.setLevel(LogLevel.ERROR);
    } else if (this.isDebugEnabled()) {
      // In debug mode, show all logs
      logger.setLevel(LogLevel.DEBUG);
    } else {
      // In development without debug, show info and above
      logger.setLevel(LogLevel.INFO);
    }
  }

  /**
   * Set log level manually
   */
  setLogLevel(level: LogLevel): void {
    logger.setLevel(level);
  }
}

// Export a singleton instance
export const config = new Config();
