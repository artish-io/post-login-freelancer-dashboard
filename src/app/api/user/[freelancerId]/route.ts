import { NextRequest, NextResponse } from 'next/server';
import { getAllInvoices, updateInvoice, deleteInvoice } from '@/lib/invoice-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ freelancerId: string }> }
) {
  try {
    const { freelancerId } = await params;
    const invoices = await getAllInvoices(); // Use hierarchical storage

    const filtered = invoices.filter(
      (invoice: any) => String(invoice.freelancerId) === freelancerId
    );

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Failed to fetch invoices:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const freelancerId = extractFreelancerId(request);
    const body = await request.json();
    const { invoiceNumber, updates } = body;

    // Verify the invoice belongs to this freelancer
    const invoices = await getAllInvoices();
    const invoice = invoices.find(
      (inv: any) =>
        inv.invoiceNumber === invoiceNumber &&
        String(inv.freelancerId) === freelancerId
    );

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Update the invoice using hierarchical storage
    const success = await updateInvoice(invoiceNumber, updates);

    if (!success) {
      return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Invoice updated successfully' });
  } catch (error) {
    console.error('Failed to update invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const freelancerId = extractFreelancerId(request);
    const { invoiceNumber } = await request.json();

    // Verify the invoice belongs to this freelancer
    const invoices = await getAllInvoices();
    const invoice = invoices.find(
      (inv: any) =>
        inv.invoiceNumber === invoiceNumber &&
        String(inv.freelancerId) === freelancerId
    );

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Delete the invoice using hierarchical storage
    const success = await deleteInvoice(invoiceNumber);

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Failed to delete invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

function extractFreelancerId(request: NextRequest): string {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  return pathSegments[pathSegments.length - 1];
}