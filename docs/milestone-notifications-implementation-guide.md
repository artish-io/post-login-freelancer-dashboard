# Milestone-Based Project Notifications Implementation Guide

## Overview
This guide provides step-by-step implementation instructions to fix the notification system for milestone-based projects, ensuring all required notifications are delivered correctly and reliably.

## Implementation Roadmap

### Phase 1: Critical Fixes (High Priority)

#### 1.1 Fix Invoice Type Filtering for Freelancer Payment Notifications

**Problem**: Freelancer payment notifications trigger for all project types, not just milestone-based.

**File**: `src/app/api/payments/services/payments-service.ts`

**Implementation**:
```typescript
// Add invoiceType parameter to processInvoicePayment
static async processInvoicePayment(params: {
  invoiceNumber: string;
  amount: number;
  commissionerId: number;
  freelancerId: number;
  projectId: string;
  source: string;
  invoiceType?: 'milestone' | 'completion'; // Add this parameter
}): Promise<{ success: boolean; paymentId?: string; amount?: number; error?: string }> {

  // ... existing payment logic ...

  // 🔔 Only emit bus event for milestone-based projects
  if (params.invoiceType === 'milestone') {
    try {
      const busModule = await import('../../../../lib/events/bus');
      await busModule.emit('invoice.paid', {
        actorId: params.commissionerId,
        targetId: params.freelancerId,
        projectId: params.projectId,
        invoiceNumber: params.invoiceNumber,
        amount: params.amount,
        projectTitle: undefined,
      });
      console.log(`🔔 Emitted invoice.paid event for milestone project ${params.projectId}`);
    } catch (busError) {
      console.warn('[payments.service] bus emit failed:', busError);
    }
  } else {
    console.log(`ℹ️ Skipping payment notification for ${params.invoiceType}-based project`);
  }
}
```

**Note**: The `invoiceType` should be derived server-side from the authoritative project record's `invoicingMethod` to ensure accuracy. If the caller provides an `invoiceType` that mismatches the project’s actual invoicing method, log a warning and prefer the server-side derived value.

**Update Callers**: Ensure all calls to `processInvoicePayment` include the `invoiceType` parameter.

#### 1.2 Fix Final Task Detection Logic

**Problem**: Final task detection uses stale data and has timing issues.

**File**: `src/app/api/project-tasks/submit/route.ts`

**Implementation**:
```typescript
// Add proper final task detection after task status update
if (action === 'approve') {
  // ... existing approval logic ...

  // ✅ Check if this was the final task AFTER status update
  const updatedProjectTasks = await getProjectTasks(Number(projectId));
  const allTasksApproved = updatedProjectTasks.tasks.every(
    (task: any) => task.status === 'Approved' && task.completed
  );

  if (allTasksApproved && isMilestoneProject) {
    // This is the final task for a milestone project
    await sendProjectCompletionRatingNotifications(
      Number(projectId),
      result.task.freelancerId,
      result.task.commissionerId,
      result.task.projectTitle || 'Project',
      result.task.title,
      result.task.commissionerName || 'Commissioner'
    );
    console.log(`🎉 Final task approved - sent completion notifications for project ${projectId}`);
  }
}
```

#### 1.3 Implement Reliable Project Completion Detection

**File**: `src/lib/notifications/project-completion-detector.ts` (new file)

**Implementation**:
```typescript
export interface ProjectCompletionStatus {
  isComplete: boolean;
  totalTasks: number;
  approvedTasks: number;
  remainingTasks: number;
  isFinalTask: boolean;
}

export async function detectProjectCompletion(
  projectId: number,
  currentTaskId?: number
): Promise<ProjectCompletionStatus> {
  try {
    const { getProjectTasks } = await import('../storage/unified-storage-service');
    const projectTasks = await getProjectTasks(projectId);
    
    if (!projectTasks?.tasks) {
      throw new Error(`No tasks found for project ${projectId}`);
    }

    const totalTasks = projectTasks.tasks.length;
    const approvedTasks = projectTasks.tasks.filter(
      (task: any) => task.status === 'Approved' && task.completed
    );
    const approvedCount = approvedTasks.length;
    const remainingTasks = totalTasks - approvedCount;

    // If currentTaskId is provided, check if approving it would complete the project
    let isFinalTask = false;
    if (currentTaskId) {
      const unapprovedTasks = projectTasks.tasks.filter(
        (task: any) => task.taskId !== currentTaskId && 
                      (task.status !== 'Approved' || !task.completed)
      );
      isFinalTask = unapprovedTasks.length === 0;
    }

    return {
      isComplete: remainingTasks === 0,
      totalTasks,
      approvedTasks: approvedCount,
      remainingTasks,
      isFinalTask
    };
  } catch (error) {
    console.error('Error detecting project completion:', error);
    return {
      isComplete: false,
      totalTasks: 0,
      approvedTasks: 0,
      remainingTasks: 0,
      isFinalTask: false
    };
  }
}
```

