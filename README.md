# caza.la

This is my personal website, featuring an interactive fish simulation that responds to user interactions.

# Fish Simulation

A browser-based fish shoaling behavior simulation.

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation

```bash
# Install dependencies
npm install
```

### Available Scripts

- `npm start` - Start the development server
- `npm run build` - Build the project for production
- `npm run lint` - Run ESLint to check code quality
- `npm run format` - Format code using Prettier
- `npm run preview` - Preview the production build locally

### Development Environment

The project includes:

- TypeScript in strict mode
- ESLint for code quality
- Prettier for code formatting
- Husky for git hooks
- Lint-staged for pre-commit validation

All code must pass linting and formatting checks before it can be committed.

## Project Structure

- `/src` - Source code
  - `/components` - React components
  - `/lib` - Core simulation logic
  - `/utils` - Utility functions
- `/public` - Static assets
- `/dist` - Production build output (generated)
