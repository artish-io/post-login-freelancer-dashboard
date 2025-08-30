# ARTISH - Architecture Guide

## System Overview

ARTISH follows a modular, service-oriented architecture built on Next.js with a hierarchical data storage system. The platform is designed around three core user types: freelancers, commissioners, and administrators, each with dedicated workflows and interfaces.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Freelancer  │  │Commissioner │  │    Admin    │        │
│  │ Dashboard   │  │ Dashboard   │  │ Dashboard   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Projects  │  │    Gigs     │  │  Payments   │        │
│  │     API     │  │     API     │  │     API     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                 Business Logic Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Storage   │  │Notification │  │Transaction  │        │
│  │  Services   │  │   System    │  │  Services   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                │
│           Hierarchical JSON File Storage                    │
└─────────────────────────────────────────────────────────────┘
```

## Core Modules

### 1. Storage System
**Location**: `src/lib/storage/`

- **Unified Storage Service**: Central data access layer with atomic operations
- **Hierarchical Storage**: Date-based file organization (YYYY/Month/Day/ID/)
- **Legacy Prevention**: Runtime detection of deprecated flat file usage
- **Transaction Service**: ACID-compliant operations with rollback capabilities

**Key Features**:
- Atomic file operations with temp file + rename
- Zod schema validation on all writes
- Per-file mutex for thread safety
- Index synchronization

### 2. Notification System
**Location**: `src/lib/notifications/`

- **Event-Driven Architecture**: Decoupled notification emission
- **Granular Storage**: Partitioned by date and event type
- **Deduplication**: Prevents duplicate notifications
- **Enrichment Pipeline**: Emit-time data resolution

**Components**:
- `NotificationStorage`: Manages granular notification files
- `PaymentEnrichment`: Enriches payment notifications with context
- `EventBus`: In-memory event orchestration

### 3. Payment & Invoice System
**Location**: `src/lib/payments/`, `src/lib/invoices/`

- **Dual Payment Models**: Milestone-based and completion-based
- **Robust Invoice Service**: Retry mechanisms and error handling
- **Upfront Payment Guard**: Verification and reconciliation
- **Balance Calculation**: Real-time balance computation

**Key Services**:
- `HierarchicalTransactionService`: Transaction storage and retrieval
- `BalanceCalculationService`: Dynamic balance calculations
- `UpfrontPaymentGuard`: Payment verification

### 4. Project Management
**Location**: `src/lib/services/`, `src/app/api/projects/`

- **Project Lifecycle**: Creation, activation, completion
- **Task Management**: Submission, approval, feedback cycles
- **Auto-Completion**: Intelligent project completion detection
- **Progress Tracking**: Real-time progress calculations

### 5. Gig & Matching System
**Location**: `src/app/api/gigs/`, `src/lib/gigs/`

- **Gig Applications**: Freelancer application workflow
- **Smart Matching**: AI-powered freelancer-project matching
- **Gig Requests**: Commissioner-initiated gig requests
- **Status Management**: Available, matched, completed states

### 6. Authentication & Authorization
**Location**: `src/lib/auth/`, `src/app/api/auth/`

- **Magic Link Authentication**: Passwordless login system
- **Session Management**: Cookie-based sessions
- **Role-Based Access**: Freelancer, commissioner, admin roles
- **Session Guards**: API endpoint protection

## Data Flow Patterns

### 1. Event-Driven Updates
```
User Action → API Endpoint → Business Logic → Event Emission → 
Notification Storage → Real-time Updates
```

### 2. Transaction Processing
```
Payment Request → Validation → Transaction Creation → 
Invoice Generation → Notification → Balance Update
```

### 3. Project Lifecycle
```
Gig Creation → Freelancer Matching → Project Activation → 
Task Execution → Completion → Payment Processing
```

## Storage Architecture

### Hierarchical Organization
```
data/
├── projects/2025/July/15/1/project.json
├── project-tasks/2025/July/15/1/task.json
├── invoices/2025/July/15/TB-001/invoice.json
├── transactions/2025/July/15/tx_123/transaction.json
├── notifications/events/2025/July/15/task_approved.json
└── users/2025/July/01/1/user.json
```

### Benefits
- **Scalability**: Prevents large file growth
- **Performance**: Efficient date-based queries
- **Maintenance**: Easy archival and cleanup
- **Debugging**: Clear audit trails

## Integration Points

### External Services
- **Firebase**: Authentication (production-ready alternative)
- **Payment Gateways**: Stripe Connect integration ready
- **Email Services**: Magic link delivery
- **File Storage**: Local file system (cloud-ready)

### Internal APIs
- **REST Endpoints**: Standard HTTP API patterns
- **Event System**: Internal event bus for decoupling
- **Storage APIs**: Unified data access layer
- **Notification APIs**: Real-time update delivery

## Scalability Considerations

### Current Architecture
- **File-based Storage**: Suitable for development and small-scale deployment
- **In-memory Caching**: Event deduplication and session management
- **Atomic Operations**: Ensures data consistency

### Future Enhancements
- **Database Migration**: PostgreSQL/MongoDB for production scale
- **Microservices**: Service decomposition for larger teams
- **Message Queues**: Redis/RabbitMQ for async processing
- **CDN Integration**: Static asset optimization

## Security Architecture

### Data Protection
- **Input Validation**: Zod schema validation
- **Session Security**: HttpOnly cookies, CSRF protection
- **File System Security**: Controlled access patterns
- **Error Handling**: Structured error responses

### Access Control
- **Role-based Permissions**: User type-based access
- **Session Guards**: API endpoint protection
- **Ownership Validation**: Resource access verification

## Monitoring & Observability

### Logging
- **Transition Logging**: State change tracking
- **Error Logging**: Structured error capture
- **Performance Monitoring**: Development optimization tools

### Health Checks
- **Storage Health**: Data integrity validation
- **API Health**: Endpoint availability monitoring
- **Notification Health**: Event processing verification

## Development Patterns

### Service Layer Pattern
- **Unified Services**: Consistent data access
- **Transaction Services**: ACID compliance
- **Business Logic Separation**: Clear layer boundaries

### Event-Driven Pattern
- **Loose Coupling**: Service independence
- **Async Processing**: Non-blocking operations
- **Audit Trails**: Complete event history

This architecture provides a solid foundation for the ARTISH platform while maintaining flexibility for future growth and enhancement.
