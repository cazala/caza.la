# Issue 02: Remove Excessive Debug Logging

## Status

- ✅ Completed

## Description

The codebase had multiple instances of direct `console.log` statements scattered throughout the code, making it difficult to control logging behavior and creating noise in the console. We needed a structured logging system that could be configured based on the environment and allow for different log levels.

## Problems Identified

- Direct use of `console.log`, `console.warn`, and other console methods throughout the codebase
- No way to disable logging in production
- No consistent format for logged messages
- No way to filter logs by severity or importance

## Implemented Solution

1. Created a new logger utility in `src/lib/logging.ts` that:

   - Implements different logging levels (DEBUG, INFO, WARN, ERROR, NONE)
   - Uses a singleton pattern to ensure a single logger instance
   - Formats log messages consistently with level indicators
   - Allows dynamic setting of the log level

2. Created a configuration system in `src/lib/config.ts` that:

   - Manages environment detection (development, production, test)
   - Configures the logger based on environment
   - Provides a centralized place for other configuration settings
   - Exposes helper methods for environment checks

3. Replaced all instances of direct console methods with the logger in:

   - main.tsx
   - App.tsx
   - components/FishCanvas.tsx
   - lib/Simulation.ts
   - Added logger import to other files for future use

4. Added ESLint disable comments for console methods in the logger class itself

## Implementation Details

- The logger uses environment variables to set the default log level
- In production, only ERROR logs are shown by default
- In development, INFO and above are shown by default
- When debug mode is enabled, all logs are shown (including DEBUG)
- Added the logger to all major components with appropriate log level calls

## Benefits

- Centralized control over logging behavior
- Ability to filter logs by importance
- Cleaner console output in production environments
- More consistent and informative log messages
- Code that's easier to debug with standardized logging

## Acceptance Criteria

- ✅ All direct console method calls replaced with logger
- ✅ Logger configurable based on environment
- ✅ Logging levels implemented (DEBUG, INFO, WARN, ERROR)
- ✅ Log messages consistently formatted
- ✅ ESLint configuration updated to warn about direct console usage
