# Testing Guide

This project uses Jest for testing with comprehensive setup for React components, TypeScript, and Next.js.

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI (no watch, with coverage)
npm run test:ci
```

## Test Structure

### Test Files
- Place test files in `__tests__` directories or name them `*.test.ts/tsx` or `*.spec.ts/tsx`
- Use `src/__tests__/` for general utility tests
- Use `src/[module]/__tests__/` for module-specific tests

### Example Test Structure
```
src/
├── __tests__/
│   ├── setup.test.ts          # Jest setup verification
│   └── test-utils.ts          # Testing utilities
├── components/
│   └── __tests__/
│       └── Button.test.tsx    # Component tests
└── lib/
    └── __tests__/
        └── utils.test.ts      # Utility function tests
```

## Testing Utilities

### Test Utils (`src/__tests__/test-utils.ts`)
- `render()` - Custom render function with providers
- `createMockUser()` - Generate mock user objects
- `createMockProject()` - Generate mock project objects
- `createMockTask()` - Generate mock task objects
- `mockFetch()` - Mock fetch requests
- `resetAllMocks()` - Reset all mocks between tests

### Example Usage
```typescript
import { render, screen, createMockUser } from '../__tests__/test-utils'
import UserProfile from './UserProfile'

test('displays user name', () => {
  const user = createMockUser({ name: 'John Doe' })
  render(<UserProfile user={user} />)
  expect(screen.getByText('John Doe')).toBeInTheDocument()
})
```

## Mocks

### Automatic Mocks
- Next.js router (`next/router` and `next/navigation`)
- Next.js Image and Link components
- Firebase services
- localStorage and sessionStorage
- DOM APIs (ResizeObserver, IntersectionObserver, matchMedia)

### Custom Mocks
Create mocks in `__mocks__/` directory:
```
__mocks__/
├── firebase.js        # Firebase mock
└── fileMock.js        # Static file mock
```

## Configuration

### Jest Config (`jest.config.js`)
- Uses Next.js Jest configuration
- TypeScript support with ts-jest
- JSDOM test environment
- Module path mapping for `@/` aliases
- Coverage collection from `src/`, `components/`, `utils/`, `hooks/`
- Coverage thresholds: 70% for branches, functions, lines, statements

### Setup Files
- `jest.setup.js` - Test environment setup and global mocks
- `jest.polyfills.js` - Node.js polyfills for browser APIs

## Writing Tests

### Component Tests
```typescript
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Button from './Button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### API Route Tests
```typescript
import { createMocks } from 'node-mocks-http'
import handler from './api/users'

describe('/api/users', () => {
  it('returns users list', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
  })
})
```

### Utility Function Tests
```typescript
import { formatDate } from './date-utils'

describe('formatDate', () => {
  it('formats date correctly', () => {
    const date = new Date('2023-01-01')
    expect(formatDate(date)).toBe('January 1, 2023')
  })
})
```

## Coverage

### Viewing Coverage
- Run `npm run test:coverage` to generate coverage report
- Open `coverage/lcov-report/index.html` in browser for detailed view
- Coverage reports are generated in `coverage/` directory

### Coverage Thresholds
Current thresholds (70% for all metrics):
- Statements: 70%
- Branches: 70%
- Functions: 70%
- Lines: 70%

### Excluded from Coverage
- Type definition files (`*.d.ts`)
- Next.js pages and layouts
- Global CSS files
- Node modules and build directories

## CI/CD Integration

### GitHub Actions
Tests run automatically on:
- Push to `main` and `develop` branches
- Pull requests to `main` and `develop`

### VS Code Integration
- Jest extension provides inline test results
- Coverage highlighting in editor
- Test debugging support

## Best Practices

1. **Test Structure**: Use `describe` blocks to group related tests
2. **Test Names**: Use descriptive test names that explain the expected behavior
3. **Arrange-Act-Assert**: Structure tests with clear setup, action, and assertion phases
4. **Mock External Dependencies**: Mock API calls, external services, and complex dependencies
5. **Test Edge Cases**: Include tests for error conditions and edge cases
6. **Keep Tests Fast**: Avoid unnecessary async operations and complex setup
7. **One Assertion Per Test**: Focus each test on a single behavior

## Troubleshooting

### Common Issues
- **Module not found**: Check module path mapping in `jest.config.js`
- **JSX syntax errors**: Ensure files use `.tsx` extension for JSX
- **Mock not working**: Verify mock is in correct location and properly exported
- **Coverage not collected**: Check file is included in `collectCoverageFrom` pattern

### Debug Tests
```bash
# Run specific test file
npm test -- Button.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="should render"

# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```
