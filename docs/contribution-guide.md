# ARTISH - Contribution Guide

## Getting Started

Before contributing to ARTISH, ensure you have completed the initial setup as described in the [Setup and Environment Guide](./setup-and-environment.md).

## Development Workflow

### 1. Branch Creation
Create a new branch for your feature or fix:

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description

# Or for documentation
git checkout -b docs/documentation-update
```

### 2. Development Process

#### Before Making Changes
1. **Understand the Architecture**: Review the [Architecture Guide](./architecture-guide.md)
2. **Follow Conventions**: Adhere to [Conventions and Standards](./conventions-and-standards.md)
3. **Check File Structure**: Use proper organization per [File Structure Guide](./file-structure.md)

#### Making Changes
```bash
# Start development server
npm run dev

# Run tests in watch mode (optional)
npm run test:watch

# Check for linting issues
npm run lint
```

### 3. Code Quality Checks

#### Pre-commit Checklist
- [ ] Code follows TypeScript best practices
- [ ] Components are properly typed
- [ ] API endpoints include error handling
- [ ] New features include tests
- [ ] Documentation is updated
- [ ] No console.log statements in production code
- [ ] Proper error handling implemented

#### Running Quality Checks
```bash
# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Tests
npm run test

# Storage integrity check
npm run check-storage

# Health check
npm run health-check
```

## Adding New Features

### 1. API Endpoints
When adding new API endpoints:

```typescript
// src/app/api/[feature]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSession, assert } from '@/lib/auth/session-guard';
import { ok, err, ErrorCodes, withErrorHandling } from '@/lib/http/envelope';

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    // Authentication
    const session = await requireSession(req);
    
    // Input validation
    const body = await req.json();
    const validatedInput = YourSchema.parse(body);
    
    // Business logic
    const result = await YourService.performOperation(validatedInput);
    
    return ok(result);
  });
}
```

### 2. React Components
When creating new components:

```typescript
// components/[domain]/ComponentName.tsx
interface ComponentNameProps {
  // Define props with proper types
  title: string;
  onAction: (id: number) => void;
  isLoading?: boolean;
}

export default function ComponentName({ 
  title, 
  onAction, 
  isLoading = false 
}: ComponentNameProps) {
  // Component implementation
  return (
    <div className="component-container">
      {/* Component content */}
    </div>
  );
}
```

### 3. Business Logic Services
When adding new services:

```typescript
// src/lib/services/your-service.ts
import { UnifiedStorageService } from '../storage/unified-storage-service';

export class YourService {
  static async performOperation(data: InputType): Promise<ResultType> {
    // Validation
    const validatedData = validateInput(data);
    
    // Business logic
    const result = await processData(validatedData);
    
    // Storage operations
    await UnifiedStorageService.save(result);
    
    return result;
  }
}
```

## Testing Guidelines

### 1. Unit Tests
Write unit tests for all business logic:

```typescript
// src/lib/services/__tests__/your-service.test.ts
import { YourService } from '../your-service';

describe('YourService', () => {
  describe('performOperation', () => {
    it('should process valid input correctly', async () => {
      // Arrange
      const input = { /* test data */ };
      
      // Act
      const result = await YourService.performOperation(input);
      
      // Assert
      expect(result).toMatchObject({ /* expected result */ });
    });

    it('should handle invalid input gracefully', async () => {
      // Arrange
      const invalidInput = { /* invalid data */ };
      
      // Act & Assert
      await expect(YourService.performOperation(invalidInput))
        .rejects.toThrow('Expected error message');
    });
  });
});
```

### 2. Integration Tests
For API endpoints and complex workflows:

```typescript
// src/__tests__/api/your-endpoint.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '../../app/api/your-endpoint/route';

describe('/api/your-endpoint', () => {
  it('should handle POST requests correctly', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { /* test data */ }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toMatchObject({
      success: true,
      data: expect.any(Object)
    });
  });
});
```

### 3. Running Tests
```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- your-service.test.ts

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode during development
npm run test:watch
```

## Code Review Process

### 1. Self-Review Checklist
Before submitting a pull request:

- [ ] **Functionality**: Feature works as expected
- [ ] **Tests**: All tests pass and new tests are added
- [ ] **Performance**: No performance regressions
- [ ] **Security**: No security vulnerabilities introduced
- [ ] **Documentation**: Code is well-documented
- [ ] **Consistency**: Follows project conventions
- [ ] **Error Handling**: Proper error handling implemented

### 2. Pull Request Guidelines

#### PR Title Format
```
type(scope): description

Examples:
feat(auth): add magic link authentication
fix(payments): resolve invoice generation race condition
docs(api): update endpoint documentation
```

#### PR Description Template
```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project conventions
- [ ] Self-review completed
- [ ] Tests pass locally
- [ ] Documentation updated
```

### 3. Review Criteria
Reviewers should check for:

- **Code Quality**: Clean, readable, maintainable code
- **Architecture**: Follows established patterns
- **Performance**: No unnecessary performance impacts
- **Security**: No security vulnerabilities
- **Testing**: Adequate test coverage
- **Documentation**: Clear documentation and comments

## Deployment and Release

### 1. Pre-deployment Checks
```bash
# Build the application
npm run build

# Run full test suite
npm run test

# Check for deprecated storage usage
npm run check-storage

# Validate data integrity
npm run validate-data-integrity
```

### 2. Production Considerations
Before deploying to production:

- [ ] Environment variables configured
- [ ] Database migration scripts ready
- [ ] Backup procedures in place
- [ ] Monitoring and logging configured
- [ ] Performance testing completed
- [ ] Security audit completed

## Common Contribution Scenarios

### Adding a New Dashboard Feature
1. Create API endpoint in `src/app/api/dashboard/`
2. Add business logic in `src/lib/services/`
3. Create React components in `components/dashboard/`
4. Add tests for all layers
5. Update documentation

### Adding a New Payment Method
1. Extend payment service in `src/lib/payments/`
2. Update invoice generation logic
3. Add API endpoints for new payment flow
4. Create UI components for payment method
5. Add comprehensive tests
6. Update payment documentation

### Adding a New User Type
1. Update user types in `src/types/`
2. Extend authentication system
3. Create new dashboard components
4. Add role-based access controls
5. Update API endpoints for new permissions
6. Add migration scripts if needed

## Getting Help

### Resources
- [Project Overview](./project-overview.md) - Understanding the project
- [Architecture Guide](./architecture-guide.md) - System architecture
- [File Structure](./file-structure.md) - Code organization
- [Conventions](./conventions-and-standards.md) - Coding standards

### Communication
- **Issues**: Use GitHub issues for bug reports and feature requests
- **Discussions**: Use GitHub discussions for questions and ideas
- **Code Review**: Participate in pull request reviews

### Debugging
```bash
# Development debugging
npm run dev:monitor

# Check application health
npm run health-check

# Analyze bundle size
npm run analyze

# Check for performance issues
npm run optimize:deps
```

## Best Practices Summary

1. **Start Small**: Begin with small, focused changes
2. **Test Thoroughly**: Write tests before and after implementation
3. **Document Changes**: Update documentation for new features
4. **Follow Conventions**: Adhere to established patterns
5. **Seek Feedback**: Ask for reviews early and often
6. **Stay Updated**: Keep up with project changes and updates

By following this guide, you'll contribute effectively to the ARTISH project while maintaining code quality and consistency.
