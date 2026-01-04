# caza.la

This is my personal website. The homepage renders an interactive demo powered by [`@cazala/party`](https://www.npmjs.com/package/@cazala/party).

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

- `/src` - Source code (React + TypeScript)
  - `/components` - React components (including the canvas demo)
- `/public` - Static assets
- `/dist` - Production build output (generated)
