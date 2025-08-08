import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { readAllTasks } from '@/app/api/payments/repos/tasks-repo';
import { readAllProjects } from '@/app/api/payments/repos/projects-repo';
import { getAllInvoices, saveInvoice } from '../../../../lib/invoice-storage';
import { getInitialInvoiceStatus, AUTO_MILESTONE_CONFIG } from '../../../../lib/invoice-status-definitions';

const EVENTS_LOG_PATH = path.join(process.cwd(), 'data/notifications/notifications-log.json');

interface Task {
  id: number;
  title: string;
  status: string;
  completed: boolean;
  order: number;
  description: string;
}

interface ProjectTask {
  projectId: number;
  title: string;
  organizationId: number;
  tasks: Task[];
}

interface Project {
  projectId: number;
  title: string;
  commissionerId: number;
  freelancerId: number;
  status: string;
  invoicingMethod: 'milestone' | 'completion';
}

export async function POST(request: Request) {
  try {
    const { taskId, projectId, action } = await request.json();

    if (action !== 'task_approved') {
      return NextResponse.json({ message: 'No invoice generation needed' });
    }

    // Load all required data
    const [projects, allTasks, invoices, eventsData] = await Promise.all([
      readAllProjects(), // Use projects repo
      readAllTasks(), // Use tasks repo
      getAllInvoices(), // Use hierarchical storage for invoices
      fs.readFile(EVENTS_LOG_PATH, 'utf-8')
    ]);

    // invoices is already parsed from hierarchical storage
    const events = JSON.parse(eventsData);

    // Find the project and task
    const project = projects.find(p => Number(p.projectId) === Number(projectId));
    const task = allTasks.find(t => Number(t.id) === Number(taskId) && Number(t.projectId) === Number(projectId));

    if (!project || !task) {
      return NextResponse.json({ error: 'Project or task not found' }, { status: 404 });
    }

    // Only auto-generate invoices for milestone-based projects
    if (project.invoicingMethod !== 'milestone') {
      return NextResponse.json({
        message: `Project uses ${project.invoicingMethod}-based invoicing. Auto-generation only applies to milestone-based projects.`
      });
    }

    // 🔒 MILESTONE VALIDATION: Verify task is approved before generating invoice
    if (task.status !== 'approved') {
      return NextResponse.json({
        error: 'Invoice can only be generated for approved milestone tasks',
        taskStatus: task.status
      }, { status: 400 });
    }

    // Check if this task already has an invoice
    const existingInvoice = invoices.find((inv: any) =>
      inv.projectId === projectId &&
      inv.milestones?.some((m: any) => m.taskId === taskId)
    );

    if (existingInvoice) {
      return NextResponse.json({
        message: 'Invoice already exists for this milestone task',
        existingInvoiceNumber: existingInvoice.invoiceNumber
      });
    }

    // 💰 MILESTONE PAYMENT LOGIC: Synchronize with frontend logic
    // For milestone-based projects, total budget is evenly distributed across ALL milestones
    // This matches the logic in post-a-gig and proposal creation
    const totalBudget = project.totalBudget || project.budget?.upper || project.budget?.lower || 5000;
    const totalMilestones = project.totalTasks || 1;

    // For milestone-based projects, there's NO upfront commitment - payment is per milestone
    const milestoneAmount = Math.round((totalBudget / totalMilestones) * 100) / 100;

    console.log(`💰 Milestone payment calculation for project ${projectId}:`, {
      totalBudget,
      totalMilestones,
      milestoneAmount,
      invoicingMethod: project.invoicingMethod,
      note: 'Each milestone gets equal share of total budget'
    });

    // Generate invoice number
    const invoiceNumber = `AUTO-${Date.now()}-${projectId}-${taskId}`;

    // Create new invoice entry with proper status system
    const initialStatus = getInitialInvoiceStatus('auto_milestone', true);
    const newInvoice = {
      invoiceNumber,
      freelancerId: project.freelancerId,
      projectId: project.projectId,
      commissionerId: project.commissionerId,
      projectTitle: project.title,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      totalAmount: milestoneAmount, // Use calculated milestone amount
      status: initialStatus, // Use proper status system ('sent' for auto-milestone)
      invoiceType: 'auto_milestone' as const, // Track invoice type
      invoicingMethod: 'milestone', // Explicitly set invoicing method
      milestones: [
        {
          taskId: task.id,
          description: task.title,
          rate: milestoneAmount, // Use calculated milestone amount
          approvedAt: new Date().toISOString()
        }
      ],
      // Auto-milestone specific fields
      autoPaymentAttempts: 0,
      nextRetryDate: null,
      // Legacy fields for backward compatibility
      isAutoGenerated: true,
      generatedAt: new Date().toISOString(),
      sentDate: new Date().toISOString() // Auto-milestone invoices are immediately sent
    };

    // Add to invoices
    invoices.push(newInvoice);
    await fs.writeFile(INVOICES_PATH, JSON.stringify(invoices, null, 2));

    // Create invoice generation event
    const invoiceEvent = {
      id: `evt_${Date.now()}_invoice_auto`,
      timestamp: new Date().toISOString(),
      type: 'invoice_auto_generated',
      notificationType: 42, // New type for auto-generated invoices
      actorId: project.freelancerId,
      targetId: project.commissionerId,
      entityType: 5, // Invoice entity type
      entityId: invoiceNumber,
      metadata: {
        taskTitle: task.title,
        projectTitle: project.title,
        amount: taskRate,
        invoiceNumber
      },
      context: {
        projectId: project.projectId,
        taskId: task.id,
        invoiceId: invoiceNumber
      }
    };

    events.push(invoiceEvent);
    await fs.writeFile(EVENTS_LOG_PATH, JSON.stringify(events, null, 2));

    return NextResponse.json({
      success: true,
      invoice: newInvoice,
      message: `Auto-generated invoice ${invoiceNumber} for approved task: ${task.title}`
    });

  } catch (error) {
    console.error('Error auto-generating invoice:', error);
    return NextResponse.json({ error: 'Failed to auto-generate invoice' }, { status: 500 });
  }
}
