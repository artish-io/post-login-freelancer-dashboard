import { NextRequest, NextResponse } from 'next/server';
import { readAllProjects } from '@/lib/projects-utils';
import { getAllInvoices, saveInvoice } from '@/lib/invoice-storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, freelancerId } = body;

    if (!projectId || !freelancerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch project data, tasks, and existing invoices using hierarchical storage
    const { readAllTasks, convertHierarchicalToLegacy } = await import('@/lib/project-tasks/hierarchical-storage');

    const [projects, hierarchicalTasks, invoices] = await Promise.all([
      readAllProjects(), // ✅ Use hierarchical storage
      readAllTasks(),    // ✅ Already correct
      getAllInvoices()   // ✅ Use hierarchical storage
    ]);

    // Convert tasks to legacy format for compatibility
    const allProjectTasks = convertHierarchicalToLegacy(hierarchicalTasks);

    // Find the specific project
    const projectInfo = projects.find((p: any) => p.projectId === projectId);
    const projectTasks = allProjectTasks.find((pt: any) => pt.projectId === projectId);

    if (!projectInfo || !projectTasks) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const tasks = projectTasks.tasks || [];

    // Get already invoiced tasks
    const invoicedTaskIds = new Set();
    const invoicedTaskTitles = new Set();
    invoices
      .filter((invoice: any) => invoice.projectId === projectId)
      .forEach((invoice: any) => {
        if (invoice.milestones) {
          invoice.milestones.forEach((milestone: any) => {
            if (milestone.taskId) invoicedTaskIds.add(milestone.taskId);
            if (milestone.title || milestone.description) {
              invoicedTaskTitles.add(milestone.title || milestone.description);
            }
          });
        }
        if (invoice.milestoneDescription) {
          invoicedTaskTitles.add(invoice.milestoneDescription);
        }
      });

    // Find available tasks
    const availableTasks = tasks.filter((task: any) => {
      return task.status === 'Approved' &&
             !invoicedTaskIds.has(task.id) &&
             !invoicedTaskTitles.has(task.title) &&
             !task.invoicePaid;
    });

    if (availableTasks.length === 0) {
      return NextResponse.json({ error: 'No available tasks to invoice' }, { status: 400 });
    }

    // ✅ Enhanced rate calculation with edge case handling
    let ratePerTask = 0;
    if (projectInfo.totalBudget && projectInfo.totalTasks) {
      if (projectInfo.invoicingMethod === 'completion') {
        // For completion-based projects: Handle edge cases where some tasks are already paid
        const upfrontCommitment = projectInfo.upfrontCommitment || 0;
        const milestonePool = projectInfo.totalBudget - upfrontCommitment;

        // Check how many tasks have already been paid
        const paidTasksCount = existingInvoices
          .filter((inv: any) => inv.projectId === projectId && inv.status === 'paid')
          .reduce((count: number, inv: any) => count + (inv.milestones?.length || 0), 0);

        const remainingTasks = Math.max(1, projectInfo.totalTasks - paidTasksCount);
        const remainingBudget = milestonePool - (paidTasksCount * (milestonePool / projectInfo.totalTasks));

        ratePerTask = remainingBudget / remainingTasks;

        console.log(`💰 Completion-based rate calculation for project ${projectId}:`, {
          totalBudget: projectInfo.totalBudget,
          upfrontCommitment,
          milestonePool,
          totalTasks: projectInfo.totalTasks,
          paidTasksCount,
          remainingTasks,
          remainingBudget,
          ratePerTask
        });
      } else {
        // For milestone-based projects: totalBudget / totalTasks (no upfront payment)
        ratePerTask = projectInfo.totalBudget / projectInfo.totalTasks;

        console.log(`💰 Milestone-based rate per task: $${ratePerTask} (Budget: $${projectInfo.totalBudget}, Tasks: ${projectInfo.totalTasks})`);
      }
    }

    // Create milestones from available tasks
    const milestones = availableTasks.map((task: any) => ({
      title: task.title || `Task ${task.id}`,
      description: task.description || task.title || `Task ${task.id}`,
      rate: ratePerTask > 0 ? ratePerTask : 0,
      taskId: task.id
    }));

    const totalAmount = milestones.reduce((sum: number, m: any) => sum + m.rate, 0);

    // Generate invoice number
    const invoiceNumber = `INV-${projectId}-${Date.now()}`;

    // Create invoice data
    const invoiceData = {
      invoiceNumber,
      freelancerId: Number(freelancerId),
      commissionerId: projectInfo.commissionerId,
      projectId: projectId,
      projectTitle: projectInfo.title,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
      totalAmount: totalAmount,
      status: 'draft',
      milestones: milestones,
      isCustomProject: false,
      createdAt: new Date().toISOString(),
      autoGenerated: true
    };

    // Save using hierarchical storage
    const existingInvoices = await getAllInvoices();

    const newInvoice = {
      ...invoiceData,
      id: existingInvoices.length > 0 ? Math.max(...existingInvoices.map((inv: any) => inv.id || 0)) + 1 : 1
    };

    await saveInvoice(newInvoice);

    return NextResponse.json({
      success: true,
      invoiceNumber,
      invoiceData: newInvoice
    });

  } catch (error) {
    console.error('Error generating invoice for project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
