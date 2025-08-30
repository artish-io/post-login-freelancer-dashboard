# ARTISH Invoicing Methods: Completion vs Milestone Systems

## Overview

ARTISH implements two distinct invoicing and payment execution methods that control how projects are structured, payments are processed, and workflows are managed. This documentation provides a granular, code-annotated analysis of both systems from gig matching through final invoice execution.

## Chronological Flow Analysis

### Milestone System: Complete Lifecycle

#### Phase 1: Gig Matching & Project Creation
**Trigger**: Freelancer accepts available gig
**Location**: `/api/projects/services/project-service.ts`

<augment_code_snippet path="src/app/api/projects/services/project-service.ts" mode="EXCERPT">
````typescript
// Lines 84-102: Project creation determines invoicing method
const project: ProjectRecord = {
  projectId: finalProjectId,
  title: gig.title,
  status: 'ongoing' as ProjectStatus,
  invoicingMethod: (gig.invoicingMethod || gig.executionMethod || 'completion') as InvoicingMethod,
  totalBudget: gig.upperBudget || gig.lowerBudget,
  paidToDate: 0,
};
````
</augment_code_snippet>

**What Happens**:
1. Gig status changes from 'Available' → 'Matched'
2. Project record created with `invoicingMethod: 'milestone'`
3. Default tasks generated based on gig milestones
4. **No immediate payment** - milestone projects wait for task completion

**Notifications**: Project activation notification sent to both parties

#### Phase 2: Task Work & Submission
**Trigger**: Freelancer submits completed task
**Location**: `/api/project-tasks/submit` (action: 'submit')

<augment_code_snippet path="src/lib/services/unified-task-service.ts" mode="EXCERPT">
````typescript
// Lines 94-109: Task submission validation and status update
const updates = {
  status: 'In review' as const,
  submittedAt: new Date().toISOString(),
  submittedBy: actorId,
  link: options.referenceUrl || task.link || ''
};
````
</augment_code_snippet>

**What Happens**:
1. Task status: 'Ongoing' → 'In review'
2. Commissioner receives task submission notification
3. **No payment processing** - awaits commissioner approval

#### Phase 3: Task Approval & Auto-Invoice Generation
**Trigger**: Commissioner approves task
**Location**: `/api/project-tasks/submit` (action: 'approve')

<augment_code_snippet path="src/app/api/project-tasks/submit/route.ts" mode="EXCERPT">
````typescript
// Lines 159-171: Milestone guard ensures invoice generation
const isMilestoneProject = project!.invoicingMethod === 'milestone';
const transactionParams = {
  taskId: Number(taskId),
  projectId: task!.projectId,
  generateInvoice: true, // Always generate invoice for milestone projects
  invoiceType: 'milestone' as const
};
````
</augment_code_snippet>

**What Happens**:
1. Task status: 'In review' → 'Approved'
2. **Auto-invoice generation triggered** via `/api/invoices/auto-generate`
3. Invoice amount = `totalBudget / totalMilestones`
4. Invoice status immediately set to 'sent'
5. **Auto-payment execution triggered**

**Critical Design Decision**: Milestone projects **must** generate invoices on task approval - this is enforced by guards

#### Phase 4: Auto-Payment Execution
**Trigger**: Auto-invoice generation completion
**Location**: `/api/payments/execute`

<augment_code_snippet path="src/app/api/payments/execute/route.ts" mode="EXCERPT">
````typescript
// Lines 133-147: Payment processing with gateway integration
paymentRecord = await processMockPayment({
  invoiceNumber: invoice.invoiceNumber,
  projectId: Number(invoice.projectId ?? 0),
  freelancerId: Number(invoice.freelancerId),
  commissionerId: Number(invoice.commissionerId),
  totalAmount: Number(invoice.totalAmount)
}, 'execute');
````
</augment_code_snippet>

**What Happens**:
1. Commissioner's payment method charged
2. Invoice status: 'sent' → 'paid'
3. Freelancer wallet credited with milestone amount
4. Transaction record created
5. **Dual notifications triggered**

**Notifications Triggered**:
- **To Freelancer**: "Payment received: $X for [task] in [project]"
- **To Commissioner**: "Payment processed: $X for [task] in [project]. Remaining budget: $Y"

#### Phase 5: Project Completion
**Trigger**: All tasks approved and paid
**What Happens**: Project status remains 'ongoing' until manually marked complete

### Completion System: Complete Lifecycle

#### Phase 1: Gig Matching & Project Creation
**Trigger**: Freelancer accepts completion-based gig
**Location**: `/api/projects/completion/create`

<augment_code_snippet path="artish-invoicing-methods-design.md" mode="EXCERPT">
````typescript
// Lines 149-169: Project creation with immediate upfront payment
export async function POST(req: NextRequest) {
  // 1. Create completion project
  const project = await createCompletionProject(projectData);

  // 2. Trigger upfront payment (12%)
  const upfrontResult = await executeUpfrontPayment(project.projectId);

  // 3. Emit dual notifications
  await handleCompletionNotification({
    type: 'completion.project_activated',
    context: { projectTitle, totalTasks }
  });
}
````
</augment_code_snippet>

**What Happens**:
1. Project created with `invoicingMethod: 'completion'`
2. **Immediate upfront payment triggered** (12% of total budget)
3. Upfront invoice auto-generated and paid
4. Project status set to 'ongoing'
5. `upfrontPaid: true` flag set

**Notifications Triggered**:
- **To Freelancer**: "Project activated: [project]. Upfront payment: $X received"
- **To Commissioner**: "Project started: [project]. Upfront commitment: $X charged"

**Critical Design Decision**: Completion projects **must** execute upfront payment before project activation

