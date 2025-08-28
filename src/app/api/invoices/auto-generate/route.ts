import { NextResponse } from 'next/server';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { getAllInvoices, saveInvoice } from '../../../../lib/invoice-storage';
import { getInitialInvoiceStatus } from '../../../../lib/invoice-status-definitions';

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

    console.log('🔧 Auto-generate invoice called with:', { taskId, projectId, action });

    if (action !== 'task_approved') {
      return NextResponse.json({ message: 'No invoice generation needed' });
    }

    // Load all required data using hierarchical storage
    const [projects, invoices] = await Promise.all([
      UnifiedStorageService.listProjects(),
      getAllInvoices(), // Use hierarchical storage for invoices
    ]);

    console.log('📊 Loaded data:', {
      projectsCount: projects.length,
      invoicesCount: invoices.length,
      projectIds: projects.map(p => p.projectId),
      searchingFor: { taskId, projectId }
    });

    // Get all tasks across all projects
    const allTasks = [];
    for (const project of projects) {
      const projectTasks = await UnifiedStorageService.listTasks(project.projectId);
      allTasks.push(...projectTasks.map(task => ({
        id: task.taskId,
        taskId: task.taskId, // Keep both for compatibility
        projectId: task.projectId,
        title: task.title,
        status: task.status,
        completed: task.completed,
        order: task.order,
        description: task.description
      })));
    }

    // Remove events data usage - use hierarchical storage for notifications

    // Find the project and task - handle both string and number project IDs
    const project = projects.find(p => String(p.projectId) === String(projectId));
    const task = allTasks.find(t => Number(t.taskId) === Number(taskId) && String(t.projectId) === String(projectId));

    console.log('🔍 Lookup results:', {
      project: project ? { id: project.projectId, title: project.title } : null,
      task: task ? { id: task.taskId, title: task.title, status: task.status } : null,
      allTasksCount: allTasks.length,
      taskIds: allTasks.map(t => ({ taskId: t.taskId, projectId: t.projectId }))
    });

    if (!project || !task) {
      console.error('❌ Project or task not found:', {
        projectFound: !!project,
        taskFound: !!task,
        searchCriteria: { taskId, projectId },
        availableProjects: projects.map(p => p.projectId),
        availableTasks: allTasks.map(t => ({ taskId: t.taskId, projectId: t.projectId }))
      });
      return NextResponse.json({ error: 'Project or task not found' }, { status: 404 });
    }

    // Only auto-generate invoices for milestone-based projects
    if (project.invoicingMethod !== 'milestone') {
      return NextResponse.json({
        message: `Project uses ${project.invoicingMethod}-based invoicing. Auto-generation only applies to milestone-based projects.`
      });
    }

    // 🔒 MILESTONE VALIDATION: Verify task is approved before generating invoice
    // Handle both "approved" and "Approved" for case sensitivity compatibility
    if (task.status.toLowerCase() !== 'approved') {
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
        invoiceNumber: existingInvoice.invoiceNumber,
        existingInvoiceNumber: existingInvoice.invoiceNumber
      });
    }

    // 💰 MILESTONE PAYMENT LOGIC: Synchronize with frontend logic
    // For milestone-based projects, total budget is evenly distributed across ALL milestones
    // This matches the logic in post-a-gig and proposal creation
    const totalBudget = project.totalBudget || project.budget?.upper || project.budget?.lower || 5000;

    // Calculate total tasks dynamically from the project's task list
    const projectTasks = await UnifiedStorageService.listTasks(project.projectId);
    const totalMilestones = projectTasks.length || 1;

    // For milestone-based projects, there's NO upfront commitment - payment is per milestone
    const milestoneAmount = Math.round((totalBudget / totalMilestones) * 100) / 100;

    console.log(`💰 Milestone payment calculation for project ${projectId}:`, {
      totalBudget,
      totalMilestones,
      milestoneAmount,
      invoicingMethod: project.invoicingMethod,
      note: 'Each milestone gets equal share of total budget'
    });

    // Generate invoice number using commissioner initials
    let invoiceNumber = `AUTO-${Date.now()}-${projectId}-${taskId}`; // Fallback

    try {
      // Get commissioner data using hierarchical storage
      const commissioner = project.commissionerId
        ? await UnifiedStorageService.getUserById(project.commissionerId)
        : null;

      if (commissioner?.name) {
        // Extract initials from commissioner name
        const initials = commissioner.name
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase())
          .join('');

        // Get existing invoices to determine next number
        const existingInvoices = await getAllInvoices({ commissionerId: project.commissionerId });
        const commissionerInvoices = existingInvoices.filter(inv =>
          inv.invoiceNumber.startsWith(initials)
        );

        // Find the highest existing number for this commissioner's initials
        let highestNumber = 0;
        for (const invoice of commissionerInvoices) {
          const numberPart = invoice.invoiceNumber.split('-')[1];
          if (numberPart && /^\d+$/.test(numberPart)) {
            const num = parseInt(numberPart, 10);
            if (num > highestNumber) {
              highestNumber = num;
            }
          }
        }

        const nextNumber = String(highestNumber + 1).padStart(3, '0');

        invoiceNumber = `${initials}-${nextNumber}`;
        console.log(`📋 Generated invoice number: ${invoiceNumber} for commissioner ${commissioner.name}`);
      }
    } catch (error) {
      console.warn('⚠️  Could not generate custom invoice number, using fallback:', error);
    }

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

    // Save invoice using hierarchical storage structure
    try {
      // Date parsing removed - hierarchical storage handles this
      console.log('📁 Using hierarchical storage for invoice:', {
        invoiceNumber: newInvoice.invoiceNumber,
        projectId: newInvoice.projectId
      });

      // Use hierarchical storage to save invoice
      await saveInvoice({
        ...newInvoice,
        commissionerId: newInvoice.commissionerId || 0,
        nextRetryDate: undefined
      });
      console.log(`✅ Invoice saved using hierarchical storage: ${newInvoice.invoiceNumber}`);
    } catch (saveError) {
      console.error('❌ Error saving invoice:', saveError);
      throw new Error(`Failed to save invoice: ${saveError instanceof Error ? saveError.message : String(saveError)}`);
    }

    // Events logging removed - use hierarchical notification storage instead
    console.log('✅ Invoice generation completed');

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
