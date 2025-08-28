// src/app/api/dashboard/invoices/create/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { saveInvoice, getAllInvoices, updateInvoice } from '../../../../lib/invoice-storage';
import { readProject } from '../../../../lib/projects-utils';

const ALLOWED_STATUSES = ['draft', 'sent', 'paid'];
const ALLOWED_EXECUTION_MODES = ['milestone', 'completion'];

export async function POST(request: Request) {
  try {
    // 🔒 SECURITY: Verify session authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const {
      freelancerId,
      projectId,
      client,
      projectTitle,
      issueDate,
      dueDate,
      milestones,
      totalAmount,
      status,
      executionMode,
    } = body;

    const sessionUserId = parseInt(session.user.id);

    if (
      !freelancerId ||
      !projectId ||
      !client ||
      !projectTitle ||
      !issueDate ||
      !executionMode ||
      !ALLOWED_EXECUTION_MODES.includes(executionMode) ||
      !Array.isArray(milestones) ||
      milestones.length === 0 ||
      typeof totalAmount !== 'number' ||
      (status && !ALLOWED_STATUSES.includes(status))
    ) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    // 🔒 SECURITY: Verify freelancer can only create invoices for their own projects
    if (freelancerId !== sessionUserId) {
      return NextResponse.json({
        error: 'Unauthorized: You can only create invoices for your own projects'
      }, { status: 403 });
    }

    // 🔒 SECURITY: Verify project exists and freelancer is assigned to it
    const project = await readProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.freelancerId !== sessionUserId) {
      return NextResponse.json({
        error: 'Unauthorized: You are not assigned to this project'
      }, { status: 403 });
    }

    for (const milestone of milestones) {
      if (!milestone.title || typeof milestone.amount !== 'number') {
        return NextResponse.json({ error: 'Invalid milestone data' }, { status: 400 });
      }
    }

    const newInvoiceId = Math.floor(100000 + Math.random() * 900000);

    const newInvoice = {
      id: newInvoiceId,
      invoiceNumber: `INV-${newInvoiceId}`,
      freelancerId,
      projectId,
      commissionerId: client,
      projectTitle,
      issueDate,
      dueDate,
      executionMode, // immutable after creation
      milestones,
      totalAmount,
      status: status || 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveInvoice(newInvoice);

    return NextResponse.json(
      { message: 'Invoice created successfully', invoiceId: newInvoiceId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const {
      id,
      freelancerId,
      projectId,
      projectTitle,
      issueDate,
      dueDate,
      milestones,
      totalAmount,
      status,
    } = body;

    if (!id || (status && !ALLOWED_STATUSES.includes(status))) {
      return NextResponse.json({ error: 'Missing invoice ID or invalid status' }, { status: 400 });
    }

    if (milestones && Array.isArray(milestones)) {
      for (const milestone of milestones) {
        if (!milestone.title || typeof milestone.amount !== 'number') {
          return NextResponse.json({ error: 'Invalid milestone data' }, { status: 400 });
        }
      }
    }

    // Use hierarchical storage to get all invoices
    const invoices = await getAllInvoices();

    const index = invoices.findIndex((inv: any) => inv.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    invoices[index] = {
      ...invoices[index],
      freelancerId,
      projectId,
      projectTitle,
      issueDate,
      dueDate, // OK to update
      milestones,
      totalAmount,
      status,
      updatedAt: new Date().toISOString()
    };

    // Use hierarchical storage to update the invoice
    await updateInvoice(invoices[index].invoiceNumber, invoices[index]);

    return NextResponse.json({ message: 'Invoice updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to update invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}