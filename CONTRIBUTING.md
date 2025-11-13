# Contributing to Tawk Agents SDK

Thank you for your interest in contributing to Tawk Agents SDK!

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/tawk/agents-sdk.git
   cd tawk-agents-sdk
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run examples**
   ```bash
   npm run example
   ```

## Code Standards

### TypeScript

- Use TypeScript strict mode
- Provide proper type annotations
- Avoid `any` types when possible
- Use interfaces for public APIs
- Use types for internal implementations

### Code Style

- Follow the project's ESLint and Prettier configurations
- Use meaningful variable and function names
- Write self-documenting code
- Add JSDoc comments for public APIs

### Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Aim for high code coverage

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, documented code
   - Add tests
   - Update documentation

3. **Commit your changes**
   ```bash
   git commit -m "feat: add your feature"
   ```

   Follow conventional commits:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `refactor:` for code refactoring
   - `test:` for tests
   - `chore:` for maintenance

4. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Code Review**
   - Address review feedback
   - Keep the PR updated

## Code of Conduct

- Be respectful and inclusive
- Accept constructive criticism
- Focus on what's best for the community

## Questions?

Feel free to open an issue for any questions or concerns.

Thank you for contributing! 🎉

