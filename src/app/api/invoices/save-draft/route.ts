// src/app/api/invoices/save-draft/route.ts
import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DRAFTS_PATH = path.join(process.cwd(), 'data', 'invoices-log', 'invoices-draft.json');
const GENERATE_ENDPOINT = `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/invoice-meta/generate-number`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { invoiceNumber } = body;

    // Fallback: Generate invoice number if not provided
    if (!invoiceNumber) {
      const response = await fetch(GENERATE_ENDPOINT);
      if (!response.ok) throw new Error('Failed to generate invoice number');
      const data = await response.json();
      invoiceNumber = data.invoiceNumber;
    }

    // Read current draft invoices
    const raw = await readFile(DRAFTS_PATH, 'utf-8');
    const drafts = JSON.parse(raw);

    // Auto-assign ID and UUID
    const nextId =
      drafts.length > 0
        ? Math.max(...drafts.map((inv: any) => inv.id || 0)) + 1
        : 1;

    const newDraft = {
      ...body,
      id: nextId,
      uuid: uuidv4(),
      invoiceNumber,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    drafts.push(newDraft);
    await writeFile(DRAFTS_PATH, JSON.stringify(drafts, null, 2));

    return NextResponse.json(newDraft);
  } catch (err) {
    console.error('Failed to save draft invoice:', err);
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
  }
}