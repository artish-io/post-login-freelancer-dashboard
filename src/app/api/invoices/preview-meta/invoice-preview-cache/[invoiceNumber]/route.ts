import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

const PREVIEW_PATH = path.join(process.cwd(), 'data', 'preview-invoices.json');

type PreviewInvoice = {
  invoiceNumber: string;
  issueDate?: string | null;
  dueDate?: string | null;
  [key: string]: any;
};

async function readPreviewData(): Promise<PreviewInvoice[]> {
  try {
    const raw = await readFile(PREVIEW_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn('⚠️ Preview data read failed or file empty — defaulting to []');
    return [];
  }
}

async function writePreviewData(data: PreviewInvoice[]) {
  await writeFile(PREVIEW_PATH, JSON.stringify(data, null, 2));
}

// ✅ PUT: Save or update preview invoice
export async function PUT(request: Request, context: { params: Promise<{ invoiceNumber: string }> }) {
  const { invoiceNumber } = await context.params;
  const body = await request.json();

  if (!invoiceNumber || !body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid invoice data' }, { status: 400 });
  }

  const previews = await readPreviewData();
  const index = previews.findIndex(inv => inv.invoiceNumber === invoiceNumber);

  const updatedInvoice: PreviewInvoice = {
    invoiceNumber,
    ...body,
    issueDate: body.issueDate || null,
    dueDate: body.dueDate || null,
  };

  if (index !== -1) {
    previews[index] = { ...previews[index], ...updatedInvoice };
  } else {
    previews.push(updatedInvoice);
  }

  await writePreviewData(previews);

  console.log('✅ Preview Invoice Saved:', updatedInvoice);

  return NextResponse.json({ status: 'saved', invoiceNumber });
}

// ✅ GET: Retrieve a single preview invoice by invoiceNumber
export async function GET(_req: Request, context: { params: Promise<{ invoiceNumber: string }> }) {
  const { invoiceNumber } = await context.params;

  const previews = await readPreviewData();
  const invoice = previews.find(inv => inv.invoiceNumber === invoiceNumber);

  if (!invoice) {
    return NextResponse.json({ error: 'Preview invoice not found' }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

// ✅ DELETE: Remove preview invoice
export async function DELETE(_req: Request, context: { params: Promise<{ invoiceNumber: string }> }) {
  const { invoiceNumber } = await context.params;

  const previews = await readPreviewData();
  const filtered = previews.filter(inv => inv.invoiceNumber !== invoiceNumber);

  await writePreviewData(filtered);
  return NextResponse.json({ status: 'deleted', invoiceNumber });
}