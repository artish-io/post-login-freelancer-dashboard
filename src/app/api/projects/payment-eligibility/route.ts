import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { readProject } from '@/lib/projects-utils';
import { readAllTasks, convertHierarchicalToLegacy } from '@/lib/project-tasks/hierarchical-storage';
import { getAllInvoices } from '@/lib/invoice-storage';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Load data files
    const [project, hierarchicalTasks, invoices] = await Promise.all([
      readProject(parseInt(projectId)), // Use hierarchical storage for projects
      readAllTasks(), // Use hierarchical storage for project tasks
      getAllInvoices() // Use hierarchical storage for invoices
    ]);

    // Convert hierarchical tasks to legacy format for compatibility
    const projectTasks = convertHierarchicalToLegacy(hierarchicalTasks);
    // invoices is already parsed from hierarchical storage

    // Check if project exists
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Find project tasks
    const projectTaskData = projectTasks.find((pt: any) => pt.projectId === parseInt(projectId));
    if (!projectTaskData) {
      return NextResponse.json({ error: 'Project tasks not found' }, { status: 404 });
    }

    const tasks = projectTaskData.tasks || [];
    const approvedTasks = tasks.filter((task: any) => task.status === 'Approved');
    const projectInvoices = invoices.filter((inv: any) => inv.projectId === parseInt(projectId));

    // For completion-based projects, validate payment eligibility more strictly
    if (project.invoicingMethod === 'completion') {
      // Find approved tasks that have corresponding sent invoices
      const eligibleInvoices = [];
      
      for (const task of approvedTasks) {
        // Find invoice that corresponds to this approved task
        const taskInvoice = projectInvoices.find((inv: any) => {
          // Match by milestone number (task order) or description content
          return (
            inv.milestoneNumber === task.order ||
            inv.milestoneDescription.toLowerCase().includes(task.title.toLowerCase()) ||
            task.title.toLowerCase().includes(inv.milestoneDescription.toLowerCase())
          ) && inv.status === 'sent';
        });

        if (taskInvoice) {
          eligibleInvoices.push({
            invoiceNumber: taskInvoice.invoiceNumber,
            taskId: task.id,
            taskTitle: task.title,
            taskOrder: task.order,
            amount: taskInvoice.totalAmount,
            milestoneNumber: taskInvoice.milestoneNumber,
            status: taskInvoice.status
          });
        }
      }

      // Calculate completion-based amounts
      let calculatedAmountPerTask = 0;
      if (project.totalBudget && project.upfrontCommitment && project.totalTasks) {
        const remainingBudget = project.totalBudget - project.upfrontCommitment;
        calculatedAmountPerTask = remainingBudget / project.totalTasks;
      }

      return NextResponse.json({
        projectId: parseInt(projectId),
        projectTitle: project.title,
        invoicingMethod: project.invoicingMethod,
        paymentEligible: eligibleInvoices.length > 0,
        eligibleInvoices,
        approvedTasksCount: approvedTasks.length,
        totalTasksCount: tasks.length,
        calculatedAmountPerTask: Math.round(calculatedAmountPerTask * 100) / 100,
        projectBudget: {
          total: project.totalBudget || 0,
          upfrontCommitment: project.upfrontCommitment || 0,
          remaining: (project.totalBudget || 0) - (project.upfrontCommitment || 0)
        },
        latestEligibleInvoice: eligibleInvoices.length > 0 
          ? eligibleInvoices.sort((a, b) => b.milestoneNumber - a.milestoneNumber)[0]
          : null
      });

    } else {
      // For milestone-based projects, use simpler logic
      const sentInvoices = projectInvoices.filter((inv: any) => inv.status === 'sent');
      
      return NextResponse.json({
        projectId: parseInt(projectId),
        projectTitle: project.title,
        invoicingMethod: project.invoicingMethod,
        paymentEligible: sentInvoices.length > 0,
        eligibleInvoices: sentInvoices.map((inv: any) => ({
          invoiceNumber: inv.invoiceNumber,
          amount: inv.totalAmount,
          milestoneNumber: inv.milestoneNumber,
          status: inv.status,
          description: inv.milestoneDescription
        })),
        latestEligibleInvoice: sentInvoices.length > 0 
          ? sentInvoices.sort((a: any, b: any) => b.milestoneNumber - a.milestoneNumber)[0]
          : null
      });
    }

  } catch (error) {
    console.error('Error checking payment eligibility:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
