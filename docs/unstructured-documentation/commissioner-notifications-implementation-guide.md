# Commissioner Notifications Implementation Guide

## Overview

**Scope**: Fix commissioner-specific notification issues without affecting any existing functionality.

**Hard Constraints**:
- ✅ **DO NOT** modify task approval logic
- ✅ **DO NOT** modify payment execution logic  
- ✅ **DO NOT** modify invoice generation logic
- ✅ **DO NOT** modify gig matching logic
- ✅ **DO NOT** modify freelancer notification logic
- ✅ **DO NOT** make system-wide notification changes
- ✅ **MAINTAIN** separate handling for milestone vs completion projects
- ✅ **PRESERVE** all existing working functionality

**Target**: Commissioner notification display and content issues only.

## Phase 1: Fix Broken Completion Notification Context (Critical)

### Issue
All completion notifications for commissioners have `NO_PROJECT` context, making them undeliverable.

### Implementation

#### Step 1.1: Fix Project Context in Completion Handler
**File**: `src/app/api/notifications-v2/completion-handler.ts`
**Function**: `integrateWithExistingNotificationSystem()`

```typescript
// BEFORE (broken):
const notificationEvent = {
  // ... other fields
  context: event.context,
  metadata: event.context
};

// AFTER (fixed):
const notificationEvent = {
  // ... other fields
  context: {
    projectId: event.projectId,  // ← ADD: Ensure project ID is set
    ...event.context
  },
  metadata: {
    projectId: event.projectId,  // ← ADD: Also in metadata for compatibility
    ...event.context
  }
};
```

#### Step 1.2: Verify Completion Event Emission
**Files to check** (DO NOT MODIFY LOGIC, only verify projectId is passed):
- `src/app/api/invoices/completion/create-manual/route.ts`
- `src/app/api/project-tasks/submit/route.ts` (completion branch)
- Any completion project completion detection

**Verification only**:
```typescript
// Ensure all completion event emissions include projectId:
await handleCompletionNotification({
  type: 'completion.upfront_payment',
  projectId: normalizedProjectId,  // ← Must be present
  context: {
    projectId: normalizedProjectId,  // ← And in context
    // ... existing context
  }
});
```

#### Step 1.3: Test Fix
1. Create test completion project
2. Trigger completion notifications
3. Verify notifications have proper project context
4. **DO NOT** test or modify milestone project notifications

## Phase 2: Fix Component Coverage (High Priority)

### Issue
Missing notification types in universal component causing default icons.

### Implementation

#### Step 2.1: Add Missing Icon Case for task_submitted
**File**: `components/notifications/notification-item.tsx`
**Function**: `getNotificationIcon()`

```typescript
// ADD this case to the switch statement:
case 'task_submitted':           // Completion project task submissions
  return '/icons/task-awaiting-review.png';
```

#### Step 2.2: Add task_submitted to Avatar Function
**File**: `components/notifications/notification-item.tsx`
**Function**: `useUserAvatar()`

```typescript
// ADD to the array:
const useUserAvatar = (type: string): boolean => {
  return [
    'project_pause',
    'invoice_sent',
    'gig_request_accepted',
    'task_submission',
    'task_submitted',        // ← ADD: Completion projects should use freelancer avatar
    'gig_application',
    'proposal_sent'
  ].includes(type);
};
```

#### Step 2.3: Add Other Missing Component Cases
**File**: `components/notifications/notification-item.tsx`
**Function**: `getNotificationIcon()`

```typescript
// ADD these cases to the switch statement:
case 'payment_sent':             // Completion project manual payments
  return '/icons/new-payment.png';
case 'project_completed':        // Milestone project completion
  return '/icons/project-completed.png';
case 'gig_applied':              // Data uses this instead of gig_application
  return '/icons/gig-applied.png';
```

## Phase 3: Fix UX Content Issues (High Priority)

### Issue
Payment notifications use "You" instead of organization name, duplicate content bug.

### Implementation

#### Step 3.1: Fix Payment Notification Organization Names
**File**: `src/app/api/notifications-v2/route.ts`
**Function**: `generateGranularTitle()`

