import { NextRequest, NextResponse } from 'next/server';
import { getInvoiceByNumber, updateInvoice, deleteInvoice, type Invoice } from '../../../../lib/invoice-storage';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ invoiceID: string }> }
) {
  try {
    const { invoiceID } = await params;
    const invoice = await getInvoiceByNumber(invoiceID);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('GET invoice failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceID: string }> }
) {
  try {
    const { invoiceID } = await params;
    const updatedInvoiceData = await request.json();

    const success = await updateInvoice(invoiceID, updatedInvoiceData);

    if (!success) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Invoice updated successfully' });
  } catch (error) {
    console.error('PUT invoice failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ invoiceID: string }> }
) {
  try {
    const { invoiceID } = await params;

    const success = await deleteInvoice(invoiceID);

    if (!success) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('DELETE invoice failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}