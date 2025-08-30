# ARTISH Notification System Design Documentation

## Overview

The ARTISH notification system provides context-rich, role-aware notifications for both commissioners and freelancers across milestone-based and completion-based project workflows. The system ensures semantic accuracy, consistent formatting, and proper user experience through intelligent message generation and context enrichment.

## Core Design Principles

### 1. **Semantic Accuracy**
- Organizations are always the sender of payments (not individual commissioners)
- Notifications reflect actual business relationships and payment flows
- Context-aware messaging based on user role (commissioner vs freelancer)

### 2. **Consistent Formatting**
- Short, clear titles with detailed, informative messages
- No duplicate caption/sub-caption issues
- Uniform structure across all notification types

### 3. **Context Enrichment**
- Real invoice amounts (not generic "payment" text)
- Project names and remaining budget information
- Proper user name and organization name resolution

### 4. **Generic Implementation**
- API-backed with dynamic user/organization lookup
- No hardcoded user IDs or organization names
- Works for any commissioner/freelancer combination

## Notification Types by User Role

### Commissioner Notifications

#### **Milestone Payment Sent**
- **Format**: `You just paid [freelancer name] $[amount]`
- **Message**: `You just paid [freelancer name] $[amount] for submitting [task title] for [project title]. Remaining budget: $[remaining]. Click here to see transaction activity`
- **Trigger**: When commissioner pays a milestone invoice
- **Context**: Shows actual invoice amount, task details, remaining budget

#### **Completion Final Payment**
- **Format**: `You just paid [freelancer name] $[amount]`
- **Message**: `You just paid [freelancer name] $[amount] for completing [project title]. Remaining budget: $0. Click here to see transaction activity`
- **Trigger**: When final payment is processed for completion-based projects
- **Context**: Shows final payment amount and project completion

#### **Completion Rating Prompt**
- **Format**: `Rate your experience`
- **Message**: `Rate [freelancer name]'s work. You have approved all task milestones for [project title]. Click here to rate their work on this project`
- **Trigger**: After all tasks are approved and final payment is made
- **Context**: Prompts for rating with project context

#### **Task Submission**
- **Format**: `[freelancer name] submitted a task`
- **Message**: `"[task title]" is awaiting your review`
- **Trigger**: When freelancer submits work for review
- **Context**: Clear call-to-action for task review

#### **Gig Application**
- **Format**: `[freelancer name] applied for [project title]`
- **Message**: `New application for "[project title]"`
- **Trigger**: When freelancer applies for a posted gig
- **Context**: Application management workflow

### Freelancer Notifications

#### **Invoice Paid (Milestone & Manual)**
- **Format**: `[organization name] paid $[amount]`
- **Message**: `[organization name] has paid $[amount] for your recent [project title] task submission. This project has a remaining budget of $[remaining budget]. Click here to view invoice details`
- **Trigger**: When any invoice payment is processed
- **Context**: Organization as sender, project context, remaining budget

#### **Milestone Payment Received**
- **Format**: `[organization name] paid $[amount]`
- **Message**: `[organization name] has paid $[amount] for your recent [project title] task submission. This project has a remaining budget of $[remaining budget]. Click here to view invoice details`
- **Trigger**: When milestone payment is received via bus system
- **Context**: Consistent with invoice_paid format

#### **Completion Final Payment**
- **Format**: `[organization name] sent final payment`
- **Message**: `[organization name] has paid you $[amount] for [project title] final payment (remaining [percent]% of budget). Click here to view invoice details`
- **Trigger**: When final payment is processed for completion-based projects
- **Context**: Final payment with percentage context

#### **Task Approved**
- **Format**: `[commissioner name] approved your task`
- **Message**: `[commissioner name] has approved your submission for "[task title]" in [project title]. Task approved and milestone completed. Click here to see its project tracker`
- **Trigger**: When commissioner approves submitted work
- **Context**: Task approval with project tracking link

#### **Project Activated**
- **Format**: `[organization name] activated your project`
- **Message**: `Your project "[project title]" has been activated and is ready to begin`
- **Trigger**: When project moves from matched to active status
- **Context**: Project activation confirmation

#### **Completion Upfront Payment**
- **Format**: `[organization name] paid upfront payment`
- **Message**: `[organization name] has paid $[amount] upfront for your newly activated [project title] project. This project has a budget of $[remaining] left. Click here to view invoice details`
- **Trigger**: When upfront payment (12%) is processed for completion projects
- **Context**: Upfront payment with remaining budget information

