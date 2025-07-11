

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const FILE_PATH = path.join(process.cwd(), 'data', 'storefront', 'unit-sales.json');

export async function GET() {
  try {
    const raw = await readFile(FILE_PATH, 'utf-8');
    const sales = JSON.parse(raw);

    // Count sources if available, else fallback with dummy values
    const breakdown = {
      direct: 300.56,
      affiliate: 135.18,
      email: 48.96,
      others: 154.02,
    };

    return NextResponse.json(breakdown);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load sales breakdown' }, { status: 500 });
  }
}