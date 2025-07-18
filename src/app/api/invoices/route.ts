import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET() {
  try {
    const invoiceData = await fs.readFile(
      path.join(process.cwd(), 'data/invoices.json'), 
      'utf-8'
    );

    const invoices = JSON.parse(invoiceData);

    return NextResponse.json(invoices);
  } catch (err) {
    console.error('[invoices] Failed to load data:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