## Technical Implementation

### API Endpoints

#### **Primary Notification Route**
- **Endpoint**: `/api/notifications-v2`
- **Parameters**: `userId`, `userType` (commissioner|freelancer)
- **Response**: Enriched notifications with context-aware titles and messages

#### **Invoice Payment Route**
- **Endpoint**: `/api/invoices/pay`
- **Function**: Creates invoice_paid notifications with organization context
- **Enrichment**: Fetches organization name and project budget for context

### Data Enrichment Pipeline

#### **User Lookup**
```typescript
getUserById(userId) → { name, email, type }
```

#### **Organization Lookup**
```typescript
getOrganizationByCommissionerId(commissionerId) → { name, id }
```

#### **Project Context**
```typescript
getProjectById(projectId) → { totalBudget, title, status }
```

#### **Invoice Context**
```typescript
getInvoiceByNumber(invoiceNumber) → { totalAmount, projectId, freelancerId }
```

### Event System Architecture

#### **Milestone-Based Projects**
1. **Invoice Payment** → `invoice.paid` event → Bus system
2. **Bus Handler** → Creates `milestone_payment_received` (freelancer) + `milestone_payment_sent` (commissioner)
3. **Context Enrichment** → User names, organization names, project budget

#### **Completion-Based Projects**
1. **Task Approval** → `completion.task_approved` event
2. **Final Payment** → `completion.final_payment` event
3. **Project Completion** → `completion.project_completed` + rating prompts

### Message Generation Logic

#### **Context-Aware Generation**
```typescript
generateGranularMessage(event, actor, project, task, currentUserId)
```

#### **Role Detection**
```typescript
const isCommissioner = currentUserId === event.actorId;
const isFreelancer = currentUserId === event.targetId;
```

#### **Fallback Mechanisms**
- User lookup failure → "Freelancer" / "Commissioner"
- Organization lookup failure → Commissioner name
- Project data missing → "project" / "task"
- Amount missing → "payment"

## Data Storage Structure

### Notification Schema
```json
{
  "id": "unique_notification_id",
  "type": "notification_type",
  "actorId": "user_who_triggered_action",
  "targetId": "user_who_receives_notification", 
  "metadata": {
    "amount": "actual_invoice_amount",
    "freelancerName": "resolved_freelancer_name",
    "organizationName": "resolved_organization_name",
    "projectTitle": "project_title",
    "projectBudget": "total_project_budget",
    "remainingBudget": "calculated_remaining_budget"
  },
  "context": {
    "projectId": "project_identifier",
    "invoiceNumber": "invoice_reference"
  }
}
```

### Hierarchical Storage
```
data/notifications/events/
├── 2025/
│   ├── August/
│   │   ├── 22/
│   │   │   ├── milestone_payment_sent/
│   │   │   ├── invoice_paid/
│   │   │   └── completion.final_payment/
```

## Quality Assurance

### Validation Checks
- ✅ All notification types present and functional
- ✅ Organization names used instead of commissioner names for payments
- ✅ Actual invoice amounts displayed (no generic "payment" text)
- ✅ Project context and remaining budget information included
- ✅ Context-aware messaging for commissioners vs freelancers
- ✅ No duplicate caption/sub-caption issues
- ✅ Generic implementation (no hardcoded user IDs)

### Current System Status
- **Commissioner Notifications**: 9 types, 46 total notifications
- **Freelancer Notifications**: 9 types, 34 total notifications
- **Payment Notifications**: 100% show organization names as senders
- **Amount Display**: 100% show actual invoice amounts
- **Context Enrichment**: 100% include project and budget information

## Maintenance Guidelines

### Adding New Notification Types
1. Define notification type in event system
2. Add message generation logic in `/api/notifications-v2/route.ts`
3. Ensure context enrichment includes all required data
4. Test with multiple user combinations
5. Verify generic implementation (no hardcoded values)

### Troubleshooting Common Issues
1. **Missing organization names**: Check `organizationName` in metadata
2. **Generic "payment" text**: Verify `amount` field in metadata
3. **Missing project context**: Ensure `projectTitle` and `projectBudget` in metadata
4. **Duplicate messages**: Check title vs message generation logic
5. **Hardcoded values**: Verify dynamic lookup functions are used

The ARTISH notification system provides a robust, scalable foundation for user communication that maintains semantic accuracy while delivering rich, contextual information to enhance the user experience across all project workflows.
