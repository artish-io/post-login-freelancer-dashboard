// src/app/api/invoices/[invoiceId]/route.ts
import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const filePath = path.join(process.cwd(), 'data', 'invoices.json');

export async function GET(
  _request: Request,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const data = await readFile(filePath, 'utf-8');
    const invoices = JSON.parse(data);

    const invoice = invoices.find((inv: any) => inv.invoiceNumber === params.invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Failed to read invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const updatedInvoice = await request.json();
    const data = await readFile(filePath, 'utf-8');
    const invoices = JSON.parse(data);

    const index = invoices.findIndex((inv: any) => inv.invoiceNumber === params.invoiceId);
    if (index === -1) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    invoices[index] = { ...invoices[index], ...updatedInvoice };
    await writeFile(filePath, JSON.stringify(invoices, null, 2));

    return NextResponse.json({ message: 'Invoice updated successfully' });
  } catch (error) {
    console.error('Failed to update invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const data = await readFile(filePath, 'utf-8');
    let invoices = JSON.parse(data);

    const index = invoices.findIndex((inv: any) => inv.invoiceNumber === params.invoiceId);
    if (index === -1) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    invoices.splice(index, 1);
    await writeFile(filePath, JSON.stringify(invoices, null, 2));

    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Failed to delete invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}