#### Phase 2: Task Work & Submission
**Trigger**: Freelancer submits completed task
**Location**: `/api/project-tasks/completion/submit`

<augment_code_snippet path="src/app/api/project-tasks/completion/submit/route.ts" mode="EXCERPT">
````typescript
// Lines 84-93: Completion-specific task approval
const updatedTask = {
  ...validTask,
  status: 'Approved' as const,
  completed: true, // 🔒 COMPLETION-SPECIFIC: approved = completed
  approvedAt: new Date().toISOString(),
  approvedBy: actorId,
  manualInvoiceEligible: true, // 🔒 Enables manual invoice creation
  invoicePaid: false
};
````
</augment_code_snippet>

**What Happens**:
1. Task status: 'Ongoing' → 'Approved' (direct approval, no 'In review' state)
2. `manualInvoiceEligible: true` flag set
3. **No automatic invoice generation**
4. Check if all tasks completed → trigger final payment if true

**Critical Design Decision**: Completion tasks skip 'In review' state and go directly to 'Approved'

#### Phase 3: Manual Invoice Creation (Optional)
**Trigger**: Freelancer manually creates invoice for approved task
**Location**: `/api/invoices/completion/create-manual`

<augment_code_snippet path="src/lib/invoices/robust-invoice-service.ts" mode="EXCERPT">
````typescript
// Lines 246-266: Completion invoice calculation
if (request.invoiceType === 'completion') {
  // 12% upfront already paid, remaining 88% divided by tasks
  const upfrontCommitment = project.upfrontCommitment || (totalBudget * 0.12);
  const remainingBudget = totalBudget - upfrontCommitment;

  // Redistribute remaining budget across remaining tasks
  const amountPerTask = remainingBudget / remainingTasks;
}
````
</augment_code_snippet>

**What Happens**:
1. Invoice amount = `(totalBudget * 0.88) / totalTasks`
2. Invoice created with status 'draft'
3. Freelancer can send invoice to commissioner
4. **No automatic payment** - requires commissioner action

#### Phase 4: Manual Payment Execution
**Trigger**: Commissioner pays manual invoice
**Location**: `/api/payments/completion/execute-manual`

<augment_code_snippet path="src/app/api/payments/completion/execute-manual/route.ts" mode="EXCERPT">
````typescript
// Lines 55-84: Manual payment execution
const paymentRecord = await processMockPayment({
  invoiceNumber,
  projectId: Number(invoice.projectId),
  totalAmount: Number(invoice.totalAmount)
}, 'execute');

// Update wallet and transaction log
const wallet = await getWallet(invoice.freelancerId, 'freelancer', 'USD');
const updatedWallet = PaymentsService.creditWallet(wallet, invoice.totalAmount);
````
</augment_code_snippet>

**What Happens**:
1. Commissioner's payment method charged
2. Invoice status: 'sent' → 'paid'
3. Freelancer wallet credited
4. Task marked as `invoicePaid: true`

**Notifications Triggered**:
- **To Freelancer**: "Manual invoice paid: $X for [task] in [project]"
- **To Commissioner**: "Payment processed: $X for [task] in [project]"

#### Phase 5: Final Payment & Project Completion
**Trigger**: All tasks approved (automatic detection)
**Location**: `/api/payments/completion/execute-final`

