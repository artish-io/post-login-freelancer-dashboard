// src/app/api/dashboard/invoice-meta/projects/route.ts

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const freelancerId = Number(searchParams.get('freelancerId'));
  const commissionerId = searchParams.get('commissionerId') ? Number(searchParams.get('commissionerId')) : null;

  if (!freelancerId) {
    return NextResponse.json({ error: 'Missing freelancerId' }, { status: 400 });
  }

  try {
    const [projectsData, tasksData, invoicesData] = await Promise.all([
      readFile(path.join(process.cwd(), 'data', 'projects.json'), 'utf-8'),
      readFile(path.join(process.cwd(), 'data', 'project-tasks.json'), 'utf-8'),
      readFile(path.join(process.cwd(), 'data', 'invoices.json'), 'utf-8')
    ]);

    const allProjects = JSON.parse(projectsData);
    const allTasks = JSON.parse(tasksData);
    const allInvoices = JSON.parse(invoicesData);

    let filtered = allProjects.filter((p: any) => p.freelancerId === freelancerId);

    // If commissionerId is provided, further filter by commissioner
    if (commissionerId) {
      filtered = filtered.filter((p: any) => p.commissionerId === commissionerId);
    }

    const result = filtered.map((p: any) => {
      // Find project tasks
      const projectTasks = allTasks.find((pt: any) => pt.projectId === p.projectId);
      const tasks = projectTasks?.tasks || [];

      // Check if project is completed (all tasks approved AND completed, and all invoices paid)
      const approvedAndCompletedTasks = tasks.filter((task: any) =>
        task.status === 'Approved' && task.completed === true
      );
      const isCompleted = tasks.length > 0 && approvedAndCompletedTasks.length === tasks.length;

      // Get all task IDs and titles that have been invoiced (ANY status: draft, sent, paid, cancelled, overdue)
      const invoicedTaskIds = new Set();
      const invoicedTaskTitles = new Set();
      const validInvoiceStatuses = ['draft', 'sent', 'paid', 'cancelled', 'overdue'];

      allInvoices
        .filter((invoice: any) =>
          invoice.projectId === p.projectId &&
          validInvoiceStatuses.includes(invoice.status)
        )
        .forEach((invoice: any) => {
          // Check new invoice format with milestones array
          if (invoice.milestones) {
            invoice.milestones.forEach((milestone: any) => {
              if (milestone.taskId) {
                invoicedTaskIds.add(milestone.taskId);
              }
              if (milestone.title || milestone.description) {
                invoicedTaskTitles.add(milestone.title || milestone.description);
              }
            });
          }
          // Check old invoice format with milestoneDescription
          if (invoice.milestoneDescription) {
            invoicedTaskTitles.add(invoice.milestoneDescription);
          }
        });

      // Count available tasks for invoicing (must be approved AND completed AND not invoiced)
      const availableTasks = tasks.filter((task: any) => {
        const isTaskEligible = task.status === 'Approved' && task.completed === true;
        const hasNoInvoice = !invoicedTaskIds.has(task.id) &&
                            !invoicedTaskTitles.has(task.title) &&
                            !task.invoicePaid;

        return isTaskEligible && hasNoInvoice;
      });

      // Additional check: if project is completed, ensure all invoices are paid
      let projectFullyCompleted = isCompleted;
      if (isCompleted) {
        const projectInvoices = allInvoices.filter((invoice: any) => invoice.projectId === p.projectId);
        const hasUnpaidInvoices = projectInvoices.some((invoice: any) =>
          invoice.status !== 'paid'
        );
        projectFullyCompleted = !hasUnpaidInvoices;
      }

      return {
        projectId: p.projectId,
        title: p.title,
        hasAvailableMilestones: availableTasks.length > 0,
        availableTasksCount: availableTasks.length,
        isCompleted: projectFullyCompleted,
        reason: availableTasks.length === 0 ? 'All eligible tasks have been invoiced' : null
      };
    }).filter((p: any) => !p.isCompleted && p.hasAvailableMilestones); // Exclude completed projects and projects with no available tasks

    return NextResponse.json(result);
  } catch (error) {
    console.error('[invoice-meta/projects] Failed:', error);
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 });
  }
}