import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const filePath = path.join(process.cwd(), 'data', 'invoices.json');

type Invoice = {
  invoiceNumber: string;
  [key: string]: any;
};

async function readInvoices(): Promise<Invoice[]> {
  const data = await readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

async function writeInvoices(invoices: Invoice[]) {
  await writeFile(filePath, JSON.stringify(invoices, null, 2));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;
    const invoices = await readInvoices();
    const invoice = invoices.find(inv => inv.invoiceNumber === invoiceId);

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
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;
    const updatedInvoice = await request.json();

    const invoices = await readInvoices();
    const index = invoices.findIndex(inv => inv.invoiceNumber === invoiceId);

    if (index === -1) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    invoices[index] = { ...invoices[index], ...updatedInvoice };
    await writeInvoices(invoices);

    return NextResponse.json({ message: 'Invoice updated successfully' });
  } catch (error) {
    console.error('PUT invoice failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;

    const invoices = await readInvoices();
    const index = invoices.findIndex(inv => inv.invoiceNumber === invoiceId);

    if (index === -1) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    invoices.splice(index, 1);
    await writeInvoices(invoices);

    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('DELETE invoice failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}