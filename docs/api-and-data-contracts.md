# ARTISH - API and Data Contracts

## API Overview

ARTISH provides a comprehensive REST API built on Next.js API routes. All endpoints follow consistent patterns for authentication, error handling, and response formatting.

## Base Configuration

### Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

### Response Format
All API responses follow a consistent envelope pattern:

```typescript
// Success Response
{
  "success": true,
  "data": any,
  "message"?: string
}

// Error Response
{
  "success": false,
  "error": {
    "code": string,
    "message": string,
    "details"?: any
  }
}
```

## Authentication Endpoints

### POST /api/auth/login
Traditional email/password authentication.

**Request:**
```typescript
{
  "email": string,
  "password": string
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "user": {
      "id": number,
      "name": string,
      "email": string,
      "type": "freelancer" | "commissioner" | "admin"
    },
    "redirectTo": string
  }
}
```

### POST /api/auth/magic-link
Send magic link for passwordless authentication.

**Request:**
```typescript
{
  "email": string
}
```

### GET /api/auth/verify
Verify magic link token and create session.

**Query Parameters:**
- `token`: Magic link token

## User Management Endpoints

### GET /api/users
Retrieve all users (admin only).

**Response:**
```typescript
{
  "success": true,
  "data": User[]
}
```

### GET /api/freelancers
Retrieve all freelancers.

**Response:**
```typescript
{
  "success": true,
  "data": Freelancer[]
}
```

### POST /api/users/signup
Create new user account.

**Request:**
```typescript
{
  "name": string,
  "email": string,
  "password": string,
  "type": "freelancer" | "commissioner",
  "organizationName"?: string // For commissioners
}
```

## Project Management Endpoints

### GET /api/projects
List all projects for authenticated user.

**Response:**
```typescript
{
  "success": true,
  "data": Project[]
}
```

### POST /api/projects
Create new project.

**Request:**
```typescript
{
  "title": string,
  "description": string,
  "budget": number,
  "skills": string[],
  "deadline": string,
  "invoicingMethod": "milestone" | "completion"
}
```

### GET /api/projects/[id]
Get specific project details.

### PUT /api/projects/[id]
Update project information.

### POST /api/projects/[id]/activate
Activate project after payment.

## Task Management Endpoints

### GET /api/project-tasks/by-freelancer/[freelancerId]
Get tasks for specific freelancer.

**Response:**
```typescript
{
  "success": true,
  "data": {
    "projects": ProjectWithTasks[]
  }
}
```

### POST /api/project-tasks/submit
Submit task for review.

**Request:**
```typescript
{
  "taskId": number,
  "projectId": number,
  "submissionLink": string,
  "notes"?: string
}
```

### POST /api/project-tasks/approve
Approve submitted task.

**Request:**
```typescript
{
  "taskId": number,
  "projectId": number,
  "feedback"?: string
}
```

## Gig and Matching Endpoints

### GET /api/gigs
List available gigs.

**Response:**
```typescript
{
  "success": true,
  "data": Gig[]
}
```

### POST /api/gigs/[id]/apply
Apply for a gig.

**Request:**
```typescript
{
  "pitch": string,
  "sampleLinks": string[],
  "skills": string[],
  "tools": string[]
}
```

### POST /api/gigs/match-freelancer
Match freelancer to gig (commissioner action).

**Request:**
```typescript
{
  "gigId": number,
  "applicationId": number,
  "freelancerId": number
}
```

### GET /api/matching/freelancers
Get matched freelancers for project.

**Query Parameters:**
- `projectId`: Project ID
- `skills`: Comma-separated skills
- `budget`: Project budget

## Payment and Invoice Endpoints

### GET /api/invoices/by-freelancer/[freelancerId]
Get invoices for freelancer.

**Response:**
```typescript
{
  "success": true,
  "data": Invoice[]
}
```

### POST /api/invoices/[invoiceNumber]/pay
Process invoice payment.

**Request:**
```typescript
{
  "amount": number,
  "paymentMethod": string
}
```

### GET /api/payments/balance/[userId]
Get user's wallet balance.