```typescript
// MODIFY existing cases (DO NOT change payment logic, only title generation):
case 'milestone_payment_sent':
  const orgName = event.metadata?.organizationName || 'Organization';
  const freelancerName = event.metadata?.freelancerName || 'freelancer';
  const amount = event.metadata?.amount ? `$${event.metadata.amount}` : '$0';
  return `${orgName} paid ${freelancerName} ${amount}`;

case 'payment_sent':
  const paymentOrgName = event.metadata?.organizationName || 'Organization';
  const paymentFreelancerName = event.metadata?.freelancerName || 'freelancer';
  const paymentAmount = event.metadata?.amount ? `$${event.metadata.amount}` : '$0';
  return `${paymentOrgName} paid ${paymentFreelancerName} ${paymentAmount}`;
```

#### Step 3.2: Fix Duplicate Content Bug
**File**: `src/app/api/notifications-v2/route.ts`
**Function**: `generateGranularTitle()` for `payment_sent`

```typescript
// CHANGE from returning full notificationText to short title format:
case 'payment_sent':
  // Use organization-based title format (from Step 3.1)
  // DO NOT return event.metadata?.notificationText
```

**Function**: `generateGranularMessage()` for `payment_sent`
```typescript
// KEEP existing detailed message:
case 'payment_sent':
  return event.metadata?.notificationText || event.metadata?.message || 'Payment sent';
```

#### Step 3.3: Fix Icon Assignment Per Requirements
**File**: `src/app/api/notifications-v2/route.ts`
**Function**: `shouldUsePaymentIcon()`

```typescript
// ADD invoice_sent to payment icon function:
function shouldUsePaymentIcon(eventType: EventType): boolean {
  return [
    'invoice_sent',             // ← ADD: Should use payment icon, not avatar
    'invoice_paid',
    'payment_sent',
    'milestone_payment_sent',
    'completion.upfront_payment',
    'completion.final_payment'
  ].includes(eventType);
}
```

**Function**: `shouldUseAvatar()`
```typescript
// REMOVE invoice_sent from avatar function:
function shouldUseAvatar(eventType: EventType): boolean {
  return [
    'task_submitted',
    'task_submission',
    // 'invoice_sent',          // ← REMOVE: Should use payment icon instead
    'gig_applied',
    'project_activated'
  ].includes(eventType);
}
```

## Testing Protocol

### Phase 1 Testing: Completion Context Fix
1. **Create test completion project** (invoicingMethod: "completion")
2. **Trigger completion events**: upfront payment, task approval, project completion
3. **Verify**: All completion notifications have proper project context
4. **Verify**: Commissioner receives completion notifications
5. **DO NOT** test milestone projects (should remain unchanged)

### Phase 2 Testing: Component Coverage
1. **Check task_submitted notifications** display correct icon
2. **Check payment_sent notifications** display correct icon
3. **Check project_completed notifications** display correct icon
4. **Verify**: No regression in existing notification icons

### Phase 3 Testing: UX Content
1. **Check payment notification titles** use organization names
2. **Check payment_sent notifications** no longer have duplicate content
3. **Check invoice_sent notifications** use payment icon, not avatar
4. **Verify**: No changes to payment execution or invoice generation logic

## Rollback Plan

### If Phase 1 Breaks Completion Projects:
- Revert `completion-handler.ts` changes
- Completion notifications will return to broken state but no functionality lost

### If Phase 2 Breaks Component Rendering:
- Revert `notification-item.tsx` changes
- Notifications will show default icons but no functionality lost

### If Phase 3 Breaks Payment/Invoice Logic:
- Revert only title/message generation changes in `route.ts`
- Keep payment and invoice logic completely unchanged

## Success Criteria

### Phase 1 Success:
- ✅ Completion project commissioners receive all completion notifications
- ✅ Completion notifications have proper project context
- ✅ No changes to milestone project notifications

### Phase 2 Success:
- ✅ All notification types display correct icons
- ✅ No regression in existing icon assignments

### Phase 3 Success:
- ✅ Payment notifications use organization names in titles
- ✅ No duplicate content in payment notifications
- ✅ Correct icon assignments per requirements
- ✅ No changes to payment execution or invoice generation

## Constraints Verification Checklist

Before implementing any fix, verify:
- [ ] Does this change task approval logic? **❌ FORBIDDEN**
- [ ] Does this change payment execution logic? **❌ FORBIDDEN**
- [ ] Does this change invoice generation logic? **❌ FORBIDDEN**
- [ ] Does this change gig matching logic? **❌ FORBIDDEN**
- [ ] Does this affect freelancer notifications? **❌ FORBIDDEN**
- [ ] Does this make system-wide changes? **❌ FORBIDDEN**
- [ ] Does this maintain milestone vs completion separation? **✅ REQUIRED**
- [ ] Is this commissioner-specific only? **✅ REQUIRED**
