# Deprecated Files Report

## Overview

This report documents files that have been deprecated as part of the unified storage system implementation.

## Deprecated Files

### Repository Pattern Files (moved to deprecated/repos/)
- `projects-repo.ts` - Replaced by UnifiedStorageService
- `tasks-repo.ts` - Replaced by UnifiedTaskService  
- `invoices-repo.ts` - Replaced by UnifiedStorageService

### Duplicate Endpoints (moved to deprecated/duplicate-endpoints/)
- `/api/tasks/submit/route.ts` - Replaced by unified /api/project-tasks/submit
- `/api/tasks/approve/route.ts` - Replaced by unified /api/project-tasks/submit
- `/api/project-tasks/review/route.ts` - Replaced by unified /api/project-tasks/submit

### Legacy Storage Files (moved to deprecated/flat-files/)
- `projects.json` - Replaced by hierarchical storage
- `tasks.json` - Replaced by hierarchical storage

## Replacement Guide

### For Projects
```typescript
// OLD
import { createProject, getProjectById } from '@/app/api/payments/repos/projects-repo';

// NEW
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';

// Usage
const project = await UnifiedStorageService.getProjectById(projectId);
await UnifiedStorageService.saveProject(project);
```

### For Tasks
```typescript
// OLD
import { createTask, updateTask } from '@/app/api/payments/repos/tasks-repo';

// NEW
import { UnifiedTaskService } from '@/lib/services/unified-task-service';

// Usage
const result = await UnifiedTaskService.submitTask(taskId, userId, submissionData);
const result = await UnifiedTaskService.approveTask(taskId, userId);
```

### For Invoices
```typescript
// OLD
import { createInvoice, getInvoiceById } from '@/app/api/payments/repos/invoices-repo';

// NEW
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';

// Usage
const invoice = await UnifiedStorageService.getInvoiceByNumber(invoiceNumber);
await UnifiedStorageService.saveInvoice(invoice);
```

## Benefits of New System

1. **Single Source of Truth**: All data operations go through unified services
2. **Consistent Storage**: Hierarchical storage for all entities
3. **Better Error Handling**: Centralized error handling and validation
4. **Transaction Integrity**: Atomic operations for complex workflows
5. **Easier Testing**: Unified interfaces for mocking and testing

## Migration Checklist

- [ ] Update all imports to use unified services
- [ ] Test all endpoints with new unified APIs
- [ ] Remove references to deprecated files
- [ ] Update documentation
- [ ] Remove deprecated folder after testing

Generated on: 2025-08-08T19:37:01.211Z