<augment_code_snippet path="src/app/api/project-tasks/submit/route.ts" mode="EXCERPT">
````typescript
// Lines 410-431: Final task detection and payment trigger
if (completionStatus.isFinalTask) {
  console.log(`🎯 Final task detected for completion project ${taskData.projectId} - triggering final payment`);

  const finalPaymentResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/payments/completion/execute-final`, {
    method: 'POST',
    body: JSON.stringify({ projectId: taskData.projectId })
  });
}
````
</augment_code_snippet>

**What Happens**:
1. System detects all tasks are approved
2. **Automatic final payment triggered**
3. Final amount = `88% - (manual invoices paid)`
4. Project status: 'ongoing' → 'completed'
5. Final invoice created and immediately paid

**Notifications Triggered**:
- **To Freelancer**: "Project completed: [project]. Final payment: $X received. Please rate your experience"
- **To Commissioner**: "Project completed: [project]. Final payment: $X processed. Please rate the freelancer"

**Critical Design Decision**: Final payment is **automatic** when all tasks approved, ensuring project closure

## Top-Level Design Decisions & Justifications

### 1. Dual Invoicing Method Architecture

**Decision**: Implement two completely separate invoicing workflows while sharing payment infrastructure
**Justification**:
- **Risk Mitigation**: Changes to completion system cannot break existing milestone functionality
- **Scalability**: Each system can evolve independently based on user feedback
- **Maintainability**: Clear separation of concerns reduces debugging complexity

<augment_code_snippet path="completion-invoicing-implementation-summary.md" mode="EXCERPT">
````typescript
// Lines 86-101: Complete route separation
MILESTONE ROUTES (UNCHANGED):
├── /api/payments/execute/route.ts
├── /api/payments/trigger/route.ts
├── /api/project-tasks/submit/route.ts
└── /api/invoices/auto-generate/route.ts

COMPLETION ROUTES (NEW):
├── /api/payments/completion/execute-upfront/route.ts
├── /api/payments/completion/execute-manual/route.ts
├── /api/payments/completion/execute-final/route.ts
├── /api/invoices/completion/create-manual/route.ts
└── /api/projects/completion/create/route.ts
````
</augment_code_snippet>

### 2. Immediate Upfront Payment for Completion Projects

**Decision**: Execute 12% upfront payment during project creation, not after first task
**Justification**:
- **Commitment Mechanism**: Ensures commissioner is serious about project
- **Freelancer Security**: Provides immediate compensation for project acceptance
- **Cash Flow**: Improves freelancer cash flow for project setup costs
- **Risk Reduction**: Reduces abandonment risk after project starts

<augment_code_snippet path="completion-invoicing-implementation-guide.md" mode="EXCERPT">
````typescript
// Lines 191-201: Upfront payment triggers project activation
try {
  const { emit as emitBus } = await import('@/lib/events/bus');
  await emitBus('completion.project_activated', {
    actorId: project.commissionerId,
    targetId: project.freelancerId,
    projectId,
    upfrontAmount
  });
} catch (e) {
  console.warn('Completion event emission failed:', e);
}
````
</augment_code_snippet>

### 3. Automatic Invoice Generation for Milestones vs Manual for Completion

**Decision**: Milestone = auto-invoice on approval, Completion = manual freelancer-initiated invoices
**Justification**:

**Milestone Auto-Generation**:
- **Predictability**: Commissioners know exact payment schedule
- **Simplicity**: No additional freelancer actions required
- **Cash Flow**: Immediate payment upon task approval
- **Reduced Friction**: Eliminates invoice creation step

**Completion Manual Invoices**:
- **Flexibility**: Freelancers can choose when to invoice
- **Cash Flow Control**: Freelancers can batch invoices or invoice immediately
- **Project Management**: Allows freelancers to complete multiple tasks before invoicing

<augment_code_snippet path="src/app/api/project-tasks/submit/route.ts" mode="EXCERPT">
````typescript
// Lines 159-171: Milestone guard ensures automatic invoice generation
const isMilestoneProject = project!.invoicingMethod === 'milestone';
const transactionParams = {
  generateInvoice: true, // Always generate invoice for milestone projects
  invoiceType: 'milestone' as const
};
````
</augment_code_snippet>

### 4. Task Status Transition Differences

**Decision**: Milestone uses 'In review' state, Completion skips to 'Approved'
**Justification**:

**Milestone 'In review' State**:
- **Quality Control**: Commissioner can review before payment commitment
- **Revision Workflow**: Clear state for requesting changes
- **Payment Protection**: No payment until explicit approval

**Completion Direct Approval**:
- **Simplified Workflow**: Reduces state transitions
- **Faster Processing**: Eliminates review bottleneck
- **Trust Model**: Assumes higher trust relationship in completion projects

<augment_code_snippet path="src/app/api/project-tasks/completion/submit/route.ts" mode="EXCERPT">
````typescript
// Lines 84-93: Completion tasks go directly to approved
const updatedTask = {
  status: 'Approved' as const,
  completed: true, // 🔒 COMPLETION-SPECIFIC: approved = completed
  manualInvoiceEligible: true, // Enables manual invoice creation
};
````
</augment_code_snippet>

### 5. Automatic Final Payment Trigger

**Decision**: Automatically trigger final payment when all completion tasks approved
**Justification**:
- **Project Closure**: Ensures projects don't remain indefinitely open
- **Payment Guarantee**: Freelancers receive remaining payment without additional action
- **System Integrity**: Prevents budget leakage or incomplete payments
- **User Experience**: Reduces manual steps for project completion

<augment_code_snippet path="src/app/api/project-tasks/submit/route.ts" mode="EXCERPT">
````typescript
// Lines 410-431: Automatic final payment detection
if (completionStatus.isFinalTask) {
  console.log(`🎯 Final task detected for completion project ${taskData.projectId} - triggering final payment`);
  // Automatic API call to execute final payment
}
````
</augment_code_snippet>

### 6. Shared Payment Infrastructure

**Decision**: Use identical wallet, transaction, and gateway systems for both methods
**Justification**:
- **Code Reuse**: Reduces duplication and maintenance burden
- **Consistency**: Ensures identical payment behavior across systems
- **Testing**: Single payment infrastructure to test and validate
- **Integration**: Easier third-party payment gateway integration

<augment_code_snippet path="src/app/api/payments/completion/execute-manual/route.ts" mode="EXCERPT">
````typescript
// Lines 1-10: Completion routes reuse shared infrastructure
import { getWallet, upsertWallet } from '@/app/api/payments/repos/wallets-repo';
import { processMockPayment } from '../../utils/gateways/test-gateway';
import { PaymentsService } from '@/app/api/payments/services/payments-service';
````
</augment_code_snippet>

### 7. Guard Systems and Validation

**Decision**: Implement strict guards to prevent cross-system contamination
**Justification**:
- **Data Integrity**: Prevents milestone invoices in completion projects
- **Error Prevention**: Catches configuration mismatches early
- **System Reliability**: Ensures each system operates within its constraints
- **Debugging**: Clear error messages when systems are misconfigured

<augment_code_snippet path="components/commissioner-dashboard/projects-and-invoices/tasks-to-review/task-review-modal.tsx" mode="EXCERPT">
````typescript
// Lines 180-192: Milestone guard prevents approval without invoice
if (result.entities?.project?.invoicingMethod === 'milestone') {
  if (!result.invoiceGenerated && !result.entities?.invoice) {
    setError('Task approval failed: Invoice generation required for milestone-based projects.');
    return;
  }
}
````
</augment_code_snippet>

### 8. Notification Event Separation

**Decision**: Use different notification event types for each system
**Justification**:
- **Contextual Messaging**: Different payment models require different user messaging
- **Analytics**: Separate tracking of milestone vs completion project performance
- **Customization**: Different notification preferences per project type
- **Future Features**: Enables system-specific notification features

### 9. Budget Distribution Logic

**Decision**: Milestone = equal distribution, Completion = 12%/88% split with task-based redistribution
**Justification**:

**Milestone Equal Distribution**:
- **Predictability**: Clear payment schedule for commissioners
- **Simplicity**: Easy calculation and understanding
- **Fair Compensation**: Equal pay for equal milestone completion

**Completion 12%/88% Split**:
- **Commitment Model**: Upfront payment shows commissioner commitment
- **Risk Mitigation**: Freelancer gets immediate compensation
- **Flexible Completion**: Remaining 88% can be distributed flexibly across tasks

<augment_code_snippet path="src/lib/invoices/robust-invoice-service.ts" mode="EXCERPT">
````typescript
// Lines 246-266: Completion budget redistribution logic
const upfrontCommitment = project.upfrontCommitment || (totalBudget * 0.12);
const remainingBudget = totalBudget - upfrontCommitment;
const paidTasks = await getPaidTasksCount(project.projectId);
const remainingTasks = Math.max(1, totalTasks - paidTasks);
const amountPerTask = remainingBudget / remainingTasks;
````
</augment_code_snippet>

### 10. Transaction Atomicity and Rollback

**Decision**: Implement transaction rollback mechanisms for failed operations
**Justification**:
- **Data Consistency**: Ensures partial failures don't corrupt system state
- **Financial Integrity**: Critical for payment operations
- **User Trust**: Prevents lost payments or incorrect charges
- **System Recovery**: Enables graceful handling of gateway failures

<augment_code_snippet path="src/lib/transactions/transaction-service.ts" mode="EXCERPT">
````typescript
// Lines 99-103: Transaction rollback implementation
rollback: async () => {
  console.log(`🔙 Rolling back task ${params.taskId} to original state...`);
  await UnifiedStorageService.saveTask(originalTaskState);
},
````
</augment_code_snippet>

## System Resilience Principles

### 1. Fail-Safe Defaults
- Projects default to completion method if not specified
- Invoice generation failures don't block task approval in completion projects
- Payment failures are logged but don't corrupt project state

### 2. Idempotent Operations
- Multiple calls to payment endpoints don't create duplicate charges
- Invoice generation checks for existing invoices before creating new ones
- Transaction logging prevents duplicate entries

### 3. Graceful Degradation
- Notification failures don't block payment processing
- Gateway failures are logged but don't prevent system operation
- Missing data falls back to sensible defaults

### 4. Audit Trail Completeness
- Every payment operation creates transaction records
- All status transitions are logged with timestamps and actors
- Invoice state changes are tracked for compliance and debugging

## Comprehensive Notification Flow Analysis

### Milestone System Notifications

#### 1. Project Activation
**Trigger**: Gig acceptance and project creation
**Recipients**: Both freelancer and commissioner
**Content**: "Project [title] has been activated. [X] milestones defined."

#### 2. Task Submission
**Trigger**: Freelancer submits task for review
**Recipients**: Commissioner only
**Content**: "Task '[task]' submitted for review in project [title]"

#### 3. Task Approval + Payment
**Trigger**: Commissioner approves task (triggers auto-invoice and payment)
**Recipients**: Both parties (different messages)

<augment_code_snippet path="src/app/api/project-tasks/submit/route.ts" mode="EXCERPT">
````typescript
// Lines 350-360: Dual notification creation for milestone payments
// To Freelancer:
await createNotification({
  type: 'payment_received',
  actorId: project!.commissionerId!,
  targetId: project!.freelancerId!,
  data: {
    amount: invoiceAmount,
    projectTitle: project!.title,
    projectBudget: projectBudget
  }
});

// To Commissioner:
await createNotification({
  type: 'payment_processed',
  // ... similar structure
});
````
</augment_code_snippet>

**Freelancer**: "Payment received: $[amount] for '[task]' in [project]"
**Commissioner**: "Payment processed: $[amount] for '[task]' in [project]. Remaining budget: $[remaining]"

#### 4. Project Completion
**Trigger**: Manual project status change to 'completed'
**Recipients**: Both parties
**Content**: "Project [title] has been marked as completed. Please rate your experience."

### Completion System Notifications

#### 1. Project Activation + Upfront Payment
**Trigger**: Project creation with immediate upfront payment
**Recipients**: Both parties (different messages)

<augment_code_snippet path="completion-invoicing-implementation-guide.md" mode="EXCERPT">
````typescript
// Lines 191-201: Completion-specific event emission
await emitBus('completion.project_activated', {
  actorId: project.commissionerId,
  targetId: project.freelancerId,
  projectId,
  upfrontAmount
});
````
</augment_code_snippet>

**Freelancer**: "Project '[title]' activated. Upfront payment $[amount] received. [X] tasks to complete."
**Commissioner**: "Project '[title]' started. Upfront commitment $[amount] charged. [X] tasks defined."

#### 2. Task Completion (No Review State)
**Trigger**: Task marked as completed/approved
**Recipients**: Commissioner only
**Content**: "Task '[task]' completed in project [title]. [X] tasks remaining."

#### 3. Manual Invoice Payment
**Trigger**: Commissioner pays freelancer-created invoice
**Recipients**: Both parties

**Freelancer**: "Manual invoice paid: $[amount] for '[task]' in [project]"
**Commissioner**: "Payment processed: $[amount] for '[task]' in [project]"

#### 4. Final Payment + Project Completion
**Trigger**: All tasks approved (automatic final payment)
**Recipients**: Both parties

<augment_code_snippet path="completion-invoicing-implementation-guide.md" mode="EXCERPT">
````typescript
// Lines 448-454: Project completion event
await emitBus('completion.project_completed', {
  actorId: project.commissionerId,
  targetId: project.freelancerId,
  projectId,
  finalAmount
});
````
</augment_code_snippet>

**Freelancer**: "Project '[title]' completed! Final payment $[amount] received. Please rate the commissioner."
**Commissioner**: "Project '[title]' completed! Final payment $[amount] processed. Please rate the freelancer."

### Notification Timing Comparison

| Event | Milestone System | Completion System |
|-------|------------------|-------------------|
| **Project Start** | Single activation notification | Dual: activation + upfront payment |
| **Task Work** | Submit → Review → Approve (3 notifications) | Complete → Approve (1 notification) |
| **Payment** | Automatic with approval | Manual invoice + payment |
| **Project End** | Manual completion | Automatic completion + final payment |

## Executive Summary: System Architecture Rationale

### Core Philosophy
The dual invoicing system reflects two fundamentally different project management philosophies:

1. **Milestone System**: Traditional waterfall approach with defined checkpoints and immediate payment upon approval
2. **Completion System**: Agile approach with upfront commitment and flexible task-based payments

### Key Architectural Strengths

#### 1. Zero-Impact Separation
**Achievement**: New completion system added without modifying existing milestone code
**Benefit**: Existing projects continue operating without risk of regression
**Implementation**: Complete route separation with shared infrastructure

#### 2. Payment Integrity
**Achievement**: Both systems use identical payment processing, ensuring consistent financial behavior
**Benefit**: Single point of truth for wallet management, transaction logging, and gateway integration
**Implementation**: Shared services with system-specific routing

#### 3. Workflow Optimization
**Achievement**: Each system optimized for its use case
**Milestone Benefit**: Immediate payment certainty for commissioners, predictable cash flow for freelancers
**Completion Benefit**: Upfront commitment security, flexible payment timing, automatic project closure

#### 4. Scalable Notification System
**Achievement**: Context-aware notifications that match each system's workflow
**Benefit**: Users receive relevant information at the right time without notification fatigue
**Implementation**: Event-driven architecture with system-specific event types

### Business Logic Justifications

#### Why 12%/88% Split for Completion?
- **12% Upfront**: Large enough to demonstrate commitment, small enough to be acceptable
- **88% Remaining**: Substantial enough to motivate completion, flexible enough for task-based distribution
- **Mathematical Simplicity**: Easy calculation and explanation to users

#### Why Auto-Payment for Milestones vs Manual for Completion?
- **Milestone Auto-Payment**: Matches traditional project management expectations, reduces friction
- **Completion Manual**: Provides freelancer control over cash flow, supports batched invoicing

#### Why Different Task Status Flows?
- **Milestone 'In Review'**: Protects commissioner investment with review gate before payment
- **Completion Direct Approval**: Reflects higher trust model and faster iteration cycles

### System Maintenance Principles

#### 1. Conservative Change Management
- New features added through new routes, not modifications to existing ones
- Shared infrastructure changes require testing across both systems
- Database schema changes must be backward compatible

#### 2. Monitoring and Observability
- Separate metrics tracking for each system
- Payment success rates monitored per system
- User satisfaction tracked by invoicing method

#### 3. Error Handling Strategy
- Payment failures never corrupt project state
- Notification failures don't block core operations
- Gateway timeouts handled gracefully with retry mechanisms

### Future Evolution Paths

#### Milestone System Enhancements
- Partial milestone payments
- Milestone renegotiation workflows
- Advanced approval workflows

#### Completion System Enhancements
- Variable upfront percentages
- Milestone-completion hybrid models
- Advanced task dependency management

#### Shared Infrastructure Evolution
- Multiple payment gateway support
- Advanced fraud detection
- Real-time payment status updates

This architecture demonstrates how complex business requirements can be met through careful system design that prioritizes both user experience and technical maintainability.

## Core Design Principles

### 1. Execution Method Controls Workflow
- **`executionMethod`** field in project records determines the fundamental workflow pattern
- **`invoicingMethod`** field controls payment processing logic
- Both fields are typically set to the same value but serve different purposes

<augment_code_snippet path="src/app/api/projects/create/route.ts" mode="EXCERPT">
````typescript
// Lines 180-181: Project creation sets both execution and invoicing methods
executionMethod: input.executionMode,
invoicingMethod: input.invoicingMethod || input.executionMode,
````
</augment_code_snippet>

### 2. Route Separation Strategy
- **Milestone routes**: Use existing infrastructure (`/api/payments/execute`, `/api/invoices/auto-generate`)
- **Completion routes**: Use dedicated endpoints (`/api/payments/completion/*`, `/api/invoices/completion/*`)
- **Shared infrastructure**: Wallet management, transaction logging, payment gateways

## Milestone-Based Invoicing System

### Project Structure
Milestone projects distribute the total budget evenly across all project milestones.

<augment_code_snippet path="src/app/api/invoices/auto-generate/route.ts" mode="EXCERPT">
````typescript
// Lines 133-148: Milestone payment calculation
const totalBudget = project.totalBudget || project.budget?.upper || project.budget?.lower || 5000;
const projectTasks = await UnifiedStorageService.listTasks(project.projectId);
const totalMilestones = projectTasks.length || 1;
const milestoneAmount = Math.round((totalBudget / totalMilestones) * 100) / 100;
````
</augment_code_snippet>

### Workflow Triggers

#### 1. Task Approval Triggers Auto-Invoice Generation
When a commissioner approves a task in a milestone project:

<augment_code_snippet path="src/app/api/project-tasks/submit/route.ts" mode="EXCERPT">
````typescript
// Lines 159-171: Milestone guard ensures invoice generation
const isMilestoneProject = project!.invoicingMethod === 'milestone';
const transactionParams = {
  taskId: Number(taskId),
  projectId: task!.projectId,
  freelancerId: project!.freelancerId!,
  commissionerId: project!.commissionerId!,
  generateInvoice: true, // Always generate invoice for milestone projects
  invoiceType: 'milestone' as const
};
````
</augment_code_snippet>

#### 2. Auto-Invoice Generation Process
The system automatically creates and processes milestone invoices:

<augment_code_snippet path="src/app/api/invoices/auto-generate/route.ts" mode="EXCERPT">
````typescript
// Lines 192-220: Auto-milestone invoice creation
const newInvoice = {
  invoiceNumber,
  freelancerId: project.freelancerId,
  projectId: project.projectId,
  totalAmount: milestoneAmount, // Equal share of total budget
  status: initialStatus, // 'sent' for auto-milestone
  invoiceType: 'auto_milestone' as const,
  invoicingMethod: 'milestone',
  isAutoGenerated: true,
  sentDate: new Date().toISOString() // Immediately sent
};
````
</augment_code_snippet>

#### 3. Payment Execution
Milestone payments are processed through the main payment execution route:

<augment_code_snippet path="src/app/api/payments/execute/route.ts" mode="EXCERPT">
````typescript
// Lines 133-147: Payment processing with gateway integration
paymentRecord = await processMockPayment({
  invoiceNumber: invoice.invoiceNumber,
  projectId: Number(invoice.projectId ?? 0),
  freelancerId: Number(invoice.freelancerId),
  commissionerId: Number(invoice.commissionerId),
  totalAmount: Number(invoice.totalAmount)
}, 'execute');
````
</augment_code_snippet>

## Completion-Based Invoicing System

### Project Structure
Completion projects use a three-phase payment structure: 12% upfront + 88% distributed across task completions.

<augment_code_snippet path="components/freelancer-dashboard/projects-and-invoices/proposals/completion-payment-form.tsx" mode="EXCERPT">
````typescript
// Lines 20-30: Upfront calculation (12% of total)
useEffect(() => {
  const total = Number(totalAmount) || 0;
  if (total > 0 && executionMethod === 'completion') {
    const upfront = total * 0.12; // 12% upfront commitment
    setUpfrontAmount(upfront);
    setUpfrontPercentage(12);
  }
}, [totalAmount, executionMethod]);
````
</augment_code_snippet>

### Phase 1: Upfront Payment (12%)

#### Trigger: Project Activation
When a completion project is created, it immediately triggers upfront payment:

<augment_code_snippet path="artish-invoicing-methods-design.md" mode="EXCERPT">
````typescript
// Lines 149-169: Project creation with upfront payment
export async function POST(req: NextRequest) {
  // 1. Create completion project
  const project = await createCompletionProject(projectData);
  
  // 2. Trigger upfront payment (12%)
  const upfrontResult = await executeUpfrontPayment(project.projectId);
  
  // 3. Emit dual notifications
  await handleCompletionNotification({
    type: 'completion.project_activated',
    context: { projectTitle, totalTasks }
  });
}
````
</augment_code_snippet>

#### Upfront Payment Processing
<augment_code_snippet path="src/app/api/payments/completion/execute-upfront/route.ts" mode="EXCERPT">
````typescript
// Lines 1-10: Upfront payment uses shared infrastructure
import { getWallet, upsertWallet } from '@/app/api/payments/repos/wallets-repo';
import { processMockPayment } from '../../utils/gateways/test-gateway';
import { PaymentsService } from '@/app/api/payments/services/payments-service';
````
</augment_code_snippet>

### Phase 2: Manual Task Invoices (Variable)

#### Trigger: Individual Task Completion
Freelancers can manually create invoices for approved tasks:

<augment_code_snippet path="src/lib/invoices/robust-invoice-service.ts" mode="EXCERPT">
````typescript
// Lines 246-266: Completion invoice calculation
if (request.invoiceType === 'completion') {
  // 12% upfront already paid, remaining 88% divided by tasks
  const upfrontCommitment = project.upfrontCommitment || (totalBudget * 0.12);
  const remainingBudget = totalBudget - upfrontCommitment;
  
  // Check if any tasks have already been paid out manually
  const paidTasks = await getPaidTasksCount(project.projectId);
  const remainingTasks = Math.max(1, totalTasks - paidTasks);
  
  // Redistribute remaining budget across remaining tasks
  const amountPerTask = remainingBudget / remainingTasks;
}
````
</augment_code_snippet>

#### Manual Payment Processing
<augment_code_snippet path="src/app/api/payments/completion/execute-manual/route.ts" mode="EXCERPT">
````typescript
// Lines 55-84: Manual payment execution
const paymentRecord = await processMockPayment({
  invoiceNumber,
  projectId: Number(invoice.projectId),
  freelancerId: Number(invoice.freelancerId),
  commissionerId: Number(invoice.commissionerId),
  totalAmount: Number(invoice.totalAmount)
}, 'execute');

// Update wallet and transaction log
const wallet = await getWallet(invoice.freelancerId, 'freelancer', 'USD');
const updatedWallet = PaymentsService.creditWallet(wallet, invoice.totalAmount);
await upsertWallet(updatedWallet);
````
</augment_code_snippet>

### Phase 3: Final Payment (Remaining 88%)

#### Trigger: All Tasks Approved
When all tasks in a completion project are approved, the system triggers final payment:

<augment_code_snippet path="src/app/api/project-tasks/submit/route.ts" mode="EXCERPT">
````typescript
// Lines 410-431: Final task detection and payment trigger
if (completionStatus.isFinalTask) {
  console.log(`🎯 Final task detected for completion project ${taskData.projectId} - triggering final payment`);
  
  try {
    const finalPaymentResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/payments/completion/execute-final`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: taskData.projectId })
    });
  } catch (e) {
    console.warn('Final payment trigger failed:', e);
  }
}
````
</augment_code_snippet>

#### Final Payment Processing
<augment_code_snippet path="src/app/api/payments/completion/execute-final/route.ts" mode="EXCERPT">
````typescript
// Lines 171-172: Project completion
await updateProjectStatus(projectId, 'completed');
````
</augment_code_snippet>

## Task Status Transitions

### Unified Task Status System
Both systems use the same task status transitions but trigger different payment workflows:

<augment_code_snippet path="src/types/task.ts" mode="EXCERPT">
````typescript
// Lines 1-3: Task status definitions
export type TaskStatus = 'Ongoing' | 'In review' | 'Approved';
````
</augment_code_snippet>

### Status Transition Rules
<augment_code_snippet path="src/app/api/tasks/services/task-service.ts" mode="EXCERPT">
````typescript
// Lines 149-161: Valid task status transitions
const validTransitions: Record<TaskStatus, TaskStatus[]> = {
  'Ongoing': ['In review'],
  'In review': ['Approved', 'Ongoing'], // Ongoing = rejected/needs rework
  'Approved': [], // Final state
  'Rejected': ['Ongoing'], // Can restart work
};
````
</augment_code_snippet>

## Payment Infrastructure

### Shared Components
Both systems use identical payment infrastructure:

#### 1. Mock Payment Gateway
<augment_code_snippet path="src/app/api/payments/utils/gateways/test-gateway.ts" mode="EXCERPT">
````typescript
// Lines 32-68: Mock payment processing
export async function processMockPayment(
  invoice: MockInvoice,
  phase: PaymentPhase = 'execute'
): Promise<MockTransaction> {
  // Actually deduct from card balance if card exists
  if (cardInfo && phase === 'execute') {
    await deductFromCard(cardInfo.id, invoice.totalAmount, {
      invoiceNumber: invoice.invoiceNumber,
      projectId: String(invoice.projectId),
      freelancerId: invoice.freelancerId,
      description: `Payment for invoice ${invoice.invoiceNumber}`
    });
  }
}
````
</augment_code_snippet>

#### 2. Wallet Management
<augment_code_snippet path="src/app/api/payments/services/wallets-service.ts" mode="EXCERPT">
````typescript
// Lines 38-46: Wallet crediting logic
credit(wallet: Wallet, amount: number): Result<Wallet> {
  if (amount <= 0) return { ok: false, reason: 'Amount must be > 0' };
  const w: Wallet = { ...wallet };
  w.availableBalance = Number(w.availableBalance) + Number(amount);
  w.lifetimeEarnings = Number(w.lifetimeEarnings) + Number(amount);
  w.updatedAt = now();
  return { ok: true, data: w };
}
````
</augment_code_snippet>

#### 3. Transaction Logging
<augment_code_snippet path="src/app/api/payments/repos/transactions-repo.ts" mode="EXCERPT">
````typescript
// Lines 62-66: Transaction persistence
export async function appendTransaction(record: TransactionRecord): Promise<void> {
  const items = await readAllTransactions();
  items.push(record);
  await writeAllTransactions(items);
}
````
</augment_code_snippet>

## Key Differences Summary

| Aspect | Milestone System | Completion System |
|--------|------------------|-------------------|
| **Payment Distribution** | Equal per milestone | 12% upfront + 88% across tasks |
| **Invoice Generation** | Automatic on task approval | Manual for individual tasks |
| **Payment Timing** | Immediate on approval | Upfront + manual + final |
| **Route Structure** | Existing routes | Dedicated completion routes |
| **Project Completion** | Task-based progress | All-tasks-approved trigger |

## Control Flow Summary

### Milestone Flow
1. Task submitted → Task approved → Auto-invoice generated → Payment executed → Wallet credited
2. **Controlled by**: `invoicingMethod: 'milestone'` in project record
3. **Triggered by**: Task approval action in `/api/project-tasks/submit`

### Completion Flow
1. Project created → Upfront payment (12%) → Tasks completed → Manual invoices → Final payment (remaining 88%)
2. **Controlled by**: `executionMethod: 'completion'` and `invoicingMethod: 'completion'`
3. **Triggered by**: Project creation, manual freelancer action, all-tasks-approved detection

Both systems maintain strict separation while sharing core payment infrastructure, ensuring robust, scalable invoice processing.

## Notification Systems

### Milestone Notifications
Milestone projects emit standard payment notifications:

<augment_code_snippet path="src/app/api/project-tasks/submit/route.ts" mode="EXCERPT">
````typescript
// Lines 350-360: Payment notification creation
await createNotification({
  type: 'payment_received',
  actorId: project!.commissionerId!,
  targetId: project!.freelancerId!,
  data: {
    amount: invoiceAmount,
    projectTitle: project!.title,
    projectBudget: projectBudget
  },
  context: {
    projectId: result.task.projectId,
    taskId: Number(taskId),
    invoiceNumber: invoiceNumber
  }
});
````
</augment_code_snippet>

### Completion Notifications
Completion projects use specialized notification events:

<augment_code_snippet path="completion-invoicing-implementation-guide.md" mode="EXCERPT">
````typescript
// Lines 191-201: Completion-specific event emission
try {
  const { emit as emitBus } = await import('@/lib/events/bus');
  await emitBus('completion.project_activated', {
    actorId: project.commissionerId,
    targetId: project.freelancerId,
    projectId,
    upfrontAmount
  });
} catch (e) {
  console.warn('Completion event emission failed:', e);
}
````
</augment_code_snippet>

## Guard Systems and Validation

### Milestone Guards
Milestone projects have strict invoice generation guards:

<augment_code_snippet path="components/commissioner-dashboard/projects-and-invoices/tasks-to-review/task-review-modal.tsx" mode="EXCERPT">
````typescript
// Lines 180-192: Milestone guard verification
if (result.entities?.project?.invoicingMethod === 'milestone') {
  console.log('🔍 Milestone-based project detected, verifying invoice generation...');

  if (!result.invoiceGenerated && !result.entities?.invoice) {
    console.error('❌ Milestone guard failed: No invoice generated for milestone-based project');
    setError('Task approval failed: Invoice generation required for milestone-based projects. Please try again.');
    setLoading(false);
    return;
  }

  console.log('✅ Milestone guard passed: Invoice generated successfully');
}
````
</augment_code_snippet>

### Completion Guards
Completion projects have budget validation and final payment guards:

<augment_code_snippet path="src/app/api/project-tasks/completion/submit/route.ts" mode="EXCERPT">
````typescript
// Lines 134-147: Final payment trigger guard
if (completionStatus.isReadyForFinalPayout) {
  // 🔒 COMPLETION-SPECIFIC: Only trigger final payment when gate confirms eligibility
  console.log(`[PAY_TRIGGER] ALLOWED: Final payment triggered for completion project ${normalizedProjectId}: ${completionStatus.reason}`);
  try {
    const finalPaymentResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/payments/completion/execute-final`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
        'Cookie': req.headers.get('Cookie') || ''
      },
      body: JSON.stringify({ projectId: normalizedProjectId })
    });
````
</augment_code_snippet>

## Invoice Status Management

### Status Definitions
Both systems use a unified invoice status system:

<augment_code_snippet path="src/lib/invoice-status-definitions.ts" mode="EXCERPT">
````typescript
// Lines 8-21: Invoice status and type definitions
export type InvoiceStatus =
  | 'draft'           // Created by freelancer, not yet sent
  | 'sent'            // Sent by freelancer, awaiting commissioner payment
  | 'paid'            // Paid by commissioner (manual or auto)
  | 'on_hold'         // Auto-milestone payment failed, awaiting retry
  | 'cancelled'       // Cancelled by freelancer or system
  | 'overdue';        // Past due date without payment

export type InvoiceType =
  | 'manual'              // Manually created by freelancer
  | 'auto_milestone'      // Auto-generated for milestone completion
  | 'auto_completion'     // Auto-generated for task completion
  | 'completion_upfront'  // Auto-generated upfront payment for completion projects
  | 'completion_manual';  // Manual invoice for completion project tasks
````
</augment_code_snippet>

### Status Transitions
Invoice status transitions are controlled by payment execution:

<augment_code_snippet path="src/app/api/payments/completion/execute-manual/route.ts" mode="EXCERPT">
````typescript
// Lines 64-68: Invoice status update on payment
await updateInvoice(invoiceNumber, {
  status: 'paid',
  paidDate: new Date().toISOString()
});
````
</augment_code_snippet>

## Project Service Integration

### Gig Acceptance Logic
The project service determines invoicing method during gig acceptance:

<augment_code_snippet path="src/app/api/projects/services/project-service.ts" mode="EXCERPT">
````typescript
// Lines 84-102: Project creation with invoicing method determination
const project: ProjectRecord = {
  projectId: finalProjectId,
  title: gig.title,
  status: 'ongoing' as ProjectStatus,
  invoicingMethod: (gig.invoicingMethod || gig.executionMethod || 'completion') as InvoicingMethod,
  currency: 'USD',
  commissionerId: finalCommissionerId,
  freelancerId,
  totalBudget: gig.upperBudget || gig.lowerBudget,
  paidToDate: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
````
</augment_code_snippet>

### Project Status Transitions
Both systems use the same project status validation:

<augment_code_snippet path="src/app/api/projects/services/project-service.ts" mode="EXCERPT">
````typescript
// Lines 245-276: Project status transition validation
static canTransitionStatus(
  currentStatus: ProjectStatus,
  newStatus: ProjectStatus,
  actorType: 'freelancer' | 'commissioner'
): { ok: boolean; reason?: string } {
  const validTransitions: Record<ProjectStatus, ProjectStatus[]> = {
    proposed: ['ongoing', 'archived'],
    ongoing: ['paused', 'completed', 'archived'],
    paused: ['ongoing', 'archived'],
    completed: ['archived'],
    archived: [], // No transitions from archived
  };
}
````
</augment_code_snippet>

## Error Handling and Resilience

### Transaction Rollback
The system implements transaction rollback for failed operations:

<augment_code_snippet path="src/lib/transactions/transaction-service.ts" mode="EXCERPT">
````typescript
// Lines 99-103: Task update rollback mechanism
rollback: async () => {
  console.log(`🔙 Rolling back task ${params.taskId} to original state...`);
  await UnifiedStorageService.saveTask(originalTaskState);
},
description: `Approve task ${params.taskId}`,
````
</augment_code_snippet>

### Payment Gateway Resilience
Mock payment gateway includes failure simulation:

<augment_code_snippet path="src/app/api/payments/utils/gateways/test-gateway.ts" mode="EXCERPT">
````typescript
// Lines 53-58: Payment failure simulation
// Simulate 95% success rate for realistic testing
const shouldSucceed = Math.random() > 0.05;

if (!shouldSucceed) {
  throw new Error('Mock payment failed - simulated gateway error');
}
````
</augment_code_snippet>

## Summary

The ARTISH invoicing system demonstrates sophisticated separation of concerns while maintaining shared infrastructure. The `executionMethod` and `invoicingMethod` fields act as the primary control mechanisms, routing projects through entirely different workflows while ensuring data consistency and payment integrity across both systems.
