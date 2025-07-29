// src/app/api/invoices/send/route.ts

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAllInvoices, saveInvoice } from '../../../../lib/invoice-storage';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      invoiceNumber,
      issueDate,
      dueDate,
      freelancerId,
      commissionerId,
      projectId,
      projectTitle,
      milestones,
      totalAmount,
      notes,
      isCustomProject = false,
    } = body;

    const allInvoices = await getAllInvoices();
    const maxId = allInvoices.reduce((max, inv) => Math.max(max, inv.id || 0), 0);

    const newInvoice = {
      id: maxId + 1,
      invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
      freelancerId,
      projectId: isCustomProject ? null : projectId,
      commissionerId,
      projectTitle,
      issueDate,
      dueDate,
      totalAmount,
      status: 'sent',
      milestones,
      isCustomProject,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveInvoice(newInvoice);

    return NextResponse.json({ success: true, invoice: newInvoice });
  } catch (error) {
    console.error('[SEND_INVOICE_ERROR]', error);
    return NextResponse.json({ error: 'Failed to send invoice' }, { status: 500 });
  }
}