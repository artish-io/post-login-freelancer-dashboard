# 🛡️ Duration Guard Implementation

## Overview

The Duration Guard is a surgical fix that ensures project due dates are calculated from the **activation date** rather than the original gig posting dates. This preserves the intended project duration regardless of when the project gets matched and activated.

**Key Principle**: Separate project activation date from gig creation date while persisting duration information at both project and task levels.

## Problem Statement

Previously, if a 3-day project was scheduled to run from January 1-3 but didn't get matched until January 3, the project would still have a due date of January 3 (the original end date), giving the freelancer 0 days to complete the work instead of the intended 3 days.

## Solution

The Duration Guard calculates due dates using this formula:
```
Due Date = Activation Date + Original Duration
```

### Example Scenarios

| Scenario | Original Schedule | Activation Date | Old Due Date | New Due Date | Duration Preserved |
|----------|------------------|-----------------|--------------|--------------|-------------------|
| On Time | Jan 1 → Jan 3 (3 days) | Jan 1 | Jan 3 | Jan 3 | ✅ 3 days |
| 2 Days Late | Jan 1 → Jan 3 (3 days) | Jan 3 | Jan 3 | Jan 6 | ✅ 3 days |
| 1 Week Late | Jan 1 → Jan 8 (7 days) | Jan 8 | Jan 8 | Jan 15 | ✅ 7 days |

## Date Separation Architecture

### Core Concept: Three Distinct Dates

1. **Gig Posted Date** (`gigPostedDate`) - When the gig was originally created
2. **Project Activation Date** (`projectActivatedAt`) - When the project was matched and activated
3. **Calculated Due Date** (`dueDate`) - Activation Date + Original Duration

### Data Structure Enhancement

#### Project Level (`data/projects/*/project.json`)
```json
{
  "projectId": "Z-006",
  "createdAt": "2025-08-20T17:02:18.468Z", // Project activation time
  "dueDate": "2025-08-26T04:00:00.000Z",   // Calculated from activation + duration

  // 🛡️ DURATION GUARD: Clear date separation
  "gigId": 30,
  "gigPostedDate": "2025-08-20",           // When gig was originally posted
  "projectActivatedAt": "2025-08-20T17:02:18.468Z", // When project was activated

  // 🛡️ DURATION GUARD: Duration persistence
  "originalDuration": {
    "deliveryTimeWeeks": 0.857,            // Original intended duration
    "estimatedHours": 40,                  // Original estimated hours
    "originalStartDate": "2025-08-21T04:00:00.000Z", // Original intended start
    "originalEndDate": "2025-08-26T04:00:00.000Z"    // Original intended end
  },

  // Legacy fields for backward compatibility
  "deliveryTimeWeeks": 0.857,
  "estimatedHours": 40
}
```

#### Task Level (`data/project-tasks/*/task.json`)
```json
{
  "taskId": 12345,
  "dueDate": "2025-08-26T04:00:00.000Z",   // Calculated from activation + duration
  "createdDate": "2025-08-20T17:02:18.468Z", // Task creation time

  // 🛡️ DURATION GUARD: Task-level duration information
  "taskActivatedAt": "2025-08-20T17:02:18.468Z", // When task was created
  "originalTaskDuration": {
    "estimatedHours": 40,                  // Original estimated hours for this task
    "originalDueDate": "2025-08-26T04:00:00.000Z" // Original due date from gig
  }
}
```

## Implementation Details

### Core Logic

The guard is implemented in the `calculateDueDate` method in `ProjectService`:

```typescript
private static calculateDueDate(deliveryTimeWeeks: number, endDate?: string, activationDate?: Date): string {
  const activationTime = activationDate || new Date();
  
  // 🛡️ GUARD: Always calculate from activation date to preserve duration
  if (deliveryTimeWeeks > 0) {
    const dueDate = new Date(activationTime.getTime() + deliveryTimeWeeks * 7 * 24 * 60 * 60 * 1000);
    return dueDate.toISOString().split('T')[0];
  }
  
  // Fallback logic for edge cases...
}
```

### Files Modified

1. **`src/lib/storage/schemas.ts`**
   - Enhanced `ProjectSchema` with date separation fields
   - Added `originalDuration` object for duration persistence
   - Enhanced `ProjectTaskSchema` with task-level duration information

2. **`src/app/api/projects/services/project-service.ts`**
   - Updated `calculateDueDate` method to accept activation date
   - Modified `generateDefaultTasks` to pass activation date and include duration info
   - Enhanced project creation to populate date separation fields

3. **`src/app/api/gig-requests/[id]/accept/route.ts`**
   - Updated both completion and milestone project creation paths
   - Added date separation and duration persistence for both paths
   - Replaced original endDate priority with activation-based calculation

4. **`src/app/api/projects/completion/create/route.ts`**
   - Added due date calculation for completion-based projects
   - Enhanced with date separation and duration persistence
   - Applied duration guard logic

5. **`src/app/api/projects/create/route.ts`**
   - Added due date calculation for general project creation
   - Enhanced with date separation and duration persistence
   - Applied duration guard logic

## Key Features

### ✅ Conservative Implementation
- **No breaking changes** to existing gig matching, project activation, or payment logic
- **Surgical approach** - only modifies due date calculation
- **Preserves all existing functionality**

### ✅ Consistent Application
- Applied across **all project creation paths**:
  - Gig request acceptance (completion & milestone)
  - Direct project creation
  - Completion-based project creation
  - Project service creation

### ✅ Fallback Handling
- Graceful handling when `deliveryTimeWeeks` is 0 or missing
- Default to 1 week if no duration information available
- Maintains backward compatibility

### ✅ Clear Documentation
- Extensive comments explaining the guard logic
- Examples in code showing the Jan 1-3 → Jan 3-6 scenario
- Emoji markers (🛡️) for easy identification

## Testing

The implementation includes a comprehensive test script (`scripts/test-duration-guard.js`) that validates:

- 3-day project activated 2 days late
- 1-week project activated 1 week late  
- 2-week project activated on time

All tests pass, confirming the guard works correctly.

## Impact

### ✅ Benefits
- **Preserves project duration** regardless of activation timing
- **Fair to freelancers** - they get the full intended time to complete work
- **Predictable scheduling** - duration is always respected
- **No disruption** to existing workflows

### ✅ No Side Effects
- **Gig matching** logic unchanged
- **Project activation** logic unchanged
- **Payment execution** logic unchanged
- **Notification system** unchanged

## Usage

The Duration Guard is automatically applied to all new projects created after this implementation. No manual intervention or configuration is required.

### For Existing Projects
Existing projects retain their current due dates. The guard only applies to newly activated projects going forward.

### For Developers
When creating new project creation endpoints, ensure you:
1. Calculate due dates from activation time, not original gig dates
2. Use the `🛡️ DURATION GUARD` comment pattern for clarity
3. Apply the same logic: `activationDate + originalDuration = newDueDate`

## Monitoring

To verify the guard is working:
1. Check project due dates in newly created projects
2. Compare activation date (`createdAt`) with due date
3. Verify the duration matches the original gig `deliveryTimeWeeks`

The guard ensures that `dueDate - createdAt ≈ deliveryTimeWeeks * 7 days` for all new projects.
