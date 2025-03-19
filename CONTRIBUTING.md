# Contributing to Fish Simulation

Thank you for considering contributing to this project! Here's how to get started.

## Development Environment Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/fish-simulation.git
   cd fish-simulation
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm start
   ```

## Code Standards

This project follows strict coding standards to ensure maintainability and quality:

### TypeScript

- TypeScript strict mode is enabled
- All functions should have proper return type annotations
- Avoid using `any` type
- Use interfaces for object shapes
- Initialize all class properties properly

### ESLint and Prettier

The codebase is configured with ESLint and Prettier to maintain consistent code style:

- ESLint rules enforce best practices
- Prettier ensures consistent formatting
- Pre-commit hooks validate code before commits

Run the linter:

```bash
npm run lint
```

Format your code:

```bash
npm run format
```

### Committing Changes

The project has pre-commit hooks that run:

1. TypeScript type-checking
2. ESLint to catch code issues
3. Prettier to ensure consistent formatting

If any of these checks fail, your commit will be rejected. Fix the issues and try again.

## Pull Request Process

1. Create a new branch from `main` for your feature
2. Make your changes following the code standards
3. Write tests for your changes if applicable
4. Ensure all tests and linting checks pass
5. Create a pull request with a clear description of your changes
6. Wait for code review and address any feedback

## Environment Variables

For local development, you can set up environment-specific variables:

- `.env.development` - Development environment settings
- `.env.production` - Production settings

These files are gitignored, but you can copy from the examples in the repository.

## Documentation

Please document all public functions, classes, and components using JSDoc comments. This helps other developers understand your code better.
