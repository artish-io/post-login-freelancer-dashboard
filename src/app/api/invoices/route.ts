import { NextResponse } from 'next/server';
import { getAllInvoices, getInvoiceByNumber, saveInvoice } from '@/lib/invoice-storage';

export async function GET() {
  try {
    const invoices = await getAllInvoices();
    return NextResponse.json(invoices);
  } catch (err) {
    console.error('[invoices] Failed to load data:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      invoiceNumber,
      freelancerId,
      commissionerId,
      projectId,
      projectTitle,
      issueDate,
      dueDate,
      totalAmount,
      status,
      milestones,
      isCustomProject
    } = body;

    if (!invoiceNumber || !freelancerId || !commissionerId || !projectTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if invoice already exists
    const existingInvoice = await getInvoiceByNumber(invoiceNumber);
    if (existingInvoice) {
      return NextResponse.json({ error: 'Invoice already exists' }, { status: 400 });
    }

    // Get all invoices to determine next ID
    const allInvoices = await getAllInvoices();
    const maxId = allInvoices.reduce((max, inv) => Math.max(max, inv.id || 0), 0);

    // Create new invoice
    const newInvoice = {
      id: maxId + 1,
      invoiceNumber,
      freelancerId: Number(freelancerId),
      commissionerId: Number(commissionerId),
      projectId,
      projectTitle,
      issueDate,
      dueDate,
      totalAmount: Number(totalAmount),
      status: status || 'draft',
      milestones: milestones || [],
      isCustomProject: isCustomProject || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveInvoice(newInvoice);

    return NextResponse.json({
      success: true,
      message: 'Invoice created successfully',
      invoiceNumber,
      id: newInvoice.id
    });
  } catch (err) {
    console.error('[invoices] Failed to create invoice:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
