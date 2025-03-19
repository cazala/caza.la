# Issue 02: Remove Excessive Debug Logging

## Description

Remove excessive console.log statements and implement a proper logging system with different levels based on the environment.

## Problem

The codebase contains numerous console.log statements that:

- Create noise in the browser console
- Can impact performance in production
- Potentially expose implementation details to end users
- Make it difficult to identify actual important messages

## Solution

1. Remove unnecessary console.log statements
2. Replace critical logging with a configurable logging system
3. Configure logging to be disabled in production

## Implementation Details

1. Create a simple logging utility:

   ```typescript
   // src/lib/logging.ts

   enum LogLevel {
     DEBUG,
     INFO,
     WARN,
     ERROR,
     NONE,
   }

   class Logger {
     private static instance: Logger;
     private level: LogLevel = import.meta.env.DEV
       ? LogLevel.DEBUG
       : LogLevel.ERROR;

     private constructor() {}

     static getInstance(): Logger {
       if (!Logger.instance) {
         Logger.instance = new Logger();
       }
       return Logger.instance;
     }

     setLevel(level: LogLevel): void {
       this.level = level;
     }

     debug(message: string, ...args: any[]): void {
       if (this.level <= LogLevel.DEBUG) {
         console.log(`[DEBUG] ${message}`, ...args);
       }
     }

     info(message: string, ...args: any[]): void {
       if (this.level <= LogLevel.INFO) {
         console.info(`[INFO] ${message}`, ...args);
       }
     }

     warn(message: string, ...args: any[]): void {
       if (this.level <= LogLevel.WARN) {
         console.warn(`[WARN] ${message}`, ...args);
       }
     }

     error(message: string, ...args: any[]): void {
       if (this.level <= LogLevel.ERROR) {
         console.error(`[ERROR] ${message}`, ...args);
       }
     }
   }

   export const logger = Logger.getInstance();
   ```

2. Replace console.log statements in the codebase with appropriate logger methods:

   - Debug information: `logger.debug("Message")`
   - Information messages: `logger.info("Message")`
   - Warnings: `logger.warn("Message")`
   - Errors: `logger.error("Message")`

3. Configure logging behavior based on environment:
   ```typescript
   // In app initialization
   if (import.meta.env.PROD) {
     logger.setLevel(LogLevel.ERROR); // Only show errors in production
   }
   ```

## Benefits

- Cleaner browser console in production
- Improved performance by eliminating unnecessary console operations
- More structured and consistent logging
- Ability to configure logging verbosity based on environment
- Better debugging experience with categorized log messages

## Acceptance Criteria

- [ ] All direct console.log/warn/error calls are removed
- [ ] Critical logs are preserved using the new logger utility
- [ ] Logging is properly configured to be minimal in production
- [ ] Debug logs are only shown in development
- [ ] Error logs are preserved in all environments
- [ ] The logging system allows for future extension (e.g., sending logs to a server)
