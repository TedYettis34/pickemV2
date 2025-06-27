# GitHub Actions Workflows

## Test Suite (`test.yml`)

This workflow automatically runs on:
- **Pull Requests** targeting the `main` branch
- **Pushes** to the `main` branch

### What it does:
1. **Linting** - Runs ESLint to check code quality
2. **Testing** - Executes the full Jest test suite
3. **Build** - Verifies the Next.js build succeeds
4. **Coverage** - Generates test coverage reports

### Requirements for PR approval:
- ✅ All tests must pass (25/25)
- ✅ No linting errors
- ✅ Build must succeed
- ✅ Code coverage is generated

### Environment:
- **OS**: Ubuntu Latest
- **Node.js**: v20.x
- **Package Manager**: npm (with caching)

This ensures code quality and prevents broken code from being merged into main.