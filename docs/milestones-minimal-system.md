# Minimal Milestones System

## Overview
The milestones system has been simplified to use `project-tasks.json` as the universal source of truth for task status and completion. The minimal `milestones-minimal.json` file only contains essential payment/invoicing data.

## Status Codes (Numbers)
- `0` = **In Progress** - Work ongoing, not ready for payment
- `1` = **Pending Payment** - Work completed and approved, awaiting payment
- `2` = **Paid** - Payment completed

## Business Logic
Task status in `project-tasks.json` determines milestone status:

### Task Status → Milestone Status Mapping:
- **Task completed + status "Approved"** → Milestone ready for payment (status: 1)
- **Task completed + status "In review"** → Milestone in progress (status: 0)  
- **Task completed + status "Ongoing"** → Milestone in progress (status: 0)
- **Task not completed** → Milestone in progress (status: 0)

### Milestone Completion Logic:
A milestone is considered complete when ALL tasks in the project are:
- `completed: true`
- `status: "Approved"`

## Data Structure

### milestones-minimal.json
```json
{
  "id": 1,                    // Unique milestone ID
  "projectId": 301,           // Reference to project
  "amount": 756.12,           // Payment amount
  "status": 1,                // Status code (0, 1, or 2)
  "dueDate": "2025-06-20"     // Payment due date
}
```

### project-tasks.json (Universal Source)
```json
{
  "id": 1,
  "title": "Task title",
  "status": "Approved",       // "Ongoing", "In review", "Approved"
  "completed": true,          // true/false
  "feedbackCount": 0,
  "rejected": false
}
```

## API Behavior

### Dynamic Calculation
APIs now calculate milestone status dynamically from `project-tasks.json`:

1. **Count completed tasks** in project
2. **Count approved tasks** in project  
3. **Determine milestone status** based on completion ratio
4. **Use minimal milestones file** only for payment amounts and due dates

### Benefits
- **Single source of truth**: All task data in `project-tasks.json`
- **Real-time accuracy**: Status calculated from actual task completion
- **Simplified data**: Minimal file with only essential payment data
- **Consistent logic**: Same business rules across all components

## Migration from Full Milestones
- ✅ Task status tracking → `project-tasks.json`
- ✅ Task completion tracking → `project-tasks.json`  
- ✅ Task history/variants → Removed (simplified)
- ✅ Payment amounts → `milestones-minimal.json`
- ✅ Payment status → `milestones-minimal.json`

## Files Deprecated
- `data/milestones.json` - Replaced by minimal version + dynamic calculation
- Task submission history - Simplified, no longer tracked
- Task variants - Removed for simplicity
