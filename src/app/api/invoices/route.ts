import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAllInvoices, getInvoiceByNumber, saveInvoice } from '@/lib/invoice-storage';
import { filterInvoicesForCommissioner, filterInvoicesForFreelancer } from '@/lib/invoice-status-definitions';

export async function GET(request: Request) {
  try {
    // Get session to determine user type and apply proper filtering
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const userType = url.searchParams.get('userType') || 'freelancer';
    const userId = parseInt(session.user.id);

    // Get all invoices
    let invoices = await getAllInvoices();

    // Apply user-specific filtering
    if (userType === 'commissioner') {
      // Commissioners can only see non-draft invoices for their projects
      invoices = filterInvoicesForCommissioner(invoices.filter(inv =>
        inv.commissionerId === userId
      ));
    } else {
      // Freelancers can see all their invoices including drafts
      invoices = filterInvoicesForFreelancer(invoices.filter(inv =>
        parseInt(inv.freelancerId.toString()) === userId
      ));
    }

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
