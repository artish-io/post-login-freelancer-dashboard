import { NextResponse, NextRequest } from 'next/server';
// ✅ SAFE: Reuse shared infrastructure only
import { requireSession, assert } from '@/lib/auth/session-guard';
import { sanitizeApiInput } from '@/lib/security/input-sanitizer';
import { withErrorHandling, ok, err } from '@/lib/http/envelope';

// 🚨 CRITICAL: This is a COMPLETELY NEW route for completion projects only
// 🛡️ PROTECTED: Does NOT modify src/app/api/project-tasks/submit/route.ts (milestone route)

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const { userId: actorId } = await requireSession(req);
    const body = await req.json();
    const { projectId, taskId, action } = sanitizeApiInput(body);
    
    // 🛡️ CRITICAL GUARD: Only handle completion projects - prevents milestone contamination
    const project = await getProjectById(projectId);
    assert(project, 'Project not found', 404);

    if (project.invoicingMethod !== 'completion') {
      console.error(`[COMPLETION_PAY] GUARD VIOLATION: Attempt to use completion endpoint for ${project.invoicingMethod} project ${projectId}`);
      assert(false, `GUARD: This endpoint is for completion projects only. Project ${projectId} is ${project.invoicingMethod}-based`, 400);
    }

    console.log(`[COMPLETION_PAY] Processing task approval for completion project ${projectId}`);
    
    if (action !== 'approve') {
      return NextResponse.json(ok({ 
        message: 'Only approval actions supported for completion projects',
        supportedActions: ['approve']
      }));
    }
    
    // 🔒 COMPLETION-SPECIFIC: Approve task without auto-invoice generation
    const task = await getTaskById(taskId);
    assert(task, 'Task not found', 404);
    assert(task.projectId === projectId, 'Task does not belong to project', 400);
    assert(project.commissionerId === actorId, 'Unauthorized', 403);
    assert(task.status !== 'Approved', 'Task is already approved', 409);
    
    // Update task status
    const updatedTask = {
      ...task,
      status: 'Approved',
      approvedAt: new Date().toISOString(),
      approvedBy: actorId,
      // 🔒 COMPLETION-SPECIFIC: Mark as eligible for manual invoice
      manualInvoiceEligible: true,
      invoicePaid: false
    };
    
    await updateTask(taskId, updatedTask);

    // 🔒 COMPLETION-SPECIFIC: Use centralized completion gate to check final payment eligibility
    const { CompletionCalculationService } = await import('@/app/api/payments/services/completion-calculation-service');
    const completionStatus = await CompletionCalculationService.isProjectReadyForFinalPayout(projectId);

    let finalPaymentResult = null;

    if (completionStatus.isReadyForFinalPayout) {
      // 🔒 COMPLETION-SPECIFIC: Only trigger final payment when gate confirms eligibility
      console.log(`[COMPLETION_PAY] Triggering final payment for project ${projectId}: ${completionStatus.reason}`);
      try {
        const finalPaymentResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/payments/completion/execute-final`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || ''
          },
          body: JSON.stringify({ projectId })
        });

        if (finalPaymentResponse.ok) {
          finalPaymentResult = await finalPaymentResponse.json();
        } else {
          console.warn('[COMPLETION_PAY] Final payment trigger failed:', await finalPaymentResponse.text());
        }
      } catch (e) {
        console.warn('[COMPLETION_PAY] Final payment trigger failed:', e);
      }
    } else {
      console.log(`[COMPLETION_PAY] Final payment not triggered for project ${projectId}: ${completionStatus.reason}`);
    }
    
    // 🔔 COMPLETION-SPECIFIC: Emit task approval notification
    try {
      const { handleCompletionNotification } = await import('@/app/api/notifications-v2/completion-handler');

      // Always emit task approval notification
      await handleCompletionNotification({
        type: 'completion.task_approved',
        actorId: actorId,
        targetId: project.freelancerId,
        projectId,
        context: {
          taskId: updatedTask.id,
          taskTitle: updatedTask.title,
          projectTitle: project.title,
          commissionerName: 'Commissioner' // TODO: Get actual name
        }
      });

      // Note: Project completion and final payment notifications are handled in final payment route
    } catch (e) {
      console.warn('Completion notification failed:', e);
    }
    
    return NextResponse.json(ok({
      task: {
        id: updatedTask.id,
        title: updatedTask.title,
        status: updatedTask.status,
        approvedAt: updatedTask.approvedAt,
        manualInvoiceEligible: updatedTask.manualInvoiceEligible
      },
      project: {
        projectId,
        allTasksCompleted: completionStatus.allTasksApproved,
        totalTasks: completionStatus.totalTasks,
        approvedTasks: completionStatus.approvedTasks,
        remainingBudget: completionStatus.remainingBudget,
        readyForFinalPayout: completionStatus.isReadyForFinalPayout
      },
      finalPayment: finalPaymentResult?.data || null,
      message: completionStatus.isReadyForFinalPayout
        ? 'Task approved - all conditions met, final payment triggered'
        : `Task approved successfully - ${completionStatus.reason}`
    }));
  });
}

// Helper functions - NEW, doesn't modify existing functions
async function getProjectById(projectId: string) {
  try {
    const fs = await import('fs').promises;
    const path = await import('path');
    
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    const projectsData = await fs.readFile(projectsPath, 'utf8');
    const projects = JSON.parse(projectsData);
    
    return projects.find((p: any) => p.projectId === projectId);
  } catch (error) {
    console.error('Error reading project:', error);
    return null;
  }
}

async function getTaskById(taskId: string) {
  try {
    const fs = await import('fs').promises;
    const path = await import('path');
    
    const tasksPath = path.join(process.cwd(), 'data', 'project-tasks.json');
    const tasksData = await fs.readFile(tasksPath, 'utf8');
    const tasks = JSON.parse(tasksData);
    
    return tasks.find((t: any) => t.id === taskId);
  } catch (error) {
    console.error('Error reading task:', error);
    return null;
  }
}

async function getTasksByProject(projectId: string) {
  try {
    const fs = await import('fs').promises;
    const path = await import('path');
    
    const tasksPath = path.join(process.cwd(), 'data', 'project-tasks.json');
    const tasksData = await fs.readFile(tasksPath, 'utf8');
    const tasks = JSON.parse(tasksData);
    
    return tasks.filter((t: any) => t.projectId === projectId);
  } catch (error) {
    console.error('Error reading tasks:', error);
    return [];
  }
}

async function updateTask(taskId: string, updates: any) {
  try {
    const fs = await import('fs').promises;
    const path = await import('path');
    
    const tasksPath = path.join(process.cwd(), 'data', 'project-tasks.json');
    const tasksData = await fs.readFile(tasksPath, 'utf8');
    const tasks = JSON.parse(tasksData);
    
    const taskIndex = tasks.findIndex((t: any) => t.id === taskId);
    if (taskIndex !== -1) {
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      await fs.writeFile(tasksPath, JSON.stringify(tasks, null, 2));
    }
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
}
