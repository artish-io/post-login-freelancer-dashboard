// src/app/api/invoices/send/route.ts

import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const INVOICE_FILE = path.join(process.cwd(), 'data', 'invoices.json');

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      invoiceNumber,
      issueDate,
      executionDate,
      freelancerId,
      clientId,
      projectId,
      milestones,
      total,
      notes,
      isCustomProject = false,
    } = body;

    const data = await readFile(INVOICE_FILE, 'utf-8');
    const invoices = JSON.parse(data);

    const newInvoice = {
      id: uuidv4(),
      invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
      issueDate,
      executionDate,
      freelancerId,
      clientId,
      projectId,
      isCustomProject,
      milestones,
      total,
      notes,
      createdAt: new Date().toISOString(),
    };

    invoices.push(newInvoice);
    await writeFile(INVOICE_FILE, JSON.stringify(invoices, null, 2));

    return NextResponse.json({ success: true, invoice: newInvoice });
  } catch (error) {
    console.error('[SEND_INVOICE_ERROR]', error);
    return NextResponse.json({ error: 'Failed to send invoice' }, { status: 500 });
  }
}