**Response:**
```typescript
{
  "success": true,
  "data": {
    "totalBalance": number,
    "projectEarnings": number,
    "storefrontSales": number,
    "withdrawals": number
  }
}
```

## Dashboard Endpoints

### GET /api/dashboard/stats/[userId]
Get dashboard statistics.

**Response:**
```typescript
{
  "success": true,
  "data": {
    "activeProjects": number,
    "completedTasks": number,
    "totalEarnings": number,
    "pendingPayments": number
  }
}
```

### GET /api/dashboard/tasks/today/[freelancerId]
Get today's tasks for freelancer.

## Notification Endpoints

### GET /api/notifications/[userId]
Get notifications for user.

**Response:**
```typescript
{
  "success": true,
  "data": Notification[]
}
```

### POST /api/notifications/mark-read
Mark notifications as read.

**Request:**
```typescript
{
  "notificationIds": number[]
}
```

## Core Data Models

### User
```typescript
interface User {
  id: number;
  name: string;
  email: string;
  type: 'freelancer' | 'commissioner' | 'admin';
  organizationId?: number;
  createdAt: string;
  updatedAt: string;
}
```

### Project
```typescript
interface Project {
  id: number;
  title: string;
  description: string;
  status: 'ongoing' | 'paused' | 'completed';
  budget: number;
  freelancerId: number;
  commissionerId: number;
  organizationId: number;
  invoicingMethod: 'milestone' | 'completion';
  startDate: string;
  deadline: string;
  createdAt: string;
  updatedAt: string;
}
```

### Task
```typescript
interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  dueDate: string;
  submissionLink?: string;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Invoice
```typescript
interface Invoice {
  invoiceNumber: string;
  freelancerId: number;
  projectId: number;
  commissionerId: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled' | 'overdue';
  invoiceType: 'milestone' | 'completion' | 'upfront';
  issueDate: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}
```

### Gig
```typescript
interface Gig {
  id: number;
  title: string;
  description: string;
  budget: number;
  skills: string[];
  status: 'available' | 'matched' | 'completed';
  commissionerId: number;
  organizationId: number;
  deadline: string;
  createdAt: string;
}
```

### Notification
```typescript
interface Notification {
  id: string;
  type: string;
  targetId: number;
  actorId: number;
  message: string;
  timestamp: string;
  read: boolean;
  metadata?: any;
}
```

## Error Codes

### Authentication Errors
- `UNAUTHORIZED`: Invalid credentials or session
- `FORBIDDEN`: Insufficient permissions
- `TOKEN_EXPIRED`: Authentication token expired

### Validation Errors
- `VALIDATION_ERROR`: Input validation failed
- `MISSING_REQUIRED_FIELD`: Required field not provided
- `INVALID_FORMAT`: Invalid data format

### Business Logic Errors
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `DUPLICATE_RESOURCE`: Resource already exists
- `INSUFFICIENT_FUNDS`: Not enough balance for operation
- `PAYMENT_FAILED`: Payment processing failed

### System Errors
- `INTERNAL_ERROR`: Unexpected server error
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable
- `RATE_LIMIT_EXCEEDED`: Too many requests

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- **Authentication endpoints**: 5 requests per minute
- **General endpoints**: 100 requests per minute
- **File upload endpoints**: 10 requests per minute

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response:**
```typescript
{
  "success": true,
  "data": any[],
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "hasNext": boolean,
    "hasPrev": boolean
  }
}
```

## Filtering and Sorting

Many endpoints support filtering and sorting:

**Query Parameters:**
- `filter[field]`: Filter by field value
- `sort`: Sort field (prefix with `-` for descending)
- `search`: Text search across relevant fields

## Webhooks (Future)

Planned webhook events for external integrations:
- `project.created`
- `project.completed`
- `invoice.paid`
- `task.approved`

## API Versioning

Current API version: v1 (implicit)
Future versions will use URL versioning: `/api/v2/`

This API documentation provides the foundation for integrating with ARTISH. For detailed implementation examples, refer to the codebase and existing API route implementations.
