# Commissioner Completion Notifications - Implementation Bible

## Overview

This document serves as the definitive implementation guide for all 7 commissioner completion notifications. All V2 specifications below must be implemented exactly as written. This replaces all previous implementations.

## Visual Design Rules

- **Payment notifications**: Use `/icons/new-payment.png` icon
- **Invoice notifications**: Use `/icons/new-invoice.png` icon  
- **Project completion**: Use `/icons/project-completed.png` icon
- **Rating prompts**: Use `/icons/rating-prompt.png` icon
- **Task submissions**: Use freelancer avatar + `/icons/task-awaiting-review.png` fallback
- **Unread highlight**: `bg-pink-50` background
- **Unread indicator**: `bg-[#eb1966]` dot
- **Typography**: `text-sm text-gray-900 font-medium` for titles, `text-sm text-gray-600` for messages

---

## 1. Upfront Payment (`completion.upfront_payment`)

**Trigger**: When upfront payment is executed during project creation
**Icon**: `/icons/new-payment.png`
**Avatar**: None (use icon only)

**V2 IMPLEMENTATION (REQUIRED)**:
```
Main Caption: [org name] paid [freelancer] [invoice value]

Subcaption: You just paid [freelancer name] [invoice value] upfront [project title]. Remaining budget: [remaining budget = totalBudget minus paidToDate]. Click here to view invoice details
```

**Navigation**: Invoice details page  
**Context**: Commissioner self-notification for upfront payment confirmation

---

## 2. Task Submitted (`task_submitted`)

**Trigger**: When freelancer submits a task for review  
**Icon**: `freelancer's avatar` (fallback)  
**Avatar**: Freelancer avatar (primary)

```
{{Main Caption: Task submitted: Phase 1

Subcaption: "Phase 1" is awaiting your review for Market Research for Longer Divide}}
```

**Navigation**: Project tracking page  
**Context**: Commissioner notification when freelancer submits work

---

## 3. Invoice Received (`completion.invoice_received`)

**Trigger**: When freelancer sends manual invoice via send-invoice page
**Icon**: `/icons/new-payment.png`
**Avatar**: None (use icon only)

**V2 IMPLEMENTATION (REQUIRED)**:
```
Main Caption: [freelancer name] sent you an invoice for [invoice value] for [x number] approved tasks, of your active project, [project title]

Subcaption: [invoice ID] for [project title]
```

**Navigation**: Invoice review/pay page
**Context**: Commissioner notification when freelancer sends manual invoice

---

## 4. Payment Sent (`completion.commissioner_payment`)

**Trigger**: When commissioner pays invoice via pay-invoice page
**Icon**: `/icons/new-payment.png`
**Avatar**: None (use icon only)

**V2 IMPLEMENTATION (REQUIRED)**:
```
Main Caption: [org name] paid [freelancer name] [invoice value]

Subcaption: You just paid [freelancer name] [invoice value] for your ongoing project, [project title]. Remaining budget: [remaining budget = totalBudget minus paidToDate]. Click here to see transaction activity
```

**Navigation**: Transaction activity page
**Context**: Commissioner self-notification for payment confirmation

---

## 5. Final Payment (`completion.final_payment`)

**Trigger**: After all tasks approved, final payment is processed
**Icon**: `/icons/new-payment.png`
**Avatar**: None (use icon only)

**V2 IMPLEMENTATION (REQUIRED)**:
```
Main Caption: [org name] paid [freelancer name] [invoice value]

Subcaption: You just paid [freelancer name] a final payment of [invoice value] for your now completed project, [project title]. Remaining budget: [remaining budget = totalBudget minus paidToDate]. Click here to see invoice details
```

**Navigation**: Invoice details page
**Context**: Commissioner notification for final project payment

---

## 6. Project Completed (`completion.project_completed`)

**Trigger**: After all tasks approved and final payment processed
**Icon**: `/icons/project-completed.png`
**Avatar**: None (use icon only)

**V2 IMPLEMENTATION (REQUIRED)**:
```
Main Caption: Project completed

Subcaption: You have approved all tasks for [project title]. This project is now complete
```

**Navigation**: Project tracking page
**Context**: Commissioner notification when project is fully completed

