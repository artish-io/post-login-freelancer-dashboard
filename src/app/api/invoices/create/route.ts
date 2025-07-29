// src/app/api/dashboard/invoices/create/route.ts
import { NextResponse } from 'next/server';
import { getAllInvoices, saveInvoice } from '../../../../lib/invoice-storage';
const ALLOWED_STATUSES = ['draft', 'sent', 'paid'];
const ALLOWED_EXECUTION_MODES = ['milestone', 'completion'];

export async function POST(request: Request) {
  try {
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

    for (const milestone of milestones) {
      if (!milestone.title || typeof milestone.amount !== 'number') {
        return NextResponse.json({ error: 'Invalid milestone data' }, { status: 400 });
      }
    }

    const allInvoices = await getAllInvoices();
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
      client,
      projectTitle,
      issueDate,
      dueDate,
      milestones,
      totalAmount,
      status,
      executionMode, // should not be editable
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

    const file = await readFile(invoicesFilePath, 'utf-8');
    const invoices = JSON.parse(file);

    const index = invoices.findIndex((inv: any) => inv.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Prevent executionMode from being modified
    if (
      executionMode &&
      executionMode !== invoices[index].executionMode
    ) {
      return NextResponse.json({ error: 'executionMode cannot be modified after creation' }, { status: 400 });
    }

    invoices[index] = {
      ...invoices[index],
      freelancerId,
      projectId,
      client,
      projectTitle,
      issueDate,
      dueDate, // OK to update
      milestones,
      totalAmount,
      status,
    };

    await writeFile(invoicesFilePath, JSON.stringify(invoices, null, 2));

    return NextResponse.json({ message: 'Invoice updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to update invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}