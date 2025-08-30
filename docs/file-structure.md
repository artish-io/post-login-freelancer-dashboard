# ARTISH - File Structure Guide

## Repository Overview

This document outlines the file organization, naming conventions, and guidelines for where new code should be placed in the ARTISH project.

## Root Directory Structure

```
artish-web/
├── src/                     # Source code (Next.js app)
├── components/              # Reusable React components
├── lib/                     # Core business logic and utilities
├── data/                    # JSON-based data storage
├── docs/                    # Project documentation
├── public/                  # Static assets and images
├── scripts/                 # Utility and migration scripts
├── tests/                   # Test files
├── types/                   # TypeScript type definitions
├── utils/                   # Utility functions
├── hooks/                   # Custom React hooks
├── package.json             # Dependencies and scripts
├── next.config.js           # Next.js configuration
├── tailwind.config.js       # Tailwind CSS configuration
└── tsconfig.json            # TypeScript configuration
```

## Source Code Organization (`src/`)

### App Router Structure (`src/app/`)
```
src/app/
├── api/                     # API routes
│   ├── auth/               # Authentication endpoints
│   ├── projects/           # Project management APIs
│   ├── gigs/               # Gig and matching APIs
│   ├── payments/           # Payment processing APIs
│   ├── dashboard/          # Dashboard data APIs
│   └── admin/              # Admin functionality APIs
├── freelancer-dashboard/    # Freelancer pages
├── commissioner-dashboard/  # Commissioner pages
├── admin-dashboard/         # Admin pages
├── login/                  # Authentication pages
├── get-started/            # Onboarding pages
├── app/                    # Main application entry
├── layout.tsx              # Root layout component
└── globals.css             # Global styles
```

### Business Logic (`src/lib/`)
```
src/lib/
├── storage/                # Data storage services
│   ├── unified-storage-service.ts
│   ├── hierarchical-transaction-service.ts
│   └── legacy-prevention.ts
├── notifications/          # Notification system
│   ├── notification-storage.ts
│   ├── payment-enrichment.ts
│   └── deduplication.ts
├── payments/               # Payment processing
│   ├── upfront-payment-guard.ts
│   └── payment-validation.ts
├── invoices/               # Invoice management
│   ├── robust-invoice-service.ts
│   └── invoice-storage.ts
├── services/               # Business services
│   ├── unified-task-service.ts
│   └── balance-calculation-service.ts
├── auth/                   # Authentication logic
│   └── session-guard.ts
├── events/                 # Event system
│   ├── event-logger.ts
│   ├── bus.ts
│   └── emitter.ts
└── utils/                  # Utility functions
```

## Component Organization (`components/`)

### Component Structure
```
components/
├── ui/                     # Base UI components
│   ├── loading-skeleton.tsx
│   ├── toast.tsx
│   └── navigation-progress.tsx
├── shared/                 # Shared business components
├── freelancer-dashboard/   # Freelancer-specific components
├── commissioner-dashboard/ # Commissioner-specific components
├── admin-dashboard/        # Admin-specific components
├── auth/                   # Authentication components
├── notifications/          # Notification components
├── storefront/             # Storefront components
├── user-profiles/          # Profile management components
├── navbar1.tsx             # Main navigation
├── footer.tsx              # Site footer
└── landing_body.tsx        # Landing page content
```

## Data Storage Structure (`data/`)

### Hierarchical Organization
```
data/
├── projects/               # Project data
│   └── 2025/July/15/1/project.json
├── project-tasks/          # Task data
│   └── 2025/July/15/1/task.json
├── invoices/               # Invoice data
│   └── 2025/July/15/TB-001/invoice.json
├── transactions/           # Transaction data
│   └── 2025/July/15/tx_123/transaction.json
├── notifications/          # Notification events
│   └── events/2025/July/15/task_approved.json
├── users/                  # User data
│   └── 2025/July/01/1/user.json
├── freelancers/            # Freelancer profiles
├── organizations/          # Organization data
├── gigs/                   # Gig data
├── messages/               # Communication data
├── storefront/             # Storefront data
└── wallet/                 # Wallet and balance data
```