---

## 7. Rate Experience (`completion.rating_prompt`)

**Trigger**: After project completion, prompts commissioner to rate freelancer  
**Icon**: `/icons/rating-prompt.png`  
**Avatar**: None (use icon only)

```
{{Main Caption: Rate your experience

Subcaption: Rate your experience with Tobi Philly. All tasks for Market Research for Longer Divide have been completed. Click here to rate your collaboration.}}
```

**Navigation**: Completed projects tab (`/commissioner-dashboard/projects-and-invoices/project-list/page.tsx`)  
**Context**: Commissioner prompt to rate freelancer after project completion

---

## Implementation Notes

### Icon Priority Rules
1. **Payment-related**: Always use `/icons/new-payment.png`
2. **Invoice-related**: Always use `/icons/new-invoice.png`
3. **Task submissions**: Use freelancer avatar if available, fallback to `/icons/task-awaiting-review.png`
4. **Project completion**: Use `/icons/project-completed.png`
5. **Rating prompts**: Use `/icons/rating-prompt.png`

### Content Enrichment
- All amounts are dynamically calculated
- Project titles are pulled from project data
- Freelancer names are enriched from user data
- Remaining budgets are calculated in real-time
- Task titles are pulled from task data

### Styling Consistency
- Follows ARTISH design language
- Consistent with existing notification patterns
- Proper typography hierarchy
- Brand color usage (`#eb1966` for unread indicators)
- Soft pink backgrounds for unread notifications

---

## Technical Implementation Verification

### Component File: `components/notifications/notification-item.tsx`

**Icon Mapping Verification**:
```typescript
// 🏢 COMMISSIONER COMPLETION NOTIFICATIONS - Icon assignments
case 'completion.upfront_payment':
  return '/icons/new-payment.png';        // ✅ Payment icon
case 'completion.invoice_received':
  return '/icons/new-payment.png';        // ✅ Invoice icon
case 'completion.commissioner_payment':
  return '/icons/new-payment.png';        // ✅ Payment icon
case 'completion.final_payment':
  return '/icons/new-payment.png';        // ✅ Payment icon
case 'completion.project_completed':
  return '/icons/project-completed.png';  // ✅ Completion icon
case 'completion.rating_prompt':
  return '/icons/rating-prompt.png';      // ✅ Rating icon
case 'task_submitted':
  return '/icons/task-awaiting-review.png'; // ✅ Task icon (with freelancer avatar priority)
```

**Avatar Usage Verification**:
```typescript
// Only task_submitted uses freelancer avatar for commissioners
const useUserAvatar = (type: string): boolean => {
  return [
    'task_submitted',        // ✅ Shows freelancer avatar on commissioner side
    // All other completion notifications use icons only
  ].includes(type);
};
```

### Message Generation: `src/app/api/notifications-v2/completion-handler.ts`

**Commissioner Detection**:
```typescript
// Detects commissioner notifications (self-targeted)
const isCommissionerNotification = event.actorId === event.targetId;
```

**Sample Message Generation**:
```typescript
case 'completion.upfront_payment':
  if (isCommissionerNotification) {
    return `You paid $${upfrontAmount} upfront for ${projectTitle} with ${freelancerName}. This project has a budget of $${remainingBudget} left. Click here to view invoice details`;
  }
```

### Notification Triggers

1. **Upfront Payment**: `src/app/api/projects/completion/create/route.ts`
2. **Task Submitted**: Task submission system (already working)
3. **Invoice Received**: `src/app/api/invoices/completion/create-manual/route.ts`
4. **Payment Sent**: `src/app/api/payments/completion/execute-manual/route.ts`
5. **Final Payment**: `src/app/api/payments/completion/execute-final/route.ts`
6. **Project Completed**: `src/app/api/payments/completion/execute-final/route.ts`
7. **Rate Experience**: `src/app/api/payments/completion/execute-final/route.ts`

---

## Testing Checklist

- [ ] All 7 notification types display correct icons
- [ ] Task submissions show freelancer avatars
- [ ] Payment notifications use payment icons
- [ ] Messages are properly context-enriched
- [ ] Navigation links work correctly
- [ ] Unread styling applies properly
- [ ] Typography matches design system
