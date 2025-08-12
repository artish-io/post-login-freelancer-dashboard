import { NextResponse } from 'next/server';
import { readProject } from '@/lib/projects-utils';
import { readProjectTasks } from '@/lib/project-tasks/hierarchical-storage';
import { getAllInvoices } from '@/lib/invoice-storage';
import { normalizeTaskStatus } from '@/app/api/payments/domain/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectIdParam = searchParams.get('projectId');

    if (!projectIdParam) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const projectId = Number(projectIdParam);

    // Load via hierarchical storage
    const [project, tasks, allInvoices] = await Promise.all([
      readProject(projectId),
      readProjectTasks(projectId),
      getAllInvoices(),
    ]);

    // Filter invoices for this project
    const invoices = allInvoices.filter((inv: any) => inv.projectId === projectId);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Normalize task statuses and compute approved
    const safeTasks = (tasks || []).map(t => ({
      ...t,
      status: normalizeTaskStatus((t as any).status),
    }));

    const approvedTasks = safeTasks.filter(t => t.status === 'approved' || t.completed === true);

    // Branch by invoicing method
    if (project.invoicingMethod === 'completion') {
      const eligibleInvoices: Array<{
        invoiceNumber: string;
        taskId: string | number;
        taskTitle?: string;
        taskOrder?: number;
        amount: number;
        milestoneNumber?: number;
        status: string;
      }> = [];

      for (const task of approvedTasks) {
        const taskTitleLc = String((task as any).title ?? '').toLowerCase();
        const taskOrder = (task as any).order ?? (task as any).index;

        const match = (invoices || []).find((inv: any) => {
          const desc = String(inv?.milestoneDescription ?? '').toLowerCase();
          const isSent = String(inv?.status) === 'sent';
          const milestoneMatches = inv?.milestoneNumber != null && inv.milestoneNumber === taskOrder;
          const textMatches = desc && (desc.includes(taskTitleLc) || taskTitleLc.includes(desc));
          return isSent && (milestoneMatches || textMatches);
        });

        if (match) {
          eligibleInvoices.push({
            invoiceNumber: String(match.invoiceNumber),
            taskId: task.taskId,
            taskTitle: (task as any).title,
            taskOrder,
            amount: Number(match.totalAmount ?? 0),
            milestoneNumber: match.milestoneNumber,
            status: String(match.status),
          });
        }
      }

      // Calculate completion-based amounts (if project carries budget metadata)
      const totalBudget = Number((project as any).totalBudget || 0);
      const upfrontCommitment = Number((project as any).upfrontCommitment || 0);
      const totalTasks = Number((project as any).totalTasks || safeTasks.length || 0);
      const remainingBudget = Math.max(0, totalBudget - upfrontCommitment);
      const calculatedAmountPerTask = totalTasks > 0 ? Math.round((remainingBudget / totalTasks) * 100) / 100 : 0;

      return NextResponse.json({
        projectId,
        projectTitle: (project as any).title,
        invoicingMethod: project.invoicingMethod,
        paymentEligible: eligibleInvoices.length > 0,
        eligibleInvoices,
        approvedTasksCount: approvedTasks.length,
        totalTasksCount: safeTasks.length,
        calculatedAmountPerTask,
        projectBudget: {
          total: totalBudget,
          upfrontCommitment,
          remaining: remainingBudget,
        },
        latestEligibleInvoice: eligibleInvoices.length > 0
          ? eligibleInvoices.sort((a, b) => (Number(b.milestoneNumber || 0) - Number(a.milestoneNumber || 0)))[0]
          : null,
        paymentMethodAvailable: !!project.invoicingMethod && ['completion', 'milestone'].includes(project.invoicingMethod),
        paymentTriggerEndpoint: '/api/payments/trigger',
      });
    }

    // Milestone-based: simpler — any 'sent' invoice is eligible
    const sentInvoices = (invoices || []).filter((inv: any) => String(inv.status) === 'sent');

    return NextResponse.json({
      projectId,
      projectTitle: (project as any).title,
      invoicingMethod: project.invoicingMethod,
      paymentEligible: sentInvoices.length > 0,
      eligibleInvoices: sentInvoices.map((inv: any) => ({
        invoiceNumber: String(inv.invoiceNumber),
        amount: Number(inv.totalAmount),
        milestoneNumber: inv.milestoneNumber,
        status: String(inv.status),
        description: inv.milestoneDescription,
      })),
      latestEligibleInvoice: sentInvoices.length > 0
        ? sentInvoices.sort((a: any, b: any) => (Number(b.milestoneNumber || 0) - Number(a.milestoneNumber || 0)))[0]
        : null,
      paymentMethodAvailable: !!project.invoicingMethod && ['completion', 'milestone'].includes(project.invoicingMethod),
      paymentTriggerEndpoint: '/api/payments/trigger',
    });
  } catch (error) {
    console.error('Error checking payment eligibility:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
