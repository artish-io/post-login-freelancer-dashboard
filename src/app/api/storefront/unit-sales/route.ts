

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { recalculateSummaryFromSales } from '@/lib/storefront/recalculateSummaryFromSales';

const FILE_PATH = path.join(process.cwd(), 'data', 'storefront', 'unit-sales.json');

export async function GET() {
  try {
    const raw = await readFile(FILE_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load unit sales' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const newEntry = await req.json();

    const raw = await readFile(FILE_PATH, 'utf-8');
    const existing = JSON.parse(raw);

    existing.push(newEntry);
    await writeFile(FILE_PATH, JSON.stringify(existing, null, 2));

    await recalculateSummaryFromSales();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save unit sale' }, { status: 500 });
  }
}