## Naming Conventions

### Files and Directories
- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Pages**: kebab-case (e.g., `freelancer-dashboard/`)
- **API Routes**: kebab-case (e.g., `api/project-tasks/`)
- **Utilities**: camelCase (e.g., `dateUtils.ts`)
- **Services**: kebab-case with suffix (e.g., `unified-storage-service.ts`)

### Code Conventions
- **React Components**: PascalCase
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase
- **Variables**: camelCase

### Data File Naming
- **Project IDs**: Organization prefix + number (e.g., `C-001`, `UNQ-001`)
- **Invoice Numbers**: Freelancer initials + number (e.g., `TB-001`, `JS-002`)
- **Transaction IDs**: `tx_` prefix + timestamp + random (e.g., `tx_1234567890_abc123`)
- **User IDs**: Sequential numbers (e.g., `1`, `2`, `3`)

## Where to Add New Code

### New API Endpoints
```
src/app/api/[feature]/
├── route.ts                # Main CRUD operations
├── [id]/
│   └── route.ts           # ID-specific operations
└── services/
    └── [feature]-service.ts # Business logic
```

### New Components
```
components/[domain]/
├── [component-name].tsx    # Main component
├── [component-name].test.tsx # Tests
└── types.ts               # Component-specific types
```

### New Business Logic
```
src/lib/[domain]/
├── [service-name].ts      # Main service
├── types.ts               # Domain types
├── utils.ts               # Domain utilities
└── __tests__/             # Unit tests
```

### New Pages
```
src/app/[page-name]/
├── page.tsx               # Main page component
├── layout.tsx             # Page-specific layout (optional)
└── loading.tsx            # Loading state (optional)
```

## Configuration Files

### Key Configuration Files
- `next.config.js` - Next.js build and runtime configuration
- `tailwind.config.js` - Styling and design system configuration
- `tsconfig.json` - TypeScript compiler configuration
- `jest.config.js` - Test configuration
- `eslint.config.mjs` - Code linting rules
- `package.json` - Dependencies and npm scripts

### Environment Configuration
- Development: Uses local JSON files for data storage
- Production: Ready for database migration and cloud deployment

## Asset Organization (`public/`)

```
public/
├── icons/                  # SVG icons and small graphics
├── images/                 # General images
├── avatars/                # User avatar images
├── logos/                  # Brand and organization logos
├── storefront-submissions/ # User-uploaded storefront files
└── app/                    # App-specific assets
```

## Scripts Directory (`scripts/`)

### Script Categories
- **Migration Scripts**: Data migration utilities
- **Testing Scripts**: Automated testing tools
- **Development Scripts**: Development optimization tools
- **Audit Scripts**: Data integrity and health checks

### Script Naming
- Use descriptive kebab-case names
- Include purpose in filename (e.g., `migrate-users-to-hierarchical.ts`)
- Group related scripts in subdirectories when needed

## Best Practices

### File Organization
1. **Group by Feature**: Keep related files together
2. **Consistent Naming**: Follow established conventions
3. **Clear Hierarchy**: Logical directory structure
4. **Separation of Concerns**: Business logic separate from UI

### Code Organization
1. **Single Responsibility**: One purpose per file
2. **Dependency Direction**: Import from lower-level modules
3. **Type Safety**: Use TypeScript throughout
4. **Error Handling**: Consistent error patterns

### Data Organization
1. **Hierarchical Storage**: Date-based organization
2. **Atomic Operations**: Use transaction services
3. **Schema Validation**: Validate all data writes
4. **Index Maintenance**: Keep indexes synchronized

## Migration Guidelines

When moving or refactoring files:
1. Update all import statements
2. Check for hardcoded paths
3. Update test files
4. Verify API routes still work
5. Update documentation

This structure provides a scalable foundation that can grow with the project while maintaining clear organization and developer productivity.
