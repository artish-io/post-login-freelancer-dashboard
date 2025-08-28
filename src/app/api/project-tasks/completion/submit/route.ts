import { NextResponse, NextRequest } from 'next/server';
// ✅ SAFE: Reuse shared infrastructure only
import { requireSession } from '@/lib/auth/session-guard';
import { sanitizeApiInput } from '@/lib/security/input-sanitizer';
import { ok } from '@/lib/http/envelope';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';

// Invariant helper for type narrowing
function invariant<T>(val: T, msg: string, status = 400): asserts val is NonNullable<T> {
  if (val == null) {
    const error = new Error(msg);
    (error as any).status = status;
    (error as any).code = 'VALIDATION_ERROR';
    throw error;
  }
}

// 🚨 CRITICAL: This is a COMPLETELY NEW route for completion projects only
// 🛡️ PROTECTED: Does NOT modify src/app/api/project-tasks/submit/route.ts (milestone route)

export async function POST(req: NextRequest) {
  try {
    // 🧪 TEST BYPASS: Allow testing without authentication in development
    let actorId: number;
    if (process.env.NODE_ENV === 'development' && req.headers.get('X-Test-Bypass-Auth') === 'true') {
      console.log('🧪 TEST MODE: Bypassing authentication for completion endpoint testing');
      actorId = Number(req.headers.get('X-Test-User-ID')) || 35; // Default test commissioner ID
    } else {
      const { userId } = await requireSession(req);
      actorId = userId;
    }

    const body = await req.json();
    const { projectId, taskId, action } = sanitizeApiInput(body);

    // Normalize and validate IDs
    const normalizedProjectId = String(projectId).trim();
    const normalizedTaskId = Number(taskId);
    invariant(normalizedProjectId.length > 0, 'Invalid projectId');
    invariant(Number.isFinite(normalizedTaskId), 'Invalid taskId');

    console.log(`[COMPLETION_SUBMIT] Processing task ${normalizedTaskId} for project ${normalizedProjectId}`);

    // 🛡️ CRITICAL GUARD: Only handle completion projects - prevents milestone contamination
    const project = await UnifiedStorageService.getProjectById(normalizedProjectId);
    invariant(project, 'Project not found', 404);

    if (project.invoicingMethod !== 'completion') {
      console.error(`[COMPLETION_PAY] GUARD VIOLATION: Attempt to use completion endpoint for ${project.invoicingMethod} project ${normalizedProjectId}`);
      invariant(false, `GUARD: This endpoint is for completion projects only. Project ${normalizedProjectId} is ${project.invoicingMethod}-based`, 400);
    }

    console.log(`[TYPE_GUARD] Confirmed completion project ${normalizedProjectId}`);

    if (action !== 'approve') {
      return NextResponse.json(ok({
        message: 'Only approval actions supported for completion projects'
      }));
    }

    // 🔒 COMPLETION-SPECIFIC: Approve task without auto-invoice generation
    // Use hierarchical storage with string projectId (no numeric coercion)
    console.log(`[TasksPaths][READ] Attempting to read task ${normalizedTaskId} from project ${normalizedProjectId}`);

    const task = await UnifiedStorageService.readTask(normalizedProjectId, normalizedTaskId);

    if (!task) {
      // Log path resolution diagnostics before throwing 404
      console.log(`[TasksPaths][MISS] { kind: 'task', projectId: '${normalizedProjectId}', taskId: ${normalizedTaskId} }`);
      invariant(false, 'Task not found', 404);
    }

    // TypeScript assertion: task is guaranteed to be non-null after the invariant check
    const validTask = task!;

    console.log(`[TasksPaths][READ] Successfully found task ${normalizedTaskId} with status: ${validTask.status}`);

    // Validate task belongs to project (compare as strings to avoid NaN issues)
    invariant(String(validTask.projectId) === String(normalizedProjectId), 'Task does not belong to project', 400);
    invariant(project.commissionerId === actorId, 'Unauthorized', 403);
    invariant(validTask.status !== 'Approved', 'Task is already approved', 409);
    
    // Update task status with atomic write logging
    const startTs = Date.now();
    const updatedTask = {
      ...validTask,
      status: 'Approved' as const,
      completed: true, // 🔒 COMPLETION-SPECIFIC: For completion projects, approved = completed
      approvedAt: new Date().toISOString(),
      approvedBy: actorId,
      // 🔒 COMPLETION-SPECIFIC: Mark as eligible for manual invoice
      manualInvoiceEligible: true,
      invoicePaid: false
    };

    console.log(`[ATOMIC_WRITE] { op: 'saveTask', projectId: '${normalizedProjectId}', taskId: ${normalizedTaskId}, prevStatus: '${validTask.status}', nextStatus: 'Approved', startTs: ${startTs} }`);

    await UnifiedStorageService.saveTask(updatedTask);

    const endTs = Date.now();
    console.log(`[ATOMIC_WRITE] { op: 'saveTask', projectId: '${normalizedProjectId}', taskId: ${normalizedTaskId}, endTs: ${endTs}, durationMs: ${endTs - startTs}, ok: true }`);

    // Atomic read-after-write verification
    const readbackTask = await UnifiedStorageService.readTask(normalizedProjectId, normalizedTaskId);
    const readbackMatches = readbackTask?.status === 'Approved';
    console.log(`[ATOMIC_READBACK] { projectId: '${normalizedProjectId}', taskId: ${normalizedTaskId}, status: '${readbackTask?.status}', matches: ${readbackMatches} }`);

    if (!readbackMatches) {
      console.error(`[ATOMIC_READBACK] Read-after-write verification failed for task ${normalizedTaskId}`);
      return NextResponse.json({
        ok: false,
        code: 'ATOMIC_WRITE_FAILED',
        message: 'Task update verification failed',
        status: 500,
        requestId: crypto.randomUUID()
      }, { status: 500 });
    }

    // 🔒 COMPLETION-SPECIFIC: Use centralized completion gate to check final payment eligibility
    const { CompletionCalculationService } = await import('@/app/api/payments/services/completion-calculation-service');
    const completionStatus = await CompletionCalculationService.isProjectReadyForFinalPayout(normalizedProjectId);

    // 🔍 DIAGNOSTIC: Log completion status details
    console.log(`[TYPE_GUARD] Completion readiness check for project ${normalizedProjectId}:`, {
      isReadyForFinalPayout: completionStatus.isReadyForFinalPayout,
      allTasksApproved: completionStatus.allTasksApproved,
      hasRemainingBudget: completionStatus.hasRemainingBudget,
      remainingBudget: completionStatus.remainingBudget,
      totalTasks: completionStatus.totalTasks,
      approvedTasks: completionStatus.approvedTasks,
      reason: completionStatus.reason
    });

    if (completionStatus.isReadyForFinalPayout) {
      // 🔒 COMPLETION-SPECIFIC: Only trigger final payment when gate confirms eligibility
      console.log(`[PAY_TRIGGER] ALLOWED: Final payment triggered for completion project ${normalizedProjectId}: ${completionStatus.reason}`);
      try {
        const finalPaymentResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/payments/completion/execute-final`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || '',
            // 🔑 CRITICAL: Forward cookies for NextAuth session
            'Cookie': req.headers.get('Cookie') || ''
          },
          body: JSON.stringify({ projectId: normalizedProjectId })
        });

        if (finalPaymentResponse.ok) {
          console.log(`[PAY_TRIGGER] Final payment executed successfully for project ${normalizedProjectId}`);
        } else {
          console.warn(`[PAY_TRIGGER] Final payment trigger failed for project ${normalizedProjectId}:`, await finalPaymentResponse.text());
        }
      } catch (e) {
        console.warn(`[PAY_TRIGGER] Final payment trigger failed for project ${normalizedProjectId}:`, e);
      }
    } else {
      console.log(`[PAY_TRIGGER] BLOCKED: Final payment not triggered for completion project ${normalizedProjectId}: ${completionStatus.reason}`);
    }
    
    // 🔔 COMPLETION-SPECIFIC: Emit task approval notification
    try {
      console.log(`[NOTIFY] Sending task approval notification for task ${normalizedTaskId} in project ${normalizedProjectId}`);
      const { handleCompletionNotification } = await import('@/app/api/notifications-v2/completion-handler');

      // Task approval notification for freelancer only
      await handleCompletionNotification({
        type: 'completion.task_approved',
        actorId: actorId,
        targetId: project.freelancerId,
        projectId,
        context: {
          taskId: String(updatedTask.taskId),
          taskTitle: updatedTask.title,
          projectTitle: project.title,
          commissionerName: 'Commissioner' // TODO: Get actual name
        }
      });

      console.log(`[NOTIFY] Task approval notification sent successfully for task ${normalizedTaskId}`);
      // Note: Project completion and final payment notifications are handled in final payment route
    } catch (e) {
      console.warn(`[NOTIFY] Task approval notification failed for task ${normalizedTaskId}:`, e);
    }
    
    const response = ok({
      entities: {
        task: {
          id: updatedTask.taskId,
          title: updatedTask.title,
          status: updatedTask.status,
          approvedAt: updatedTask.approvedAt,
          manualInvoiceEligible: updatedTask.manualInvoiceEligible
        },
        project: {
          projectId: normalizedProjectId,
          allTasksCompleted: completionStatus.allTasksApproved,
          totalTasks: completionStatus.totalTasks,
          approvedTasks: completionStatus.approvedTasks,
          remainingBudget: completionStatus.remainingBudget,
          readyForFinalPayout: completionStatus.isReadyForFinalPayout
        }
      },
      notificationsQueued: true,
      message: completionStatus.isReadyForFinalPayout
        ? 'Task approved - all conditions met, final payment triggered'
        : `Task approved successfully - ${completionStatus.reason}`
    });

    console.log(`[COMPLETION_SUBMIT] Successfully completed task ${normalizedTaskId} approval for project ${normalizedProjectId}`);
    return NextResponse.json(response);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[COMPLETION_SUBMIT] Error processing task approval:`, msg);

    // Handle custom errors with status codes
    if (error && typeof error === 'object' && 'status' in error && 'code' in error) {
      return NextResponse.json({
        ok: false,
        requestId: crypto.randomUUID(),
        code: (error as any).code,
        message: (error as any).message || msg,
        status: (error as any).status
      }, { status: (error as any).status });
    }

    // Handle generic errors
    return NextResponse.json({
      ok: false,
      requestId: crypto.randomUUID(),
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? msg : 'Internal server error',
      status: 500
    }, { status: 500 });
  }
}