**Note**: Final task detection should run inside a short-lived project-level lock to prevent concurrent double “complete” events. In cases where locking fails or is bypassed, a fallback reconciliation sweeper job should run periodically to reconcile missed completions.

### Phase 2: Notification Message Improvements

#### 2.1 Update Task Approval Notification Logic

**File**: `src/app/api/notifications-v2/route.ts`

**Implementation**:
```typescript
case 'task_approved':
  // Use the new project completion detector
  const { detectProjectCompletion } = await import('../../lib/notifications/project-completion-detector');
  const completionStatus = await detectProjectCompletion(
    Number(event.context?.projectId),
    event.metadata.taskId
  );
  
  const remainingMilestones = Math.max(0, completionStatus.remainingTasks);
  
  return `${actorName} has approved your submission of "${event.metadata.taskTitle}" for ${event.metadata.projectTitle || 'this project'}. This project has ${remainingMilestones} milestone${remainingMilestones !== 1 ? 's' : ''} left. Click here to see its project tracker.`;
```

**Simplified Guidance**: For non-final task approvals, use ultra-minimal notification text such as “Task approved.” to avoid stale or fluctuating milestone counts in the message.

#### 2.2 Enhance Rating Notification System

**File**: `src/lib/notifications/rating-notifications.ts`

**Implementation**:
```typescript
export async function sendProjectCompletionRatingNotifications(
  projectId: number,
  freelancerId: number,
  commissionerId: number,
  projectTitle: string,
  completedTaskTitle: string,
  commissionerName: string
) {
  try {
    // Verify this is actually a milestone-based project
    const { UnifiedStorageService } = await import('../storage/unified-storage-service');
    const project = await UnifiedStorageService.getProjectById(projectId);
    
    if (!project || project.invoicingMethod !== 'milestone') {
      console.log(`ℹ️ Skipping rating notifications for non-milestone project ${projectId}`);
      return;
    }

    const timestamp = new Date().toISOString();

    // Freelancer rating prompt
    const freelancerNotification = {
      id: `rating_prompt_freelancer_${projectId}_${Date.now()}`,
      timestamp,
      type: 'rating_prompt_freelancer' as const,
      notificationType: RATING_NOTIFICATION_TYPES.RATING_PROMPT_FREELANCER,
      actorId: commissionerId,
      targetId: freelancerId,
      entityType: ENTITY_TYPES.PROJECT,
      entityId: projectId.toString(),
      metadata: {
        projectTitle,
        commissionerName,
        completedTaskTitle,
        message: `All tasks for ${projectTitle} have been approved. Click here to rate your collaboration with ${commissionerName}.`,
        ratingSubjectId: commissionerId,
        ratingSubjectType: 'commissioner',
        priority: 'high'
      },
      context: {
        projectId,
        ratingSubjectUserId: commissionerId,
        ratingSubjectUserType: 'commissioner',
        action: 'rate_commissioner'
      }
    };

    // Add notifications to storage
    NotificationStorage.addEvent(freelancerNotification);
    // ... commissioner notification logic ...

    console.log(`✅ Sent milestone project completion rating notifications for project ${projectId}`);
  } catch (error) {
    console.error('Failed to send project completion rating notifications:', error);
  }
}
```

### Phase 3: Reliability Improvements

#### 3.1 Add Bus System Retry Logic

**File**: `src/lib/events/bus.ts`

