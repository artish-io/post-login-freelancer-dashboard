# ARTISH - Conventions and Standards

## Code Style Guidelines

### TypeScript Standards

#### Type Definitions
```typescript
// Use interfaces for object shapes
interface User {
  id: number;
  name: string;
  email: string;
  type: 'freelancer' | 'commissioner';
}

// Use type aliases for unions and computed types
type UserType = 'freelancer' | 'commissioner' | 'admin';
type ProjectStatus = 'ongoing' | 'paused' | 'completed';

// Use enums for constants with semantic meaning
enum NotificationTypes {
  TASK_SUBMITTED = 'task.submitted',
  INVOICE_PAID = 'invoice.paid',
  PROJECT_COMPLETED = 'project.completed'
}
```

#### Function Signatures
```typescript
// Use explicit return types for public functions
export async function createProject(data: ProjectData): Promise<Project> {
  // Implementation
}

// Use proper error handling
export function validateInput(input: unknown): Result<ValidInput, ValidationError> {
  // Implementation
}
```

### React Component Standards

#### Component Structure
```typescript
// Use functional components with TypeScript
interface ComponentProps {
  title: string;
  onAction: (id: number) => void;
  isLoading?: boolean;
}

export default function ComponentName({ title, onAction, isLoading = false }: ComponentProps) {
  // Hooks at the top
  const [state, setState] = useState<StateType>(initialState);
  const { data, error } = useQuery();
  
  // Event handlers
  const handleClick = useCallback((id: number) => {
    onAction(id);
  }, [onAction]);
  
  // Early returns for loading/error states
  if (error) return <ErrorComponent error={error} />;
  if (isLoading) return <LoadingComponent />;
  
  // Main render
  return (
    <div className="component-container">
      {/* Component content */}
    </div>
  );
}
```

#### Styling Conventions
```typescript
// Use Tailwind CSS classes with consistent patterns
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
  <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
    Action
  </button>
</div>

// Use CSS variables for brand colors
// Primary: #eb1966, Secondary: #FCD5E3, Accent: #B30445
```

## Naming Conventions

### File and Directory Naming
- **Components**: PascalCase (`UserProfile.tsx`)
- **Pages**: kebab-case (`freelancer-dashboard/`)
- **API Routes**: kebab-case (`api/project-tasks/`)
- **Utilities**: camelCase (`dateUtils.ts`)
- **Services**: kebab-case with descriptive suffix (`unified-storage-service.ts`)
- **Types**: PascalCase (`UserTypes.ts`)

### Code Naming
```typescript
// Variables and functions: camelCase
const userName = 'john_doe';
const calculateTotalAmount = (items: Item[]) => { };

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.artish.com';

// Classes and interfaces: PascalCase
class PaymentProcessor { }
interface ProjectData { }

// Enums: PascalCase with descriptive values
enum ProjectStatus {
  ONGOING = 'ongoing',
  PAUSED = 'paused',
  COMPLETED = 'completed'
}
```

### Database/Storage Naming
```typescript
// Entity IDs: Descriptive prefixes
const projectId = 'C-001';  // Commissioner project
const invoiceId = 'TB-001'; // Freelancer initials + number
const transactionId = 'tx_1234567890_abc123';

// File paths: Hierarchical with dates
'data/projects/2025/July/15/1/project.json'
'data/invoices/2025/July/15/TB-001/invoice.json'
```

## API Design Standards

### REST Endpoint Patterns
```typescript
// Resource-based URLs
GET    /api/projects              // List projects
POST   /api/projects              // Create project
GET    /api/projects/[id]         // Get specific project
PUT    /api/projects/[id]         // Update project
DELETE /api/projects/[id]         // Delete project

// Action-based endpoints for complex operations
POST   /api/projects/[id]/activate
POST   /api/invoices/[id]/pay
POST   /api/gigs/[id]/apply
```

### Response Formats
```typescript
// Success responses
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully"
}

// Error responses
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided",
    "details": { /* validation details */ }
  }
}

// Paginated responses
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasNext": true
  }
}
```

### Error Handling
```typescript
// Use structured error types
export enum ErrorCodes {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  PAYMENT_FAILED = 'PAYMENT_FAILED'
}

// Consistent error handling pattern
export function withErrorHandling<T>(
  operation: () => Promise<T>
): Promise<Result<T, ApiError>> {
  try {
    const result = await operation();
    return ok(result);
  } catch (error) {
    return err(new ApiError(ErrorCodes.INTERNAL_ERROR, error.message));
  }
}
```

## Testing Standards

### Test Organization
```
src/
├── __tests__/              # Integration tests
├── lib/
│   └── services/
│       ├── user-service.ts
│       └── __tests__/
│           └── user-service.test.ts
└── components/
    ├── UserProfile.tsx
    └── UserProfile.test.tsx
```

### Unit Test Patterns
```typescript
// Use descriptive test names
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      // Arrange
      const userData = { name: 'John Doe', email: 'john@example.com' };
      
      // Act
      const result = await UserService.createUser(userData);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data.id).toBeDefined();
    });

    it('should return error for invalid email format', async () => {
      // Arrange
      const userData = { name: 'John Doe', email: 'invalid-email' };
      
      // Act
      const result = await UserService.createUser(userData);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });
  });
});
```

### Test Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ]
};
```

## Git Workflow Standards

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

#### Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

#### Examples
```
feat(auth): add magic link authentication
fix(payments): resolve invoice generation race condition
docs(api): update endpoint documentation
refactor(storage): migrate to hierarchical storage system
```

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `hotfix/description` - Critical fixes
- `docs/description` - Documentation updates

## Performance Standards

### Code Performance
```typescript
// Use React.memo for expensive components
export default React.memo(ExpensiveComponent);

// Use useCallback for event handlers
const handleClick = useCallback((id: number) => {
  onAction(id);
}, [onAction]);

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);
```

### Data Loading
```typescript
// Use proper loading states
const { data, isLoading, error } = useQuery('projects', fetchProjects);

// Implement pagination for large datasets
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery(
  'projects',
  ({ pageParam = 1 }) => fetchProjects(pageParam)
);
```

## Security Standards

### Input Validation
```typescript
// Use Zod for runtime validation
const UserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  type: z.enum(['freelancer', 'commissioner'])
});

// Validate all API inputs
export async function createUser(input: unknown) {
  const validatedInput = UserSchema.parse(input);
  // Process validated input
}
```

### Authentication
```typescript
// Use session guards for protected routes
export async function protectedHandler(req: NextRequest) {
  const session = await requireSession(req);
  // Handler logic with authenticated user
}

// Validate ownership for resource access
export async function updateProject(projectId: string, userId: number) {
  await assertOwnership(projectId, userId);
  // Update logic
}
```

## Documentation Standards

### Code Documentation
```typescript
/**
 * Creates a new project with the provided data
 * 
 * @param projectData - The project information
 * @param creatorId - ID of the user creating the project
 * @returns Promise resolving to the created project
 * @throws {ValidationError} When project data is invalid
 * @throws {AuthorizationError} When user lacks permissions
 */
export async function createProject(
  projectData: ProjectData,
  creatorId: number
): Promise<Project> {
  // Implementation
}
```

### API Documentation
- Document all endpoints with request/response examples
- Include error scenarios and status codes
- Provide authentication requirements
- Use OpenAPI/Swagger format when possible

These conventions ensure consistency, maintainability, and quality across the ARTISH codebase.
