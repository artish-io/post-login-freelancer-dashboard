# Invoicing Methods Design Documentation

## Overview

This document outlines the code-based design of two distinct invoicing and payment execution methods in the ARTISH platform:

1. **Milestone-based Invoicing** - Payment distributed evenly across project milestones
2. **Completion-based Invoicing** - 12% upfront payment + 88% distributed across task completions

## Core Design Principles

### Separation of Concerns
- **Milestone-based**: Uses existing invoice infrastructure with `invoicingMethod: 'milestone'`
- **Completion-based**: Uses separate API routes and specialized logic with `invoicingMethod: 'completion'`
- Both systems share wallet, payment gateway, and transaction infrastructure

### Data Flow Architecture
```
Project Creation → Invoicing Method Selection → Payment Execution → Wallet Updates
```

## Milestone-based Invoicing System

### Core Components

#### 1. Project Structure
```typescript
interface MilestoneProject {
  projectId: number;
  invoicingMethod: 'milestone';
  totalBudget: number;
  totalTasks: number; // Determines milestone count
  status: 'ongoing' | 'paused' | 'completed';
}
```

#### 2. Payment Calculation
- **Formula**: `milestoneAmount = totalBudget / totalTasks`
- **Trigger**: Task approval (`status: 'approved'` AND `completion: true`)
- **Auto-generation**: Via `/api/invoices/auto-generate` endpoint

#### 3. Invoice Generation Flow
```typescript
// Auto-triggered on task approval
POST /api/invoices/auto-generate
{
  projectId: string,
  taskId: string
}

// Creates invoice with:
{
  invoiceType: 'auto_milestone',
  invoicingMethod: 'milestone',
  totalAmount: calculatedMilestoneAmount,
  status: 'sent' // Auto-sent to commissioner
}
```

#### 4. Key Implementation Files
- `src/app/api/invoices/auto-generate/route.ts` - Auto-invoice generation
- `src/app/api/payments/services/payments-service.ts` - Payment processing
- `src/lib/invoices/robust-invoice-service.ts` - Invoice calculation logic

### Payment Execution
1. Task submitted by freelancer
2. Commissioner approves task
3. System auto-generates invoice for milestone amount
4. Invoice auto-sent to commissioner
5. Payment processed through shared gateway
6. Freelancer wallet credited

## Completion-based Invoicing System

### Core Components

#### 1. Project Structure
```typescript
interface CompletionProject {
  projectId: number;
  invoicingMethod: 'completion';
  totalBudget: number;
  totalTasks: number;
  upfrontPaid: boolean;
  upfrontAmount: number; // 12% of totalBudget
  remainingBudget: number; // 88% of totalBudget
}
```

#### 2. Three-Phase Payment Structure

##### Phase 1: Upfront Payment (12%)
- **Trigger**: Project activation/acceptance
- **Amount**: `totalBudget * 0.12`
- **Endpoint**: `/api/payments/completion/execute-upfront`
- **Auto-execution**: Immediate upon project creation

##### Phase 2: Manual Task Invoices (Variable)
- **Trigger**: Individual task completion (manual freelancer action)
- **Amount**: `(totalBudget * 0.88) / totalTasks`
- **Endpoint**: `/api/payments/completion/manual-invoice`
- **Freelancer-initiated**: Requires manual invoice creation

##### Phase 3: Final Payment (Remaining 88%)
- **Trigger**: All tasks completed
- **Amount**: `remainingBudget - manualPaymentsTotal`
- **Endpoint**: `/api/payments/completion/execute-final`
- **Auto-execution**: When project marked complete

#### 3. Key Implementation Files
- `src/app/api/payments/completion/execute-upfront/route.ts` - Upfront payment
- `src/app/api/payments/completion/manual-invoice/route.ts` - Task-based invoices
- `src/app/api/payments/completion/execute-final/route.ts` - Final payment
- `src/app/api/payments/completion/calculate/route.ts` - Payment calculations

### Payment Execution Flow
1. **Project Activation**: 12% upfront payment auto-executed
2. **Task Completion**: Freelancer manually creates invoices for approved tasks
3. **Project Completion**: Remaining amount auto-calculated and paid

## Shared Infrastructure

### Common Components
- **Wallet System**: Both methods credit the same freelancer wallet
- **Payment Gateway**: Shared mock/real payment processing
- **Transaction Logging**: Unified transaction history
- **Notification System**: Different event types but same infrastructure

### Invoice Status System
```typescript
type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'on_hold' | 'cancelled' | 'overdue';
```

### Project Status Management
```typescript
type ProjectStatus = 'ongoing' | 'paused' | 'completed';
```

## Data Storage Patterns

### Hierarchical Storage
- Projects: `data/projects/YYYY/MM/DD/project-{id}.json`
- Invoices: `data/invoices/YYYY/MM/DD/invoice-{number}.json`
- Tasks: `data/project-tasks/{projectId}/task-{id}.json`

### Atomic Operations
- Invoice creation and payment processing use atomic writes
- Project status updates are transactional
- Wallet updates include balance verification

## Event System Integration

### Milestone Events
- `invoice.paid` - Emitted on milestone payment completion
- `task.approved` - Triggers auto-invoice generation

### Completion Events
- `completion.project_activated` - Emitted on upfront payment
- `completion.project_completed` - Emitted on final payment

## Error Handling & Guards

### Validation Guards
- Invoice eligibility checks (task approval + completion)
- Duplicate payment prevention
- Budget validation and overflow protection

### Rollback Mechanisms
- Failed upfront payments rollback project creation
- Invoice generation failures don't affect task status
- Payment failures maintain invoice state consistency

## Configuration & Flexibility

### Configurable Parameters
- Upfront percentage (currently 12% for completion-based)
- Invoice due dates (7-14 days default)
- Auto-payment retry attempts
- Currency support (USD default, extensible)

This design ensures both invoicing methods can coexist while sharing core infrastructure, providing flexibility for different project types and client preferences.