**Implementation**:
```typescript
// Add retry wrapper for bus events
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      // Add jitter between 500ms and 1500ms
      const jitter = 500 + Math.floor(Math.random() * 1000);
      // Structured error logging with code, eventType, key if available
      const errCode = error?.code || 'UNKNOWN_ERROR';
      const eventType = (operation as any)?.eventType || 'unknown_event';
      const key = (operation as any)?.key || 'unknown_key';
      console.warn(`[bus] Attempt ${attempt} failed for eventType=${eventType} key=${key} code=${errCode}, retrying in ${jitter}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, jitter));
    }
  }
  throw new Error('Max retries exceeded');
}
```

#### 3.2 Add Notification Deduplication

**File**: `src/lib/notifications/deduplication.ts` (new file)

**Implementation**:
```typescript
interface NotificationKey {
  type: string;
  targetId: number;
  entityId: string;
  timeWindow: number; // minutes
}

const recentNotifications = new Map<string, number>();

export function generateNotificationKey(notification: any): string {
  return `${notification.type}-${notification.targetId}-${notification.entityId}`;
}

export function isDuplicateNotification(
  notification: any,
  timeWindowMinutes: number = 5
): boolean {
  const key = generateNotificationKey(notification);
  const now = Date.now();
  const lastSent = recentNotifications.get(key);

  if (lastSent && (now - lastSent) < (timeWindowMinutes * 60 * 1000)) {
    return true;
  }

  recentNotifications.set(key, now);
  return false;
}
```

**Note**: This in-memory `Map` serves only as a micro-cache for rapid deduplication. For serverless and multi-instance safety, persisted deduplication should be backed by `UnifiedStorageService` with TTL semantics.

### Phase 4: Testing Implementation

#### 4.1 Create Notification Test Suite

**File**: `tests/notifications/milestone-notifications.test.ts` (new file)

**Implementation**:
```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Milestone Project Notifications', () => {
  describe('Non-Final Task Approval', () => {
    it('should send exactly 2 notifications to freelancer', async () => {
      // Test implementation
    });

    it('should send exactly 1 notification to commissioner', async () => {
      // Test implementation
    });
  });

  describe('Final Task Approval', () => {
    it('should send exactly 3 notifications to freelancer', async () => {
      // Test implementation
    });

    it('should send exactly 2 notifications to commissioner', async () => {
      // Test implementation
    });
  });
});
```

## Implementation Checklist

### Phase 1: Critical Fixes
- [ ] Add `invoiceType` parameter to `PaymentsService.processInvoicePayment`
- [ ] Update all callers to pass `invoiceType`
- [ ] Implement conditional bus event emission
- [ ] Create `project-completion-detector.ts`
- [ ] Update final task detection in task approval flow
- [ ] Test final task detection with single-task projects

### Phase 2: Message Improvements
- [ ] Update task approval notification logic
- [ ] Enhance rating notification system
- [ ] Add milestone-only checks to rating notifications
- [ ] Verify notification message formats
- [ ] Test navigation links

### Phase 3: Reliability
- [ ] Implement bus system retry logic with jitter and structured logging
- [ ] Add notification deduplication micro-cache
- [ ] Add comprehensive error logging
- [ ] Implement fallback notification mechanisms

### Phase 4: Testing
- [ ] Create unit tests for each notification type
- [ ] Add integration tests for complete flows
- [ ] Test edge cases (single task, project cancellation)
- [ ] Performance testing for high-volume scenarios

### Minimal Additional Safeguards
- [ ] Centralize event emission functions (`emitMilestonePayment`, etc.)
- [ ] Implement deterministic idempotency keys: `invoice.paid:${invoiceNumber}`, `task.approved:${projectId}:${milestoneId}`, `project.complete:${projectId}`
- [ ] Persist deduplication keys with TTL using `UnifiedStorageService`
- [ ] Implement reopen/rollback path: emit `task.reopened`, suppress rating until all tasks approved again
- [ ] Centralize notification copy and linking in `notifications/templates.ts`
- [ ] Create lightweight reconciliation job to backfill missing notifications

## Validation Criteria

### Success Metrics
1. **Zero Silent Fails**: All notification failures are logged and handled
2. **Correct Counts**: Exact number of notifications per scenario
3. **Message Accuracy**: All notification text matches requirements
4. **Navigation Works**: All notification links route correctly
5. **Type Isolation**: Milestone/completion projects properly separated

### Manual Testing Scenarios
1. **3-Task Milestone Project**: Complete lifecycle testing
2. **Single-Task Milestone Project**: Edge case testing
3. **Completion-Based Project**: Negative testing (no milestone notifications)
4. **Network Failures**: Bus system reliability testing
5. **Concurrent Approvals**: Race condition testing

This implementation guide provides a comprehensive roadmap to fix all identified issues in the milestone-based project notification system.
