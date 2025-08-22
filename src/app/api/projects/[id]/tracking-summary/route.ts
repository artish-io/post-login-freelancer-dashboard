import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { getAllInvoices } from '@/lib/invoice-storage';

/**
 * GET /api/projects/[id]/tracking-summary
 * 
 * Returns project tracking summary including:
 * - Total and approved tasks count
 * - Manual invoice eligibility for completion projects
 * - Invoices left count
 * - Remaining budget information
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    // Validate session and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[TRACKING_UI] projectId=${projectId}, userId=${session.user.id}`);

    // Read project using hierarchical storage
    const project = await UnifiedStorageService.readProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Validate user has access to this project
    const userId = Number(session.user.id);
    if (project.freelancerId !== userId && project.commissionerId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Read all tasks for this project using hierarchical storage
    const allTasks = await UnifiedStorageService.listTasks(projectId);
    console.log(`[TasksPaths][READ] { projectId: ${projectId}, tasksDir: "hierarchical", count: ${allTasks.length} }`);

    const totalTasks = allTasks.length;
    const approvedTasks = allTasks.filter(task =>
      task.status === 'Approved'
    ).length;
    const pendingTasks = totalTasks - approvedTasks;

    // Calculate manual invoice eligibility for completion projects
    let eligibleForManualInvoiceTaskIds: number[] = [];
    let eligibleForManualInvoiceCount = 0;
    let invoicesLeft = 0;
    let remainingBudget = 0;
    let isReadyForFinalPayout = false;

    if (project.invoicingMethod === 'completion') {
      // Get all invoices for this project
      const allInvoices = await getAllInvoices({ projectId });
      
      // Check each approved task for manual invoice eligibility
      for (const task of allTasks) {
        if (task.status === 'Approved') {
          // Check if task already has a paid or sent invoice
          const taskInvoices = allInvoices.filter(inv =>
            (inv as any).taskId === task.taskId &&
            (inv.status === 'paid' || inv.status === 'sent')
          );

          if (taskInvoices.length === 0) {
            eligibleForManualInvoiceTaskIds.push(Number(task.taskId));
            eligibleForManualInvoiceCount++;
          }
        }
      }

      // Calculate remaining budget and invoices left
      const totalBudget = Number(project.totalBudget || 0);
      const upfrontCommitment = Number(project.upfrontCommitment || 0);
      remainingBudget = Math.max(0, totalBudget - upfrontCommitment);
      
      // For completion projects, invoices left = eligible tasks
      invoicesLeft = eligibleForManualInvoiceCount;
      
      // Ready for final payout when all tasks approved and no eligible tasks remain
      isReadyForFinalPayout = totalTasks > 0 && approvedTasks === totalTasks && eligibleForManualInvoiceCount === 0;
    } else {
      // For milestone projects, use simpler logic
      const sentInvoices = await getAllInvoices({ 
        projectId, 
        status: 'sent' 
      });
      invoicesLeft = sentInvoices.length;
      
      const totalBudget = Number(project.totalBudget || 0);
      remainingBudget = totalBudget; // Simplified for milestone projects
    }

    const summary = {
      projectId,
      invoicingMethod: project.invoicingMethod || 'milestone',
      totalTasks,
      approvedTasks,
      pendingTasks,
      eligibleForManualInvoiceTaskIds,
      eligibleForManualInvoiceCount,
      invoicesLeft,
      remainingBudget,
      isReadyForFinalPayout
    };

    console.log(`[PROGRESS_AGG] { projectId: ${projectId}, totalTasks: ${totalTasks}, approvedTasks: ${approvedTasks}, pendingTasks: ${pendingTasks}, eligibleForManualInvoiceCount: ${eligibleForManualInvoiceCount}, invoicesLeft: ${invoicesLeft}, remainingBudget: ${remainingBudget} }`);

    return NextResponse.json(summary);

  } catch (error) {
    console.error('Error fetching tracking summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
