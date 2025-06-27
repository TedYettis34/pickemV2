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

### Required GitHub Secrets:
The following secrets must be configured in your repository settings:
- `NEXT_PUBLIC_AWS_REGION` - AWS region (e.g., us-east-1)
- `NEXT_PUBLIC_USER_POOL_ID` - Cognito User Pool ID
- `NEXT_PUBLIC_USER_POOL_CLIENT_ID` - Cognito User Pool Client ID

## Setting Up Secrets:
1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each required secret with its value

This ensures code quality and prevents broken code from being merged into main.