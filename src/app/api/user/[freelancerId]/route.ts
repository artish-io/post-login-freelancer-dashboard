import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

const filePath = path.join(process.cwd(), 'data', 'invoices.json');

export async function GET(
  _request: Request,
  { params }: { params: { freelancerId: string } }
) {
  try {
    const data = await readFile(filePath, 'utf-8');
    const invoices = JSON.parse(data);

    const filtered = invoices.filter(
      (invoice: any) => String(invoice.freelancerId) === params.freelancerId
    );

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Failed to fetch invoices:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { freelancerId: string } }
) {
  try {
    const body = await request.json();
    const { invoiceNumber, updates } = body;

    const data = await readFile(filePath, 'utf-8');
    const invoices = JSON.parse(data);

    const index = invoices.findIndex(
      (inv: any) =>
        inv.invoiceNumber === invoiceNumber &&
        String(inv.freelancerId) === params.freelancerId
    );

    if (index === -1) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    invoices[index] = { ...invoices[index], ...updates };
    await writeFile(filePath, JSON.stringify(invoices, null, 2));

    return NextResponse.json({ message: 'Invoice updated successfully' });
  } catch (error) {
    console.error('Failed to update invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { freelancerId: string } }
) {
  try {
    const { invoiceNumber } = await request.json();

    const data = await readFile(filePath, 'utf-8');
    const invoices = JSON.parse(data);

    const newInvoices = invoices.filter(
      (inv: any) =>
        inv.invoiceNumber !== invoiceNumber ||
        String(inv.freelancerId) !== params.freelancerId
    );

    await writeFile(filePath, JSON.stringify(newInvoices, null, 2));

    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Failed to delete invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}