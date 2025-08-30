# ARTISH - Setup and Environment Guide

## Prerequisites

### System Requirements
- **Node.js**: Version 20.0.0 or higher
- **npm**: Version 9.0.0 or higher (comes with Node.js)
- **Git**: For version control
- **VS Code**: Recommended IDE with extensions

### Recommended VS Code Extensions
- TypeScript and JavaScript Language Features
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- Prettier - Code formatter
- ESLint
- Auto Rename Tag
- Bracket Pair Colorizer

## Initial Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd artish-web
```

### 2. Install Dependencies
```bash
# Install all dependencies
npm install

# Verify installation
npm list --depth=0
```

### 3. Environment Configuration
The project uses local JSON file storage for development. No additional environment variables are required for basic functionality.

#### Optional Environment Variables
Create a `.env.local` file in the root directory for optional configurations:

```bash
# Development optimizations
SKIP_TYPE_CHECK=false
SKIP_LINT=false

# API Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Performance monitoring
ANALYZE=false
BUNDLE_ANALYZE=false

# Test configuration
NODE_ENV=development
DATA_ROOT=./data
JEST_VERBOSE=false
```

## Development Scripts

### Core Development Commands
```bash
# Start development server
npm run dev

# Fast development (skip type checking and linting)
npm run dev:fast

# Development with Turbo (experimental)
npm run dev:turbo

# Development with performance monitoring
npm run dev:monitor
```

### Build and Production
```bash
# Build for production
npm run build

# Start production server
npm run start

# Analyze bundle size
npm run analyze
npm run analyze:server
npm run analyze:browser
```

### Testing Commands
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run storage-specific tests
npm run test:storage

# Run storage tests with verbose output
npm run test:storage:verbose

# Run smoke tests
npm run test:smoke
```

### Development Tools
```bash
# Lint code
npm run lint

# Check for deprecated storage usage
npm run check-storage

# Health check API
npm run health-check

# Performance optimization tools
npm run optimize:imports
npm run optimize:deps
npm run optimize:hmr
npm run monitor:hmr
```

## Data Storage Setup

### Local Data Structure
The project uses a hierarchical JSON file storage system. The data directory structure will be automatically created when you start the application:

```
data/
├── users/
├── freelancers/
├── organizations/
├── projects/
├── project-tasks/
├── invoices/
├── transactions/
├── notifications/
├── gigs/
├── messages/
└── storefront/
```

### Data Migration Scripts
If you need to migrate existing data or set up test data:

```bash
# Migrate storage to hierarchical format
npm run migrate:storage
npm run migrate:storage:dry-run

# Migrate specific entities
npm run migrate:users
npm run migrate:freelancers
npm run migrate:organizations

# Dry run migrations (preview changes)
npm run migrate:users:dry
npm run migrate:freelancers:dry
npm run migrate:organizations:dry
```

## Development Workflow

### 1. Start Development Server
```bash
npm run dev
```
The application will be available at [http://localhost:3000](http://localhost:3000)

### 2. Development Features
- **Hot Module Replacement**: Automatic page refresh on code changes
- **TypeScript**: Real-time type checking
- **ESLint**: Code quality enforcement
- **Tailwind CSS**: Utility-first styling with hot reload

### 3. Performance Optimization
For better development performance on lower-end machines:

```bash
# Use fast development mode
npm run dev:fast

# Monitor HMR performance
npm run monitor:hmr

# Optimize imports
npm run optimize:imports
```

## Authentication Setup

### Development Authentication
The project includes a development-only authentication system:

- **Magic Link Authentication**: Passwordless login via console logs
- **Traditional Login**: Username/password with bcrypt hashing
- **Session Management**: Cookie-based sessions

### Test Accounts
The system will automatically create test accounts when you first run the application. Check the console logs for login credentials.

## Database and Storage

### Current Implementation
- **Storage Type**: JSON file-based hierarchical storage
- **Location**: `./data/` directory
- **Features**: Atomic operations, schema validation, transaction support

### Production Considerations
The current file-based storage is suitable for development and small-scale deployment. For production, consider:
- PostgreSQL or MongoDB for scalable data storage
- Redis for session management and caching
- Cloud storage for file uploads

## API Configuration

### Development API
All API endpoints are available at `http://localhost:3000/api/`

Key endpoints:
- `/api/auth/*` - Authentication
- `/api/projects/*` - Project management
- `/api/gigs/*` - Gig and matching system
- `/api/payments/*` - Payment processing
- `/api/dashboard/*` - Dashboard data

### API Testing
```bash
# Health check
curl http://localhost:3000/api/health/storage

# Test authentication
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```

#### Node Version Issues
```bash
# Check Node version
node --version

# Update Node.js to version 20+
# Use nvm (recommended)
nvm install 20
nvm use 20
```

#### Dependency Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript Errors
```bash
# Restart TypeScript server in VS Code
# Command Palette: "TypeScript: Restart TS Server"

# Or skip type checking temporarily
npm run dev:fast
```

### Performance Issues
If experiencing slow development performance:

```bash
# Use performance monitoring
npm run dev:monitor

# Optimize for development
npm run optimize:hmr

# Check bundle analysis
npm run analyze
```

### Data Issues
```bash
# Validate data integrity
npm run validate-data-integrity

# Check for deprecated file usage
npm run check-storage

# Run storage health check
npm run health-check
```

## IDE Configuration

### VS Code Settings
Create `.vscode/settings.json`:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

### VS Code Tasks
Create `.vscode/tasks.json` for common development tasks:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "dev",
      "type": "npm",
      "script": "dev",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    }
  ]
}
```

## Next Steps

After completing the setup:

1. **Explore the Application**: Navigate to different dashboards and features
2. **Review Documentation**: Check other documentation files for deeper understanding
3. **Run Tests**: Ensure everything is working with `npm run test`
4. **Start Development**: Begin making changes and see hot reload in action

For additional help, refer to:
- [Project Overview](./project-overview.md)
- [Architecture Guide](./architecture-guide.md)
- [Contribution Guide](./contribution-guide.md)
